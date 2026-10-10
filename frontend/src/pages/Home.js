import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Check, Compass, Download, Search } from 'lucide-react';
import { Button, Container, Eyebrow, Skeleton } from '../components/ui';
import HeroVisual from '../components/illustrations/HeroVisual';
import useAsync from '../hooks/useAsync';
import useReveal from '../hooks/useReveal';
import { catalog, payments } from '../lib/api';
import { formatAmount, organismeLabel } from '../lib/format';
import { segmentFor } from '../lib/slug';
import { catalogPath } from '../lib/catalogSeo';
import OrganismeLogo, { distinctPalette } from '../components/catalog/OrganismeLogo';

const STEPS = [
  { icon: Compass, title: 'Choisissez votre concours', text: 'Organisme, concours, année, matière : chaque sujet est rangé à sa place.' },
  { icon: BookOpenCheck, title: 'Consultez le sujet', text: 'Voyez ce qui est disponible, avec ou sans corrigé, avant de vous engager.' },
  { icon: Download, title: 'Téléchargez et révisez', text: 'Avec votre abonnement, gardez sujets et corrigés pour travailler hors ligne.' },
];

const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

/** Trait or dessiné sous un mot du titre : la marque du correcteur. */
const Underline = ({ children }) => (
  <span className="relative inline-block whitespace-nowrap">
    {children}
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-[0.22em] w-full text-gold" aria-hidden>
      <path d="M2 8.5C40 3.5 120 1.5 198 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" pathLength="1" className="hero-underline [stroke-dasharray:1] [stroke-dashoffset:1] animate-[draw_900ms_500ms_cubic-bezier(0.16,1,0.3,1)_forwards] motion-reduce:[stroke-dashoffset:0]" />
    </svg>
  </span>
);

const OrganismeCard = ({ organisme, to, paletteIndex, index }) => (
  <Link
    to={to}
    data-reveal-item
    style={{ '--i': index }}
    className="group flex min-w-0 flex-col justify-between gap-6 rounded-2xl border border-line bg-paper p-4 transition-[transform,box-shadow,border-color,background-color] duration-300 ease-emphasized sm:p-5 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-line-strong [@media(hover:hover)]:hover:bg-white [@media(hover:hover)]:hover:shadow-lift active:scale-[0.98]"
  >
    {/* Logo au-dessus du nom sur mobile : le nom garde toute la largeur de la carte. */}
    <div className="flex min-w-0 flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center">
      <OrganismeLogo organisme={organisme} size="md" paletteIndex={paletteIndex} className="transition-transform duration-300 ease-emphasized group-hover:scale-105" />
      <p className="min-w-0 max-w-full break-words font-semibold leading-snug text-ink [hyphens:auto]">{organismeLabel(organisme)}</p>
    </div>
    <div className="flex items-center justify-between text-sm text-ink-soft">
      <span className="tabular">{organisme.subjectCount ? plural(organisme.subjectCount, 'sujet') : 'Sujets publiés'}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
        <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-px" />
      </span>
    </div>
  </Link>
);

