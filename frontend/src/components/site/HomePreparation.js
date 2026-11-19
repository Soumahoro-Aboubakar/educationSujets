import React from 'react';
import { ArrowRight, Compass, Dumbbell, ListChecks, PlayCircle, Repeat2, Timer, Trophy } from 'lucide-react';
import { Button, Container, Eyebrow } from '../ui';
import useAsync from '../../hooks/useAsync';
import useReveal from '../../hooks/useReveal';
import { prepApi } from '../../prep/client';
import PlatformDemo from './PlatformDemo';

/*
 * Accueil : la préparation guidée, présentée à côté des sujets.
 * Deux rangées image + texte : apprendre (cours, vidéos, plan du jour), puis s'évaluer
 * (concours blanc, test de niveau, révisions, classement). Chiffres réels du catalogue publié.
 * Photos générées (frontend/assets/_generated/PROMPTS.md), servies en WebP depuis public/images/home.
 */

const LEARN = [
  { icon: PlayCircle, title: 'Des cours courts, avec leur vidéo', text: 'Chaque leçon tient en quelques minutes et va droit à ce que le concours demande.' },
  { icon: Dumbbell, title: 'Des exercices corrigés en trois niveaux', text: 'Chaque réponse est corrigée aussitôt, du niveau 1 au niveau 3.' },
  { icon: ListChecks, title: 'Un plan du jour qui choisit pour vous', text: 'Fatafalta alterne les matières et vous dit quoi travailler ensuite.' },
];

const PRACTICE = [
  { icon: Timer, title: 'Concours blanc', text: 'Chronométré, noté sur 20.' },
  { icon: Compass, title: 'Test de niveau', text: 'Commencez là où vous en êtes.' },
  { icon: Repeat2, title: 'Révisions', text: 'Vos erreurs reviennent au bon moment.' },
  { icon: Trophy, title: 'Classement', text: 'Votre place parmi les candidats.' },
];

const Photo = ({ name, alt, className, sizes }) => (
  <picture>
    <source type="image/webp" srcSet={`/images/home/${name}-800.webp 800w, /images/home/${name}-1400.webp 1400w`} sizes={sizes} />
    <img
      src={`/images/home/${name}-1400.jpg`}
      alt={alt}
      width="1400"
      height="934"
      loading="lazy"
      decoding="async"
      className={className}
    />
  </picture>
);

const HomePreparation = () => {
  const catalogue = useAsync(() => prepApi.catalogue(), []);
  const orgs = catalogue.data || [];
  const concours = orgs.reduce((n, o) => n + o.cycles.length, 0);
  const modules = orgs.reduce((n, o) => n + o.cycles.reduce((m, c) => m + (c.modulesPublies || 0), 0), 0);
  const learnReveal = useReveal();
  const practiceReveal = useReveal({ group: true });

  return (
    <section id="preparation" className="scroll-mt-20 py-16 md:py-24" aria-labelledby="home-prep-title">
      <Container>
        {/* Démo : la préparation en action, sur fond encre */}
        <div className="relative mb-20 grid items-center gap-10 overflow-hidden rounded-[32px] bg-ink bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(58,90,148,0.55),transparent_70%),radial-gradient(ellipse_60%_50%_at_20%_100%,rgba(180,138,72,0.14),transparent_70%)] px-5 py-10 text-white sm:px-10 md:mb-28 md:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:px-14">
          <div className="relative">
            <Eyebrow className="!text-gold-light">Préparation</Eyebrow>
            <h2 id="home-prep-title" className="mt-3 max-w-md text-title font-bold">Votre préparation, du plan du jour au concours.</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/70">
              Une leçon courte, sa vidéo, des exercices corrigés aussitôt, et une progression que vous voyez avancer chaque jour.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              <Button to="/preparation" variant="gold" size="lg" icon={ArrowRight} iconPosition="end">Commencer gratuitement</Button>
              <p className="text-sm text-white/60 sm:ml-2">7 jours gratuits, sans abonnement.</p>
            </div>
          </div>
          <PlatformDemo className="relative mx-auto w-full max-w-[460px]" />
        </div>

        {/* Apprendre */}
        <div {...learnReveal} className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative">
            <Photo
              name="prep-student"
              alt="Un élève révise à son bureau, son cahier ouvert et la leçon du jour sur son téléphone."
              sizes="(min-width: 1024px) 600px, 100vw"
              className="aspect-[4/3] w-full rounded-[28px] object-cover object-[72%_center] shadow-lift sm:aspect-[3/2]"
            />
            {concours ? (
              <div className="absolute -bottom-5 left-4 flex animate-fade-in items-center gap-4 rounded-2xl border border-line bg-white/95 px-5 py-3.5 shadow-lift backdrop-blur sm:left-6">
                <p className="text-sm text-ink-soft"><strong className="tabular block text-xl font-bold text-ink">{concours}</strong>concours préparés</p>
                <span className="h-9 w-px bg-line" aria-hidden />
                <p className="text-sm text-ink-soft"><strong className="tabular block text-xl font-bold text-ink">{modules}</strong>modules publiés</p>
              </div>
            ) : null}
          </div>

          <div className="pt-4 lg:pt-0">
            <Eyebrow>Apprendre</Eyebrow>
            <h2 className="mt-2 max-w-lg text-title font-bold text-ink">Un vrai programme, une leçon à la fois.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-soft">
              Au-delà des anciens sujets, Fatafalta vous accompagne jusqu’au concours. Votre progression est la même sur le site, sur iPhone et sur l’application Android.
            </p>
            <ul className="mt-8 grid gap-5">
              {LEARN.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink"><Icon size={19} strokeWidth={1.9} /></span>
                  <div>
                    <h3 className="font-semibold text-ink">{title}</h3>
                    <p className="mt-0.5 leading-relaxed text-ink-soft">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              <Button to="/preparation" size="lg" icon={ArrowRight} iconPosition="end">Commencer la préparation</Button>
              <p className="text-sm text-ink-soft sm:ml-2">7 jours gratuits, sans abonnement.</p>
            </div>
          </div>
        </div>

        {/* S'évaluer */}
        <div className="mt-20 grid items-center gap-10 md:mt-28 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <h2 className="max-w-md text-title font-bold text-ink">Entraînez-vous dans les conditions de l’épreuve.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-soft">Mesurez votre niveau avant le jour J, et ne refaites jamais deux fois la même erreur.</p>
            <ul {...practiceReveal} className="mt-8 grid grid-cols-2 gap-3">
              {PRACTICE.map(({ icon: Icon, title, text }, index) => (
                <li key={title} data-reveal-item style={{ '--i': index }} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                  <Icon size={20} strokeWidth={1.9} className="text-ink" aria-hidden />
                  <h3 className="mt-4 font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <Photo
              name="prep-desk"
              alt="Copie d’examen corrigée, chronomètre, cahier et téléphone posés sur un bureau."
              sizes="(min-width: 1024px) 620px, 100vw"
              className="aspect-[3/2] w-full rounded-[28px] object-cover shadow-soft"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HomePreparation;
