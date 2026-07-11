import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
  Stamp,
} from 'lucide-react';
import simulatorBg from '../assets/images/simulator.jpeg';

// ---------------------------------------------------------------------------
// Design system — identique à celui du Simulateur ("Dossier d'admission")
// pour que les deux écrans appartiennent visiblement au même produit.
// ---------------------------------------------------------------------------
const C = {
  ink: '#0E1A2B',
  inkSoft: '#5C6A7D',
  inkFaint: '#8B96A6',
  paper: '#F6F4EF',
  paperDim: '#EFECE3',
  navy: '#16273F',
  navyDeep: '#0A1524',
  gold: '#B98A3B',
  goldSoft: '#F3E7D2',
  line: '#DCD5C6',
  lineSoft: '#E8E3D6',
  lineStrong: 'rgba(14,26,43,0.12)',
};

const tsOuter = '0 1px 6px rgba(234,230,220,0.95), 0 0 12px rgba(234,230,220,0.8)';
const tsOuterStrong = '0 1px 4px rgba(234,230,220,0.98), 0 0 16px rgba(234,230,220,0.9)';

const useFonts = () => {
  useEffect(() => {
    if (document.getElementById('edu-ci-fonts')) return;
    const link = document.createElement('link');
    link.id = 'edu-ci-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap';
    document.head.appendChild(link);
  }, []);
};

const fDisplay = { fontFamily: "'Fraunces', ui-serif, Georgia, serif" };
const fMono = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

const quickSignals = [
  { label: 'Documents & sujets classés', icon: FileText },
  { label: 'Concours et calendriers à jour', icon: GraduationCap },
  { label: 'Calcul effectué sur votre appareil', icon: ShieldCheck },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] } }),
};

