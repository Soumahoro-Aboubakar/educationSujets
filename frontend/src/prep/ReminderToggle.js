import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BellRing } from 'lucide-react';
import { cx } from '../components/ui';
import { isStandalone } from '../components/site/PwaHelper';

/*
 * Rappel quotidien (notification web, 18 h) : activé par l'élève, jamais d'office.
 * - Serveur sans clés VAPID : la ligne ne s'affiche pas.
 * - iPhone : Safari n'autorise les notifications qu'à l'application installée sur l'écran
 *   d'accueil (iOS 16.4+) ; sinon on explique comment l'installer.
 * - Permission refusée : on dit où la réactiver, sans redemander en boucle.
 */
const toUint8 = (base64) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const ReminderToggle = ({ programme }) => {
  const [key, setKey] = useState(null);
  const [state, setState] = useState('idle'); // idle | on | off | busy | denied | unsupported | install
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    axios.get('/api/push/cle').then(async (r) => {
      if (!alive) return;
      setKey(r.data?.data?.cle || null);
      if (isIos() && !isStandalone()) { setState('install'); return; }
      if (!supported) { setState('unsupported'); return; }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (alive) setState(sub ? 'on' : 'off');
    }).catch(() => { if (alive) setKey(null); });
    return () => { alive = false; };
  }, []);

  if (!key) return null;

  const enable = async () => {
    setState('busy');
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.ready;
      // Un service push injoignable peut ne jamais répondre : 15 s au plus, puis un message.
      const subscribe = reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) });
      const timeout = new Promise((_, reject) => { setTimeout(() => reject(new Error('délai')), 15000); });
      const sub = (await reg.pushManager.getSubscription()) || await Promise.race([subscribe, timeout]);
      await axios.post('/api/push/abonnement', { subscription: sub.toJSON(), programme });
      setState('on');
    } catch (e) {
      setError('Activation impossible pour le moment. Réessaie dans un instant.');
      setState('off');
    }
  };
  const disable = async () => {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await axios.delete('/api/push/abonnement', { data: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
    } finally { setState('off'); }
  };

  const text = {
    install: 'Sur iPhone, installe d’abord Fatafalta sur l’écran d’accueil (Partager → Sur l’écran d’accueil), puis active le rappel depuis l’application.',
    unsupported: 'Ce navigateur ne gère pas les notifications.',
    denied: 'Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur pour recevoir le rappel.',
  }[state];

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-5 sm:flex-row sm:items-center" aria-labelledby="rappel-titre">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink"><BellRing size={19} /></span>
      <div className="min-w-0 flex-1">
        <p id="rappel-titre" className="text-[16px] font-semibold text-ink">Rappel quotidien</p>
        <p className="text-[13px] leading-snug text-ink-soft">{text || 'Une notification à 18 h, seulement les jours où tu n’as pas encore étudié.'}</p>
        {error ? <p className="mt-1 text-[13px] text-burgundy">{error}</p> : null}
      </div>
      {['on', 'off', 'busy'].includes(state) ? (
        <button
          type="button"
          role="switch"
          aria-checked={state === 'on'}
          aria-labelledby="rappel-titre"
          disabled={state === 'busy'}
          onClick={state === 'on' ? disable : enable}
          className={cx('relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50', state === 'on' ? 'bg-ink' : 'bg-line-strong')}
        >
          <span className={cx('absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-soft transition-transform duration-300 ease-emphasized', state === 'on' && 'translate-x-6')} />
        </button>
      ) : null}
    </section>
  );
};

export default ReminderToggle;
