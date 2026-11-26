import React from 'react';
import { useCurrentFrame, Img, staticFile, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, pop, useVertical, Browser, Glow } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';
import { AbsoluteFill } from 'remotion';

/** Concours blanc : vrai écran (24 questions, 40 min) + chronomètre qui démarre. */
export const S6Blanc: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const tChrono = wordAt(scene, 'chronometres'); const tVingt = wordAt(scene, 'vingt');
  const run = Math.max(0, f - tChrono);
  const secs = 40 * 60 - Math.floor(run / 30 * 6); // le temps file (accéléré ×6)
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'); const ss = String(secs % 60).padStart(2, '0');
  const ring = Math.min(1, run / 140);
  const enter = prog(f, 0, 18);
  const note = pop(f, tVingt - 2);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Glow x={v ? '50%' : '75%'} y={v ? '28%' : '45%'} size={900} opacity={0.25} />
      <div style={{ position: 'absolute', fontFamily: FONT, color: C.white, ...(v ? { left: 70, right: 70, top: 120 } : { left: 120, top: 120 }), opacity: enter }}>
        <div style={{ fontSize: v ? 84 : 78, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02 }}>Concours blanc<br /><span style={{ color: C.goldLight }}>chronométré.</span></div>
      </div>
      {/* écran réel */}
      <div style={{ position: 'absolute', ...(v ? { left: 60, top: 560 } : { left: 110, top: 330 }), transform: `translateY(${(1 - enter) * 120}px) scale(${interpolate(f, [0, scene.frames], [1, 1.04])})`, transformOrigin: '30% 30%', opacity: enter }}>
        {v ? (
          <div style={{ width: 960, height: 880, borderRadius: 34, overflow: 'hidden', background: C.paper, boxShadow: '0 40px 90px -30px rgba(0,0,0,.6)' }}>
            <Img src={staticFile('captures/mobile/concours-blanc-intro.png')} style={{ width: 960, marginTop: -80 * (960 / 390) }} />
          </div>
        ) : <Browser src="captures/web/concours-blanc-intro.png" width={1180} url="fatafalta.com/preparation/…/concours-blanc" crop={[0, 560]} zoom={1.5} origin="40% 6%" />}
      </div>
      {/* chronomètre */}
      <div style={{ position: 'absolute', ...(v ? { right: 70, top: 120 } : { right: 150, top: 330 }), width: v ? 300 : 400, height: v ? 300 : 400, transform: `scale(${pop(f, tChrono - 6)})` }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,.14)" strokeWidth="5" fill="none" />
          <circle cx="50" cy="50" r="44" stroke={C.goldLight} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={276.5} strokeDashoffset={276.5 * ring * 0.08} transform="rotate(-90 50 50)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: C.white }}>
          <div style={{ fontSize: v ? 62 : 84, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{mm}:{ss}</div>
          <div style={{ fontSize: v ? 22 : 26, color: C.goldLight, fontWeight: 600, marginTop: 4, opacity: note, transform: `scale(${0.7 + 0.3 * note})` }}>Noté sur 20</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
