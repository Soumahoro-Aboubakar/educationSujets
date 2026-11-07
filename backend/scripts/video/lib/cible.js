const crypto = require('crypto');
const path = require('path');
const core = require('../../../services/prep/shared/prepCore');

/**
 * Résolution de la cible d'une vidéo dans le pack de contenu (data/prep/build/pack.json) :
 * le module ou le concours doit exister et être publié, sinon aucune vidéo ne lui est rattachée.
 */
const PACK_PATH = path.resolve(__dirname, '../../../data/prep/build/pack.json');
const SITE = 'https://fatafalta.com';

let packCache = null;
const loadPack = () => {
  if (!packCache) packCache = require(PACK_PATH); // eslint-disable-line global-require, import/no-dynamic-require
  return packCache;
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** Empreinte du contenu ayant servi à la vidéo (repère les vidéos devenues obsolètes). */
const empreinte = (value) => sha256(JSON.stringify(value)).slice(0, 16);

/** Marqueur écrit dans la description YouTube : retrouve un envoi même sans journal local. */
const marqueur = (cible, fichierSha256) => `fatafalta:${cible.type}:${cible.code}:${cible.langue}:${String(fichierSha256).slice(0, 12)}`;

const LANGUES = { fr: 'français', en: 'anglais', es: 'espagnol', de: 'allemand', ar: 'arabe', pt: 'portugais', it: 'italien', zh: 'chinois', ru: 'russe' };

const resolveModule = (pack, code, langue) => {
  const mod = pack.modules[code];
  if (!mod) throw new Error(`Module ${code} introuvable dans le pack (npm run prep:pack ?)`);
  if (!mod.publie) throw new Error(`Module ${code} non publié : aucune vidéo ne peut lui être rattachée`);
  const versions = core.moduleVersions(mod);
  if (!versions.includes(langue)) throw new Error(`Module ${code} : version « ${langue} » inexistante (versions : ${versions.join(', ')})`);
  const v = core.moduleVersion(mod, langue);
  const programmes = pack.programmes.filter((p) => p.matieres.some((m) => m.modules.some((x) => x.code === code && x.publie)));
  return {
    type: 'module', code, langue, titre: v.titre, resume: v.resume, matiere: v.matiere,
    concours: programmes.map((p) => `${p.organisme.sigle} ${p.titre}`),
    empreinte: empreinte({ titre: v.titre, resume: v.resume, notions: v.notions, lecons: v.lecons, exercices: v.exercices }),
    contenu: v,
  };
};

const resolveConcours = (pack, code) => {
  const prog = pack.programmes.find((p) => p.code === code);
  if (!prog) throw new Error(`Concours (programme) ${code} introuvable dans le pack`);
  return {
    type: 'concours', code, langue: 'fr', titre: prog.titre, resume: prog.description, sigle: prog.organisme.sigle,
    empreinte: empreinte({ titre: prog.titre, description: prog.description, epreuves: prog.epreuves, matieres: prog.matieres }),
    contenu: prog,
  };
};

const resolveCible = ({ type, id, langue = 'fr' }, pack = loadPack()) => (
  type === 'module' ? resolveModule(pack, id, langue) : resolveConcours(pack, id)
);

/** Toutes les cibles possibles (pour --etat). */
const toutesLesCibles = (pack = loadPack()) => [
  ...pack.programmes.map((p) => ({ type: 'concours', code: p.code, langue: 'fr', titre: p.titre })),
  ...Object.values(pack.modules).flatMap((m) => core.moduleVersions(m).map((langue) => ({ type: 'module', code: m.code, langue, titre: core.moduleVersion(m, langue).titre }))),
].map((c) => ({ ...c, empreinte: resolveCible({ type: c.type, id: c.code, langue: c.langue }, pack).empreinte }));

/** Métadonnées YouTube (titre ≤ 100 caractères, description ≤ 5000). */
const metadonnees = (cible, { titre, fichierSha256 }) => {
  const defaut = cible.type === 'module'
    ? `${cible.titre} — ${cible.matiere} | Fatafalta`
    : `Concours ${cible.sigle} — ${cible.titre} : présentation | Fatafalta`;
  const lignes = [
    cible.resume,
    '',
    cible.type === 'module' && cible.concours.length ? `Préparation aux concours : ${cible.concours.join(' · ')}.` : null,
    cible.langue !== 'fr' ? `Version en ${LANGUES[cible.langue] || cible.langue} du cours.` : null,
    `Cours, exercices corrigés et anciens sujets sur Fatafalta : ${SITE}`,
    '',
    marqueur(cible, fichierSha256),
  ].filter((l) => l !== null);
  return {
    snippet: {
      title: (titre || defaut).slice(0, 100),
      description: lignes.join('\n').slice(0, 5000),
      tags: ['Fatafalta', 'concours', 'Côte d’Ivoire', cible.type === 'module' ? cible.matiere : cible.sigle].filter(Boolean),
      categoryId: '27', // Éducation
      defaultLanguage: cible.langue,
      defaultAudioLanguage: cible.langue,
    },
    status: {
      privacyStatus: 'public',
      embeddable: true, // indispensable : lecture dans l'application via le lecteur intégré
      selfDeclaredMadeForKids: false,
      license: 'youtube',
      publicStatsViewable: true,
    },
  };
};

module.exports = { resolveCible, toutesLesCibles, metadonnees, marqueur, sha256, empreinte, loadPack };
