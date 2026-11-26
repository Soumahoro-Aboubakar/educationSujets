// Assemble la voix off seule, calée sur la timeline de la vidéo : out/voiceover.wav (48 kHz, stéréo).
import fs from 'fs'; import { execFileSync } from 'child_process';
const voices = JSON.parse(fs.readFileSync(new URL('../src/voice-timings.json', import.meta.url)));
const PRE = [0.25, 0.45, 0.4, 0.4, 0.35, 0.35, 0.5, 0.4], POST = [0.25, 0.3, 0.3, 0.25, 0.3, 0.35, 0.3, 2.9]; // = src/timeline.ts
const FPS = 30; let t = 0; const delays = [];
voices.forEach((v, i) => { const start = Math.round(t * FPS); delays.push(Math.round((start + Math.round(PRE[i] * FPS)) / FPS * 1000)); t += PRE[i] + v.duration + POST[i]; });
const total = Math.round(t * FPS) / FPS;
const args = ['-y', '-loglevel', 'error'];
voices.forEach((v) => args.push('-i', `public/${v.file}`));
const f = voices.map((_, i) => `[${i}]aresample=48000,adelay=${delays[i]}|${delays[i]}[a${i}]`).join(';') + ';' + voices.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${voices.length}:normalize=0,apad,atrim=0:${total}[out]`;
args.push('-filter_complex', f, '-map', '[out]', '-ac', '2', '-ar', '48000', 'out/voiceover.wav');
execFileSync('ffmpeg', args, { stdio: 'inherit' }); console.log('voiceover.wav', total, 's');
