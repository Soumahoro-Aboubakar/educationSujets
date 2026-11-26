// Exporte les sous-titres (mêmes segments que la vidéo) au format SRT : out/subtitles.srt
import fs from 'fs';
import { captionChunks } from '../src/captions.mjs';
const voices = JSON.parse(fs.readFileSync(new URL('../src/voice-timings.json', import.meta.url)));
const PRE = [0.25, 0.45, 0.4, 0.4, 0.35, 0.35, 0.5, 0.4], POST = [0.25, 0.3, 0.3, 0.25, 0.3, 0.35, 0.3, 2.9]; // = src/timeline.ts
const FPS = 30; let t = 0; const cues = [];
voices.forEach((v, i) => {
  const start = Math.round(t * FPS) / FPS; const voiceAt = start + Math.round(PRE[i] * FPS) / FPS;
  captionChunks(v).forEach((c) => cues.push({ a: voiceAt + c.start, b: voiceAt + c.end + 0.15, text: c.words.map((w) => w.w).join(' ') }));
  t += PRE[i] + v.duration + POST[i];
});
for (let i = 0; i < cues.length - 1; i++) cues[i].b = Math.min(cues[i].b, cues[i + 1].a - 0.02);
const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.text.replace(/ /g, ' ')}\n`).join('\n');
fs.mkdirSync('out', { recursive: true }); fs.writeFileSync('out/subtitles.srt', srt); console.log(cues.length, 'sous-titres');
