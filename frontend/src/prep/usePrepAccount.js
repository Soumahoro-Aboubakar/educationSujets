import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import AuthContext from '../context/AuthContext';
import { flush, forgetIdentity, prepApi, queueState, subscribeQueue } from './client';

/**
 * Identité de préparation du compte connecté, droits et progressions (relus au retour sur l'onglet).
 * Les droits viennent toujours du serveur ; le navigateur ne décide de rien.
 */
const usePrepAccount = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [state, setState] = useState({ loading: true, error: null, droits: null, progressions: {} });

  const load = useCallback(async () => {
    if (!user) { forgetIdentity(); setState({ loading: false, error: null, droits: null, progressions: {} }); return; }
    try {
      const declared = await prepApi.declare();
      await flush();
      const read = await prepApi.progressions();
      const progressions = Object.fromEntries(Object.entries(read?.progressions || {}).map(([code, p]) => [code, p.etat]));
      setState({ loading: false, error: null, droits: declared?.droits || null, progressions });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [user]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible' && user) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, user]);

  return { ...state, loading: authLoading || state.loading, authLoading, user, reload: load };
};

/** État de la file locale (envois en attente, stockage plein). */
export const useQueueState = () => {
  const snapshot = useSyncExternalStore(subscribeQueue, () => JSON.stringify(queueState()));
  return JSON.parse(snapshot);
};

export default usePrepAccount;
