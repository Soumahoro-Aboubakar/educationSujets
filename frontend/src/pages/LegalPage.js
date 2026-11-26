import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Container } from '../components/ui';
import useSeo from '../hooks/useSeo';
import { DOCUMENTS, LEGAL_DATE_TEXTE, LEGAL_VERSION, documentBySlug, legalSeo } from '../legal/documents';

/*
 * Documents juridiques publics (CGU, CGV, confidentialité…), accessibles sans compte.
 * Lecture : colonne de 68 caractères, sommaire fixe sur ordinateur, repliable sur mobile.
 * Le site est la source de référence : l'application Android ouvre ces pages.
 */

// Liens internes « [texte](/chemin) » et champs « [À COMPLÉTER : …] » dans le texte des documents.
const Rich = ({ text }) => {
  const parts = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\[(À COMPLÉTER[^\]]*)\]/g;
  let last = 0; let match; let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[3]) {
      parts.push(<mark key={key++} className="rounded bg-burgundy-wash px-1 py-0.5 font-semibold text-burgundy">{match[3]}</mark>);
    } else if (match[2].startsWith('/')) {
      parts.push(<Link key={key++} to={match[2]} className="font-medium text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink">{match[1]}</Link>);
    } else {
      parts.push(<a key={key++} href={match[2]} rel="noopener noreferrer" target={match[2].startsWith('mailto:') ? undefined : '_blank'} className="font-medium text-ink underline decoration-gold decoration-2 underline-offset-4 hover:decoration-ink">{match[1]}</a>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
};

const Bloc = ({ bloc }) => {
  if (bloc.liste) {
    return (
      <ul className="my-4 space-y-2 pl-5 [&>li]:list-disc [&>li]:pl-1 marker:text-ink-muted">
        {bloc.liste.map((item) => <li key={item}><Rich text={item} /></li>)}
      </ul>
    );
  }
  if (bloc.tableau) {
    const [premier, ...autres] = bloc.tableau.entetes;
    return (
      <>
      {/* Téléphone : une carte par ligne, chaque valeur sous son intitulé (aucune colonne cachée à droite). */}
      <div className="my-5 divide-y divide-line overflow-hidden rounded-xl border border-line sm:hidden">
        {bloc.tableau.lignes.map((ligne) => (
          <div key={ligne.join('|')} className="px-4 py-4 text-[15px] leading-relaxed">
            <p className="sr-only">{premier}</p>
            <p className="font-semibold text-ink"><Rich text={ligne[0]} /></p>
            <dl className="mt-2 space-y-2">
              {autres.map((h, i) => (
                <div key={h}>
                  <dt className="text-[13px] font-medium text-ink-muted">{h}</dt>
                  <dd className="text-ink-soft"><Rich text={ligne[i + 1]} /></dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="my-5 hidden overflow-x-auto rounded-xl border border-line sm:block">
        <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
          <thead className="bg-paper-dim/70">
            <tr>{bloc.tableau.entetes.map((h) => <th key={h} className="px-4 py-3 font-semibold text-ink">{h}</th>)}</tr>
          </thead>
          <tbody>
            {bloc.tableau.lignes.map((ligne) => (
              <tr key={ligne.join('|')} className="border-t border-line align-top">
                {ligne.map((cell, i) => <td key={`${i}-${cell}`} className="px-4 py-3 text-ink-soft"><Rich text={cell} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    );
  }
  if (bloc.note) {
    return <p className="my-5 rounded-xl bg-paper-dim px-5 py-4 text-[15px] leading-relaxed text-ink-soft"><Rich text={bloc.note} /></p>;
  }
  return <p className="my-4"><Rich text={bloc.p} /></p>;
};

// Section en cours de lecture, pour le sommaire.
const useActiveSection = (ids) => {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-96px 0px -65% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ids]);
  return active;
};

const Sommaire = ({ sections, active, onNavigate }) => (
  <ol className="space-y-0.5">
    {sections.map((s) => (
      <li key={s.id}>
        <a
          href={`#${s.id}`}
          onClick={onNavigate}
          aria-current={active === s.id ? 'true' : undefined}
          className={`block rounded-lg px-3 py-1.5 text-[14px] leading-snug transition-colors ${active === s.id ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(13,27,50,0.06)]' : 'text-ink-soft hover:bg-white/70 hover:text-ink'}`}
        >
          {s.titre}
        </a>
      </li>
    ))}
  </ol>
);

const AutresDocuments = ({ courant }) => (
  <nav aria-label="Autres documents juridiques" className="mt-16 border-t border-line pt-8">
    <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">Les autres documents</h2>
    <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
      {DOCUMENTS.filter((d) => d.slug !== courant).map((d) => (
        <li key={d.slug} className="border-b border-line">
          <Link to={`/${d.slug}`} className="block py-3 text-[15px] text-ink-soft transition-colors hover:text-ink">{d.titre}</Link>
        </li>
      ))}
    </ul>
  </nav>
);

export const LegalDocumentPage = ({ slug: slugProp }) => {
  const params = useParams();
  const doc = documentBySlug(slugProp || params.slug);
  useSeo(doc ? legalSeo(doc) : null);
  const ids = React.useMemo(() => (doc ? doc.sections.map((s) => s.id) : []), [doc]);
  const active = useActiveSection(ids);
  const [ouvert, setOuvert] = useState(false);
  if (!doc) return null;

  return (
    <Container className="py-10 md:py-16">
      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-paper-dim/60 p-3">
            <p className="px-3 pb-2 pt-1 text-[13px] font-semibold text-ink">Sommaire</p>
            <Sommaire sections={doc.sections} active={active} />
            <Link to="/informations-legales" className="mt-3 block border-t border-line px-3 pt-3 text-[13px] text-ink-muted hover:text-ink">Tous les documents</Link>
          </div>
        </aside>

        <article className="max-w-[68ch] text-[17px] leading-[1.7] text-ink-soft">
          <Link to="/informations-legales" className="text-[14px] text-ink-muted hover:text-ink">Informations légales</Link>
          <h1 className="mt-3 text-balance text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink">{doc.titre}</h1>
          <p className="mt-4 text-[14px] tabular-nums text-ink-muted">Version {LEGAL_VERSION} · En vigueur le {LEGAL_DATE_TEXTE}</p>

          {doc.essentiel?.length ? (
            <section aria-label="L’essentiel" className="mt-8 rounded-2xl border border-line bg-white px-6 py-5">
              <h2 className="text-[15px] font-bold text-ink">L’essentiel</h2>
              <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
                {doc.essentiel.map((item) => (
                  <li key={item} className="flex gap-3"><span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /><span><Rich text={item} /></span></li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-6 lg:hidden">
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              aria-expanded={ouvert}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-paper-dim/60 px-4 py-3 text-left text-[15px] font-semibold text-ink"
            >
              Sommaire
              <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`} />
            </button>
            {ouvert ? <div className="mt-2 rounded-xl bg-paper-dim/60 p-2"><Sommaire sections={doc.sections} active={active} onNavigate={() => setOuvert(false)} /></div> : null}
          </div>

          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="mt-12 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">{s.titre}</h2>
              {s.blocs.map((bloc, i) => <Bloc key={`${s.id}-${i}`} bloc={bloc} />)}
            </section>
          ))}

          <p className="mt-12 text-[15px] text-ink-muted">
            Une question sur ce document ? Écris-nous à <a href="mailto:contact@fatafalta.com" className="font-medium text-ink underline decoration-gold decoration-2 underline-offset-4">contact@fatafalta.com</a>.
          </p>
          <AutresDocuments courant={doc.slug} />
        </article>
      </div>
    </Container>
  );
};

export const LegalHubPage = () => {
  useSeo({
    title: 'Informations légales — Fatafalta',
    description: 'Conditions d’utilisation, conditions d’abonnement, politique de confidentialité, cookies, sécurité, propriété intellectuelle et mentions légales de Fatafalta.',
    path: '/informations-legales',
  });
  return (
    <Container className="py-10 md:py-16">
      <div className="max-w-[68ch]">
        <h1 className="text-balance text-[clamp(2rem,4.5vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink">Informations légales</h1>
        <p className="mt-4 text-[17px] leading-[1.7] text-ink-soft">
          Les règles qui encadrent l’utilisation de Fatafalta, l’abonnement et la protection de tes données. Elles s’appliquent au site, à la version installée sur téléphone et à l’application Android.
        </p>
        <p className="mt-3 text-[14px] tabular-nums text-ink-muted">Version {LEGAL_VERSION} · En vigueur le {LEGAL_DATE_TEXTE}</p>
      </div>
      <ul className="mt-10 border-t border-line">
        {DOCUMENTS.map((d) => (
          <li key={d.slug} className="border-b border-line">
            <Link to={`/${d.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:gap-8">
              <span className="text-[17px] font-semibold text-ink group-hover:underline group-hover:decoration-gold group-hover:decoration-2 group-hover:underline-offset-4">{d.titre}</span>
              <span className="text-[15px] leading-relaxed text-ink-soft">{d.resume}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
};

export default LegalDocumentPage;
