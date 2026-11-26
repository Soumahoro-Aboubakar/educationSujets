#!/usr/bin/env node
/**
 * Publie les NOUVEAUX modules et programmes du pack (data/prep/build/pack.json) dans une base où la
 * publication dynamique est déjà active (génération ≥ 1, après scripts/migrations/lot3.js).
 *
 *   node scripts/prep/publierNouveautes.js --uri=mongodb://127.0.0.1:27017/<base>            à blanc
 *   node scripts/prep/publierNouveautes.js --uri=mongodb://127.0.0.1:27017/<base> --apply    publication
 *
 * Garanties :
 *  - à blanc par défaut : rien n'est écrit sans --apply ;
 *  - idempotent : seuls les codes absents de la publication active sont ajoutés ; une seconde
 *    exécution ne publie rien ;
 *  - aucune édition existante n'est écrasée : un module ou programme déjà publié dont le contenu
 *    diffère du pack est seulement signalé (à traiter depuis l'administration) ;
 *  - les programmes sont rattachés à l'organisme et au parcours existants du catalogue
 *    (même règle que lot3) ; un rattachement introuvable ou ambigu interrompt tout ;
 *  - une seule publication atomique (contrôle de génération) : en cas d'erreur, la publication
 *    active reste inchangée ;
 *  - base distante refusée, sauf --autoriser-distant passé explicitement par le propriétaire.
 */
const path = require('path');
const mongoose = require('mongoose');
const service = require('../../services/prep/publicationService');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');

const PACK = path.resolve(__dirname, '../../data/prep/build/pack.json');
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const key = (r) => `${r.kind}:${r.code}`;

const rattacher = async (prog) => {
  const orgs = await Organisme.find({ nom: { $in: prog.organisme.recherche.map((r) => new RegExp(`^${escape(r)}(\\b|\\s|-|$)`, 'i')) }, status: { $nin: ['draft', 'archived'] } }).lean();
  if (orgs.length !== 1) return { erreur: `${prog.code} : ${orgs.length} organisme(s) trouvé(s) pour ${prog.organisme.recherche.join(', ')}` };
  const parcours = await ParcoursType.findOne({ organismeId: orgs[0]._id, nom: prog.parcoursType, status: { $nin: ['draft', 'archived'] } }).lean();
  if (!parcours) return { erreur: `${prog.code} : parcours « ${prog.parcoursType} » introuvable pour ${orgs[0].nom}` };
  return { organismeId: String(orgs[0]._id), parcoursTypeId: String(parcours._id), organisme: orgs[0].nom };
};

const run = async ({ apply = false, pack = require(PACK) } = {}) => {
  const active = await service.current();
  if (!active.generation) {
    return { dryRun: !apply, generation: 0, message: 'Publication dynamique inactive : l’API sert directement le pack fichier, rien à publier.' };
  }
  const publies = new Map(active.entries.map((e) => [key(e), e]));
  const ajouts = [];
  const differents = [];
  const erreurs = [];
  for (const mod of Object.values(pack.modules)) {
    const k = `module:${mod.code}`;
    if (!publies.has(k)) ajouts.push({ kind: 'module', code: mod.code, payload: mod });
    else if (publies.get(k).hash !== service.hash(mod)) differents.push(k);
  }
  for (const prog of pack.programmes) {
    const k = `programme:${prog.code}`;
    if (publies.has(k)) continue; // les programmes publiés portent des rattachements propres à la base
    const lien = await rattacher(prog);
    if (lien.erreur) { erreurs.push(lien.erreur); continue; }
    ajouts.push({ kind: 'programme', code: prog.code, payload: { ...prog, organismeId: lien.organismeId, parcoursTypeId: lien.parcoursTypeId }, organisme: lien.organisme });
  }
  const resume = {
    dryRun: !apply,
    generation: active.generation,
    ajouts: ajouts.map((a) => key(a) + (a.organisme ? ` → ${a.organisme}` : '')),
    differentsNonModifies: differents,
    erreurs,
  };
  if (erreurs.length) throw Object.assign(new Error(`Rattachement impossible :\n  ${erreurs.join('\n  ')}`), { resume });
  if (!ajouts.length || !apply) return resume;

  const revisions = [];
  for (const item of ajouts) {
    const existant = await service.latest(item.kind, item.code);
    if (existant && existant.hash === service.hash(item.payload) && existant.status !== 'archived') revisions.push(existant);
    else if (existant) throw new Error(`${key(item)} : un brouillon différent existe déjà dans l’administration. Rien n’a été publié.`);
    else revisions.push(await service.saveDraft(item, true));
  }
  const publie = await service.publish({ expectedGeneration: active.generation, revisions: revisions.map(({ kind, code, revision }) => ({ kind, code, revision })) }, null);
  return { ...resume, generation: publie.generation };
};

const assertUri = (uri, distant) => {
  if (!uri) throw new Error('--uri=mongodb://… obligatoire (le script ne lit aucun fichier .env).');
  if (!distant && !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri)) throw new Error('Base distante refusée. Ajouter --autoriser-distant uniquement sur décision du propriétaire.');
};

const main = async () => {
  const args = process.argv.slice(2);
  const uri = args.find((v) => v.startsWith('--uri='))?.slice(6);
  assertUri(uri, args.includes('--autoriser-distant'));
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  try { console.log(JSON.stringify(await run({ apply: args.includes('--apply') }), null, 2)); }
  catch (error) { if (error.resume) console.log(JSON.stringify(error.resume, null, 2)); throw error; }
  finally { await mongoose.disconnect(); }
};
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { run, assertUri };
