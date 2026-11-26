import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing, spring } from 'remotion';
import { C, FONT } from '../theme';

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
/** 0→1 entre deux images, courbe signature. */
export const prog = (f: number, a: number, b: number, e = ease) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
export const useVertical = () => { const { width, height } = useVideoConfig(); return height > width; };
export const pop = (f: number, at: number, fps = 30, damping = 14) => spring({ frame: f - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });

export const LogoMark: React.FC<{ size: number; fold?: number }> = ({ size, fold = 1 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect width="100" height="100" rx="22" fill={C.ink} />
    <path d="M34 18H63L75 30V31A3 3 0 0 1 72 34H47V44H62A3 3 0 0 1 65 47V55A3 3 0 0 1 62 58H47V79A3 3 0 0 1 44 82H34A3 3 0 0 1 31 79V21A3 3 0 0 1 34 18Z" fill={C.paper} />
    <g style={{ transformOrigin: '63px 18px', transform: `scale(${fold})` }}>
      <path d="M63 18L75 30H65.5A2.5 2.5 0 0 1 63 27.5Z" fill={C.goldLight} />
    </g>
  </svg>
);

/** Cadre navigateur : barre d'adresse + capture (img 1600 px CSS de large, ×2). */
export const Browser: React.FC<{ src: string; width: number; url: string; crop?: [number, number]; zoom?: number; origin?: string; shadow?: boolean; style?: React.CSSProperties }> = ({ src, width, url, crop = [0, 1000], zoom = 1, origin = '50% 0%', style }) => {
  const k = width / 1600; const bar = 44 * Math.max(k, 0.55) / 0.8;
  const h = (crop[1] - crop[0]) * k;
  return (
    <div style={{ width, borderRadius: 18 * Math.max(k, 0.6), overflow: 'hidden', background: C.white, boxShadow: '0 40px 90px -30px rgba(13,27,50,.45), 0 0 0 1px rgba(13,27,50,.08)', ...style }}>
      <div style={{ height: bar, background: C.paperDim, display: 'flex', alignItems: 'center', gap: bar * 0.18, padding: `0 ${bar * 0.4}px`, borderBottom: `1px solid ${C.line}` }}>
        {['#E3B7A6', '#E9D29F', '#B9CFAE'].map((c) => <div key={c} style={{ width: bar * 0.26, height: bar * 0.26, borderRadius: 99, background: c }} />)}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontFamily: FONT, fontSize: bar * 0.36, color: C.inkSoft, background: C.white, borderRadius: 99, padding: `${bar * 0.1}px ${bar * 0.6}px`, border: `1px solid ${C.line}`, fontWeight: 500 }}>🔒 {url}</div>
        </div>
      </div>
      <div style={{ height: h, overflow: 'hidden', position: 'relative' }}>
        <Img src={staticFile(src)} style={{ position: 'absolute', top: -crop[0] * k, left: 0, width, transform: `scale(${zoom})`, transformOrigin: origin }} />
      </div>
    </div>
  );
};

/** Téléphone : écran 390 px CSS de large ; `scrollY` en px CSS dans la capture pleine page. */
export const Phone: React.FC<{ src: string; height: number; scrollY?: number; children?: React.ReactNode; style?: React.CSSProperties; cssWidth?: number; topCrop?: number }> = ({ src, height, scrollY = 0, children, style, cssWidth = 390, topCrop = 0 }) => {
  const sw = height * 0.462; const k = sw / cssWidth; const bez = height * 0.018;
  return (
    <div style={{ width: sw + bez * 2, height: height + bez * 2, borderRadius: height * 0.075, background: '#0B0F17', padding: bez, boxShadow: '0 50px 100px -35px rgba(13,27,50,.55), inset 0 0 0 2px #2A3242', position: 'relative', ...style }}>
      <div style={{ width: sw, height, borderRadius: height * 0.062, overflow: 'hidden', position: 'relative', background: C.paper }}>
        <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: -(scrollY + topCrop) * k, width: sw }} />
        {/* barre d'état propre */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.052, background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${sw * 0.09}px`, fontFamily: FONT, fontWeight: 600, fontSize: height * 0.019, color: C.ink }}>
          <span>9:41</span><span style={{ letterSpacing: 1 }}>▂▄▆ ◔</span>
        </div>
        <div style={{ position: 'absolute', top: height * 0.012, left: '50%', width: sw * 0.3, height: height * 0.032, marginLeft: -sw * 0.15, borderRadius: 99, background: '#000' }} />
        {children}
      </div>
    </div>
  );
};

export const Glow: React.FC<{ x: string; y: string; size: number; color?: string; opacity?: number }> = ({ x, y, size, color = C.goldLight, opacity = 0.35 }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 65%)`, opacity, filter: 'blur(20px)' }} />
);

export const Paper: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line}55 1px, transparent 1px), linear-gradient(90deg, ${C.line}55 1px, transparent 1px)`, backgroundSize: '64px 64px', transform: `translateY(${-(f * 0.15) % 64}px)`, maskImage: 'radial-gradient(ellipse at 50% 40%, black 20%, transparent 75%)' }} />
      {children}
    </AbsoluteFill>
  );
};

/** Libellé de section (pastille + titre), style du site : très gras, serré. */
export const Title: React.FC<{ f: number; at: number; kicker?: string; children: React.ReactNode; size: number; color?: string; align?: 'left' | 'center' }> = ({ f, at, kicker, children, size, color = C.ink, align = 'left' }) => {
  const p = prog(f, at, at + 16);
  return (
    <div style={{ fontFamily: FONT, textAlign: align, opacity: p, transform: `translateY(${(1 - p) * 28}px)` }}>
      {kicker && <div style={{ display: 'inline-block', fontSize: size * 0.32, fontWeight: 600, color: C.gold, background: C.goldWash, border: `1px solid ${C.goldLight}`, borderRadius: 99, padding: `${size * 0.08}px ${size * 0.3}px`, marginBottom: size * 0.3 }}>{kicker}</div>}
      <div style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, color }}>{children}</div>
    </div>
  );
};

/** Soulignement or dessiné (signature du site : « jour J »). */
export const Underline: React.FC<{ p: number; width: number }> = ({ p, width }) => (
  <svg width={width} height={18} viewBox={`0 0 ${width} 18`} style={{ display: 'block' }}>
    <path d={`M4 12 C ${width * 0.3} 4, ${width * 0.7} 4, ${width - 4} 10`} stroke={C.gold} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={width * 1.1} strokeDashoffset={width * 1.1 * (1 - p)} />
  </svg>
);
