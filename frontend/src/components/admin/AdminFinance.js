import React, { useState } from 'react';
import { StatusPill } from '../ui';
import { formatAmount, formatDate } from '../../lib/format';
import {
  AdminButton, Box, Pager, Panel, SearchBox, Select, TableState, Td, Th, adminApi, apiError, useAdminList,
} from './adminKit';

const KIND_LABELS = { initial: 'Abonnement', monthly: 'Mensualité' };

export const AdminPayments = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const list = useAdminList('/payments', { search: search || undefined, status: status || undefined });

  return (
    <Panel title="Paiements" description="Toutes les transactions d’abonnement, quel que soit leur statut.">
      <div className="flex flex-wrap gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Utilisateur, email ou référence…" />
        <Select label="Statut" value={status} onChange={setStatus} options={[['', 'Tous les statuts'], ['SUCCEEDED', 'Réussis'], ['PENDING', 'En attente'], ['FAILED', 'Échoués'], ['CANCELLED', 'Annulés'], ['EXPIRED', 'Expirés']]} />
      </div>
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50/70"><tr><Th>Date</Th><Th>Utilisateur</Th><Th>Type</Th><Th>Moyen</Th><Th>Code</Th><Th className="text-right">Montant</Th><Th>Statut</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={7} />
              {list.data.map((payment) => (
                <tr key={payment.id}>
                  <Td>{formatDate(payment.createdAt)}</Td>
                  <Td><p className="font-semibold text-slate-800">{payment.user?.name}</p><p className="text-xs text-slate-400">{payment.user?.email}</p></Td>
                  <Td>{KIND_LABELS[payment.kind]}</Td>
                  <Td>{payment.methodLabel}<p className="text-xs text-slate-400">{payment.channel === 'mobile' ? 'depuis l’app' : 'web'}</p></Td>
                  <Td>{payment.promoCode ? <span className="font-mono text-xs">{payment.promoCode}</span> : '—'}</Td>
                  <Td className="text-right font-semibold">{formatAmount(payment.amount)}{payment.discount ? <p className="text-xs font-normal text-slate-400">{`− ${formatAmount(payment.discount)}`}</p> : null}</Td>
                  <Td><StatusPill status={payment.status} />{payment.failureReason ? <p className="mt-1 max-w-[180px] text-xs text-slate-400">{payment.failureReason}</p> : null}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={list.pagination} page={list.page} setPage={list.setPage} />
      </Box>
    </Panel>
  );
};

const Withdrawals = () => {
  const [status, setStatus] = useState('PENDING');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const list = useAdminList('/withdrawals', { status: status || undefined });

  const process = async (withdrawal, nextStatus) => {
    const reference = nextStatus === 'PROCESSED' ? window.prompt('Référence de la transaction Mobile Money (facultatif) :') : undefined;
    const reason = nextStatus === 'FAILED' ? window.prompt('Raison de l’échec :') : undefined;
    if (nextStatus === 'FAILED' && !reason) return;
    if (nextStatus === 'PROCESSED' && !window.confirm(`Confirmer le versement de ${formatAmount(withdrawal.amount)} au ${withdrawal.phone} ?`)) return;
    setBusy(withdrawal.id);
    setError(null);
    try {
      await adminApi.post(`/withdrawals/${withdrawal.id}/process`, { status: nextStatus, reference, reason });
      list.reload();
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-800">Retraits</h3>
        <Select label="Statut" value={status} onChange={setStatus} options={[['PENDING', 'En attente'], ['PROCESSED', 'Traités'], ['FAILED', 'Échoués'], ['CANCELLED', 'Annulés'], ['', 'Tous']]} />
      </div>
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50/70"><tr><Th>Date</Th><Th>Bénéficiaire</Th><Th>Mobile Money</Th><Th className="text-right">Montant</Th><Th>Statut</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={6} />
              {list.data.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <Td>{formatDate(withdrawal.createdAt)}</Td>
                  <Td><p className="font-semibold text-slate-800">{`${withdrawal.firstName} ${withdrawal.lastName}`}</p><p className="text-xs text-slate-400">{withdrawal.user?.email}</p></Td>
                  <Td>{withdrawal.operatorLabel}<p className="font-mono text-xs text-slate-500">{withdrawal.phone}</p></Td>
                  <Td className="text-right font-semibold">{formatAmount(withdrawal.amount)}</Td>
                  <Td><StatusPill status={withdrawal.status} />{withdrawal.reference ? <p className="mt-1 text-xs text-slate-400">{withdrawal.reference}</p> : null}</Td>
                  <Td className="text-right">
                    {withdrawal.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <AdminButton variant="success" loading={busy === withdrawal.id} onClick={() => process(withdrawal, 'PROCESSED')}>Marquer versé</AdminButton>
                        <AdminButton variant="danger" disabled={busy === withdrawal.id} onClick={() => process(withdrawal, 'FAILED')}>Échec</AdminButton>
                      </div>
                    ) : null}
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

const Commissions = () => {
  const list = useAdminList('/commissions', {});
  const now = new Date();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">Commissions</h3>
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50/70"><tr><Th>Date</Th><Th>Parrain</Th><Th>Filleul</Th><Th>Code</Th><Th className="text-right">Montant</Th><Th>Statut</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={6} />
              {list.data.map((commission) => (
                <tr key={commission.id}>
                  <Td>{formatDate(commission.date)}</Td>
                  <Td>{commission.referrer?.name}<p className="text-xs text-slate-400">{commission.referrer?.email}</p></Td>
                  <Td>{commission.referredUser?.name}</Td>
                  <Td><span className="font-mono text-xs">{commission.code}</span></Td>
                  <Td className="text-right font-semibold">{formatAmount(commission.amount)}</Td>
                  <Td><StatusPill status={commission.status === 'REVERSED' ? 'REVERSED' : new Date(commission.availableAt) <= now ? 'AVAILABLE' : 'PENDING'} /></Td>
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

export const AdminReferrals = () => (
  <Panel title="Parrainage" description="Retraits à traiter en priorité, puis historique des commissions.">
    <Withdrawals />
    <Commissions />
  </Panel>
);
