import React, { useEffect, useState } from 'react';
import {
  Box, Pager, Panel, SearchBox, Select, TableState, Td, Th, adminApi, apiError, useAdminList,
} from './adminKit';

/*
 * Suivi du quota gratuit : sujets 2010-2020 téléchargés sans abonnement (3 au total par compte).
 * Les données et les droits (administrateur seulement) sont contrôlés par /api/admin/free-downloads.
 */

const formatDateTime = (date) => (date
  ? new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

const Metric = ({ label, value, hint, tone = 'text-slate-800' }) => (
  <Box className="p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-1.5 text-2xl font-black ${tone}`}>{value ?? '—'}</p>
    {hint ? <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p> : null}
  </Box>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
    {label}
    <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent text-slate-700 focus:outline-none" />
  </label>
);

const History = ({ stats }) => {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [year, setYear] = useState('');
  const [organisme, setOrganisme] = useState('');
  const list = useAdminList('/free-downloads', {
    search: search || undefined, from: from || undefined, to: to || undefined, year: year || undefined, organisme: organisme || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Utilisateur, email ou titre du sujet…" />
        <Select label="Année du sujet" value={year} onChange={setYear} options={[['', 'Toutes les années'], ...(stats?.filters.years || []).map((item) => [String(item), String(item)])]} />
        <Select label="Organisme" value={organisme} onChange={setOrganisme} options={[['', 'Tous les organismes'], ...(stats?.filters.organismes || []).map((item) => [item.id, item.nom])]} />
        <DateInput label="Du" value={from} onChange={setFrom} />
        <DateInput label="Au" value={to} onChange={setTo} />
      </div>
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50/70"><tr><Th>Date</Th><Th>Utilisateur</Th><Th>Sujet</Th><Th>Année</Th><Th>Organisme</Th><Th>Quota</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={6} />
              {list.data.map((row) => (
                <tr key={row.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(row.date)}</Td>
                  <Td>
                    {row.user
                      ? <><p className="font-semibold text-slate-800">{row.user.name}</p><p className="text-xs text-slate-400">{row.user.email}</p></>
                      : <p className="text-slate-500">{`Visiteur sans compte${row.visitor ? ` · ${row.visitor}` : ''}`}</p>}
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-800">{row.document.title}</p>
                    <p className="text-xs text-slate-400">{[row.parcoursType, row.matiere].filter(Boolean).join(' · ') || '—'}</p>
                  </Td>
                  <Td>{row.year ?? '—'}</Td>
                  <Td>{row.organisme?.nom || '—'}</Td>
                  <Td>
                    {row.charged
                      ? <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">Décompté</span>
                      : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Re-téléchargement</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={list.pagination} page={list.page} setPage={list.setPage} />
      </Box>
    </div>
  );
};

const Accounts = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const list = useAdminList('/free-downloads/users', { search: search || undefined, status: status || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Nom ou email…" />
        <Select label="État du quota" value={status} onChange={setStatus} options={[['', 'Tous les comptes'], ['exhausted', 'Quota épuisé'], ['available', 'Quota disponible']]} />
      </div>
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50/70"><tr><Th>Utilisateur</Th><Th className="text-right">Utilisés</Th><Th className="text-right">Restants</Th><Th className="text-right">Livraisons</Th><Th>Dernier</Th><Th>État</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={6} />
              {list.data.map((row) => (
                <tr key={row.user.id}>
                  <Td><p className="font-semibold text-slate-800">{row.user.name}</p><p className="text-xs text-slate-400">{row.user.email}</p></Td>
                  <Td className="text-right font-semibold">{`${row.used} / ${row.limit}`}</Td>
                  <Td className="text-right">{row.remaining}</Td>
                  <Td className="text-right">{row.deliveries}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(row.lastAt)}</Td>
                  <Td>
                    {row.exhausted
                      ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">Épuisé</span>
                      : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">Disponible</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={list.pagination} page={list.page} setPage={list.setPage} />
      </Box>
    </div>
  );
};

const AdminFreeDownloads = () => {
  const [view, setView] = useState('history');
  const [stats, setStats] = useState({ loading: true });

  useEffect(() => {
    adminApi.get('/free-downloads/stats')
      .then((response) => setStats({ data: response.data }))
      .catch((error) => setStats({ error: apiError(error) }));
  }, []);

  const data = stats.data;
  const range = data ? `${data.freeUntilYear + 1}-${data.freeQuotaUntilYear}` : '2010-2020';

  return (
    <Panel
      title="Téléchargements gratuits"
      description={`Sujets ${range} téléchargés sans abonnement, sur le quota gratuit de ${data?.limit ?? 3} téléchargements par compte.`}
    >
      {stats.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{stats.error}</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Téléchargements gratuits" value={data?.charged} hint={data ? `${data.deliveries} livraisons, re-téléchargements compris` : null} tone="text-indigo-600" />
        <Metric label="Comptes concernés" value={data?.accounts} />
        <Metric label="Quota épuisé" value={data?.exhausted} tone={data?.exhausted ? 'text-rose-600' : 'text-slate-800'} />
        <Metric label="Quota par compte" value={data?.limit} hint={`Sujets de ${data?.freeUntilYear ?? 2009} et avant : illimités`} />
      </div>

      {data?.topUsers?.length ? (
        <Box>
          <h3 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700">Utilisateurs gratuits les plus actifs</h3>
          <ul className="divide-y divide-slate-100">
            {data.topUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span><span className="font-semibold text-slate-800">{user.name}</span> <span className="text-slate-400">{user.email}</span></span>
                <span className="text-slate-500">{`${user.count} téléchargement${user.count > 1 ? 's' : ''} · ${formatDateTime(user.lastAt)}`}</span>
              </li>
            ))}
          </ul>
        </Box>
      ) : null}

      <div className="flex gap-2" role="tablist" aria-label="Vue">
        {[['history', 'Historique'], ['accounts', 'Par utilisateur']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${view === id ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'history' ? <History stats={data} /> : <Accounts />}
    </Panel>
  );
};

export default AdminFreeDownloads;
