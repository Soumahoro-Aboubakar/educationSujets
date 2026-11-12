import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getErrorAlert } from '../utils/userMessages';

/** Verrou synchrone : protège aussi les appuis reçus avant le prochain rendu. */
const useAsyncAction = () => {
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback((action, ...args) => {
    if (!mounted.current || locked.current || !action) return;
    locked.current = true;
    const release = () => {
      locked.current = false;
      if (mounted.current) setPending(false);
    };
    const fail = (error) => {
      if (mounted.current) Alert.alert(...getErrorAlert(error));
    };
    try {
      const result = action(...args);
      if (!result || typeof result.then !== 'function') {
        release();
        return result;
      }
      if (mounted.current) setPending(true);
      return Promise.resolve(result).catch(fail).finally(release);
    } catch (error) {
      fail(error);
      release();
    }
  }, []);

  return [run, pending];
};

export default useAsyncAction;
