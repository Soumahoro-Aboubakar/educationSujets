import timings from './voice-timings.json';
export const FPS = 30;
export type Word = { w: string; start: number; end: number };
export type Voice = { id: number; text: string; file: string; duration: number; words: Word[] };
export const VOICES = timings as Voice[];
// Respiration avant la voix de chaque scène et après (secondes). La scène 1 démarre presque à 0 (accroche).
const PRE = [0.25, 0.45, 0.4, 0.4, 0.35, 0.35, 0.5, 0.4];
const POST = [0.25, 0.3, 0.3, 0.25, 0.3, 0.35, 0.3, 2.9];
export const OVERLAP = 10; // images de fondu enchaîné entre deux scènes
export type SceneT = { i: number; start: number; frames: number; voiceAt: number; voice: Voice };
export const SCENES: SceneT[] = (() => {
  let t = 0; const out: SceneT[] = [];
  VOICES.forEach((v, i) => {
    const len = PRE[i] + v.duration + POST[i];
    const start = Math.round(t * FPS);
    out.push({ i, start, frames: Math.round((t + len) * FPS) - start, voiceAt: start + Math.round(PRE[i] * FPS), voice: v });
    t += len;
  });
  return out;
})();
export const TOTAL = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].frames;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]/g, '');
/** Image (relative au début de la scène) où le mot `w` est prononcé (n-ième occurrence). */
export const wordAt = (scene: SceneT, w: string, nth = 0): number => {
  const target = norm(w); let seen = 0;
  for (const x of scene.voice.words) if (norm(x.w).startsWith(target)) { if (seen === nth) return scene.voiceAt - scene.start + Math.round(x.start * FPS); seen++; }
  throw new Error(`mot introuvable « ${w} » scène ${scene.i + 1}`);
};
