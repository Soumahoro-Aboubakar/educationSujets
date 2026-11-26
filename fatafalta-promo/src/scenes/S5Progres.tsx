import React from 'react';
import { useCurrentFrame, interpolate, Img, staticFile } from 'remotion';
import { C, FONT } from '../theme';
import { prog, useVertical, Phone, Paper, Glow, inOut } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

/** Exercices corrigés → plan du jour → progression → rang : carrousel de vrais écrans. */
export const S5Progres: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const t = [wordAt(scene, 'texerces'), wordAt(scene, 'plan'), wordAt(scene, 'progression'), wordAt(scene, 'rang')];
  const tCorr = wordAt(scene, 'corrigee');
  // position du carrousel (0..3), glisse vers l'écran nommé
  const pos = t.reduce((acc, at, i) => (i === 0 ? 0 : acc + prog(f, at - 8, at + 8, inOut)), 0);
  const labels = ['Corrigé aussitôt', 'Ton plan du jour', 'Ta progression', 'Ton rang'];
  const cur = Math.round(pos);
  const PH = v ? 1060 : 730; const sw = PH * 0.462 + PH * 0.036; const gap = v ? sw + 80 : sw + 90; const k = (PH * 0.462) / 390;
  const corr = prog(f, tCorr - 2, tCorr + 6);
  const items = [
    <Phone key="e" src="captures/mobile/exercice-choix.png" height={PH}>
      <Img src={staticFile('captures/mobile/exercice-corrige.png')} style={{ position: 'absolute', left: 0, top: 0, width: '100%', opacity: corr }} />
    </Phone>,
    <Phone key="p" src="captures/mobile/plan.png" height={PH}>
      {/* pastille de rang de la carte « objectif » remplacée par le temps du jour (donnée réelle : 35 min) */}
      <div style={{ position: 'absolute', left: 28 * k, top: 396 * k, height: 28 * k, padding: `0 ${10 * k}px`, borderRadius: 99, background: C.goldWash, border: `1px solid ${C.goldLight}`, color: C.gold, fontFamily: FONT, fontWeight: 700, fontSize: 12 * k, display: 'flex', alignItems: 'center' }}>✓ 35 min aujourd’hui</div>
    </Phone>,
    <Phone key="g" src="captures/mobile/progres.png" height={PH} />,
    <RankCard key="r" h={PH} w={sw} />,
  ];
  return (
    <Paper>
      <Glow x="50%" y="55%" size={1100} opacity={0.3} />
      <div style={{ position: 'absolute', top: v ? 150 : 70, left: 0, right: 0, height: v ? 110 : 90, fontFamily: FONT, textAlign: 'center' }}>
        {labels.map((l, i) => { const o = Math.max(0, 1 - Math.abs(pos - i) * 1.6); return (
          <div key={l} style={{ position: 'absolute', left: 0, right: 0, fontSize: v ? 84 : 72, fontWeight: 800, letterSpacing: '-0.04em', color: i === 3 ? C.gold : C.ink, opacity: o * prog(f, 0, 12), transform: `translateY(${(pos - i) * -40}px)` }}>{l}</div>); })}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: v ? 340 : 178 }}>
        {items.map((it, i) => { const d = i - pos; const s = 1 - Math.min(1, Math.abs(d)) * 0.18; return (
          <div key={i} style={{ position: 'absolute', left: -sw / 2 + d * gap, top: 0, transform: `scale(${s}) translateY(${(1 - prog(f, i * 3, 18 + i * 3)) * 200}px)`, opacity: Math.max(0, 1 - Math.abs(d) * (v ? 0.9 : 0.5)) * prog(f, 0, 10), zIndex: 10 - Math.round(Math.abs(d)) }}>{it}</div>); })}
      </div>
      {cur === 0 && corr > 0 && <div style={{ position: 'absolute', left: '50%', top: v ? 1430 : 900, transform: `translateX(-50%) scale(${0.8 + 0.2 * corr})`, opacity: corr * (1 - prog(f, t[1] - 10, t[1])), fontFamily: FONT, fontWeight: 700, fontSize: v ? 36 : 30, background: '#E7F6EE', color: '#1F7A4D', border: '1px solid #9ED3B6', borderRadius: 99, padding: '10px 26px', display: v ? 'block' : 'none' }}>✓ Bien joué</div>}
    </Paper>
  );
};

/** Classement réel (compte de test local) : podium recadré, la ligne « toi » en tête. */
const RankCard: React.FC<{ h: number; w: number }> = ({ h, w }) => {
  // sous la carte « Ta place » (qui affiche le nombre total de candidats)
  const cssTop = 562, cssH = 282; const k = w / 390;
  return (
    <div style={{ width: w, marginTop: h * 0.2, borderRadius: 36, background: C.white, boxShadow: '0 50px 100px -35px rgba(13,27,50,.45)', overflow: 'hidden', border: `1px solid ${C.line}` }}>
      <div style={{ background: C.ink, color: C.white, fontFamily: FONT, padding: `${24 * k * 0.9}px ${22 * k}px` }}>
        <div style={{ fontSize: 15 * k, color: C.goldLight, fontWeight: 600 }}>Classement · cette semaine</div>
        <div style={{ fontSize: 40 * k, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4 * k }}>1<sup style={{ fontSize: 20 * k, verticalAlign: 'super', lineHeight: 0, marginRight: 14 * k }}>er</sup><span style={{ fontSize: 18 * k, fontWeight: 600, color: C.goldLight }}>ENSEA · AS</span></div>
      </div>
      <div style={{ position: 'relative', height: cssH * k, overflow: 'hidden' }}>
        <Img src={staticFile('captures/mobile/classement.png')} style={{ position: 'absolute', left: 0, top: -cssTop * k, width: w }} />
      </div>
    </div>
  );
};
