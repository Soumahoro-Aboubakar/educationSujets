const crypto = require('crypto');
const path = require('path');
const core = require('../../../services/prep/shared/prepCore');

/**
 * Résolution de la cible d'une vidéo dans le pack de contenu (data/prep/build/pack.json) :
 * la leçon (d'un module publié) ou le concours doit exister, sinon aucune vidéo ne lui est rattachée.
 * Une vidéo par leçon (décision du 2026-11-07), plus une vidéo de présentation par concours.
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

const resolveLecon = (pack, code, langue) => {
  const mod = Object.values(pack.modules).find((m) => m.lecons.some((l) => l.code === code));
  if (!mod) throw new Error(`Leçon ${code} introuvable dans le pack (codes : MATH-LNEXP-L1, ANG-GRAM-L2… ; npm run prep:pack ?)`);
  if (!mod.publie) throw new Error(`Leçon ${code} : module ${mod.code} non publié, aucune vidéo ne peut lui être rattachée`);
  const versions = core.moduleVersions(mod);
  if (!versions.includes(langue)) throw new Error(`Leçon ${code} : version « ${langue} » inexistante (versions : ${versions.join(', ')})`);
  const v = core.moduleVersion(mod, langue);
  const index = v.lecons.findIndex((l) => l.code === code);
  const lecon = v.lecons[index];
  const programmes = pack.programmes.filter((p) => p.matieres.some((m) => m.modules.some((x) => x.code === mod.code && x.publie)));
  return {
    type: 'lecon', code, langue, contentRevision: mod.revision || null, contentGeneration: pack.generation || null, titre: lecon.titre, matiere: v.matiere,
    resume: `Leçon ${index + 1} sur ${v.lecons.length} du module « ${v.titre} » (${v.matiere}).`,
    retenir: (lecon.blocs.find((b) => b.type === 'recap')?.items || []).map((x) => String(x).replace(/\*\*/g, '')),
    module: { code: mod.code, titre: v.titre, numero: index + 1, total: v.lecons.length },
    concours: programmes.map((p) => `${p.organisme.sigle} ${p.titre}`),
    empreinte: empreinte({ titre: lecon.titre, blocs: lecon.blocs }),
    contenu: { lecon, module: v, index },
  };
};

const resolveConcours = (pack, code) => {
  const prog = pack.programmes.find((p) => p.code === code);
  if (!prog) throw new Error(`Concours (programme) ${code} introuvable dans le pack`);
  return {
    type: 'concours', code, langue: 'fr', contentRevision: prog.revision || null, contentGeneration: pack.generation || null, titre: prog.titre, resume: prog.description, sigle: prog.organisme.sigle,
    empreinte: empreinte({ titre: prog.titre, description: prog.description, epreuves: prog.epreuves, matieres: prog.matieres }),
    contenu: prog,
  };
};

const resolveCible = ({ type, id, langue = 'fr' }, pack = loadPack()) => {
  if (type === 'lecon') return resolveLecon(pack, id, langue);
  if (type === 'concours') return resolveConcours(pack, id);
  throw new Error(`type de cible inconnu : ${type} (lecon | concours)`);
};

/** Toutes les cibles possibles (pour --etat) : chaque concours, chaque leçon dans chaque version. */
const toutesLesCibles = (pack = loadPack()) => [
  ...pack.programmes.map((p) => ({ type: 'concours', code: p.code, langue: 'fr' })),
  ...Object.values(pack.modules).flatMap((m) => core.moduleVersions(m).flatMap((langue) => m.lecons.map((l) => ({ type: 'lecon', code: l.code, langue })))),
].map((c) => {
  const r = resolveCible({ type: c.type, id: c.code, langue: c.langue }, pack);
  return { ...c, titre: r.titre, empreinte: r.empreinte };
});

/** Métadonnées YouTube (titre ≤ 100 caractères, description ≤ 5000). */
const metadonnees = (cible, { titre, fichierSha256 }) => {
  const defaut = cible.type === 'lecon'
    ? `${cible.titre} — ${cible.module.titre} | Fatafalta`
    : `Concours ${cible.sigle} — ${cible.titre} : présentation | Fatafalta`;
  const lignes = [
    cible.resume,
    cible.type === 'lecon' && cible.retenir.length ? `\nÀ retenir :\n${cible.retenir.map((r) => `• ${r}`).join('\n')}` : null,
    '',
    cible.type === 'lecon' && cible.concours.length ? `Préparation aux concours : ${cible.concours.join(' · ')}.` : null,
    cible.langue !== 'fr' ? `Version en ${LANGUES[cible.langue] || cible.langue} du cours.` : null,
    `Cours, exercices corrigés et anciens sujets sur Fatafalta : ${SITE}`,
    '',
    marqueur(cible, fichierSha256),
  ].filter((l) => l !== null);
  return {
    snippet: {
      title: (titre || defaut).slice(0, 100),
      description: lignes.join('\n').slice(0, 5000),
      tags: ['Fatafalta', 'concours', 'Côte d’Ivoire', cible.type === 'lecon' ? cible.matiere : cible.sigle].filter(Boolean),
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
