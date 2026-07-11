import { useEffect, useState } from 'react';
import { DEFAULT_FORM_STATE } from '../data/admissionConfig';

const STORAGE_KEY = 'education-ci-admission-simulator-v1';

const mergeDraft = (draft) => ({
  ...DEFAULT_FORM_STATE,
  ...draft,
  notes: {
    ...DEFAULT_FORM_STATE.notes,
    ...(draft?.notes || {}),
  },
});

export const useAdmissionDraft = () => {
  const [draft, setDraft] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? mergeDraft(JSON.parse(stored)) : DEFAULT_FORM_STATE;
    } catch (error) {
      console.warn('Impossible de restaurer la simulation admission:', error);
      return DEFAULT_FORM_STATE;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn('Impossible de sauvegarder la simulation admission:', error);
    }
  }, [draft]);

  const resetDraft = () => {
    setDraft(DEFAULT_FORM_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Impossible de vider la simulation admission:', error);
    }
  };

  return { draft, setDraft, resetDraft };
};
