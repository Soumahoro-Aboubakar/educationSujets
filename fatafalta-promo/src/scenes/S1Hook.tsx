import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, pop, useVertical, inOut } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

/** Accroche : élève qui révise tard, questions qui claquent dès la première image. */
export const S1Hook: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const chips: [string, string, number?][] = [['BAC', 'bac'], ['BEPC', 'b.e.p.c'], ['CAFOP', 'cafop'], ['INFAS', 'linfass'], ['Grandes écoles', 'grande']];
  const tPasses = wordAt(scene, 'passes');
  const out1 = prog(f, tPasses - 6, tPasses + 8);
  const zoom = interpolate(f, [0, scene.frames], [1.04, 1.16]);
  const punch = interpolate(f, [0, 7], [1.22, 1], { extrapolateRight: 'clamp', easing: inOut });
  const T = v ? 92 : 92;
  const clockA = prog(f, tPasses, tPasses + 12);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: 'hidden' }}>
      <Img src={staticFile('images/etudiant-nuit.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: v ? '36% 50%' : '30% 50%', transform: `scale(${zoom})` }} />
      <AbsoluteFill style={{ background: v ? 'linear-gradient(180deg, rgba(8,18,34,.92) 0%, rgba(8,18,34,.55) 38%, rgba(8,18,34,.15) 60%, rgba(8,18,34,.8) 100%)' : 'linear-gradient(90deg, rgba(8,18,34,.05) 25%, rgba(8,18,34,.78) 58%, rgba(8,18,34,.94) 100%)' }} />
      <div style={{ position: 'absolute', fontFamily: FONT, color: C.white, ...(v ? { left: 70, right: 70, top: 170 } : { left: 1010, right: 90, top: 250 }) }}>
        <div style={{ opacity: 1 - out1, transform: `translateY(${-out1 * 40}px)` }}>
          <div style={{ fontSize: T, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, transform: `scale(${punch})`, transformOrigin: 'left center', opacity: interpolate(f, [0, 4], [0, 1], { extrapolateRight: 'clamp' }) }}>
            Tu prépares<br />un <span style={{ color: C.goldLight }}>concours</span> ?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 44 }}>
            {chips.map(([label, w]) => {
              const at = wordAt(scene, w); const s = pop(f, at - 2);
              return <div key={label} style={{ fontSize: v ? 40 : 34, fontWeight: 700, padding: '12px 26px', borderRadius: 99, border: `2px solid ${C.goldLight}`, color: C.goldLight, background: 'rgba(228,201,151,.08)', opacity: Math.min(1, s * 1.5), transform: `scale(${0.6 + 0.4 * s}) translateY(${(1 - s) * 20}px)` }}>{label}</div>;
            })}
          </div>
        </div>
        <div style={{ position: 'absolute', top: v ? 0 : 20, left: 0, right: 0, opacity: clockA, transform: `translateY(${(1 - clockA) * 40}px)` }}>
          <Clock f={f - tPasses} size={v ? 150 : 130} />
          <div style={{ fontSize: v ? 84 : 80, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginTop: 34 }}>
            Des heures<br />à chercher<br /><span style={{ color: C.goldLight }}>les bons sujets…</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Horloge : les aiguilles tournent vite (le temps qui file). */
const Clock: React.FC<{ f: number; size: number }> = ({ f, size }) => {
  const a = Math.max(0, f) * 14; const h = a / 12;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke={C.goldLight} strokeWidth="5" />
      {[0, 90, 180, 270].map((d) => <line key={d} x1="50" y1="12" x2="50" y2="19" stroke={C.goldLight} strokeWidth="4" strokeLinecap="round" transform={`rotate(${d} 50 50)`} />)}
      <line x1="50" y1="50" x2="50" y2="20" stroke={C.white} strokeWidth="5" strokeLinecap="round" transform={`rotate(${a} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="30" stroke={C.white} strokeWidth="6" strokeLinecap="round" transform={`rotate(${h} 50 50)`} />
      <circle cx="50" cy="50" r="5" fill={C.goldLight} />
    </svg>
  );
};
