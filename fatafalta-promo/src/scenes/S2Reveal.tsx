import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, pop, useVertical, LogoMark, Browser, Phone, Paper, Glow, inOut } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

const ITEMS = ['Anciens sujets', 'Corrigés', 'Leçons en vidéo', 'Exercices corrigés', 'Concours blancs', 'Progression'];

/** Révélation : tout converge vers le logo, puis le site apparaît. */
export const S2Reveal: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const tD = wordAt(scene, 'decouvre'); const tP = wordAt(scene, 'plateforme');
  const conv = prog(f, tD - 14, tD + 2, inOut);
  const logoS = pop(f, tD, 30, 12);
  const toDevice = prog(f, tP - 4, tP + 22);
  const W = v ? 1080 : 1920, H = v ? 1920 : 1080;
  const cx = W / 2, cy = H / 2;
  return (
    <Paper>
      <Glow x="50%" y="50%" size={v ? 1100 : 1200} opacity={0.35 * logoS} />
      {/* question */}
      <div style={{ position: 'absolute', top: v ? 260 : 150, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink, fontSize: v ? 76 : 76, lineHeight: 1.05,
        opacity: prog(f, 0, 12) * (1 - prog(f, tD - 10, tD)), transform: `translateY(${(1 - prog(f, 0, 14)) * 30}px)` }}>
        Et si tout était réuni<br /><span style={{ color: C.gold }}>au même endroit</span> ?
      </div>
      {/* éléments qui convergent */}
      {ITEMS.map((t, i) => {
        const ang = (i / ITEMS.length) * Math.PI * 2 + 0.4; const r = v ? 360 : 420; const rx = v ? 330 : 620;
        const x = cx + Math.cos(ang) * rx * (1 - conv); const y = cy + 90 + Math.sin(ang) * r * 0.62 * (1 - conv);
        const a = pop(f, 6 + i * 5);
        return <div key={t} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${(0.7 + 0.3 * a) * (1 - conv * 0.7)})`, opacity: Math.min(1, a) * (1 - conv),
          fontFamily: FONT, fontWeight: 700, fontSize: v ? 34 : 30, color: C.ink, background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px 26px', boxShadow: '0 18px 40px -18px rgba(13,27,50,.3)', whiteSpace: 'nowrap' }}>
          <span style={{ color: C.gold, marginRight: 10 }}>●</span>{t}
        </div>;
      })}
      {/* logo */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: interpolate(toDevice, [0, 1], [cy - (v ? 170 : 150), v ? 150 : 70]), display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: Math.min(1, logoS * 2), transform: `scale(${interpolate(toDevice, [0, 1], [1, v ? 0.55 : 0.42]) * (0.6 + 0.4 * logoS)})`, transformOrigin: '50% 0%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
          <LogoMark size={v ? 190 : 190} fold={prog(f, tD + 6, tD + 18)} />
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: v ? 120 : 150, letterSpacing: '-0.045em', color: C.ink, clipPath: `inset(0 ${100 - 100 * prog(f, tD + 4, tD + 20)}% 0 0)` }}>Fatafalta</div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: v ? 40 : 40, color: C.inkSoft, marginTop: 30, opacity: prog(f, tD + 14, tD + 26) * (1 - toDevice), textAlign: 'center', padding: '0 60px' }}>
          Concours et examens · <span style={{ color: C.gold }}>Côte d’Ivoire</span>
        </div>
      </div>
      {/* le vrai site */}
      <div style={{ position: 'absolute', left: '50%', top: v ? 470 : 250, transform: `translateX(-50%) translateY(${(1 - toDevice) * 700}px) perspective(1800px) rotateX(${(1 - toDevice) * 22}deg)`, opacity: toDevice }}>
        {v ? <Phone src="captures/ios/home.png" height={960} cssWidth={402} />
           : <Browser src="captures/web/home-hero.png" width={1380} url="fatafalta.com" crop={[0, 760]} zoom={interpolate(f, [tP, scene.frames], [1, 1.06])} origin="30% 40%" />}
      </div>
    </Paper>
  );
};
