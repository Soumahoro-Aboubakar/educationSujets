import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, ErrorNote, Field, PasswordField } from '../components/ui';
import { CodeField, ResendCode } from '../components/site/EmailCode';
import { emailAuth, emailErrorMessage, isDailyLimit } from '../lib/emailAuth';
import { afterAuthPath } from '../lib/redirect';

/*
 * Mot de passe oublié : 1) adresse e-mail → code envoyé (même réponse que le compte existe ou non) ;
 * 2) code + nouveau mot de passe → connexion automatique. 3 e-mails par adresse et par jour.
 */
const ForgotPassword = () => {
  const { login } = useContext(AuthContext);
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = async () => {
    setError('');
    try {
      const out = await emailAuth.forgot(email.trim());
      setRemaining(out.data?.remaining ?? null);
      setStep('code');
      return true;
    } catch (err) {
      if (isDailyLimit(err)) setRemaining(0);
      setError(emailErrorMessage(err));
      return false;
    }
  };

  const submitEmail = async (event) => {
    event.preventDefault();
    setLoading(true);
    await request();
    setLoading(false);
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true);
    try {
      await emailAuth.reset(email.trim(), code, password);
      // Nouveau mot de passe accepté : connexion directe, sans le ressaisir.
      const result = await login(email.trim(), password);
      if (result.success) navigate(afterAuthPath(result.user, next), { replace: true });
      else navigate(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
    } catch (err) {
      setError(emailErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const footer = <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="inline-block py-2 font-semibold text-burgundy hover:underline">Retour à la connexion</Link>;

  if (step === 'email') {
    return (
      <AuthShell title="Mot de passe oublié" subtitle="Indiquez l’adresse e-mail de votre compte : nous vous enverrons un code pour choisir un nouveau mot de passe." footer={footer}>
        <form onSubmit={submitEmail} className="space-y-4" noValidate>
          <Field label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" className="!mt-6 w-full" loading={loading} disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || remaining === 0}>Recevoir le code</Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle={`Si un compte existe avec ${email.trim()}, un code à 6 chiffres vient d’y être envoyé. Pensez aux courriers indésirables.`} footer={footer}>
      <form onSubmit={submitReset} className="space-y-4" noValidate>
        <CodeField value={code} onChange={setCode} error={error && code.length === 6 ? error : ''} />
        <PasswordField label="Nouveau mot de passe" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} hint="6 caractères au moins." />
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" size="lg" className="!mt-6 w-full" loading={loading} disabled={code.length !== 6 || password.length < 6}>Changer le mot de passe</Button>
        <ResendCode onResend={request} remaining={remaining} />
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
