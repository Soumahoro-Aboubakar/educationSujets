const mongoose = require('mongoose');
const PrepProgression = require('../../models/PrepProgression');
const PrepIdentite = require('../../models/PrepIdentite');
const AppError = require('../../utils/errors');
const { normalizePseudonym, escapeRegex } = require('./pseudonymSearch');

const MAX_TIME_MS = 3000;
const TTL_MS = 45000;
const CACHE_MAX = 200;
const cache = new Map();
const PUBLIC_FIELDS = { _id: 1, identite: 1, score: 1, stats: 1 };
const MINE_FIELDS = 'identite score stats rangSemainePrecedente derniereActivite';
const IDENTITY_FIELDS = { _id: 1, pseudonyme: 1, avatarTeinte: 1, visibleClassement: 1 };
const SORT = { score: -1, _id: 1 };

const invalid = (message) => new AppError(message, 400, undefined, 'PREP_CLASSEMENT_PARAMETRE');
const periodOf = (periode = 'tout') => {
  if (!['tout', 'semaine', 'mois'].includes(periode)) throw invalid('Période invalide');
  return periode;
};
const periodFilter = (programme, periode) => ({
  programme,
  ...(periode === 'tout' ? {} : { derniereActivite: { $gte: new Date(Date.now() - (periode === 'semaine' ? 7 : 30) * 864e5) } }),
});
const encodeCursor = (row) => Buffer.from(JSON.stringify({ score: row.score, _id: String(row._id) })).toString('base64url');
const decodeCursor = (value) => {
  if (typeof value !== 'string' || value.length > 200 || !/^[A-Za-z0-9_-]+$/.test(value)) throw invalid('Curseur invalide');
  try {
    const raw = Buffer.from(value, 'base64url');
    if (raw.toString('base64url') !== value) throw new Error();
    const cursor = JSON.parse(raw.toString());
    if (typeof cursor.score !== 'number' || !Number.isFinite(cursor.score) || !/^[a-f0-9]{24}$/.test(cursor._id)) throw new Error();
    return { score: cursor.score, _id: new mongoose.Types.ObjectId(cursor._id) };
  } catch { throw invalid('Curseur invalide'); }
};
// L'identifiant est celui de la progression, jamais celui de l'identité.
const boundary = (cursor, before = false, inclusive = false) => ({ $or: [
  { score: { [before ? '$gt' : '$lt']: cursor.score } },
  { score: cursor.score, _id: { [before ? (inclusive ? '$lte' : '$lt') : (inclusive ? '$gte' : '$gt')]: cursor._id } },
] });
const aggregate = (model, pipeline) => model.aggregate(pipeline).option({ maxTimeMS: MAX_TIME_MS });
const count = (filter) => PrepProgression.countDocuments(filter).maxTimeMS(MAX_TIME_MS);

/**
 * Pas de dénormalisation de visibilité : l'identité est l'autorité, y compris pour les anciennes
 * progressions. Le lookup par _id (index natif) et le filtre précèdent la limite. La projection
 * d'inclusion interdit etat. Les agrégations renvoient déjà des objets simples (équivalent lean).
 */
const visibleRows = (filter, limit, cursor = null, before = false, inclusive = false) => aggregate(PrepProgression, [
  { $match: { ...filter, ...(cursor ? boundary(cursor, before, inclusive) : {}) } },
  { $sort: before ? { score: 1, _id: -1 } : SORT },
  { $project: PUBLIC_FIELDS },
  { $lookup: {
    from: PrepIdentite.collection.name, localField: 'identite', foreignField: '_id',
    pipeline: [{ $match: { visibleClassement: { $ne: false }, fusionneeDans: null } }, { $project: IDENTITY_FIELDS }],
    as: 'profil',
  } },
  { $unwind: '$profil' },
  { $limit: limit },
]);

/**
 * Un seul parcours des scores pour tous les rangs d'une page, masqués compris. Chaque bucket
 * contient un score demandé et l'intervalle jusqu'au suivant ; ties compte ses seuls ex æquo.
 * On cumule depuis le haut : supérieurs stricts = buckets supérieurs + count - ties.
 * Résultat borné à 51 buckets (avec la ligne de détection de page suivante), sans transférer les progressions ni faire 50 comptages séparés.
 */
