import React, { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, ShieldAlert, UserPlus, X } from 'lucide-react';
import { StatusPill } from '../ui';
import { formatAmount, formatDate } from '../../lib/format';
import {
  AdminButton, Box, Pager, Panel, SearchBox, Select, TableState, Td, Th, adminApi, apiError, useAdminList,
} from './adminKit';

const ROLE_LABELS = { user: 'Utilisateur', partner: 'Partenaire', contributor: 'Contributeur', 'sub-admin': 'Administrateur', admin: 'Super admin' };

const Overlay = ({ onClose, children, wide }) => (
  <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-[2px]" role="dialog" aria-modal="true">
    <button type="button" aria-label="Fermer" className="absolute inset-0" onClick={onClose} />
    <div className={`relative h-full w-full overflow-y-auto bg-[#F8FAFC] shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
      <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200"><X size={18} /></button>
      {children}
    </div>
  </div>
);

/** Identifiants temporaires : affichés une seule fois, à transmettre à l'utilisateur. */
const Credentials = ({ email, password, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(`Email : ${email}\nMot de passe temporaire : ${password}`).then(() => setCopied(true)).catch(() => {});
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><KeyRound size={15} /> Identifiants temporaires</p>
      <p className="mt-1 text-xs text-amber-700">Affichés une seule fois. L’utilisateur devra choisir son propre mot de passe.</p>
      <dl className="mt-3 space-y-1 font-mono text-sm text-slate-800">
        <div><dt className="inline text-slate-500">Email : </dt><dd className="inline break-all">{email}</dd></div>
        <div><dt className="inline text-slate-500">Mot de passe : </dt><dd className="inline">{password}</dd></div>
      </dl>
      <div className="mt-3 flex gap-2">
        <AdminButton variant="secondary" onClick={copy}><Copy size={14} /> {copied ? 'Copié' : 'Copier'}</AdminButton>
        {onClose ? <AdminButton variant="secondary" onClick={onClose}>Terminé</AdminButton> : null}
      </div>
    </div>
  );
};

const CreateUser = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [state, setState] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true });
    try {
      const created = await adminApi.post('/users', form);
      setState({ created });
      onCreated();
    } catch (error) {
      setState({ error: apiError(error) });
    }
  };

  const input = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-300 focus:outline-none';

  return (
    <Overlay onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-black text-slate-800">Nouveau partenaire</h3>
        <p className="mt-1 text-sm text-slate-500">Son code promotionnel est actif en permanence, même sans abonnement. Un mot de passe temporaire est généré ; sans email, une adresse temporaire est créée.</p>
        {state.created ? (
          <div className="mt-6"><Credentials email={state.created.email} password={state.created.tempPassword} onClose={onClose} /></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-600">Nom complet<input required className={`${input} mt-1`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-slate-600">Téléphone<input className={`${input} mt-1`} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-slate-600">Email (facultatif)<input type="email" className={`${input} mt-1`} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
            <AdminButton type="submit" loading={state.loading} className="w-full">Créer le compte</AdminButton>
          </form>
        )}
      </div>
    </Overlay>
  );
};

const Section = ({ title, children }) => (
  <section className="mt-6">
    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
    <div className="rounded-2xl border border-slate-100 bg-white">{children}</div>
  </section>
);

const Line = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-semibold text-slate-800">{children}</span>
  </div>
);

const UserDetail = ({ userId, onClose, onChanged }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const load = useCallback(() => {
    adminApi.get(`/users/${userId}`).then((response) => setData(response.data)).catch((requestError) => setError(apiError(requestError)));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (name, request, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(name);
    setError(null);
    try {
      const result = await request();
      if (result?.user) setData(result);
      else load();
      onChanged();
      return result;
    } catch (requestError) {
      setError(apiError(requestError));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (status) => {
    const reason = status === 'ACTIVE' ? undefined : window.prompt('Motif (visible par l’équipe) :') || undefined;
    return act('status', () => adminApi.patch(`/users/${userId}`, { accountStatus: status, statusReason: reason }));
  };

  const setRole = (role) => act('role', () => adminApi.patch(`/users/${userId}`, { role }), `Changer le rôle en « ${ROLE_LABELS[role]} » ?`);

  const setPromo = (override) => {
    const note = override === 'ACTIVE' ? window.prompt('Action administrative : motif de l’activation forcée') : undefined;
    if (override === 'ACTIVE' && !note) return;
    act('promo', () => adminApi.post(`/users/${userId}/promo-code`, { override, note }));
  };

  const resetPassword = async () => {
    const result = await act('password', () => adminApi.post(`/users/${userId}/reset-password`), 'Générer un nouveau mot de passe temporaire ?');
    if (result?.tempPassword) setCredentials(result.tempPassword);
  };

  return (
    <Overlay onClose={onClose} wide>
      {!data ? (
        <div className="flex justify-center py-24">{error ? <p className="text-sm text-rose-600">{error}</p> : <Loader2 className="animate-spin text-slate-400" />}</div>
      ) : (
        <div className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{ROLE_LABELS[data.user.role]}</p>
          <h3 className="mt-1 text-2xl font-black text-slate-800">{data.user.name}</h3>
          <p className="text-sm text-slate-500">{[data.user.email, data.user.phone].filter(Boolean).join(' · ')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill status={data.user.accountStatus} label={`Compte : ${data.user.accountStatus === 'ACTIVE' ? 'actif' : data.user.accountStatus === 'DISABLED' ? 'désactivé' : 'suspendu'}`} />
            <StatusPill status={data.subscription.status} label={`Abonnement : ${data.subscription.status.toLowerCase()}`} />
            <StatusPill status={data.promoCode.status} label={`Code : ${data.promoCode.status === 'ACTIVE' ? 'actif' : 'inactif'}`} />
          </div>
          {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          {credentials ? <div className="mt-4"><Credentials email={data.user.email} password={credentials} /></div> : null}

          <Section title="Compte">
            <Line label="Inscrit le">{formatDate(data.user.createdAt)}</Line>
            {data.user.statusReason ? <Line label="Motif du statut">{data.user.statusReason}</Line> : null}
            {data.user.referredBy ? <Line label="Parrainé par">{data.user.referredBy.name}</Line> : null}
            <Line label="Rôle">
              <select aria-label="Rôle" value={data.user.role} disabled={busy === 'role'} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm">
                {Object.entries(ROLE_LABELS).filter(([role]) => role !== 'contributor' || data.user.role === 'contributor').map(([role, label]) => <option key={role} value={role}>{label}</option>)}
              </select>
            </Line>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {data.user.accountStatus === 'ACTIVE' ? (
                <>
                  <AdminButton variant="danger" loading={busy === 'status'} onClick={() => setStatus('DISABLED')}>Désactiver</AdminButton>
                  <AdminButton variant="secondary" loading={busy === 'status'} onClick={() => setStatus('SUSPENDED')}>Suspendre</AdminButton>
                </>
              ) : (
                <AdminButton variant="success" loading={busy === 'status'} onClick={() => setStatus('ACTIVE')}>Réactiver le compte</AdminButton>
              )}
              <AdminButton variant="secondary" loading={busy === 'password'} onClick={resetPassword}><KeyRound size={14} /> Mot de passe temporaire</AdminButton>
            </div>
          </Section>

          <Section title="Abonnement">
            <Line label="Statut"><StatusPill status={data.subscription.status} /></Line>
            {data.subscription.firstActivatedAt ? <Line label="Début">{formatDate(data.subscription.firstActivatedAt)}</Line> : null}
            {data.subscription.currentPeriodEnd ? <Line label="Expiration">{formatDate(data.subscription.currentPeriodEnd)}</Line> : null}
          </Section>

          <Section title="Code promotionnel">
            <Line label="Code"><span className="font-mono">{data.promoCode.code}</span></Line>
            <Line label="Statut">
              <span className="inline-flex items-center gap-2">
                <StatusPill status={data.promoCode.status} />
                {data.promoCode.adminOverride && data.user.role !== 'partner' ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><ShieldAlert size={12} /> forcé</span> : null}
              </span>
            </Line>
            {data.user.role === 'partner' ? (
              <p className="px-4 py-3 text-sm text-slate-500">Compte partenaire : code actif en permanence, indépendamment de l’abonnement.</p>
            ) : (
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <AdminButton variant="secondary" loading={busy === 'promo'} onClick={() => setPromo('ACTIVE')}>Forcer actif</AdminButton>
              <AdminButton variant="secondary" loading={busy === 'promo'} onClick={() => setPromo('INACTIVE')}>Forcer inactif</AdminButton>
              {data.promoCode.adminOverride ? <AdminButton variant="secondary" loading={busy === 'promo'} onClick={() => setPromo(null)}>Revenir à l’automatique</AdminButton> : null}
            </div>
            )}
            {data.promoCode.history.length ? (
              <ul className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                {data.promoCode.history.map((entry) => (
                  <li key={entry._id} className="py-0.5">
                    {`${formatDate(entry.at)} · ${entry.action}`}{entry.isAdminAction ? ' · action administrative' : ''}{entry.note ? ` · ${entry.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="Portefeuille">
            <Line label="Disponible">{formatAmount(data.balances.available)}</Line>
            <Line label="Gains générés">{formatAmount(data.balances.earned)}</Line>
            <Line label="Déjà retiré">{formatAmount(data.balances.withdrawn)}</Line>
            <Line label="Filleuls">{data.balances.referrals}</Line>
          </Section>

          <Section title={`Paiements (${data.payments.length})`}>
            {data.payments.length ? data.payments.map((payment) => (
              <Line key={payment.id} label={`${formatDate(payment.createdAt)} · ${payment.methodLabel}`}>
                <span className="inline-flex items-center gap-2">{formatAmount(payment.amount)} <StatusPill status={payment.status} /></span>
              </Line>
            )) : <p className="px-4 py-3 text-sm text-slate-400">Aucun paiement.</p>}
          </Section>

          <Section title={`Téléchargements récents (${data.downloads.length})`}>
            {data.downloads.length ? data.downloads.map((entry) => (
              <Line key={entry.id} label={formatDate(entry.date)}><span className="block max-w-[320px] truncate">{entry.title}</span></Line>
            )) : <p className="px-4 py-3 text-sm text-slate-400">Aucun téléchargement.</p>}
          </Section>
        </div>
      )}
    </Overlay>
  );
};

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const list = useAdminList('/users', { search: search || undefined, status: status || undefined, role: role || undefined });

  return (
    <Panel
      title="Utilisateurs"
      description="Comptes, abonnements et codes promotionnels."
      action={<AdminButton onClick={() => setCreating(true)}><UserPlus size={16} /> Nouveau partenaire</AdminButton>}
    >
      <div className="flex flex-wrap gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Nom, email ou téléphone…" />
        <Select label="Statut" value={status} onChange={setStatus} options={[['', 'Tous les statuts'], ['ACTIVE', 'Actifs'], ['DISABLED', 'Désactivés'], ['SUSPENDED', 'Suspendus']]} />
        <Select label="Rôle" value={role} onChange={setRole} options={[['', 'Tous les rôles'], ['user', 'Utilisateurs'], ['partner', 'Partenaires'], ['sub-admin', 'Administrateurs'], ['admin', 'Super admins']]} />
      </div>

      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/70"><tr><Th>Utilisateur</Th><Th>Rôle</Th><Th>Compte</Th><Th>Abonnement</Th><Th>Code</Th><Th>Inscrit le</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <TableState loading={list.loading && !list.data.length} error={list.error} empty={!list.data.length} colSpan={6} />
              {list.data.map((user) => (
                <tr key={user.id} onClick={() => setSelected(user.id)} className="cursor-pointer hover:bg-slate-50">
                  <Td><p className="font-semibold text-slate-800">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></Td>
                  <Td>{ROLE_LABELS[user.role] || user.role}</Td>
                  <Td><StatusPill status={user.accountStatus} /></Td>
                  <Td><StatusPill status={user.subscription.status} />{user.subscription.currentPeriodEnd ? <p className="mt-1 text-xs text-slate-400">{formatDate(user.subscription.currentPeriodEnd)}</p> : null}</Td>
                  <Td>{user.promoCode ? <><span className="font-mono text-xs">{user.promoCode.code}</span><div className="mt-1"><StatusPill status={user.promoCode.status} /></div></> : '—'}</Td>
                  <Td>{formatDate(user.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={list.pagination} page={list.page} setPage={list.setPage} />
      </Box>

      {creating ? <CreateUser onClose={() => setCreating(false)} onCreated={list.reload} /> : null}
      {selected ? <UserDetail userId={selected} onClose={() => setSelected(null)} onChanged={list.reload} /> : null}
    </Panel>
  );
};

export default AdminUsers;
