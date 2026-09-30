import React, { useContext, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, Field } from '../components/ui';
import { afterAuthPath } from '../lib/redirect';

/** Inscription courte : trois champs. Le reste se complète plus tard dans le profil. */
const Register = () => {
  const { register, user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={afterAuthPath(user, next)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const result = await register(form.name.trim(), form.email.trim(), form.password);
    setLoading(false);
    if (result.success) navigate(afterAuthPath(result.user, next), { replace: true });
    else setError(result.error);
  };

  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthShell
      title="Créer votre compte"
      subtitle="Gratuit. Votre abonnement s’ajoute quand vous le souhaitez."
      footer={<>Déjà inscrit ? <Link to={`/login${suffix}`} className="font-semibold text-burgundy hover:underline">Se connecter</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Nom complet" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <div className="relative">
          <Field label="Mot de passe" hint="6 caractères minimum." type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} inputClassName="pr-12" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-0 top-[30px] flex h-12 w-12 items-center justify-center text-ink-muted hover:text-ink">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!form.name || !form.email || !form.password}>Créer mon compte</Button>
      </form>
    </AuthShell>
  );
};

export default Register;
