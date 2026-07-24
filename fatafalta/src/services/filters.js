/**
 * Filter options API service
 */

import api from './api';
import { FILTER_DEFINITIONS } from '../types/constants';

/**
 * Fetch all filter options in parallel (universities, departments, levels, semesters, categories)
 * @returns {Promise<Object>} - { university: [], department: [], ... }
 */
export const fetchAllFilterOptions = async () => {
  const results = await Promise.all(
    FILTER_DEFINITIONS.map((def) => api.get(def.endpoint))
  );

  const options = {};
  FILTER_DEFINITIONS.forEach((def, index) => {
    const items = results[index].data.data || [];
    // For semester items, keep original name but expose a UI-friendly displayName
    if (def.key === 'semester') {
      options[def.key] = items.map((it) => ({
        ...it,
        displayName: (it.name || '').replace(/Semestre/gi, 'Session'),
      }));
    } else {
      options[def.key] = items;
    }
  });

  return options;
};

/**
 * Fetch options for a single filter
 * @param {string} endpoint
 * @returns {Promise<Array>}
 */
export const fetchFilterOption = async (endpoint) => {
  const response = await api.get(endpoint);
  const items = response.data.data || [];
  // map semesters similarly
  if (endpoint && endpoint.includes('/semesters')) {
    return items.map((it) => ({ ...it, displayName: (it.name || '').replace(/Semestre/gi, 'Session') }));
  }
  return items;
};
