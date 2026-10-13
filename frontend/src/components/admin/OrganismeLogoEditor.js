import React, { useEffect, useState } from 'react';
import { ImagePlus, Link2, Save, Trash2 } from 'lucide-react';
import OrganismeLogo from '../catalog/OrganismeLogo';
import { errorMessage, organismeLogos } from '../../lib/api';

/*
 * Logo d'un organisme (administration web uniquement) : ajout, remplacement, suppression.
 * Deux sources : image envoyée (PNG/JPEG, 2 Mo, normalisée par le serveur) ou adresse https.
 * L'image est prévisualisée et contrôlée (chargement, dimensions) avant l'enregistrement.
 * Sans logo, le site et l'application affichent les deux premiers caractères du nom.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const MIN_SIDE = 32;

/** Charge une image dans le navigateur : ses dimensions, ou une erreur si elle est inexploitable. */
const probeImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error('unreadable'));
  image.src = src;
});

const OrganismeLogoEditor = ({ organisme, onSaved }) => {
  const [source, setSource] = useState('file');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [check, setCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Changement d'organisme : formulaire vidé.
  useEffect(() => {
    setFile(null); setUrl(''); setPreview(null); setCheck(null); setMessage(null);
  }, [organisme?._id]);

  // Prévisualisation et contrôle de l'image choisie.
  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    const candidate = source === 'file' && file ? (objectUrl = URL.createObjectURL(file)) : source === 'url' && /^https:\/\/\S+$/.test(url.trim()) ? url.trim() : null;
    setPreview(candidate);
    setCheck(null);
    if (candidate) {
      setCheck({ state: 'checking' });
      probeImage(candidate)
        .then(({ width, height }) => {
          if (cancelled) return;
          if (width < MIN_SIDE || height < MIN_SIDE) setCheck({ state: 'error', text: `Image trop petite (${width} × ${height} px) : ${MIN_SIDE} × ${MIN_SIDE} px minimum.` });
          else setCheck({ state: 'ok', text: `Image exploitable · ${width} × ${height} px` });
        })
        .catch(() => { if (!cancelled) setCheck({ state: 'error', text: 'Cette image ne se charge pas. Vérifiez le fichier ou l’adresse.' }); });
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, file, url]);

  const pickFile = (event) => {
    const chosen = event.target.files?.[0] || null;
    setMessage(null);
    if (chosen && !['image/png', 'image/jpeg'].includes(chosen.type)) {
      setMessage({ error: true, text: 'Format non pris en charge : choisissez une image PNG ou JPEG.' });
      setFile(null);
      return;
    }
    if (chosen && chosen.size > MAX_BYTES) {
      setMessage({ error: true, text: 'Image trop lourde : 2 Mo maximum.' });
      setFile(null);
      return;
    }
    setFile(chosen);
  };

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      const updated = source === 'file' ? await organismeLogos.upload(organisme._id, file) : await organismeLogos.setUrl(organisme._id, url.trim());
      onSaved?.(updated);
      setFile(null); setUrl('');
      setMessage({ text: 'Logo enregistré. Il est visible immédiatement sur le site et l’application.' });
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error, 'Le logo n’a pas pu être enregistré.') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer le logo de ${organisme.nom} ? Ses initiales seront affichées à la place.`)) return;
    setSaving(true); setMessage(null);
    try {
      const updated = await organismeLogos.remove(organisme._id);
      onSaved?.(updated);
      setMessage({ text: 'Logo supprimé : les initiales de l’organisme sont affichées.' });
    } catch (error) {
      setMessage({ error: true, text: errorMessage(error, 'Le logo n’a pas pu être supprimé.') });
    } finally {
      setSaving(false);
    }
  };

  if (!organisme) return null;
  const canSave = Boolean(preview) && check?.state === 'ok' && !saving;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Identité</p>
          <h3 className="mt-1 text-xl font-black text-slate-800">Logo de {organisme.nom}</h3>
          <p className="mt-1 text-sm text-slate-500">Facultatif. Sans logo, les deux premiers caractères du nom sont affichés.</p>
        </div>
        <div className="flex items-center gap-3">
          <OrganismeLogo organisme={organisme} size="lg" />
          {organisme.logo ? (
            <button type="button" onClick={remove} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
              <Trash2 size={16} /> Supprimer
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setSource('file')} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${source === 'file' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}><ImagePlus size={16} /> Envoyer une image</button>
        <button type="button" onClick={() => setSource('url')} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${source === 'url' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600'}`}><Link2 size={16} /> Adresse https</button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        {source === 'file' ? (
          <input type="file" accept="image/png,image/jpeg" onChange={pickFile} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-slate-700" />
        ) : (
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://exemple.ci/logo.png" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        )}
        {/* Aperçu au format réel des listes : carré, image contenue, fond clair. */}
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
          {preview && check?.state !== 'error' ? <img src={preview} alt="Aperçu du logo" className="h-full w-full object-contain" /> : <span className="text-[10px] font-bold text-slate-400">Aperçu</span>}
        </div>
      </div>

      {check?.text || check?.state === 'checking' ? (
        <p className={`mt-3 text-sm font-medium ${check.state === 'error' ? 'text-rose-600' : check.state === 'ok' ? 'text-emerald-700' : 'text-slate-500'}`}>
          {check.state === 'checking' ? 'Vérification de l’image…' : check.text}
        </p>
      ) : null}
      {message ? <p role={message.error ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${message.error ? 'text-rose-600' : 'text-emerald-700'}`}>{message.text}</p> : null}

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button type="button" onClick={save} disabled={!canSave} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          <Save size={16} /> {organisme.logo ? 'Remplacer le logo' : 'Enregistrer le logo'}
        </button>
      </div>
    </div>
  );
};

export default OrganismeLogoEditor;
