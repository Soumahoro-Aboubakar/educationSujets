import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Smartphone } from 'lucide-react';
import { AdminButton, Box, Panel, adminApi, apiError } from './adminKit';

/*
 * Mises à jour des applications (super administrateur) : pour chaque plateforme, « Aucune action »,
 * « Conseillée » (message qu'on peut fermer) ou « Obligatoire » (blocage jusqu'à la mise à jour).
 * Application Android : comparée au numéro de build installé (versionCode de app.json).
 * Le site et la PWA n'ont pas de réglage : ils se mettent à jour seuls, sans message (PwaHelper).
 */

const PLATFORMS = [
  { id: 'android', label: 'Application Android', icon: Smartphone },
];

const MODES = [
  ['none', 'Aucune action', 'Rien n’est affiché.'],
  ['recommended', 'Conseillée', 'Un message propose la mise à jour ; l’utilisateur peut le fermer.'],
  ['required', 'Obligatoire', 'L’utilisateur doit mettre à jour pour continuer.'],
];

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
  </label>
);
const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const PlatformCard = ({ platform, policy, onSaved }) => {
  const [form, setForm] = useState(policy);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => setForm(policy), [policy]);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    if (form.mode === 'required' && !window.confirm(`Rendre la mise à jour obligatoire ? Tout appareil dont le build est inférieur à ${form.latestBuild || '…'} sera bloqué jusqu’à la mise à jour.`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      const body = { mode: form.mode, latestBuild: Number(form.latestBuild) || 0, latestVersion: form.latestVersion, message: form.message, storeUrl: form.storeUrl };
      const { data } = await axios.put(`/api/admin/app-releases/${platform.id}`, body);
      onSaved(data.data);
      setFeedback({ ok: true, text: 'Enregistré. Appliqué sous une minute.' });
    } catch (error) {
      setFeedback({ ok: false, text: apiError(error) });
    } finally {
      setSaving(false);
    }
  };

  const Icon = platform.icon;
  return (
    <Box className="p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={19} /></span>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{platform.label}</h3>
          {policy.updatedAt ? <p className="text-xs text-slate-400">{`Modifié le ${new Date(policy.updatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}`}</p> : null}
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-700">Mise à jour</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {MODES.map(([value, label, hint]) => (
            <label key={value} className={`cursor-pointer rounded-2xl border p-3.5 transition-colors ${form.mode === value ? (value === 'required' ? 'border-rose-300 bg-rose-50' : 'border-indigo-300 bg-indigo-50') : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name={`mode-${platform.id}`} value={value} checked={form.mode === value} onChange={set('mode')} className="sr-only" />
              <span className="block text-sm font-bold text-slate-800">{label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Numéro de build publié" hint="versionCode de la version disponible sur le Play Store (app.json → android.versionCode).">
            <input type="number" min="0" inputMode="numeric" value={form.latestBuild || ''} onChange={set('latestBuild')} className={inputClass} placeholder="ex. 12" />
          </Field>
          <Field label="Version affichée" hint="Facultatif, ex. 1.2.0.">
            <input value={form.latestVersion || ''} onChange={set('latestVersion')} className={inputClass} placeholder="1.2.0" />
          </Field>
          <Field label="Lien du magasin" hint="Google Play uniquement. Vide : fiche Fatafalta sur le Play Store.">
            <input value={form.storeUrl || ''} onChange={set('storeUrl')} className={inputClass} placeholder="https://play.google.com/store/apps/details?id=com.fatafalta.mobile" />
          </Field>
        </div>

      <div className="mt-4">
        <Field label="Message affiché" hint={`${(form.message || '').length}/280 — facultatif ; sinon un message par défaut.`}>
          <textarea rows={2} maxLength={280} value={form.message || ''} onChange={set('message')} className={`${inputClass} h-auto py-2.5`} placeholder="Ex. Cette version corrige le téléchargement des sujets." />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AdminButton loading={saving} onClick={save} variant={form.mode === 'required' ? 'danger' : 'primary'}>Enregistrer</AdminButton>
        {feedback ? <p role="status" className={`text-sm font-medium ${feedback.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{feedback.text}</p> : null}
      </div>
    </Box>
  );
};

const AdminAppReleases = () => {
  const [policies, setPolicies] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    adminApi.get('/app-releases').then((response) => setPolicies(response.data)).catch((requestError) => setError(apiError(requestError)));
  }, []);
  const byId = (id) => policies?.find((policy) => policy.platform === id);
  const replace = (saved) => setPolicies((current) => current.map((policy) => (policy.platform === saved.platform ? saved : policy)));

  return (
    <Panel title="Mises à jour" description="Proposez ou imposez la dernière version de l’application. Le site et la PWA se mettent à jour seuls.">
      {error ? <Box className="p-5 text-sm text-rose-600">{error}</Box> : null}
      {!policies && !error ? <Box className="p-5 text-sm text-slate-400">Chargement…</Box> : null}
      {policies ? PLATFORMS.map((platform) => (
        <PlatformCard key={platform.id} platform={platform} policy={byId(platform.id)} onSaved={replace} />
      )) : null}
    </Panel>
  );
};

export default AdminAppReleases;
