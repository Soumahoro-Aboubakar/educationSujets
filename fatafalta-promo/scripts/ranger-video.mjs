#!/usr/bin/env node
/*
 * Range une vidéo promotionnelle du jour dans videos/AAAA-MM/AAAA-MM-JJ/NN-sujet/.
 *
 *   npm run ranger -- --sujet "rentree-bac"                       # rendu Remotion : copie out/
 *   npm run ranger -- --sujet "infas-concours" --fichier ~/Downloads/clip.mp4 [--fichier …]
 *   npm run ranger -- --sujet "ensea" --date 2026-11-20 --outil "Sora" --format vertical
 *
 * Options :
 *   --sujet    obligatoire : thème court (converti en minuscules-sans-accents).
 *   --fichier  fichier(s) à ranger (vidéo, sous-titres, voix, miniature). Sans --fichier : le
 *              dernier rendu Remotion (out/*.mp4, out/subtitles.srt, out/voiceover.wav).
 *   --date     jour de la vidéo (AAAA-MM-JJ). Par défaut : aujourd'hui (heure locale).
 *   --outil    outil d'IA ou de montage utilisé (noté dans la fiche). Défaut : Remotion.
 *   --format   horizontal | vertical | carre, pour un fichier externe dont le nom ne le dit pas.
 *   --deplacer déplace au lieu de copier (libère la place dans out/ ou Téléchargements).
 *
 * Les fichiers sont renommés « AAAA-MM-JJ_sujet_format.ext » : le nom reste parlant une fois
 * envoyé seul (WhatsApp, Drive, plateforme). Une fiche.md est créée à partir de _modele-fiche.md.
 * Aucun fichier existant n'est jamais écrasé.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS = path.join(ROOT, 'videos');

const args = { fichier: [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const key = argv[i].replace(/^--/, '');
  if (key === 'deplacer') { args.deplacer = true; continue; }
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) { console.error(`Valeur manquante pour --${key}`); process.exit(1); }
  if (key === 'fichier') args.fichier.push(value); else args[key] = value;
  i += 1;
}

const slug = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const sujet = slug(args.sujet);
if (!sujet) { console.error('Indique le thème : --sujet "rentree-bac"'); process.exit(1); }

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const date = args.date || today();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) { console.error(`Date invalide : ${date} (attendu AAAA-MM-JJ)`); process.exit(1); }

// Fichiers à ranger.
let sources = args.fichier.map((f) => path.resolve(f.replace(/^~(?=\/)/, process.env.HOME)));
if (!sources.length) {
  const out = path.join(ROOT, 'out');
  sources = ['fatafalta-promo-1080p.mp4', 'fatafalta-promo-vertical.mp4', 'subtitles.srt', 'voiceover.wav']
    .map((f) => path.join(out, f)).filter((f) => fs.existsSync(f));
  if (!sources.length) { console.error('Rien dans out/ : lance le rendu, ou indique --fichier.'); process.exit(1); }
}
const missing = sources.filter((f) => !fs.existsSync(f));
if (missing.length) { console.error(`Introuvable : ${missing.join(', ')}`); process.exit(1); }

// Nom normalisé selon le type et le format.
const probe = (file) => {
  try {
    const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim().split(',').map(Number);
    return w && h ? { w, h } : null;
  } catch { return null; }
};
const duration = (file) => {
  try { return Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }))); } catch { return null; }
};
const VIDEO = /\.(mp4|mov|webm|m4v)$/i;
const roleOf = (file) => {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file).toLowerCase();
  if (VIDEO.test(ext)) {
    const size = probe(file);
    let format = args.format || (/vertical|9x16|reel|short|tiktok/.test(base) ? 'vertical' : /carre|square|1x1/.test(base) ? 'carre' : null);
    if (!format && size) format = size.h > size.w ? 'vertical' : size.h === size.w ? 'carre' : 'horizontal';
    format = format || 'horizontal';
    const label = size ? `${format}-${size.w}x${size.h}` : format;
    return { name: label, ext, size, kind: 'video' };
  }
  if (ext === '.srt' || ext === '.vtt') return { name: 'sous-titres', ext, kind: 'texte' };
  if (['.wav', '.mp3', '.m4a', '.aac'].includes(ext)) return { name: /music|musique|bed/.test(base) ? 'musique' : 'voix-off', ext, kind: 'audio' };
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return { name: 'miniature', ext, kind: 'image' };
  return { name: slug(path.basename(file, ext)) || 'fichier', ext, kind: 'autre' };
};

// Dossier : videos/AAAA-MM/AAAA-MM-JJ/NN-sujet (NN : ordre de la vidéo dans la journée).
const dayDir = path.join(VIDEOS, date.slice(0, 7), date);
fs.mkdirSync(dayDir, { recursive: true });
const existing = fs.readdirSync(dayDir).filter((d) => /^\d{2}-/.test(d));
const same = existing.find((d) => d.slice(3) === sujet);
const folder = same || `${String(existing.length + 1).padStart(2, '0')}-${sujet}`;
const target = path.join(dayDir, folder);
fs.mkdirSync(target, { recursive: true });

const placed = [];
const used = new Set(fs.readdirSync(target));
for (const src of sources) {
  const role = roleOf(src);
  let name = `${date}_${sujet}_${role.name}${role.ext}`;
  for (let n = 2; used.has(name); n += 1) name = `${date}_${sujet}_${role.name}-${n}${role.ext}`;
  used.add(name);
  const dest = path.join(target, name);
  if (args.deplacer) fs.renameSync(src, dest); else fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
  placed.push({ name, role, seconds: role.kind === 'video' ? duration(dest) : null });
}

// Fiche de la vidéo (créée une seule fois, complétée ensuite à la main).
const fiche = path.join(target, 'fiche.md');
if (!fs.existsSync(fiche)) {
  const model = fs.readFileSync(path.join(VIDEOS, '_modele-fiche.md'), 'utf8');
  const lines = placed.map((p) => `| \`${p.name}\` | ${p.role.kind === 'video' ? `${p.role.name}${p.seconds ? `, ${p.seconds} s` : ''}` : p.role.name} |`).join('\n');
  fs.writeFileSync(fiche, model
    .replaceAll('{{DATE}}', date)
    .replaceAll('{{SUJET}}', args.sujet)
    .replace('{{OUTIL}}', args.outil || (args.fichier.length ? 'à préciser' : 'Remotion (rendu du projet fatafalta-promo)'))
    .replace('{{FICHIERS}}', lines));
}

const rel = path.relative(ROOT, target);
console.log(`Rangé dans ${rel}/`);
placed.forEach((p) => console.log(`  ${p.name}`));
const tooLong = placed.filter((p) => p.seconds && p.seconds > 120);
if (tooLong.length) console.log(`\n⚠ Plus de 2 minutes : ${tooLong.map((p) => p.name).join(', ')} (règle : 2 min au plus).`);
console.log(`\nÀ faire : compléter ${rel}/fiche.md (objectif, plateformes, contrôle, publication).`);
