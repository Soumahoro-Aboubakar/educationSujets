import React from 'react';
import { useCurrentFrame, interpolate, Img, staticFile } from 'remotion';
import { C, FONT } from '../theme';
import { prog, useVertical, Phone, Paper, Glow, Title, inOut } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

const PLAY = { x: 195, y: 328 }; // bouton lecture de la vidéo, px CSS dans lecon-full.png

/** Leçon : la vidéo se lance, puis on fait défiler le cours écrit pour qui préfère lire. */
export const S4Lecon: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const tLecon = wordAt(scene, 'lecon'); const tVid = wordAt(scene, 'video'); const tLire = wordAt(scene, 'preferes'); const tCours = wordAt(scene, 'cours');
  const tap = tVid + 6; const playing = prog(f, tap + 6, tap + 14) * (1 - prog(f, tLire - 6, tLire + 2));
  const scroll = interpolate(f, [tLire + 4, scene.frames - 6], [0, 1180], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut });
  const PH = v ? 840 : 880; const k = (PH * 0.462) / 390;
  const ripple = prog(f, tap, tap + 14);
  const lines: [string, number, string?][] = [['Une leçon courte,', tLecon], ['avec sa vidéo,', tVid, C.gold], ['ou le cours à lire.', tCours]];
  const enter = prog(f, 0, 18);
  return (
    <Paper>
      <Glow x={v ? '50%' : '68%'} y="55%" size={1000} opacity={0.3} />
      <div style={{ position: 'absolute', ...(v ? { left: 70, right: 70, top: 110 } : { left: 140, top: 250, width: 760 }) }}>
        <Title f={f} at={0} kicker="Préparation guidée" size={v ? 70 : 64}>Une préparation<br />pas à pas.</Title>
        <div style={{ marginTop: v ? 28 : 48, fontFamily: FONT }}>
          {lines.map(([t, at, col]) => { const p = prog(f, at - 3, at + 12); return (
            <div key={t} style={{ fontSize: v ? 46 : 46, fontWeight: 700, letterSpacing: '-0.03em', color: col || C.inkSoft, opacity: 0.15 + 0.85 * p, transform: `translateX(${(1 - p) * -20}px)`, lineHeight: 1.3 }}>{t}</div>); })}
        </div>
      </div>
      <div style={{ position: 'absolute', ...(v ? { left: '50%', top: 600, marginLeft: -(PH * 0.462 + PH * 0.036) / 2 } : { right: 260, top: 80 }), transform: `translateY(${(1 - enter) * 300}px)`, opacity: enter }}>
        <Phone src="captures/mobile/lecon-full.png" height={PH} scrollY={scroll}>
          {/* tap sur la vidéo */}
          <div style={{ position: 'absolute', left: PLAY.x * k, top: PLAY.y * k - scroll * k, width: 0, height: 0 }}>
            <div style={{ position: 'absolute', width: 160 * k, height: 160 * k, left: -80 * k, top: -80 * k, borderRadius: '50%', border: `${4 * k}px solid ${C.white}`, opacity: f >= tap ? 1 - ripple : 0, transform: `scale(${0.3 + ripple})` }} />
            <div style={{ position: 'absolute', width: 46 * k, height: 46 * k, left: -23 * k, top: -23 * k, borderRadius: '50%', background: 'rgba(255,255,255,.55)', opacity: f >= tap - 8 && f < tap + 8 ? 1 : 0, transform: `scale(${f < tap ? 1 : 0.8})` }} />
          </div>
          {/* lecteur lancé (capture réelle après le clic) */}
          <Img src={staticFile('captures/mobile/lecon-video.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%', opacity: playing }} />
          {playing > 0 && <div style={{ position: 'absolute', left: 16 * k, top: 152 * k, padding: `${4 * k}px ${10 * k}px`, borderRadius: 99, background: C.ink, color: C.white, fontFamily: FONT, fontWeight: 700, fontSize: 12 * k, opacity: playing }}>● Lecture</div>}
        </Phone>
      </div>
    </Paper>
  );
};
