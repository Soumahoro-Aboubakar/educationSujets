import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  savePreferences,
} from '../services/preferences';

const PreferencesContext = createContext(null);

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isPreferencesReady, setIsPreferencesReady] = useState(false);
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const savedRef = useRef(DEFAULT_PREFERENCES);
  const writes = useRef(Promise.resolve());
  const revisions = useRef({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let isMounted = true;

    const hydrate = async () => {
      const storedPreferences = await getPreferences();
      if (isMounted) {
        preferencesRef.current = storedPreferences;
        savedRef.current = storedPreferences;
        setPreferences(storedPreferences);
        setIsPreferencesReady(true);
      }
    };

    hydrate();
    return () => { isMounted = false; mounted.current = false; };
  }, []);

  const updatePreferences = useCallback(async (updates) => {
    const versions = {};
    Object.keys(updates).forEach((key) => {
      revisions.current[key] = (revisions.current[key] || 0) + 1;
      versions[key] = revisions.current[key];
    });
    const nextPreferences = { ...preferencesRef.current, ...updates };
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    const write = writes.current.then(async () => {
      const next = { ...savedRef.current, ...updates };
      await savePreferences(next);
      savedRef.current = next;
    });
    writes.current = write.catch(() => {});
    try {
      await write;
    } catch (error) {
      const rollback = { ...preferencesRef.current };
      Object.keys(updates).forEach((key) => {
        if (revisions.current[key] === versions[key]) rollback[key] = savedRef.current[key];
      });
      preferencesRef.current = rollback;
      if (mounted.current) setPreferences(rollback);
      throw error;
    }
    return nextPreferences;
  }, []);

  const value = useMemo(() => ({
    preferences,
    isPreferencesReady,
    updatePreferences,
  }), [preferences, isPreferencesReady, updatePreferences]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = React.useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }

  return context;
};

export default PreferencesContext;
