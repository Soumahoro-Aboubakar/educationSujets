import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { C, FONT } from '../theme';
import { prog, pop, useVertical, Browser, Phone, Paper, Glow, Title } from '../components/ui';
import { wordAt } from '../timeline';
import type { SceneProps } from './types';

// Pages « anciens sujets » réelles (production). ESATIC est cité mais sa page n'est pas montrée (catalogue encore court).
const ORGS: { name: string; word: string; src?: string; mob?: string }[] = [
  { name: 'ENA', word: 'ena', src: 'captures/orgs/ena-desk.png', mob: 'captures/orgs/ena-mob.png' },
  { name: 'INPHB', word: 'i.n.p.h.b', src: 'captures/orgs/inphb-desk.png', mob: 'captures/orgs/inphb-mob.png' },
  { name: 'ESATIC', word: 'esatic' },
  { name: 'INFJ', word: 'i.n.f.j', src: 'captures/orgs/infj-desk.png', mob: 'captures/orgs/infj-mob.png' },
  { name: 'ENSEA', word: 'ensea', src: 'captures/orgs/ensea-desk.png', mob: 'captures/orgs/ensea-mob.png' },
  { name: 'ENS', word: 'e.n.s', src: 'captures/orgs/ens-desk.png', mob: 'captures/orgs/ens-mob.png' },
  { name: 'CAFOP', word: 'cafop', src: 'captures/web/org-cafop.png' },
];

/** Catalogue : les concours ivoiriens défilent, puis le compteur réel et le mobile. */
export const S3Sujets: React.FC<SceneProps> = ({ scene, lead }) => {
  const f = useCurrentFrame() - lead; const v = useVertical();
  const at = ORGS.map((o) => wordAt(scene, o.word));
  const tPlus = wordAt(scene, 'plus'); const tOrdi = wordAt(scene, 'ordinateur');
  // page affichée : dernier organisme prononcé qui a une page
  let page = 'captures/web/sujets.png'; let pageAt = 0; let mob = 'captures/ios/sujets.png';
  ORGS.forEach((o, i) => { if (o.src && f >= at[i] - 3 && f < tPlus - 4) { page = o.src; pageAt = at[i] - 3; } if (o.mob && f >= at[i] - 3 && f < tPlus - 4) mob = o.mob; });
  if (f >= tPlus - 4) { page = 'captures/web/sujets.png'; pageAt = tPlus - 4; mob = 'captures/ios/sujets.png'; }
  const swap = prog(f, pageAt, pageAt + 9);
  const count = Math.round(interpolate(f, [tPlus, tPlus + 40], [0, 1174], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) }));
  const cIn = prog(f, tPlus - 2, tPlus + 12);
  const ph = prog(f, tOrdi - 4, tOrdi + 18);
  const bw = 1060;
  return (
    <Paper>
      <Glow x={v ? '50%' : '72%'} y={v ? '60%' : '50%'} size={1100} opacity={0.22} />
      <div style={{ position: 'absolute', ...(v ? { left: 70, right: 70, top: 110 } : { left: 110, top: 150, width: 640 }) }}>
        <Title f={f} at={0} kicker="Anciens sujets et corrigés" size={v ? 76 : 70}>Tous les concours<br />de <span style={{ color: C.gold }}>Côte d’Ivoire</span>.</Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 36 }}>
          {ORGS.map((o, i) => {
            const s = pop(f, at[i] - 2); const active = f >= at[i] - 2 && (i === ORGS.length - 1 ? f < tPlus : f < at[i + 1] - 2);
            return <div key={o.name} style={{ fontFamily: FONT, fontWeight: 700, fontSize: v ? 34 : 28, padding: '10px 22px', borderRadius: 99,
              background: active ? C.ink : C.white, color: active ? C.white : C.ink, border: `1px solid ${active ? C.ink : C.line}`,
              opacity: Math.min(1, s * 1.4), transform: `scale(${0.7 + 0.3 * s})` }}>{o.name}</div>;
          })}
        </div>
        {/* compteur réel (fatafalta.com, novembre 2026) */}
        <div style={{ marginTop: v ? 26 : 60, opacity: cIn, transform: `translateY(${(1 - cIn) * 24}px)`, fontFamily: FONT, display: 'flex', gap: 48, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: v ? 96 : 120, fontWeight: 800, letterSpacing: '-0.05em', color: C.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{count.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize: v ? 32 : 28, fontWeight: 600, color: C.inkSoft, marginTop: 8 }}>sujets publiés</div>
          </div>
          <div>
            <div style={{ fontSize: v ? 96 : 120, fontWeight: 800, letterSpacing: '-0.05em', color: C.gold, lineHeight: 1 }}>{Math.round(25 * Math.min(1, count / 1174))}</div>
            <div style={{ fontSize: v ? 32 : 28, fontWeight: 600, color: C.inkSoft, marginTop: 8 }}>organismes</div>
          </div>
        </div>
      </div>
      {v ? (
        <div style={{ position: 'absolute', left: '50%', top: 640, transform: `translateX(-50%) translateY(${(1 - prog(f, 0, 18)) * 500}px)` }}>
          <Phone src={mob} height={800} cssWidth={mob.includes('/ios/') ? 402 : 390}>
            <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 - swap }} />
          </Phone>
        </div>
      ) : (<>
        <div style={{ position: 'absolute', left: 790, top: 190, transform: `translateX(${-ph * 80}px) scale(${1 - ph * 0.06})`, transformOrigin: '0 50%', opacity: (1 - ph * 0.25) * prog(f, 0, 12) }}>
          <div style={{ transform: `translateY(${(1 - prog(f, 0, 16)) * 60}px)` }}>
            <Browser src={page} width={bw} url={page.includes('sujets.png') ? 'fatafalta.com/sujets' : `fatafalta.com/sujets/${(ORGS.find((o) => o.src === page)?.name || '').toLowerCase()}`} crop={[0, 860]} zoom={1.32} origin="50% 0%"
              style={{ opacity: 0.4 + 0.6 * swap, transform: `translateY(${(1 - swap) * 18}px)` }} />
          </div>
        </div>
        <div style={{ position: 'absolute', right: 110, top: 130, transform: `translateY(${(1 - ph) * 1300}px) rotate(${(1 - ph) * 6}deg)` }}>
          <Phone src="captures/ios/sujets.png" height={780} cssWidth={402} />
        </div>
      </>)}
    </Paper>
  );
};