const ranksFor = async (filter, rows) => {
  const scores = [...new Set(rows.map((r) => r.score))].sort((a, b) => a - b);
  if (!scores.length) return new Map();
  const buckets = await aggregate(PrepProgression, [
    { $match: { ...filter, score: { $gte: scores[0] } } },
    { $project: { _id: 0, score: 1 } },
    { $bucket: { groupBy: '$score', boundaries: [...scores, Infinity], output: {
      count: { $sum: 1 }, ties: { $sum: { $cond: [{ $in: ['$score', scores] }, 1, 0] } },
    } } },
    { $sort: { _id: -1 } },
  ]);
  const ranks = new Map();
  let higher = 0;
  for (const b of buckets) { ranks.set(b._id, higher + b.count - b.ties + 1); higher += b.count; }
  return ranks;
};
const withRanks = async (filter, rows) => {
  const ranks = await ranksFor(filter, rows);
  return rows.map((r) => ({ ...r, rang: ranks.get(r.score) }));
};
const publicRow = (r, identite) => ({
  identite: String(r.profil._id), pseudonyme: r.profil.pseudonyme, avatarTeinte: r.profil.avatarTeinte,
  score: r.score, stats: r.stats || {}, rang: r.rang, rangApprox: r.rang,
  moi: Boolean(identite && String(r.profil._id) === String(identite._id)),
});

// Les promesses coalescent les requêtes simultanées. Une entrée invalidée en vol n'est jamais réinsérée.
const cached = (programme, periode, filter) => {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
  const key = JSON.stringify([programme, periode]);
  let entry = cache.get(key);
  if (!entry) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    entry = { expires: now + TTL_MS };
    cache.set(key, entry);
  }
  const get = (field, loader) => {
    if (!entry[field]) entry[field] = loader().catch((error) => { if (cache.get(key) === entry) cache.delete(key); throw error; });
    return entry[field];
  };
  return {
    total: () => get('total', () => count(filter)),
    first: async () => {
      const reused = Boolean(entry.first);
      const rows = await get('first', () => visibleRows(filter, 51).then((page) => withRanks(filter, page)));
      if (!reused || !rows.length) return rows;
      // Le cache est local ; un autre processus peut avoir masqué un candidat entre deux appels.
      // Recontrôle borné des identités, puis recharge de la page entière si nécessaire : aucune
      // suppression après limite qui laisserait des trous dans une page mise en cache.
      const profiles = await PrepIdentite.find({ _id: { $in: rows.map((r) => r.profil._id) },
        visibleClassement: { $ne: false }, fusionneeDans: null })
        .select(IDENTITY_FIELDS).maxTimeMS(MAX_TIME_MS).lean();
      const byId = new Map(profiles.map((profile) => [String(profile._id), profile]));
      const unchanged = rows.every(({ profil }) => {
        const current = byId.get(String(profil._id));
        return current && current.pseudonyme === profil.pseudonyme && current.avatarTeinte === profil.avatarTeinte;
      });
      if (unchanged) return rows;
      invalidateRanking(programme);
      return cached(programme, periode, filter).first();
    },
  };
};
const invalidateRanking = (programme) => {
  if (!programme) { cache.clear(); return; }
  for (const key of cache.keys()) if (JSON.parse(key)[0] === programme) cache.delete(key);
};