const Home = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  // Liste complète (quelques dizaines d'organismes) : mêmes couleurs de logo que le catalogue ; 8 affichés.
  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const allOrganismes = useMemo(() => organismes.data?.data || [], [organismes.data]);
  const colors = useMemo(() => distinctPalette(allOrganismes), [allOrganismes]);
  const plans = useAsync(() => payments.plans(), []);

  // Chiffres réels du catalogue public, affichés seulement une fois chargés.
  const totalSubjects = allOrganismes.reduce((sum, item) => sum + (item.subjectCount || 0), 0);
  const popular = useMemo(
    () => [...allOrganismes].sort((a, b) => (b.subjectCount || 0) - (a.subjectCount || 0)).slice(0, 4),
    [allOrganismes],
  );
  const methodLabels = (plans.data?.methods || []).map((method) => method.label).filter(Boolean);

  const organismesReveal = useReveal({ group: true });
  const stepsReveal = useReveal({ group: true });
  const offerReveal = useReveal();

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/recherche?q=${encodeURIComponent(query.trim())}` : '/recherche');
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Trame de papier millimétré, très discrète, estompée vers le bas. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(13,27,50,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,27,50,0.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_0%,#000_40%,transparent_100%)]" aria-hidden />
        <Container className="relative grid items-center gap-12 pb-14 pt-8 sm:pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="min-w-0">
            <div className="animate-rise-in">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-wash/70 py-1 pl-1.5 pr-3 text-xs font-semibold text-gold-ink">
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-ink">Côte d’Ivoire</span>
                Concours · Examens · Tests
              </span>
            </div>
            <h1 className="mt-5 animate-rise-in text-display font-extrabold text-ink [animation-delay:60ms]">
              Les anciens sujets de concours, avec leurs <Underline>corrigés.</Underline>
            </h1>
            <p className="mt-5 max-w-lg animate-rise-in text-[17px] leading-relaxed text-ink-soft [animation-delay:120ms] sm:text-lg">
              Fatafalta réunit les sujets, tests et corrigés des concours passés pour vous aider à vous préparer sérieusement.
            </p>

            <form
              onSubmit={submitSearch}
              role="search"
              className="mt-7 flex max-w-lg animate-rise-in items-center gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-soft transition-[border-color,box-shadow] duration-200 [animation-delay:180ms] focus-within:border-ink/30 focus-within:shadow-lift"
            >
              <Search size={19} className="ml-3 shrink-0 text-ink-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Concours, matière, année…"
                aria-label="Rechercher un sujet"
                enterKeyHint="search"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-[15px]"
              />
              <Button type="submit" size="sm" className="h-11 shrink-0 px-3.5 sm:px-4" aria-label="Rechercher">
                <span className="hidden sm:inline">Rechercher</span><Search size={18} className="sm:hidden" aria-hidden />
              </Button>
            </form>

            {/* Accès directs : les organismes qui ont le plus de sujets publiés. */}
            <div className="mt-4 min-h-[36px] max-w-lg animate-rise-in [animation-delay:220ms]">
              {popular.length ? (
                <div className="fade-x scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
                  <span className="shrink-0 text-sm text-ink-muted">Populaires :</span>
                  {popular.map((organisme) => (
                    <Link
                      key={organisme._id}
                      to={catalogPath([segmentFor(organisme, allOrganismes)])}
                      className="inline-flex h-9 shrink-0 animate-fade-in items-center gap-1.5 rounded-full border border-line bg-white/80 pl-1 pr-3 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-white"
                    >
                      <OrganismeLogo organisme={organisme} size="xs" paletteIndex={colors[organisme._id]} className="!h-7 !w-7 !rounded-full" />
                      {organismeLabel(organisme)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-7 grid animate-rise-in gap-3 [animation-delay:260ms] sm:flex sm:flex-wrap">
              <Button to="/sujets" size="lg" icon={ArrowRight} iconPosition="end">Explorer les sujets</Button>
              <Button as="a" href="#concours" variant="secondary" size="lg">Découvrir les concours</Button>
            </div>

            <p className="mt-6 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft" aria-live="polite">
              {totalSubjects ? (
                <>
                  <span className="animate-fade-in"><strong className="tabular font-semibold text-ink">{totalSubjects}</strong> sujets publiés</span>
                  <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden />
                  <span className="animate-fade-in"><strong className="tabular font-semibold text-ink">{allOrganismes.length}</strong> organismes</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="hidden lg:block">
            <HeroVisual />
          </div>
        </Container>
      </section>

      {/* Organismes */}
      <section id="concours" className="scroll-mt-20 border-y border-line bg-white py-16 md:py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Catalogue</Eyebrow>
              <h2 className="mt-2 text-title font-bold text-ink">Parcourez par organisme</h2>
              <p className="mt-2 text-ink-soft">Les organismes dont les sujets sont déjà disponibles.</p>
            </div>
            <Button to="/sujets" variant="secondary" size="sm" icon={ArrowRight} iconPosition="end">Tout voir</Button>
          </div>

          <div className="mt-8 md:mt-10">
            {organismes.loading && !organismes.data ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Chargement des organismes">
                {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-[150px] rounded-2xl min-[400px]:h-[124px] sm:h-[136px]" />)}
              </div>
            ) : organismes.error ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-paper p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-soft">Les organismes n’ont pas pu être chargés.</p>
                <Button variant="secondary" size="sm" onClick={organismes.reload}>Réessayer</Button>
              </div>
            ) : (
              <div {...organismesReveal} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {allOrganismes.slice(0, 8).map((organisme, index) => (
                  <OrganismeCard
                    key={organisme._id}
                    organisme={organisme}
                    index={index}
                    paletteIndex={colors[organisme._id]}
                    to={catalogPath([segmentFor(organisme, allOrganismes)])}
                  />
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 md:py-24">
        <Container>
          <Eyebrow>Comment ça marche</Eyebrow>
          <h2 className="mt-2 max-w-md text-title font-bold text-ink">Trois étapes, pas plus.</h2>
          <ol {...stepsReveal} className="relative mt-10 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
            {/* Fil qui relie les étapes (ordinateur). */}
            <span className="absolute left-[12%] right-[12%] top-[46px] hidden border-t border-dashed border-line-strong md:block" aria-hidden />
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} data-reveal-item style={{ '--i': index }} className="relative flex gap-4 rounded-2xl border border-line bg-white p-5 md:block md:p-6">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-soft">
                  <Icon size={20} strokeWidth={1.8} />
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-light px-1 text-[11px] font-bold text-ink ring-2 ring-white">{index + 1}</span>
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold text-ink md:mt-5 md:text-lg">{title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Abonnement */}
      <section className="pb-20 md:pb-28">
        <Container>
          <div {...offerReveal} className="relative grid gap-10 overflow-hidden rounded-[28px] bg-ink p-6 text-white sm:p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" aria-hidden />
            <div className="relative">
              <Eyebrow className="!text-gold-light">Abonnement</Eyebrow>
              <h2 className="mt-3 text-title font-bold">Un accès complet, un prix simple.</h2>
              <ul className="mt-6 space-y-3.5 text-white/80">
                {[
                  'Tous les sujets et leurs corrigés',
                  `Jusqu’à ${plans.data?.downloadsPerDay || 15} téléchargements par jour`,
                  methodLabels.length ? `Paiement par ${methodLabels.join(', ').replace(/, ([^,]*)$/, ' ou $1')}` : 'Paiement par Orange Money, MTN, Moov ou Wave',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-light/15"><Check size={13} className="text-gold-light" strokeWidth={3} /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative flex flex-col justify-center rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-sm">
              {plans.data ? (
                <div className="animate-fade-in">
                  <p className="tabular text-[clamp(2.5rem,2rem+2vw,3rem)] font-extrabold leading-none tracking-[-0.04em]">{formatAmount(plans.data.initial.amount)}</p>
                  <p className="mt-3 text-white/70">
                    {`${plans.data.initial.months} mois d’accès, puis ${formatAmount(plans.data.monthly.amount)} par mois.`}
                  </p>
                  <p className="mt-1 text-sm text-gold-light">{`${formatAmount(plans.data.promo.discountedInitialAmount)} avec un code promotionnel.`}</p>
                </div>
              ) : <div className="h-[108px] animate-pulse rounded-xl bg-white/10" />}
              <Button to="/abonnement" variant="gold" size="lg" icon={ArrowRight} iconPosition="end" className="mt-6">Voir l’abonnement</Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
