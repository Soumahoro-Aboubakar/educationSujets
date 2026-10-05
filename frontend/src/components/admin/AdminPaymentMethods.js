import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import PaymentMethodLogo from '../payments/PaymentMethodLogo';
import { AdminButton, Box, Panel, Td, Th, adminApi, apiError } from './adminKit';

/**
 * Moyens de paiement proposés aux abonnés. La configuration est enregistrée côté serveur :
 * elle s'applique immédiatement au site et à l'application, et le serveur refuse tout
 * paiement avec un moyen désactivé.
 */

const Toggle = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);


const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none';

const EditRow = ({ method, onSave, onCancel }) => {
  const [label, setLabel] = useState(method.label);
  const [logoUrl, setLogoUrl] = useState(method.logoUrl || '');
  const [steps, setSteps] = useState((method.confirmSteps || []).join('\n'));
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await onSave({
      label,
      logoUrl: logoUrl.trim() || null,
      ...(method.flow === 'push' ? { confirmSteps: steps.split('\n').map((step) => step.trim()).filter(Boolean) } : {}),
    });
    setSaving(false);
  };
  return (
    <tr className="bg-slate-50/60">
      <td colSpan={5} className="px-5 py-4">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1 text-xs font-semibold text-slate-500">Nom affiché
            <input className={`${inputClass} mt-1`} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} required />
          </label>
          <label className="min-w-[240px] flex-[2] text-xs font-semibold text-slate-500">Logo (adresse https, facultatif)
            <input className={`${inputClass} mt-1`} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…" type="url" />
          </label>
          {method.flow === 'push' ? (
            <label className="w-full text-xs font-semibold text-slate-500">Étapes de confirmation montrées après l’initiation (une par ligne, 5 au plus)
              <textarea className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none" rows={3} value={steps} onChange={(event) => setSteps(event.target.value)} placeholder="Composez #120#" />
            </label>
          ) : null}
          <AdminButton type="submit" loading={saving}>Enregistrer</AdminButton>
          <AdminButton variant="secondary" onClick={onCancel} disabled={saving}>Annuler</AdminButton>
        </form>
      </td>
    </tr>
  );
};

const AddMethodForm = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', requiresPhone: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) {
    return <AdminButton variant="secondary" onClick={() => setOpen(true)}><Plus size={15} /> Ajouter un moyen</AdminButton>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.post('/payment-methods', form);
      setForm({ code: '', label: '', requiresPhone: true });
      setOpen(false);
      onCreated();
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">L’identifiant technique doit correspondre exactement à une valeur <code className="rounded bg-slate-100 px-1">payment_method</code> prise en charge par GeniusPay. Le moyen est créé désactivé.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1 text-xs font-semibold text-slate-500">Identifiant technique
            <input className={`${inputClass} mt-1 font-mono`} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase() })} placeholder="airtel_money" pattern="[a-z0-9_]{2,40}" required />
          </label>
          <label className="min-w-[180px] flex-1 text-xs font-semibold text-slate-500">Nom affiché
            <input className={`${inputClass} mt-1`} value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Airtel Money" maxLength={60} required />
          </label>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.requiresPhone} onChange={(event) => setForm({ ...form, requiresPhone: event.target.checked })} />
            Numéro Mobile Money requis
          </label>
        </div>
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex gap-2">
          <AdminButton type="submit" loading={saving}>Ajouter</AdminButton>
          <AdminButton variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Annuler</AdminButton>
        </div>
      </form>
    </Box>
  );
};

const AdminPaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await adminApi.get('/payment-methods');
      setMethods(response.data);
      setError(null);
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (code, changes) => {
    setBusy(code);
    setError(null);
    try {
      const updated = await adminApi.patch(`/payment-methods/${code}`, changes);
      setMethods((current) => current.map((method) => (method.code === code ? updated : method)));
      setEditing(null);
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setBusy(null);
    }
  };

  const enabledCount = methods.filter((method) => method.enabled).length;

  return (
    <Panel
      title="Méthodes de paiement"
      description="Seuls les moyens activés sont proposés aux abonnés, sur le site comme sur l’application."
      action={<AddMethodForm onCreated={load} />}
    >
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p> : null}
      {!loading && methods.length && !enabledCount ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Aucun moyen n’est activé : les abonnés ne peuvent plus payer.</p>
      ) : null}
      <Box className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50/70"><tr><Th>Moyen</Th><Th>Identifiant technique</Th><Th>Numéro requis</Th><Th>Statut</Th><Th className="text-right">Activé</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center"><Loader2 size={20} className="mx-auto animate-spin text-slate-400" /></td></tr>
              ) : methods.map((method) => (
                <React.Fragment key={method.code}>
                  <tr>
                    <Td>
                      <div className="flex items-center gap-3">
                        <PaymentMethodLogo method={method} size="lg" />
                        <span className="font-semibold text-slate-800">{method.label}</span>
                        <button type="button" aria-label={`Modifier ${method.label}`} onClick={() => setEditing(editing === method.code ? null : method.code)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={14} /></button>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-slate-500">{method.code}</span>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{`→ ${method.gatewayMethod}${method.mmoProvider ? ` · ${method.mmoProvider}` : ''}`}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{method.flow === 'push' ? 'Validation sur le téléphone' : 'Page de paiement / QR code'}</p>
                    </Td>
                    <Td>{method.requiresPhone ? 'Oui' : 'Non'}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${method.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {method.enabled ? '✓ Activé' : '✕ Désactivé'}
                      </span>
                      {method.availableAtProvider === false ? (
                        <p className="mt-1 max-w-[200px] text-xs text-amber-700">Fermé chez GeniusPay pour le moment : non proposé aux abonnés.</p>
                      ) : null}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end">
                        {busy === method.code ? <Loader2 size={18} className="mr-3 animate-spin text-slate-400" /> : null}
                        <Toggle checked={method.enabled} disabled={busy === method.code} label={`${method.enabled ? 'Désactiver' : 'Activer'} ${method.label}`} onChange={(enabled) => update(method.code, { enabled })} />
                      </div>
                    </Td>
                  </tr>
                  {editing === method.code ? <EditRow method={method} onSave={(changes) => update(method.code, changes)} onCancel={() => setEditing(null)} /> : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </Panel>
  );
};

export default AdminPaymentMethods;