const ranking = async (identite, programme, options = {}) => {
  const periode = periodOf(options.periode);
  const rawLimit = options.limite ?? options.limit ?? 30;
  if (!['string', 'number'].includes(typeof rawLimit) || !/^[1-9]\d*$/.test(String(rawLimit)) || !Number.isSafeInteger(Number(rawLimit))) throw invalid('Limite invalide');
  const limit = Math.min(Number(rawLimit), 50);
  const { apres, avant, autour } = options;
  if (autour !== undefined && autour !== 'moi') throw invalid('Valeur autour invalide');
  if ((apres !== undefined && avant !== undefined) || (autour && (apres !== undefined || avant !== undefined))) throw invalid('Paramètres de pagination incompatibles');
  const cursor = apres !== undefined ? decodeCursor(apres) : avant !== undefined ? decodeCursor(avant) : null;
  const filter = periodFilter(programme, periode);
  const shared = cached(programme, periode, filter);
  const [total, mine] = await Promise.all([
    shared.total(),
    identite ? PrepProgression.findOne({ identite: identite._id, programme }).select(MINE_FIELDS).maxTimeMS(MAX_TIME_MS).lean() : null,
  ]);
  // Même inactif sur la période, le propriétaire conserve sa ligne ; seuls ses concurrents sont filtrés.
  const rang = mine ? (await count({ ...filter, score: { $gt: mine.score } })) + 1 : null;
  let rows; let hasBefore = false; let hasAfter = false;
  if (autour && mine) {
    const [above, below] = await Promise.all([
      visibleRows(filter, limit + 1, mine, true),
      visibleRows(filter, limit + 1, mine, false, true),
    ]);
    let nAbove = Math.min(Math.floor(limit / 2), above.length);
    const nBelow = Math.min(limit - nAbove, below.length);
    nAbove = Math.min(limit - nBelow, above.length);
    rows = [...above.slice(0, nAbove).reverse(), ...below.slice(0, nBelow)];
    hasBefore = above.length > nAbove; hasAfter = below.length > nBelow;
    rows = await withRanks(filter, rows);
  } else if (cursor) {
    rows = await visibleRows(filter, limit + 1, cursor, avant !== undefined);
    const more = rows.length > limit;
    rows = rows.slice(0, limit);
    if (avant !== undefined) rows.reverse();
    rows = await withRanks(filter, rows);
    hasBefore = avant !== undefined ? more : false;
    hasAfter = avant !== undefined ? false : more;
    // Un curseur fourni peut pointer vers une ligne supprimée ou masquée : vérifier l'autre côté.
    if (rows.length) {
      if (avant !== undefined) hasAfter = (await visibleRows(filter, 1, rows[rows.length - 1])).length > 0;
      else hasBefore = (await visibleRows(filter, 1, rows[0], true)).length > 0;
    }
  } else {
    const first = await shared.first();
    rows = first.slice(0, limit); hasAfter = first.length > limit;
  }
  return {
    total, periode, rang,
    variation: mine?.rangSemainePrecedente && rang ? mine.rangSemainePrecedente - rang : 0,
    moi: mine ? { rang, score: mine.score, stats: mine.stats || {}, visible: identite.visibleClassement !== false,
      identite: String(identite._id), pseudonyme: identite.pseudonyme } : null,
    candidats: rows.map((r) => publicRow(r, identite)),
    precedent: hasBefore && rows.length ? encodeCursor(rows[0]) : null,
    suivant: hasAfter && rows.length ? encodeCursor(rows[rows.length - 1]) : null,
  };
};

const searchCandidates = async (programme, q, { periode: rawPeriod } = {}) => {
  const periode = periodOf(rawPeriod);
  if (typeof q !== 'string' || [...q.trim()].length < 2 || [...q.trim()].length > 40) throw invalid('Recherche : 2 à 40 caractères requis');
  const normalized = normalizePseudonym(q.trim());
  if (!normalized) throw invalid('Recherche invalide');
  const prefix = new RegExp(`^${escapeRegex(normalized)}`);
  const filter = periodFilter(programme, periode);
  const rows = await aggregate(PrepIdentite, [
    { $match: { $or: [{ pseudonymeNormalise: prefix }, { pseudonymeNumero: prefix }], visibleClassement: { $ne: false }, fusionneeDans: null } },
    { $project: IDENTITY_FIELDS },
    // Ne pas limiter avant d'avoir vérifié la participation à ce programme.
    { $lookup: { from: PrepProgression.collection.name, localField: '_id', foreignField: 'identite',
      pipeline: [{ $match: filter }, { $project: PUBLIC_FIELDS }], as: 'progression' } },
    { $unwind: '$progression' },
    { $limit: 20 },
    { $project: { _id: '$progression._id', identite: '$_id', score: '$progression.score', stats: '$progression.stats', profil: '$$ROOT' } },
    { $project: { ...PUBLIC_FIELDS, 'profil._id': 1, 'profil.pseudonyme': 1, 'profil.avatarTeinte': 1 } },
  ]);
  const ranked = await withRanks(filter, rows);
  return { periode, candidats: ranked.map((r) => {
    const { moi, rangApprox, ...result } = publicRow(r, null);
    return result;
  }) };
};

const candidateProfile = async (programme, identiteId, { periode: rawPeriod, viewer } = {}) => {
  const periode = periodOf(rawPeriod);
  const identite = await PrepIdentite.findById(identiteId).select(IDENTITY_FIELDS).maxTimeMS(MAX_TIME_MS).lean();
  const own = viewer && String(viewer._id) === String(identiteId);
  if (!identite || (identite.visibleClassement === false && !own)) return null;
  const doc = await PrepProgression.findOne({ identite: identiteId, programme })
    .select('score stats matieresFortes').maxTimeMS(MAX_TIME_MS).lean();
  if (!doc) return null;
  const rang = (await count({ ...periodFilter(programme, periode), score: { $gt: doc.score } })) + 1;
  return { identite: String(identite._id), pseudonyme: identite.pseudonyme, avatarTeinte: identite.avatarTeinte,
    periode, rang, score: doc.score, stats: doc.stats || {}, matieresFortes: doc.matieresFortes || [] };
};

module.exports = { ranking, candidateProfile, searchCandidates, invalidateRanking };
