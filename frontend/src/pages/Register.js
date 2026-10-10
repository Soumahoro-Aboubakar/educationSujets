import React, { useContext, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, ErrorNote, Field, PasswordField } from '../components/ui';
import { afterAuthPath } from '../lib/redirect';
import { trackEvent } from '../lib/analytics';

/** Inscription courte : trois champs. Le reste se complète plus tard dans le profil. */
const Register = () => {
  const { register, user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={afterAuthPath(user, next)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPasswordError('');
    if (form.password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const result = await register(form.name.trim(), form.email.trim(), form.password);
    setLoading(false);
    if (result.success) {
      trackEvent('sign_up', { method: 'email' });
      navigate(afterAuthPath(result.user, next), { replace: true });
    }
    else setError(result.error);
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
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="!mt-6 w-full" loading={loading} disabled={!form.name || !form.email || !form.password}>Créer mon compte</Button>
      </form>
    </AuthShell>
  );
};

export default Register;
