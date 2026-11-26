import React, { useContext, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, ErrorNote, Field, PasswordField } from '../components/ui';
import { afterAuthPath } from '../lib/redirect';
import { trackEvent } from '../lib/analytics';
import { trackSignupSource } from '../lib/visitSource';

/** Inscription courte : trois champs. Le reste se complète plus tard dans le profil. */
const Register = () => {
  const { register, user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  // Acceptation des conditions : case jamais précochée, obligatoire pour créer le compte.
  const [accepte, setAccepte] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  if (user && !justRegistered) return <Navigate to={afterAuthPath(user, next)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPasswordError('');
    if (form.password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setJustRegistered(true);
    const result = await register(form.name.trim(), form.email.trim(), form.password, accepte);
    setLoading(false);
    if (result.success) {
      trackEvent('sign_up', { method: 'email' });
      trackSignupSource();
      // Vérification de l'adresse : le premier code part tout seul ; « Plus tard » reste possible.
      navigate(`/verifier-email?envoi=auto${next ? `&next=${encodeURIComponent(next)}` : ''}`, { replace: true });
    } else {
      setJustRegistered(false);
      setError(result.error);
    }
  };

  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthShell
      title="Créer votre compte"
      subtitle="Gratuit. Votre abonnement s’ajoute quand vous le souhaitez."
      footer={<>Déjà inscrit ? <Link to={`/login${suffix}`} className="inline-block py-2 font-semibold text-burgundy hover:underline">Se connecter</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Nom complet" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <PasswordField label="Mot de passe" hint="6 caractères minimum." error={passwordError} autoComplete="new-password" required value={form.password} onChange={(event) => { setForm({ ...form, password: event.target.value }); setPasswordError(''); }} />
        <label className="flex cursor-pointer items-start gap-3 pt-1 text-[14px] leading-relaxed text-ink-soft">
          <input type="checkbox" required checked={accepte} onChange={(event) => setAccepte(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-ink" />
          <span>
            J’accepte les <Link to="/conditions-utilisation" target="_blank" className="font-medium text-ink underline decoration-gold underline-offset-4">conditions d’utilisation</Link> et les <Link to="/conditions-vente" target="_blank" className="font-medium text-ink underline decoration-gold underline-offset-4">conditions d’abonnement</Link>. J’ai lu la <Link to="/politique-confidentialite" target="_blank" className="font-medium text-ink underline decoration-gold underline-offset-4">politique de confidentialité</Link>.
          </span>
        </label>
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="!mt-6 w-full" loading={loading} disabled={!form.name || !form.email || !form.password || !accepte}>Créer mon compte</Button>
      </form>
    </AuthShell>
  );
};

export default Register;
