import { useState, useEffect, useCallback } from 'react';
import cache from '../services/cache';

const CACHE_KEY = 'correctionPromptPreference';

const useCorrectionPromptPreference = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(true);

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

  const setEnabled = useCallback(async (value) => {
    setEnabledState(value);
    await cache.save(CACHE_KEY, value);
  }, []);

  return {
    enabled,
    setEnabled,
    isLoaded,
  };
};

export default useCorrectionPromptPreference;
