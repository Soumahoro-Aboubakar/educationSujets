import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Chargement asynchrone minimal : ignore les réponses obsolètes (changement rapide de
 * paramètres) et expose `reload` pour les actions « Réessayer ».
 */
const useAsync = (fn, deps = [], { enabled = true } = {}) => {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    if (!enabled) {
      setState({ data: undefined, loading: false, error: null });
      return;
    }
    const current = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await fn();
      if (current === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (current === requestId.current) setState((previous) => ({ ...previous, loading: false, error }));
    }
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
};

export default useAsync;
