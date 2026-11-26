import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
// @ts-ignore module JS partagé avec l'export SRT
import { captionChunks } from '../captions.mjs';
import { SCENES, FPS } from '../timeline';
import { C, FONT } from '../theme';
import { useVertical } from './ui';

type W = { w: string; start: number; end: number };
type Chunk = { words: W[]; start: number; end: number };
/** Sous-titres incrustés, mot actif en or clair (lisibles sans le son, réseaux sociaux). */
export const Captions: React.FC = () => {
  const f = useCurrentFrame(); const v = useVertical();
  const all = useMemo(() => SCENES.flatMap((s) => (captionChunks(s.voice) as Chunk[]).map((c) => ({ ...c, a: s.voiceAt + c.start * FPS, b: s.voiceAt + c.end * FPS, s }))), []);
  const i = all.findIndex((c, k) => f >= c.a - 2 && f < (all[k + 1] && all[k + 1].s === c.s ? all[k + 1].a - 2 : c.b + 10));
  if (i < 0) return null;
  const c = all[i];
  const inP = interpolate(f, [c.a - 2, c.a + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = v ? 54 : 40;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: v ? 300 : 64, display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 60px' }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.25, letterSpacing: '-0.01em', textAlign: 'center', maxWidth: v ? 920 : 1400,
        background: 'rgba(8,18,34,.78)', backdropFilter: 'blur(8px)', color: C.white, borderRadius: size * 0.45, padding: `${size * 0.28}px ${size * 0.55}px`,
        opacity: inP, transform: `translateY(${(1 - inP) * 10}px)`, boxShadow: '0 10px 30px -10px rgba(0,0,0,.5)' }}>
        {c.words.map((w, k) => {
          const t0 = c.s.voiceAt + w.start * FPS; const on = f >= t0 - 1;
          return <span key={k} style={{ color: on ? (f < c.s.voiceAt + w.end * FPS + 3 ? C.goldLight : C.white) : 'rgba(255,255,255,.55)' }}>{w.w}{k < c.words.length - 1 ? ' ' : ''}</span>;
        })}
      </div>
    </div>
  );
};
