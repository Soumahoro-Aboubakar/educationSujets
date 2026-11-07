/**
 * Options de la ligne de commande de scripts/video/publish.js.
 * Erreur explicite (et aucune action) dès qu'une option est inconnue ou incohérente.
 */
const USAGE = `
Publication d'une vidéo explicative (leçon) ou de présentation (concours) — EN LOCAL UNIQUEMENT.

  node scripts/video/publish.js --type lecon    --id MATH-LNEXP-L1 --fichier ~/videos/math-lnexp-l1.mp4
  node scripts/video/publish.js --type concours --id ENSEA-AS      --fichier ~/videos/ensea-as.mp4
  node scripts/video/publish.js --type lecon    --id ANG-GRAM-L1 --langue en --fichier …

Options
  --type lecon|concours    cible de la vidéo (obligatoire, sauf --etat)
  --id <code>              code de la leçon (ex. MATH-LNEXP-L1) ou du concours (programme) dans le pack
  --langue fr|en…          version du cours (défaut : fr ; autre valeur : leçon d'un cours de langue)
  --fichier <mp4>          vidéo à envoyer (étape « génération » : aucun générateur branché pour l'instant)
  --titre "<titre>"        titre YouTube (défaut : construit depuis le contenu)
  --dry-run                lit tout (pack, fichier, YouTube, base), n'envoie rien, n'écrit rien
  --remplacer              autorise le remplacement d'une vidéo déjà enregistrée pour cette cible
  --masquer                retire la vidéo de l'application (statut « hidden ») sans la supprimer de YouTube
  --etat                   liste les leçons et concours avec ou sans vidéo en production (lecture seule)
  --confirmer <code>       confirmation non interactive (doit être exactement le code de la cible)
  --attente <minutes>      attente maximale du traitement YouTube (défaut : 20)
  --env-video <fichier>    défaut : backend/.env.video.local
  --env-production <fich.> défaut : backend/.env.production.local
`;

const FLAGS = new Set(['--dry-run', '--remplacer', '--masquer', '--etat', '--aide', '--help']);
const VALUES = new Set(['--type', '--id', '--langue', '--fichier', '--titre', '--confirmer', '--attente', '--env-video', '--env-production']);

const parseArgs = (argv) => {
  const opts = { dryRun: false, remplacer: false, masquer: false, etat: false, langue: 'fr', attenteMinutes: 20 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (FLAGS.has(arg)) {
      if (arg === '--aide' || arg === '--help') opts.aide = true;
      if (arg === '--dry-run') opts.dryRun = true;
      if (arg === '--remplacer') opts.remplacer = true;
      if (arg === '--masquer') opts.masquer = true;
      if (arg === '--etat') opts.etat = true;
    } else if (VALUES.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} attend une valeur`);
      i += 1;
      if (arg === '--type') opts.type = value;
      if (arg === '--id') opts.id = value.trim();
      if (arg === '--langue') opts.langue = value.trim().toLowerCase();
      if (arg === '--fichier') opts.fichier = value;
      if (arg === '--titre') opts.titre = value.trim();
      if (arg === '--confirmer') opts.confirmer = value.trim();
      if (arg === '--attente') opts.attenteMinutes = Number(value);
      if (arg === '--env-video') opts.envVideo = value;
      if (arg === '--env-production') opts.envProduction = value;
    } else {
      throw new Error(`option inconnue : ${arg}`);
    }
  }
  if (opts.aide || opts.etat) return opts;
  if (opts.type === 'module') throw new Error('les vidéos sont désormais faites par leçon : --type lecon --id <code de la leçon> (ex. MATH-LNEXP-L1)');
  if (!['lecon', 'concours'].includes(opts.type)) throw new Error('--type lecon|concours est obligatoire');
  if (!opts.id || !/^[A-Z0-9][A-Z0-9-]{1,59}$/i.test(opts.id)) throw new Error('--id <code> est obligatoire (ex. MATH-LNEXP-L1, ENSEA-AS)');
  if (!/^[a-z]{2}$/.test(opts.langue)) throw new Error('--langue attend un code à deux lettres (fr, en…)');
  if (opts.type === 'concours' && opts.langue !== 'fr') throw new Error('un concours n’a qu’une version (fr)');
  if (!(opts.attenteMinutes > 0)) throw new Error('--attente attend un nombre de minutes > 0');
  if (opts.masquer && (opts.fichier || opts.remplacer)) throw new Error('--masquer ne se combine ni avec --fichier ni avec --remplacer');
  return opts;
};

module.exports = { parseArgs, USAGE };
