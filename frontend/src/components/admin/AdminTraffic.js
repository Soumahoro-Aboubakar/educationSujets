import React, { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import { Box, Panel, Select, TableState, Td, Th, adminApi, apiError } from './adminKit';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

/*
 * Provenance des visiteurs : d'où viennent les personnes qui arrivent sur Fatafalta (ChatGPT, Google,
 * Facebook, WhatsApp…), par jour, semaine ou mois, avec les inscriptions qu'elles apportent.
 * Données agrégées (compteurs par jour), aucune donnée personnelle.
 * Couleurs : une par famille de sources, toujours la même (palette catégorielle validée) ;
 * « Accès direct » en gris neutre.
 */
const CATEGORY_ORDER = ['ia', 'recherche', 'social', 'messagerie', 'campagne', 'site', 'application', 'direct'];
const CATEGORY_COLORS = {
  ia: '#2a78d6', recherche: '#eb6834', social: '#1baf7a', messagerie: '#eda100',
  campagne: '#e87ba4', site: '#008300', application: '#6250d6', direct: '#9a9893',
};
const SECTION_LABELS = { accueil: 'Accueil', sujets: 'Sujets', preparation: 'Préparation', abonnement: 'Abonnement', autre: 'Autre' };

const RANGES = [['7j', '7 derniers jours'], ['30j', '30 derniers jours'], ['90j', '90 derniers jours'], ['12m', '12 derniers mois']];
const GRANULARITIES = [['', 'Regroupement automatique'], ['jour', 'Par jour'], ['semaine', 'Par semaine'], ['mois', 'Par mois']];

const number = (value) => new Intl.NumberFormat('fr-FR').format(value || 0);
const percent = (value) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value || 0)} %`;
const periodLabel = (period, granularity) => {
  const date = new Date(`${period}T00:00:00Z`);
  if (granularity === 'mois') return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const label = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return granularity === 'semaine' ? `sem. ${label}` : label;
};

const Trend = ({ now, before }) => {
  if (!before) return now ? <span className="text-xs font-semibold text-slate-400">nouveau</span> : null;
  const change = ((now - before) / before) * 100;
  if (Math.abs(change) < 0.5) return <span className="text-xs font-semibold text-slate-400">stable</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
      <Icon size={13} aria-hidden />{`${up ? '+' : ''}${Math.round(change)} %`}
    </span>
  );
};

const Stat = ({ label, value, sub }) => (
  <Box className="p-5">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-[28px] font-black tabular-nums leading-tight text-slate-900">{value}</p>
    {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
  </Box>
);

const AdminTraffic = () => {
  const [range, setRange] = useState('30j');
  const [granularity, setGranularity] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    adminApi.get('/traffic', { range, granularity: granularity || undefined })
      .then((response) => { if (alive) setData(response.data); })
      .catch((requestError) => { if (alive) setError(apiError(requestError)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range, granularity]);

  // Familles présentes sur la période, dans l'ordre fixe (la couleur suit la famille, jamais son rang).
  const present = useMemo(() => CATEGORY_ORDER.filter((key) => data?.series.some((point) => point.categories[key] > 0)), [data]);

  const chart = useMemo(() => (data ? {
    labels: data.series.map((point) => periodLabel(point.period, data.granularity)),
    datasets: present.map((key) => ({
      label: data.categories[key],
      data: data.series.map((point) => point.categories[key] || 0),
      backgroundColor: CATEGORY_COLORS[key],
      borderColor: '#ffffff',
      borderWidth: { top: 2 },
      borderSkipped: 'bottom',
      borderRadius: 4,
      maxBarThickness: 28,
    })),
  } : null), [data, present]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    // Outil consulté souvent : les chiffres s'affichent tout de suite, sans animation d'entrée.
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a', padding: 10, boxPadding: 4, usePointStyle: true,
        filter: (item) => item.raw > 0,
        callbacks: { footer: (items) => `Total : ${number(items.reduce((sum, item) => sum + item.raw, 0))}` },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', maxRotation: 0, autoSkipPadding: 12 } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { color: '#64748b', precision: 0 } },
    },
  }), []);

  const totals = data?.totals;
  const top = data?.sources[0];
  const ia = data?.sources.filter((source) => source.category === 'ia').reduce((sum, source) => sum + source.visits, 0) || 0;

  return (
    <Panel
      title="Provenance des visiteurs"
      description="D’où viennent les personnes qui arrivent sur Fatafalta, et combien s’inscrivent."
      action={(
        <div className="flex flex-wrap gap-2">
          <Select label="Période" value={range} onChange={setRange} options={RANGES} />
          <Select label="Regroupement" value={granularity} onChange={setGranularity} options={GRANULARITIES} />
        </div>
      )}
    >
      {error ? <Box className="p-5 text-sm text-rose-600">{error}</Box> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Visites" value={totals ? number(totals.visits) : '—'} sub={totals ? <Trend now={totals.visits} before={totals.previousVisits} /> : null} />
        <Stat label="Inscriptions" value={totals ? number(totals.signups) : '—'} sub={totals ? <Trend now={totals.signups} before={totals.previousSignups} /> : null} />
        <Stat label="Taux d’inscription" value={totals?.visits ? percent((totals.signups / totals.visits) * 100) : '—'} sub="inscriptions / visites" />
        <Stat label="Assistants IA" value={totals ? number(ia) : '—'} sub={top ? <>Source n° 1 : <strong className="font-semibold text-slate-700">{top.label}</strong></> : 'ChatGPT, Gemini, Perplexity…'} />
      </div>

      <Box className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800">Visites par famille de sources</h3>
          {present.length ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Légende">
              {present.map((key) => (
                <li key={key} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[key] }} aria-hidden />
                  {data.categories[key]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mt-4 h-72" role="img" aria-label={`Visites par famille de sources, ${RANGES.find(([key]) => key === range)?.[1]}. Détail dans le tableau ci-dessous.`}>
          {loading && !data ? <div className="h-full animate-pulse rounded-2xl bg-slate-50" /> : null}
          {chart && totals?.visits ? <Bar data={chart} options={options} /> : null}
          {data && !totals?.visits ? <p className="flex h-full items-center justify-center text-sm text-slate-400">Aucune visite enregistrée sur cette période.</p> : null}
        </div>
      </Box>

      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50/70">
              <tr><Th>Source</Th><Th>Visites</Th><Th>Part</Th><Th>Évolution</Th><Th>Inscriptions</Th><Th>Taux</Th><Th>Arrivée surtout sur</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={loading && !data} error={null} empty={data && !data.sources.length} colSpan={7} />
              {data?.sources.map((source) => {
                const share = totals.visits ? (source.visits / totals.visits) * 100 : 0;
                const [mainSection] = Object.entries(source.sections).sort((a, b) => b[1] - a[1]);
                return (
                  <tr key={source.key}>
                    <Td>
                      <p className="font-semibold text-slate-800">{source.label}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[source.category] }} aria-hidden />
                        {data.categories[source.category]}
                      </p>
                    </Td>
                    <Td className="tabular-nums font-semibold">{number(source.visits)}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.max(share, 2)}%` }} /></div>
                        <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{percent(share)}</span>
                      </div>
                    </Td>
                    <Td><Trend now={source.visits} before={source.previousVisits} /></Td>
                    <Td className="tabular-nums">{number(source.signups)}</Td>
                    <Td className="tabular-nums text-slate-500">{source.visits ? percent((source.signups / source.visits) * 100) : '—'}</Td>
                    <Td className="text-slate-500">{mainSection && mainSection[1] ? SECTION_LABELS[mainSection[0]] : '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Box>

      <Box className="flex gap-3 p-5 text-sm leading-relaxed text-slate-600">
        <Info size={18} className="mt-0.5 shrink-0 text-indigo-500" aria-hidden />
        <div>
          <p><strong className="font-semibold text-slate-800">WhatsApp, Telegram, SMS :</strong> ces applications n’indiquent pas d’où vient le visiteur ; sans précaution, il est compté en « Accès direct ». Pour mesurer un partage, ajoutez <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">?utm_source=whatsapp</code> à la fin du lien (par ex. <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">https://fatafalta.com/preparation?utm_source=whatsapp</code>).</p>
          <p className="mt-2">Même principe pour une affiche, un partenaire ou une publicité : <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">?utm_source=affiche-inphb</code> apparaîtra comme une campagne. Une visite = une arrivée par session de navigation ; les robots ne sont pas comptés.</p>
        </div>
      </Box>
    </Panel>
  );
};

export default AdminTraffic;
