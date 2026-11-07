#!/usr/bin/env node
/**
 * Dossier de génération d'une vidéo, construit UNIQUEMENT à partir du contenu de la leçon ou du
 * concours présent dans le projet (pack). Aucune vidéo n'est générée ici.
 *
 *   npm run video:brief -- --type lecon --id MATH-LNEXP-L1
 *   npm run video:brief -- --type lecon --id ANG-GRAM-L1 --langue en
 *   npm run video:brief -- --type concours --id ENSEA-AS --stdout
 *
 * Sorties : backend/.video-state/briefs/<type>-<code>-<langue>.json (données) et .md (consigne
 * de génération complète : contenu, plan, glossaire ordonné, visuels suggérés, exigences qualité).
 */
const fs = require('fs');
const path = require('path');
const { resolveCible } = require('../lib/cible');

const CONSIGNES = fs.readFileSync(path.join(__dirname, 'consignes-qualite.md'), 'utf8');
const OUT = path.resolve(__dirname, '../../../.video-state/briefs');

const gras = (texte) => [...String(texte || '').matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
const sansGras = (texte) => String(texte || '').replace(/\*\*([^*]+)\*\*/g, '$1');

const VISUEL_PAR_BLOC = {
  tableau: 'tableau animé ligne par ligne',
  formule: 'formule construite pas à pas',
  exemple: 'scène d’exemple concret, mise en situation',
  piege: 'visuel « erreur / correction » côte à côte',
  aRetenir: 'carte « À retenir » (encadré or)',
  liste: 'liste qui se construit point par point',
  texte: 'schéma ou illustration du propos',
  recap: 'récapitulatif final, points numérotés',
};

/** Termes dans l'ordre de première apparition dans la leçon (termes en gras du cours). */
const glossaireLecon = (lecon) => {
  const vus = new Map();
  const ajouter = (terme, ou) => {
    const t = terme.replace(/[.:;,]+$/, '').trim();
    if (t.length < 3 || t.length > 60 || vus.has(t.toLowerCase())) return;
    vus.set(t.toLowerCase(), { terme: t, premiereApparition: ou });
  };
  lecon.blocs.forEach((b, bi) => {
    const ou = `bloc ${bi + 1}`;
    [b.md, b.texte, ...(b.items || []), ...(b.lignes || []).flat()].forEach((x) => gras(x).forEach((t) => ajouter(t, ou)));
  });
  return [...vus.values()];
};

const briefLecon = (cible) => {
  const { lecon, module: mod } = cible.contenu;
  // Le plan suit les sections (titres) de la leçon ; à défaut, la leçon forme une seule partie.
  const sections = [];
  lecon.blocs.forEach((b) => {
    if (b.type === 'titre' || !sections.length) sections.push({ titre: b.type === 'titre' ? b.texte : lecon.titre, blocs: [] });
    if (b.type !== 'titre') sections[sections.length - 1].blocs.push(b);
  });
  return {
    cible: { type: 'lecon', code: cible.code, langue: cible.langue },
    titre: lecon.titre,
    resume: cible.resume,
    matiere: mod.matiere,
    module: { code: mod.code, titre: mod.titre },
    concours: cible.concours,
    empreinteContenu: cible.empreinte,
    plan: sections.map((sec) => ({
      titre: sec.titre,
      aRetenir: sec.blocs.filter((b) => b.type === 'aRetenir' || b.type === 'recap').flatMap((b) => (b.items ? b.items.map(sansGras) : [sansGras(b.texte)])),
      pieges: sec.blocs.filter((b) => b.type === 'piege').map((b) => sansGras(b.texte)),
      visuels: [...new Set(sec.blocs.map((b) => VISUEL_PAR_BLOC[b.type]).filter(Boolean))],
    })),
    glossaire: glossaireLecon(lecon),
    contenuSource: { titre: lecon.titre, blocs: lecon.blocs.filter((b) => b.type !== 'miniQuestion') },
  };
};

const briefConcours = (cible) => {
  const p = cible.contenu;
  return {
    cible: { type: 'concours', code: cible.code, langue: 'fr' },
    titre: `${p.organisme.sigle} — ${p.titre}`,
    resume: p.description,
    empreinteContenu: cible.empreinte,
    plan: [
      { titre: 'Le concours et le public visé', contenu: p.description },
      { titre: 'Les épreuves', contenu: p.epreuves.map((e) => `${e.nom} — ${[e.duree, e.coefficient ? `coef. ${e.coefficient}` : null].filter(Boolean).join(', ')}${e.note ? ` (${e.note})` : ''}`) },
      { titre: 'Les matières à préparer', contenu: p.matieres.map((m) => `${m.nom} : ${m.modules.map((x) => x.titre || x.code).join(', ')}`) },
      { titre: 'Se préparer avec Fatafalta', contenu: 'Leçons, exercices par niveaux, concours blanc, anciens sujets.' },
    ],
    avertissements: [p.noteSources, p.fiabilite !== 'officielle' ? 'Matières déduites des anciens sujets : à présenter comme indicatives.' : null].filter(Boolean),
    sources: p.sources,
    glossaire: [],
  };
};

const markdown = (b) => [
  `# Dossier de génération — ${b.titre} (${b.cible.type} ${b.cible.code}, ${b.cible.langue})`,
  '',
  `Empreinte du contenu : ${b.empreinteContenu}`,
  '',
  '## Mission',
  `Produire une vidéo ${b.cible.type === 'lecon' ? `d’explication de cette leçon (module « ${b.module.titre} »), affichée en tête de la leçon` : 'de présentation de ce concours'} pour l’application Fatafalta, en ${b.cible.langue === 'fr' ? 'français' : `langue « ${b.cible.langue} »`}.`,
  'Produire d’abord le **storyboard** (format : scripts/video/generation/storyboard.js), le faire valider par `verifierStoryboard`, puis seulement le rendu.',
  '',
  '## Plan issu du contenu',
  ...b.plan.flatMap((p, i) => [`### ${i + 1}. ${p.titre}`, ...[].concat(p.sections || [], p.contenu || []).map((x) => `- ${x}`), ...(p.aRetenir || []).map((x) => `- À retenir : ${x}`), ...(p.pieges || []).map((x) => `- Piège : ${x}`), ...(p.visuels?.length ? [`- Visuels suggérés : ${p.visuels.join(' ; ')}`] : []), '']),
  ...(b.glossaire.length ? ['## Glossaire ordonné (termes en gras du cours, dans l’ordre d’apparition)', 'Chaque notion technique de cette liste est définie AVANT sa première utilisation ; les simples exemples (formes verbales, mots courants) peuvent être ignorés.', ...b.glossaire.map((g, i) => `${i + 1}. ${g.terme} (première apparition : ${g.premiereApparition})`), ''] : []),
  ...(b.avertissements?.length ? ['## Avertissements', ...b.avertissements.map((a) => `- ${a}`), ''] : []),
  CONSIGNES,
].join('\n');

const construireBrief = (opts) => {
  const cible = resolveCible(opts);
  const brief = cible.type === 'lecon' ? briefLecon(cible) : briefConcours(cible);
  return { brief, markdown: markdown(brief) };
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  try {
    const opts = { type: val('--type'), id: val('--id'), langue: val('--langue', 'fr') };
    if (!['lecon', 'concours'].includes(opts.type) || !opts.id) throw new Error('Usage : --type lecon|concours --id <code> [--langue en] [--stdout]');
    const { brief, markdown: md } = construireBrief(opts);
    if (args.includes('--stdout')) { process.stdout.write(md); } else {
      fs.mkdirSync(OUT, { recursive: true });
      const base = path.join(OUT, `${opts.type}-${opts.id}-${opts.langue}`);
      fs.writeFileSync(`${base}.json`, `${JSON.stringify(brief, null, 2)}\n`);
      fs.writeFileSync(`${base}.md`, md);
      console.log(`✓ Dossier de génération : ${base}.md (+ .json) — aucune vidéo générée.`);
    }
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { construireBrief, glossaireLecon };
