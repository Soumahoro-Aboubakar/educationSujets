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

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const storedPreferences = await getPreferences();
      if (isMounted) {
        preferencesRef.current = storedPreferences;
        setPreferences(storedPreferences);
        setIsPreferencesReady(true);
      }
    };

    hydrate();
    return () => { isMounted = false; };
  }, []);

  const updatePreferences = useCallback(async (updates) => {
    const nextPreferences = { ...preferencesRef.current, ...updates };
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
    await savePreferences(nextPreferences);
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
