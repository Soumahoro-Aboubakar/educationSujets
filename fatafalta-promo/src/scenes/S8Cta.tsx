import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, pop, useVertical, LogoMark, Glow, Underline } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

const URL = 'fatafalta.com';

/** Appel à l'action : logo, adresse tapée en direct, essai gratuit réel, signature. */
export const S8Cta: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const tJ = wordAt(scene, 'rejoins'); const tSur = wordAt(scene, 'sur'); const tPrep = wordAt(scene, 'prepare');
  const logo = pop(f, 2, 30, 13);
  const typed = Math.floor(interpolate(f, [tSur + 4, tSur + 4 + URL.length * 1.6], [0, URL.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const urlIn = prog(f, tSur - 4, tSur + 8);
  const join = prog(f, tJ - 3, tJ + 12);
  const tag = prog(f, tPrep - 3, tPrep + 14);
  const sweep = interpolate(f, [0, scene.frames], [-30, 130]);
  const S = v ? 1 : 0.92;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, #15294A 0%, ${C.ink} 55%, ${C.night} 100%)`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${sweep - 12}%, rgba(228,201,151,.10) ${sweep}%, transparent ${sweep + 12}%)` }} />
      <Glow x="50%" y={v ? '30%' : '30%'} size={900} opacity={0.18} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: v ? 230 : 70, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: C.white, transform: `scale(${S})`, transformOrigin: '50% 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: Math.min(1, logo * 2), transform: `scale(${0.7 + 0.3 * logo})` }}>
          <div style={{ borderRadius: 34, boxShadow: '0 0 0 2px rgba(228,201,151,.5), 0 20px 60px -10px rgba(0,0,0,.6)' }}><LogoMark size={150} fold={prog(f, 8, 22)} /></div>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: '-0.045em' }}>Fatafalta</div>
        </div>
        <div style={{ marginTop: v ? 90 : 56, fontSize: v ? 64 : 58, fontWeight: 800, letterSpacing: '-0.035em', opacity: join, transform: `translateY(${(1 - join) * 24}px)`, textAlign: 'center' }}>
          Inscris-toi <span style={{ color: C.goldLight }}>gratuitement</span>
        </div>
        {/* barre d'adresse */}
        <div style={{ marginTop: v ? 50 : 34, opacity: urlIn, transform: `scale(${0.9 + 0.1 * urlIn})`, display: 'flex', alignItems: 'center', gap: 18, background: C.paper, color: C.ink, borderRadius: 99, padding: v ? '26px 54px' : '22px 50px', boxShadow: '0 30px 70px -20px rgba(0,0,0,.6)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.inkSoft} strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <span style={{ fontSize: v ? 70 : 64, fontWeight: 800, letterSpacing: '-0.03em', minWidth: v ? 470 : 430 }}>
            {URL.slice(0, typed)}<span style={{ opacity: typed < URL.length || Math.floor(f / 15) % 2 ? 1 : 0, color: C.gold, fontWeight: 400 }}>|</span>
          </span>
        </div>
        <div style={{ marginTop: v ? 36 : 26, fontSize: v ? 34 : 30, fontWeight: 600, color: C.goldLight, opacity: prog(f, tSur + 20, tSur + 34) }}>7 jours gratuits, sans abonnement.</div>
        <div style={{ marginTop: v ? 90 : 46, textAlign: 'center', opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
          <div style={{ fontSize: v ? 50 : 46, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2 }}>Prépare aujourd’hui<br />les réussites de <span style={{ color: C.goldLight }}>demain</span>.</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}><Underline p={prog(f, tPrep + 30, tPrep + 50)} width={v ? 420 : 380} /></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
