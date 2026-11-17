#!/usr/bin/env node
/**
 * Enregistre les décisions d'un lot (data/prep/videos-externes/decisions/<MODULE>.json) dans
 * selections.json, après vérification YouTube de chaque vidéo retenue.
 *
 *   node scripts/video/externe/decider.js MATH-LNEXP [...]
 *
 * Format d'une décision : { code, youtubeId | null, couverture: exacte|partielle, justification,
 *   source: "d'où vient le candidat", recherchePar: claude|chatgpt, ecartes?: [{ youtubeId, motif }] }
 * youtubeId null = aucune vidéo satisfaisante (statut « a_rechercher », trace conservée).
 *
 * Règles : une vidéo refusée par la vérification (introuvable, intégration interdite, > 15 min…)
 * n'est jamais retenue ; une leçon déjà « validee » n'est remplacée qu'avec "remplacer": true.
 */
const fs = require('fs');
const path = require('path');
const { DIR, lireSelections, ecrireSelections } = require('./lib');
const { verifierListe } = require('./verifier');

const pack = require('../../../data/prep/build/pack.json');

const codesLecons = new Map(Object.values(pack.modules).flatMap((m) => m.lecons.map((l) => [l.code, m.code])));

const main = async () => {
  const selections = lireSelections();
  let erreurs = 0;
  for (const mod of process.argv.slice(2)) {
    const fichier = path.join(DIR, 'decisions', `${mod}.json`);
    const decisions = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    const verif = await verifierListe(decisions.filter((d) => d.youtubeId).map((d) => d.youtubeId), { log: () => {} });
    const vus = new Set();
    for (const d of decisions) {
      const ko = (m) => { erreurs += 1; console.error(`✗ ${d.code} : ${m}`); };
      if (codesLecons.get(d.code) !== mod) { ko(`leçon inconnue dans le module ${mod}`); continue; }
      if (d.youtubeId && vus.has(d.youtubeId)) { ko(`vidéo ${d.youtubeId} déjà retenue pour une autre leçon du module`); continue; }
      const avant = selections[d.code];
      if (avant?.statut === 'validee' && avant.youtubeId !== d.youtubeId && !d.remplacer) { ko(`déjà validée (${avant.youtubeId}) : "remplacer": true + justification pour changer`); continue; }
      const base = { code: d.code, module: mod, justification: d.justification, source: d.source || null, recherchePar: d.recherchePar || 'claude', ecartes: d.ecartes || [], decideLe: new Date().toISOString() };
      if (!d.youtubeId) { selections[d.code] = { ...base, statut: 'a_rechercher' }; console.log(`· ${d.code} : aucune vidéo satisfaisante (à rechercher)`); continue; }
      const v = verif[d.youtubeId];
      if (!v.ok) { ko(`vidéo ${d.youtubeId} refusée : ${v.motifs.join(' ; ')}`); continue; }
      if (v.langueAudio && !v.langueAudio.startsWith('fr') && !d.anglaisAccepte) { ko(`vidéo ${d.youtubeId} en « ${v.langueAudio} » (mettre "anglaisAccepte": true si aucune vidéo française)`); continue; }
      vus.add(d.youtubeId);
      selections[d.code] = {
        ...base, statut: 'validee', youtubeId: v.youtubeId, url: v.url, titre: v.titre, chaine: v.chaine, chaineId: v.chaineId,
        durationSec: v.durationSec, langueAudio: v.langueAudio, couverture: d.couverture, verifieeLe: v.verifieeLe,
      };
      console.log(`✓ ${d.code} : ${v.youtubeId} ${Math.round(v.durationSec / 6) / 10} min — ${v.titre}`);
    }
  }
  ecrireSelections(selections);
  if (erreurs) { console.error(`${erreurs} décision(s) refusée(s)`); process.exitCode = 1; }
};

main();
