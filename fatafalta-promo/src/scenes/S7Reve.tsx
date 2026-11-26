import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, useVertical } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

/** Émotion : un rêve, un métier, un avenir — lumière dorée sur Abidjan. */
export const S7Reve: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const words: [string, string][] = [['Un rêve.', 'reve'], ['Un métier.', 'metier'], ['Un avenir.', 'avenir']];
  const tC = wordAt(scene, 'chaque', 1);
  const outW = prog(f, tC - 6, tC + 10);
  const push = interpolate(f, [0, scene.frames], [1.02, 1.12]);
  return (
    <AbsoluteFill style={{ background: C.night, overflow: 'hidden' }}>
      <Img src={staticFile('images/avenir.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: v ? '22% 50%' : '50% 50%', transform: `scale(${push})`, transformOrigin: v ? '25% 40%' : '30% 40%' }} />
      <AbsoluteFill style={{ background: v ? 'linear-gradient(180deg, rgba(8,18,34,.0) 30%, rgba(8,18,34,.75) 75%)' : 'linear-gradient(90deg, rgba(8,18,34,0) 35%, rgba(8,18,34,.55) 75%)' }} />
      <div style={{ position: 'absolute', fontFamily: FONT, color: C.white, ...(v ? { left: 70, right: 70, top: 1000 } : { left: 1080, right: 80, top: 260 }) }}>
        <div style={{ opacity: 1 - outW, transform: `translateY(${-outW * 30}px)` }}>
          {words.map(([t, w]) => { const at = wordAt(scene, w); const p = prog(f, at - 3, at + 12); return (
            <div key={t} style={{ fontSize: v ? 110 : 104, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.04, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - p) * 8}px)`, textShadow: '0 4px 30px rgba(0,0,0,.35)' }}>
              {t.split(' ')[0]} <span style={{ color: w === 'avenir' ? C.goldLight : C.white }}>{t.split(' ')[1]}</span>
            </div>); })}
        </div>
        <div style={{ position: 'absolute', top: v ? 40 : 60, left: 0, right: 0, opacity: outW, transform: `translateY(${(1 - outW) * 30}px)`, fontSize: v ? 76 : 72, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.06, textShadow: '0 4px 30px rgba(0,0,0,.35)' }}>
          Chaque jour<br />te rapproche<br /><span style={{ color: C.goldLight }}>de ton objectif.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
