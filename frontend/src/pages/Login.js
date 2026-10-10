import React, { useContext, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, ErrorNote, Field, PasswordField } from '../components/ui';
import { afterAuthPath } from '../lib/redirect';

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={afterAuthPath(user, next)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(form.email.trim(), form.password);
    setLoading(false);
    if (result.success) navigate(afterAuthPath(result.user, next), { replace: true });
    else setError(result.error);
  };

  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous pour accéder à vos sujets et à votre abonnement."
      footer={<>Pas encore de compte ? <Link to={`/register${suffix}`} className="inline-block py-2 font-semibold text-burgundy hover:underline">Créer un compte</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <PasswordField label="Mot de passe" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="!mt-6 w-full" loading={loading} disabled={!form.email || !form.password}>Se connecter</Button>
      </form>
    </AuthShell>
  );
};

export default Login;
