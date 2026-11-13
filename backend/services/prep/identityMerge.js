const PrepProgression = require('../../models/PrepProgression');
const PrepTentative = require('../../models/PrepTentative');
const PrepIdentite = require('../../models/PrepIdentite');
const core = require('./shared/prepCore');

// L'archive source reste conservée. Le marqueur et l'état cible sont écrits ensemble (CAS),
// donc une reprise après crash ne réadditionne jamais les compteurs.
const combine = (left, right) => {
  const a = structuredClone(left?.compteurs ? left : core.emptyProgress());
  const b = right?.compteurs ? right : core.emptyProgress();
  for (const k of Object.keys(a.compteurs)) a.compteurs[k] += b.compteurs[k] || 0;
  for (const n of [1, 2, 3]) a.premierCoup[n] = a.premierCoup[n].map((v, i) => v + (b.premierCoup[n]?.[i] || 0));
  for (const [m, levels] of Object.entries(b.scores || {})) {
    a.scores[m] ||= {};
    for (const [n, value] of Object.entries(levels)) a.scores[m][n] = Math.max(a.scores[m][n] || 0, value);
  }
  a.modulesValides = [...new Set([...a.modulesValides, ...b.modulesValides])];
  a.joursActifs = [...new Set([...a.joursActifs, ...b.joursActifs])].sort();
  a.blancs = [...a.blancs, ...b.blancs];
  for (const key of ['erreurs', 'revisions']) a[key] = { ...b[key], ...a[key] };
  for (const [code, lesson] of Object.entries(b.lecons || {})) {
    const old = a.lecons[code];
    a.lecons[code] = old ? { ...lesson, ...old, terminee: Boolean(old.terminee || lesson.terminee), position: Math.max(old.position || 0, lesson.position || 0) } : lesson;
  }
  // Les minutes sont comptabilisées par jour dans le moteur existant.
  for (const [day, minutes] of Object.entries(b.minutesParJour || {})) a.minutesParJour[day] = (a.minutesParJour[day] || 0) + minutes;
  return a;
};
const merge = async (source, target) => {
  const progress = require('./progressService');
  for (const doc of await PrepProgression.find({ identite: source._id }).lean()) {
    let done = false;
    for (let attempt = 0; attempt < 10 && !done; attempt += 1) {
      let current = await PrepProgression.findOne({ identite: target._id, programme: doc.programme });
      if (!current) {
        try { current = await PrepProgression.create({ identite: target._id, programme: doc.programme, etat: core.emptyProgress() }); }
        catch (error) { if (error.code === 11000) continue; throw error; }
      }
      if (current.mergedIdentities.some((id) => String(id) === String(source._id))) { done = true; break; }
      const etat = combine(current.etat, doc.etat);
      const result = await PrepProgression.updateOne({ _id: current._id, __v: current.__v, mergedIdentities: { $ne: source._id } },
        { $set: { etat }, $addToSet: { mergedIdentities: source._id, appliquees: { $each: doc.appliquees || [] } }, $inc: { __v: 1, revision: 1 } });
      done = Boolean(result.modifiedCount);
    }
    if (!done) throw new Error('Fusion concurrente : réessayer le rattachement');
    // Recalcul dérivé rejouable, y compris après interruption entre CAS et recalcul.
    await progress.finalize(await PrepProgression.findOne({ identite: target._id, programme: doc.programme }));
  }
  for (const attempt of await PrepTentative.find({ identite: source._id })) {
    // En cas de collision de clé, l'original reste archivé sur la source, jamais supprimé.
    try { await PrepTentative.updateOne({ _id: attempt._id, identite: source._id }, { $set: { identite: target._id } }); }
    catch (error) { if (error.code !== 11000) throw error; }
  }
  await PrepIdentite.updateOne({ _id: target._id }, {
    $addToSet: { 'essai.jours': { $each: source.essai.jours } },
    $max: { 'essai.iaUtilisees': source.essai.iaUtilisees },
  });
  progress.invalidateRanking();
};
module.exports = { merge, combine };
