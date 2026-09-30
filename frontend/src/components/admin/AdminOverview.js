import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatAmount } from '../../lib/format';
import { Box, Panel, adminApi, apiError } from './adminKit';

const Metric = ({ label, value, hint, tone = 'text-slate-800' }) => (
  <div className="p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`mt-1.5 text-2xl font-black ${tone}`}>{value}</p>
    {hint ? <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p> : null}
  </div>
);

const Group = ({ title, children }) => (
  <Box>
    <h3 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700">{title}</h3>
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 [&>*:nth-child(-n+2)]:border-t-0">{children}</div>
  </Box>
);

/** Indicateurs clés, regroupés par domaine. Un chiffre = une question que se pose l'équipe. */
const AdminOverview = () => {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    adminApi.get('/stats')
      .then((response) => setState({ data: response.data }))
      .catch((error) => setState({ error: apiError(error) }));
  }, []);

  if (state.loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (state.error) return <p className="text-sm text-rose-600">{state.error}</p>;

  const { users, subscriptions, payments, referrals, downloads } = state.data;

  return (
    <Panel title="Activité de la plateforme" description="Utilisateurs, abonnements, paiements et téléchargements.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Group title="Utilisateurs">
          <Metric label="Total" value={users.total} />
          <Metric label="Nouveaux (7 j)" value={users.newLast7Days} tone="text-indigo-600" />
          <Metric label="Actifs" value={users.active} />
          <Metric label="Désactivés" value={users.disabled} tone={users.disabled ? 'text-rose-600' : 'text-slate-800'} />
        </Group>
        <Group title="Abonnements">
          <Metric label="Actifs" value={subscriptions.active} tone="text-emerald-600" />
          <Metric label="Expirés" value={subscriptions.expired} />
          <Metric label="Renouvellements (30 j)" value={subscriptions.renewalsLast30Days} />
          <Metric label="Paiements en attente" value={payments.pending} tone={payments.pending ? 'text-amber-600' : 'text-slate-800'} />
        </Group>
        <Group title="Paiements">
          <Metric label="Montant encaissé" value={formatAmount(payments.totalAmount)} />
          <Metric label="Transactions réussies" value={payments.succeeded} />
          <Metric label="En attente" value={payments.pending} />
          <Metric label="Échouées (30 j)" value={payments.failedLast30Days} tone={payments.failedLast30Days ? 'text-rose-600' : 'text-slate-800'} />
        </Group>
        <Group title="Parrainage">
          <Metric label="Codes actifs" value={referrals.activeCodes} />
          <Metric label="Filleuls" value={referrals.commissions} />
          <Metric label="Commissions" value={formatAmount(referrals.commissionAmount)} />
          <Metric label="Retraits à traiter" value={referrals.pendingWithdrawals} hint={referrals.pendingWithdrawals ? formatAmount(referrals.pendingWithdrawalAmount) : undefined} tone={referrals.pendingWithdrawals ? 'text-amber-600' : 'text-slate-800'} />
        </Group>
      </div>

      <Box>
        <div className="grid divide-y divide-slate-100 md:grid-cols-[260px_1fr] md:divide-x md:divide-y-0">
          <div>
            <h3 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700">Téléchargements</h3>
            <Metric label="Aujourd’hui" value={downloads.today} />
            <Metric label="Limite atteinte" value={downloads.usersAtLimit} hint={`${downloads.dailyLimit} téléchargements / jour`} />
          </div>
          <div>
            <h3 className="border-b border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700">Documents populaires (30 j)</h3>
            {downloads.popular.length ? (
              <ol className="divide-y divide-slate-100">
                {downloads.popular.map((item, index) => (
                  <li key={item._id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="w-5 font-bold text-slate-300">{index + 1}</span>
                    <span className="flex-1 truncate font-medium text-slate-700">{item.title}</span>
                    <span className="font-bold text-slate-500">{item.count}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="px-5 py-8 text-sm text-slate-400">Aucun téléchargement sur la période.</p>}
          </div>
        </div>
      </Box>
    </Panel>
  );
};

export default AdminOverview;
