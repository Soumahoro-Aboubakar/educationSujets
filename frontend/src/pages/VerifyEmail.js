import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import AuthShell from '../components/site/AuthShell';
import { Button, ErrorNote, Spinner } from '../components/ui';
import { CodeField, ResendCode } from '../components/site/EmailCode';
import { emailAuth, emailErrorMessage, isDailyLimit } from '../lib/emailAuth';
import { afterAuthPath } from '../lib/redirect';

/*
 * Vérification de l'adresse e-mail par code à 6 chiffres (après l'inscription, ou depuis le compte).
 * Après l'inscription (?envoi=auto), le premier code part tout seul, une seule fois par compte et
 * par session. « Plus tard » laisse continuer : la vérification ne bloque pas l'accès.
 */
const SENT_KEY = 'fatafalta.verif-envoyee';

const VerifyEmail = () => {
  const { user, loading: authLoading, updateUser } = useContext(AuthContext);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const started = useRef(false);

  const send = async () => {
    setError('');
    try {
      const out = await emailAuth.sendVerification();
      if (out.alreadyVerified) { updateUser({ isVerified: true }); return true; }
      setRemaining(out.remaining);
      setSent(true);
      return true;
    } catch (err) {
      if (isDailyLimit(err)) setRemaining(0);
      setError(emailErrorMessage(err));
      return false;
    }
  };

  useEffect(() => {
    if (!user || user.isVerified || started.current) return;
    started.current = true;
    const key = `${SENT_KEY}.${user._id || user.id}`;
    let already = false;
    try { already = window.sessionStorage.getItem(key) === '1'; } catch (e) { /* rien */ }
    if (params.get('envoi') === 'auto' && !already) {
      try { window.sessionStorage.setItem(key, '1'); } catch (e) { /* rien */ }
      send();
    } else {
      emailAuth.quota().then((q) => setRemaining(q.remaining)).catch(() => {});
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/verifier-email${next ? `?next=${encodeURIComponent(next)}` : ''}`)}`} replace />;

  const done = () => navigate(afterAuthPath(user, next), { replace: true });

  if (user.isVerified) {
    return (
      <AuthShell title="Adresse vérifiée" subtitle={`${user.email} est confirmée. Vous pourrez récupérer votre compte si vous oubliez votre mot de passe.`}>
        <div className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3 text-sm text-ink"><MailCheck size={18} className="text-gold" aria-hidden />Tout est en ordre.</div>
        <Button size="lg" className="!mt-6 w-full" onClick={done}>Continuer</Button>
      </AuthShell>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setChecking(true);
    try {
      await emailAuth.verify(code);
      updateUser({ isVerified: true });
      done();
    } catch (err) {
      setError(emailErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthShell
      title="Vérifiez votre adresse"
      subtitle={sent
        ? `Nous avons envoyé un code à 6 chiffres à ${user.email}. Pensez à regarder dans les courriers indésirables.`
        : `Recevez un code à 6 chiffres à ${user.email} pour confirmer votre adresse.`}
      footer={<Link to={afterAuthPath(user, next)} replace className="inline-block py-2 font-semibold text-ink-soft hover:text-ink hover:underline">Plus tard</Link>}
    >
      {sent ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <CodeField value={code} onChange={setCode} error={error} />
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" className="!mt-6 w-full" loading={checking} disabled={code.length !== 6}>Vérifier</Button>
          <ResendCode onResend={send} remaining={remaining} />
        </form>
      ) : (
        <div className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          <Button size="lg" className="w-full" onClick={send} disabled={remaining === 0}>Recevoir le code</Button>
          {remaining === 0 ? <p className="text-sm text-ink-muted">Limite de 3 e-mails atteinte aujourd’hui : réessayez demain.</p> : null}
        </div>
      )}
    </AuthShell>
  );
};

export default VerifyEmail;