/* ──────────────────────────────────────────────────────── */
/*                          HOME                             */
/* ──────────────────────────────────────────────────────── */
const Home = () => {
  useFonts();

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-fixed bg-center"
      style={{ backgroundImage: `url(${simulatorBg})` }}
    >
      {/* ── Couche 1 : fond couleur opaque à 93 % ── */}
      <div
        className="absolute inset-0 z-0 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(236, 232, 224, 0.93)' }}
      />

      {/* ── Couche 2 : vignette subtile (plus sombre en haut/bas) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,21,36,0.06) 0%, transparent 30%, transparent 70%, rgba(10,21,36,0.04) 100%)',
        }}
      />

      {/* ── Couche 3 : liseré doré ultra-fin en haut (accent premium) ── */}
      <div
        className="absolute inset-x-0 top-0 z-[2] h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${C.gold}60 30%, ${C.gold} 50%, ${C.gold}60 70%, transparent 95%)`,
        }}
      />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 px-4 pb-16 pt-[110px] sm:px-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-8">

        {/* ── Texte ── */}
        <motion.div initial="hidden" animate="visible" className="max-w-xl">
          <motion.p
            custom={0}
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: C.gold, textShadow: tsOuterStrong }}
          >
            <Stamp size={13} />
            Éducation CI
          </motion.p>

          <motion.h1
            custom={0.08}
            variants={fadeUp}
            className="text-4xl font-semibold leading-[1.06] sm:text-5xl lg:text-[3.4rem]"
            style={{ ...fDisplay, color: C.ink, textShadow: tsOuterStrong }}
          >
            Vos ressources et votre dossier d'admission, au même endroit.
          </motion.h1>

          <motion.p
            custom={0.16}
            variants={fadeUp}
            className="mt-5 text-[15px] leading-relaxed"
            style={{ color: C.inkSoft, textShadow: tsOuter }}
          >
            Accédez aux documents académiques et simulez votre score ESATIC / INPHB
            depuis un espace pensé pour votre réussite.
          </motion.p>

          <motion.div custom={0.24} variants={fadeUp} className="mt-8 hidden flex-wrap gap-3 lg:flex">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 shadow-md"
              style={{ backgroundColor: C.navyDeep, color: '#FFFFFF' }}
            >
              Créer mon compte
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/ressources"
              className="inline-flex items-center gap-2 rounded-md border px-6 py-3 text-sm font-medium transition hover:bg-black/[0.03]"
              style={{ borderColor: C.lineStrong, color: C.ink }}
            >
              Explorer les ressources
            </Link>
          </motion.div>

          {/* Signaux rapides — desktop uniquement (masqué sur mobile) */}
          <motion.div custom={0.32} variants={fadeUp} className="mt-10 hidden flex-col gap-3 border-t pt-6 lg:flex" style={{ borderColor: C.lineSoft }}>
            {quickSignals.map(({ label, icon: Icon }) => (
              <div key={label} className="inline-flex items-center gap-2.5 text-[13px] font-medium" style={{ color: C.inkFaint, textShadow: tsOuter }}>
                <Icon size={15} style={{ color: C.inkSoft }} />
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Deux entrées principales, hiérarchie claire ── */}
        <motion.div initial="hidden" animate="visible" className="flex flex-col gap-4">

             {/*Primaire  — Télécharger (sobre, discret) */}
          <motion.div custom={0.28} variants={fadeUp}>
            <Link
              to="/ressources"
              className="group flex items-center justify-between gap-4 rounded-lg border p-5 transition-colors hover:bg-white"
              style={{ borderColor: C.line, backgroundColor: C.paperDim }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: 'rgba(14,26,43,0.06)', color: C.inkSoft }}
                >
                  <Download size={17} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold" style={{ color: C.ink }}>Télécharger des documents</h3>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: C.inkSoft }}>
                    Sujets, concours, devoirs partagés.
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="shrink-0 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" style={{ color: C.ink }} />
            </Link>
          </motion.div>


          {/* Secondaire — Simuler (accent gold, le vrai signature du produit) */}
          <motion.div custom={0.2} variants={fadeUp}>
            <Link
              to="/simulateur-admission"
              className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-lg border p-5 transition-colors shadow-[0_4px_24px_rgba(14,26,43,0.06),0_1px_3px_rgba(14,26,43,0.04)] hover:shadow-md"
              style={{ borderColor: C.line, backgroundColor: '#FFFFFF' }}
            >
              {/* Liseré doré en haut du panneau (accent "chemise cartonnée") */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${C.gold}80, ${C.goldSoft}, ${C.gold}80)`,
                }}
              />
              <div className="flex items-center gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: 'rgba(185,138,59,0.16)', color: C.gold }}
                >
                  <BarChart3 size={17} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold" style={{ color: C.ink }}>Simuler mon Admission</h3>
                  <p className="mt-0.5 text-[12.5px]" style={{ color: C.inkSoft }}>
                    Score ESATIC / INPHB guidé.
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="shrink-0 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" style={{ color: C.gold }} />
            </Link>
          </motion.div>

       

          {/* Repère de progression du parcours */}
          <motion.div
            custom={0.34}
            variants={fadeUp}
            className="flex items-center gap-3 rounded-lg border px-5 py-3.5 mt-2"
            style={{ borderColor: C.line, backgroundColor: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-[11px] font-semibold tabular-nums" style={{ ...fMono, color: C.gold }}>
              02
            </span>
            <p className="text-[12.5px] leading-snug" style={{ color: C.inkSoft }}>
              Deux entrées principales — un parcours pensé pour aller droit au but.
            </p>
          </motion.div>

          {/* Signaux rapides — mobile uniquement (masqué sur desktop) */}
          <motion.div custom={0.38} variants={fadeUp} className="mt-4 flex flex-col gap-3 border-t pt-6 lg:hidden" style={{ borderColor: C.lineSoft }}>
            {quickSignals.map(({ label, icon: Icon }) => (
              <div key={label} className="inline-flex items-center gap-2.5 text-[13px] font-medium" style={{ color: C.inkFaint, textShadow: tsOuter }}>
                <Icon size={15} style={{ color: C.inkSoft }} />
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        
      </section>
    </main>
  );
};

export default Home;