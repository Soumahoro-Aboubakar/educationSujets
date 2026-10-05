import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Check, Compass, Download, Search } from 'lucide-react';
import { Button, Container, SkeletonRows } from '../components/ui';
import HeroVisual from '../components/illustrations/HeroVisual';
import useAsync from '../hooks/useAsync';
import { catalog, payments } from '../lib/api';
import { formatAmount, organismeLabel } from '../lib/format';
import { segmentFor } from '../lib/slug';

const STEPS = [
  { icon: Compass, title: 'Choisissez votre concours', text: 'Organisme, concours, année, matière : chaque sujet est rangé à sa place.' },
  { icon: BookOpenCheck, title: 'Consultez le sujet', text: 'Voyez ce qui est disponible, avec ou sans corrigé, avant de vous engager.' },
  { icon: Download, title: 'Téléchargez et révisez', text: 'Avec votre abonnement, gardez sujets et corrigés pour travailler hors ligne.' },
];

const Home = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const organismes = useAsync(() => catalog.organismes({ limit: 8 }), []);
  const plans = useAsync(() => payments.plans(), []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/recherche?q=${encodeURIComponent(query.trim())}` : '/recherche');
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
          <div className="min-w-0 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-ink">Concours · Examens · Tests</p>
            <h1 className="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[58px]">
              Les anciens sujets de concours, avec leurs corrigés.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
              Fatafalta réunit les sujets, tests et corrigés des concours passés pour vous aider à vous préparer sérieusement.
            </p>

            <form onSubmit={submitSearch} className="mt-8 flex max-w-lg items-center gap-2 rounded-2xl border border-line bg-white p-1.5 shadow-soft focus-within:border-ink/30" role="search">
              <Search size={19} className="ml-3 shrink-0 text-ink-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Un concours, une matière, une année…"
                aria-label="Rechercher un sujet"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <Button type="submit" size="sm" className="h-10 shrink-0" aria-label="Rechercher"><span className="hidden sm:inline">Rechercher</span><Search size={17} className="sm:hidden" /></Button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button to="/sujets" size="lg" icon={ArrowRight} className="flex-row-reverse">Explorer les sujets</Button>
              <Button as="a" href="#concours" variant="secondary" size="lg">Découvrir les concours</Button>
            </div>
          </div>

          <div className="hidden animate-fade-up sm:block" style={{ animationDelay: '120ms' }}>
            <HeroVisual />
          </div>
        </Container>
      </section>

      {/* Organismes */}
      <section id="concours" className="scroll-mt-20 border-t border-line bg-white py-16 md:py-20">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.03em] text-ink">Parcourez par organisme</h2>
              <p className="mt-2 text-ink-soft">Les organismes dont les sujets sont déjà disponibles.</p>
            </div>
            <Link to="/sujets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-burgundy hover:underline">
              Tout voir <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-8">
            {organismes.loading && !organismes.data ? <SkeletonRows count={3} /> : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {(organismes.data?.data || []).map((organisme) => (
                  <Link
                    key={organisme._id}
                    to={`/sujets?o=${segmentFor(organisme, organismes.data.data)}`}
                    className="group flex min-w-0 flex-col justify-between rounded-2xl border border-line bg-paper p-4 transition-all sm:p-5 hover:-translate-y-0.5 hover:border-line-strong hover:bg-white hover:shadow-soft"
                  >
                    <p className="break-words font-semibold leading-snug text-ink">{organismeLabel(organisme)}</p>
                    <p className="mt-6 flex items-center justify-between text-sm text-ink-soft">
                      {organisme.subjectCount ? `${organisme.subjectCount} sujet${organisme.subjectCount > 1 ? 's' : ''}` : 'Sujets publiés'}
                      <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 md:py-20">
        <Container>
          <h2 className="max-w-md text-3xl font-bold tracking-[-0.03em] text-ink">Trois étapes, pas plus.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white"><Icon size={20} strokeWidth={1.8} /></span>
                  <span className="text-sm font-semibold text-ink-muted">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Abonnement */}
      <section className="pb-20">
        <Container>
          <div className="grid gap-10 overflow-hidden rounded-3xl bg-ink p-8 text-white md:grid-cols-[1.2fr_1fr] md:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">Abonnement</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em]">Un accès complet, un prix simple.</h2>
              <ul className="mt-6 space-y-3 text-white/80">
                {['Tous les sujets et leurs corrigés', `Jusqu’à ${plans.data?.downloadsPerDay || 15} téléchargements par jour`, 'Paiement par Orange Money, MTN, Moov ou Wave'].map((item) => (
                  <li key={item} className="flex items-center gap-3"><Check size={17} className="shrink-0 text-gold-light" strokeWidth={2.5} /> {item}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10">
              {plans.data ? (
                <>
                  <p className="text-5xl font-extrabold tracking-[-0.04em]">{formatAmount(plans.data.initial.amount)}</p>
                  <p className="mt-2 text-white/70">
                    {`${plans.data.initial.months} mois d’accès, puis ${formatAmount(plans.data.monthly.amount)} par mois.`}
                  </p>
                  <p className="mt-1 text-sm text-gold-light">{`${formatAmount(plans.data.promo.discountedInitialAmount)} avec un code promotionnel.`}</p>
                </>
              ) : <div className="h-24 animate-pulse rounded-xl bg-white/10" />}
              <Button to="/abonnement" variant="gold" size="lg" className="mt-6">Voir l’abonnement</Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
