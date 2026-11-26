import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Download, Info, RefreshCw, Search, Send } from 'lucide-react';
import { AdminButton, Box, Pager, Panel, SearchBox, Select, TableState, Td, Th, adminApi, apiError } from './adminKit';

/*
 * Référencement et indexation : file IndexNow, versions du site détectées, sitemaps, Search Console.
 * Vocabulaire volontairement strict : « acceptée » = reçue par IndexNow, jamais « indexée ».
 * Seule l'API d'inspection de Google peut dire qu'une page est explorée ou indexée (et à quelle date).
 */
const number = (value) => new Intl.NumberFormat('fr-FR').format(value || 0);
const dateTime = (value) => (value ? new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (value) => (value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const FILTERS = [['changed', 'Modifiées'], ['pending', 'En attente d’envoi'], ['accepted', 'Notification acceptée'], ['failed', 'Échecs'], ['removed', 'Retirées du site'], ['indexed', 'Indexées (Google)'], ['', 'Toutes les pages']];
const CHANGE = { ajout: 'Ajoutée', modification: 'Modifiée', suppression: 'Supprimée' };
const LOG_TYPES = { evenement: 'Contenu', reconstruction: 'Reconstruction', version: 'Version en ligne', indexnow: 'IndexNow', google: 'Google', erreur: 'Erreur', action: 'Action' };

const IndexNowState = ({ page }) => {
  const state = page.indexNow?.state;
  if (state === 'accepted') return <span className="font-semibold text-emerald-700" title={`HTTP ${page.indexNow.lastStatus}`}>{`Acceptée · ${dateTime(page.indexNow.acceptedAt)}`}</span>;
  if (state === 'pending') return <span className="text-amber-700">{`En attente · ${dateTime(page.indexNow.nextAttemptAt)}`}</span>;
  if (state === 'sent') return <span className="text-amber-700">Envoyée, réponse attendue</span>;
  if (state === 'failed') return <span className="font-semibold text-rose-700" title={page.indexNow.lastError || ''}>{`Échec · ${page.indexNow.lastError || ''}`}</span>;
  return <span className="text-slate-400">—</span>;
};

const GoogleState = ({ google }) => {
  if (!google?.checkedAt) return <span className="text-slate-400">Non inspectée</span>;
  if (google.error) return <span className="text-rose-700" title={google.error}>Erreur d’inspection</span>;
  const indexed = google.verdict === 'PASS';
  return (
    <span className={indexed ? 'text-emerald-700' : 'text-slate-600'} title={`Inspectée le ${dateTime(google.checkedAt)}`}>
      {indexed ? 'Indexée' : (google.coverageState || 'Non indexée')}
      <span className="block text-xs text-slate-400">{google.lastCrawlTime ? `Explorée le ${day(google.lastCrawlTime)}` : 'Jamais explorée'}</span>
    </span>
  );
};

const Stat = ({ label, value, sub, tone = 'text-slate-900' }) => (
  <Box className="p-5">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className={`mt-1 text-[28px] font-black tabular-nums leading-tight ${tone}`}>{value}</p>
    {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
  </Box>
);

const Check = ({ ok, children }) => (
  <li className="flex items-start gap-2 text-sm text-slate-600">
    {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />}
    <span>{children}</span>
  </li>
);

const AdminSeo = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('changed');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(null);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [inspection, setInspection] = useState(null);

  const load = useCallback(() => adminApi.get('/seo').then((response) => setData(response.data)).catch((e) => setError(apiError(e))), []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    setPagesLoading(true);
    const timer = setTimeout(() => {
      adminApi.get('/seo/pages', { filtre: filter || undefined, q: q || undefined, page })
        .then((response) => { if (alive) setPages(response.data); })
        .catch((e) => { if (alive) setError(apiError(e)); })
        .finally(() => { if (alive) setPagesLoading(false); });
    }, q ? 300 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [filter, q, page, data]);

  const act = async (name, request, message) => {
    setBusy(name);
    setError(null);
    setNotice(null);
    try {
      const result = await request();
      if (result?.totals) setData(result);
      else await load();
      setNotice(typeof message === 'function' ? message(result) : message);
      return result;
    } catch (e) {
      setError(apiError(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const exportReport = async () => {
    setBusy('export');
    try {
      const response = await axios.get('/api/admin/seo/rapport.csv', { responseType: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(response.data);
      link.download = `fatafalta-seo-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(null);
    }
  };

  const totals = data?.totals;
  const cfg = data?.configuration;

  return (
    <Panel
      title="SEO et indexation"
      description="Ce que les moteurs de recherche savent des pages publiques de Fatafalta, et ce qui leur a été signalé."
      action={(
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="secondary" loading={busy === 'check'} onClick={() => act('check', () => adminApi.post('/seo/verification'), 'Version en ligne relue et file traitée.')}><RefreshCw size={15} aria-hidden />Vérifier maintenant</AdminButton>
          <AdminButton variant="secondary" loading={busy === 'export'} onClick={exportReport}><Download size={15} aria-hidden />Exporter le rapport</AdminButton>
          <AdminButton loading={busy === 'rebuild'} disabled={!cfg?.deployHook} title={cfg?.deployHook ? '' : 'FRONTEND_DEPLOY_HOOK_URL non configuré'} onClick={() => act('rebuild', () => adminApi.post('/seo/reconstruction'), 'Reconstruction demandée : les sitemaps seront à jour une fois le site redéployé (quelques minutes).')}>Régénérer les sitemaps</AdminButton>
        </div>
      )}
    >
      {error ? <Box className="p-4 text-sm font-medium text-rose-600" role="alert">{error}</Box> : null}
      {notice ? <Box className="p-4 text-sm font-medium text-emerald-700" role="status">{notice}</Box> : null}

      {data?.pendingReview ? (
        <Box className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-900"><strong>{number(data.pendingReview.removed)} pages</strong> ont disparu d’un coup de la version en ligne. Les retraits sont suspendus : vérifiez le site avant de confirmer.</p>
          <AdminButton variant="danger" loading={busy === 'removals'} onClick={() => act('removals', () => adminApi.post('/seo/retraits/confirmer', { buildId: data.pendingReview.buildId }), 'Retraits appliqués.')}>Confirmer les retraits</AdminButton>
        </Box>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="URL indexables" value={totals ? number(totals.indexable) : '—'} sub={totals ? `dans les sitemaps · ${number(totals.live)} pages publiques suivies` : null} />
        <Stat label="En attente d’envoi" value={totals ? number(totals.pending + totals.sent) : '—'} tone={totals?.pending ? 'text-amber-700' : 'text-slate-900'} sub="modifiées, pas encore signalées" />
        <Stat label="Notifications acceptées" value={totals ? number(totals.accepted) : '—'} tone="text-emerald-700" sub={data ? `reçues par IndexNow · ${number(data.submissions30d.ok)} envoi(s) réussi(s) en 30 j` : null} />
        <Stat label="Échecs" value={totals ? number(totals.failed) : '—'} tone={totals?.failed ? 'text-rose-700' : 'text-slate-900'} sub={data ? (
          totals.failed ? <button type="button" className="font-semibold text-indigo-600 hover:underline disabled:opacity-50" disabled={busy === 'retry'} onClick={() => act('retry', () => adminApi.post('/seo/echecs/relancer'), (r) => `${r?.count ?? 0} envoi(s) relancé(s).`)}>Relancer les échecs</button> : `${number(data.submissions30d.failed)} envoi(s) en échec en 30 j`
        ) : null} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box className="p-5">
          <h3 className="text-base font-bold text-slate-800">Site et IndexNow (Bing, Yandex, Seznam…)</h3>
          <ul className="mt-3 space-y-2">
            <Check ok={Boolean(data?.build?.buildId) && !data?.build?.error}>{data?.build?.buildId ? <>Version en ligne du <strong className="font-semibold text-slate-800">{dateTime(data.build.builtAt)}</strong>{data.build.commit ? ` (commit ${data.build.commit})` : ''}, relue {dateTime(data.build.lastCheckAt)}.</> : 'Aucune version en ligne lue pour l’instant.'}{data?.build?.error ? <span className="block text-rose-600">{data.build.error}</span> : null}</Check>
            <Check ok={!data?.rebuild?.pendingSince}>{data?.rebuild?.inFlight ? `Reconstruction en cours (demandée ${dateTime(data.rebuild.requestedAt)}).` : data?.rebuild?.pendingSince ? `Changements en attente de reconstruction depuis ${dateTime(data.rebuild.pendingSince)}.` : 'Aucun changement en attente de reconstruction.'} <span className="text-slate-400">{data ? `${data.rebuild.today}/${data.rebuild.maxPerDay} reconstructions aujourd’hui.` : ''}</span>{data?.rebuild?.error && data.rebuild.error !== 'quota' ? <span className="block text-rose-600">{data.rebuild.error}</span> : null}</Check>
            <Check ok={cfg?.indexNowKey && data?.indexNow?.keyValid !== false}>{!cfg?.indexNowKey ? 'Clé IndexNow non configurée (INDEXNOW_KEY).' : data?.indexNow?.keyValid === false ? 'Fichier de clé IndexNow introuvable ou refusé : envois suspendus.' : `Clé IndexNow publiée${data?.indexNow?.keyCheckedAt ? `, vérifiée ${dateTime(data.indexNow.keyCheckedAt)}` : ''}.`}</Check>
            <Check ok={Boolean(data?.submissions30d?.lastSuccessAt)}>{`Dernier envoi accepté : ${dateTime(data?.submissions30d?.lastSuccessAt)}${data?.submissions30d?.lastFailureAt ? ` · dernier échec : ${dateTime(data.submissions30d.lastFailureAt)}` : ''}.`}</Check>
          </ul>
        </Box>
        <Box className="p-5">
          <h3 className="text-base font-bold text-slate-800">Google Search Console</h3>
          {cfg && !cfg.google ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Non reliée. Google n’utilise pas IndexNow : il découvre les pages par le sitemap et les liens. Pour voir ici l’état d’exploration et d’indexation, configurez un compte de service (voir <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">docs/seo-indexation.md</code>).</p>
          ) : (
            <ul className="mt-3 space-y-2">
              <Check ok={Boolean(data?.google?.sitemap) && !data?.google?.sitemap?.errors}>{data?.google?.sitemap ? `Sitemap lu par Google le ${dateTime(data.google.sitemap.lastDownloaded)} · ${number(data.google.sitemap.submitted)} URL envoyées · ${data.google.sitemap.errors} erreur(s), ${data.google.sitemap.warnings} avertissement(s).` : 'État du sitemap pas encore lu.'}</Check>
              <Check ok={Boolean(data?.google?.submittedAt)}>{`Dernière soumission du sitemap : ${dateTime(data?.google?.submittedAt)}.`}</Check>
              <Check ok>{totals ? `${number(totals.googleIndexed)} page(s) indexée(s) et ${number(totals.googleCrawled)} explorée(s), d’après les inspections (${data.google.inspectionsToday}/${data.google.inspectionsPerDay} aujourd’hui).` : '—'}</Check>
              {data?.google?.error ? <Check ok={false}><span className="text-rose-600">{data.google.error}</span></Check> : null}
            </ul>
          )}
          {cfg?.google ? <AdminButton variant="secondary" className="mt-4" loading={busy === 'sitemap'} onClick={() => act('sitemap', () => adminApi.post('/seo/google/sitemap'), 'Sitemap soumis à Search Console.')}>Soumettre le sitemap</AdminButton> : null}
        </Box>
      </div>

      <Box className="p-5">
        <h3 className="text-base font-bold text-slate-800">Une page précise</h3>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="seo-url">Adresse de la page</label>
          <input id="seo-url" type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://fatafalta.com/sujets/…" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          <AdminButton variant="secondary" loading={busy === 'submit'} disabled={!url} onClick={() => act('submit', () => adminApi.post('/seo/indexnow', { url }), (r) => r?.message || 'Ajoutée à la file.')}><Send size={15} aria-hidden />Signaler à IndexNow</AdminButton>
          <AdminButton variant="secondary" loading={busy === 'inspect'} disabled={!url || !cfg?.google} title={cfg?.google ? '' : 'Search Console non configurée'} onClick={async () => { const r = await act('inspect', () => adminApi.post('/seo/google/inspection', { url }), 'Inspection Google terminée.'); if (r) setInspection(r); }}><Search size={15} aria-hidden />Inspecter sur Google</AdminButton>
        </form>
        {inspection ? (
          <p className="mt-3 text-sm text-slate-600">
            {`Google : ${inspection.verdict === 'PASS' ? 'indexée' : 'non indexée'}${inspection.coverageState ? ` — ${inspection.coverageState}` : ''}. Dernière exploration : ${inspection.lastCrawlTime ? dateTime(inspection.lastCrawlTime) : 'jamais'}.`}
            {inspection.googleCanonical ? ` Canonique retenue : ${inspection.googleCanonical}.` : ''}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">Seules les pages publiques présentes dans la version en ligne sont acceptées ; une même version n’est pas renvoyée deux fois dans l’heure.</p>
      </Box>

      <Box className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <Select label="Afficher" value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={FILTERS} />
          <div className="min-w-[220px] flex-1"><SearchBox value={q} onChange={(value) => { setQ(value); setPage(1); }} placeholder="Filtrer par adresse (ex. /sujets/ensea)" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50/70">
              <tr><Th>Page</Th><Th>Changement</Th><Th>lastmod</Th><Th>IndexNow</Th><Th>Google</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={pagesLoading && !pages} error={null} empty={pages && !pages.items.length} colSpan={5} />
              {pages?.items.map((item) => (
                <tr key={item.path} className={item.live ? '' : 'bg-slate-50/60'}>
                  <Td className="max-w-[340px]">
                    {item.live ? <a href={item.url} target="_blank" rel="noreferrer" className="break-all font-medium text-slate-800 hover:text-indigo-600">{item.path}</a> : <span className="break-all font-medium text-slate-500 line-through">{item.path}</span>}
                    <span className="block text-xs text-slate-400">{[item.category, item.live && !item.inSitemap ? 'hors sitemap' : null].filter(Boolean).join(' · ')}</span>
                  </Td>
                  <Td>{item.changeType ? <>{CHANGE[item.changeType]}<span className="block text-xs text-slate-400">{dateTime(item.changedAt)}</span></> : <span className="text-slate-400">Version de référence</span>}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{day(item.lastmod)}</Td>
                  <Td><IndexNowState page={item} /></Td>
                  <Td><GoogleState google={item.google} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={pages ? { total: pages.total, pages: pages.pages } : null} page={page} setPage={setPage} />
      </Box>

      <Box className="overflow-hidden">
        <h3 className="border-b border-slate-100 px-5 py-4 text-base font-bold text-slate-800">Historique</h3>
        <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {data?.logs.length ? data.logs.map((entry) => (
            <li key={entry._id} className="flex gap-3 px-5 py-3 text-sm">
              <span className="w-28 shrink-0 tabular-nums text-slate-400">{dateTime(entry.at)}</span>
              <span className={`w-32 shrink-0 font-semibold ${entry.ok === false || entry.type === 'erreur' ? 'text-rose-700' : 'text-slate-600'}`}>{LOG_TYPES[entry.type] || entry.type}</span>
              <span className="min-w-0 text-slate-700">{entry.message || (entry.type === 'evenement' ? `Contenu modifié (${entry.source}${entry.count ? `, ${entry.count} élément(s)` : ''})` : '')}</span>
            </li>
          )) : <li className="px-5 py-8 text-center text-sm text-slate-400">Aucun événement pour l’instant.</li>}
        </ul>
      </Box>

      <Box className="flex gap-3 p-5 text-sm leading-relaxed text-slate-600">
        <Info size={18} className="mt-0.5 shrink-0 text-indigo-500" aria-hidden />
        <div>
          <p><strong className="font-semibold text-slate-800">Les étapes, dans l’ordre :</strong> page <em>modifiée</em> (constatée dans la version en ligne) → <em>en attente</em> → <em>notification envoyée</em> → <em>notification acceptée</em> (IndexNow l’a reçue) → <em>explorée</em> puis <em>indexée</em> (uniquement d’après Google Search Console).</p>
          <p className="mt-2">Une notification acceptée signifie que le moteur a reçu l’adresse ; elle ne garantit ni l’exploration ni l’indexation. Google n’utilise pas IndexNow : il s’appuie sur le sitemap, dont les dates (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">lastmod</code>) ne changent que si le contenu change réellement.</p>
        </div>
      </Box>
    </Panel>
  );
};

export default AdminSeo;
