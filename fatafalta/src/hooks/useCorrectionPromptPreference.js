import { useState, useEffect, useCallback } from 'react';
import cache from '../services/cache';
import useAsyncAction from './useAsyncAction';

const CACHE_KEY = 'correctionPromptPreference';

const useCorrectionPromptPreference = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(true);
  const [run, saving] = useAsyncAction();

  useEffect(() => {
    let mounted = true;

    const loadPreference = async () => {
      const stored = await cache.load(CACHE_KEY);
      if (!mounted) return;
      setEnabledState(stored === false ? false : true);
      setIsLoaded(true);
    };

    loadPreference();

    return () => {
      mounted = false;
    };
  }, []);

  const setEnabled = useCallback((value) => run(async () => {
    setEnabledState(value);
    try {
      await cache.save(CACHE_KEY, value, { throwOnError: true });
    } catch (error) {
      setEnabledState(!value);
      throw error;
    }
  }), [run]);

  return {
    enabled,
    setEnabled,
    isLoaded,
    saving,
  };
};

export default useCorrectionPromptPreference;
