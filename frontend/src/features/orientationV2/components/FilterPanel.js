import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Sliders } from 'lucide-react';
import { VILLES, REGIONS } from '../data/orientationCatalog';
import { BUDGET_CATEGORIES, DURATION_CATEGORIES, PROFESSIONAL_SECTORS } from '../utils/constants';

const FilterPanel = ({ isOpen, onClose, filters, onFiltersChange }) => {
  const [expandedSections, setExpandedSections] = useState({
    geographic: true,
    budget: false,
    type: false,
    duration: false,
    benefits: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleRangeFilter = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value === filters[key] ? null : value
    });
  };

  const FilterSection = ({ title, section, children }) => (
    <div className="border-b border-[#E8E3D6]">
      <button
        onClick={() => toggleSection(section)}
        className="flex w-full items-center justify-between px-4 py-4 hover:bg-[#F6F4EF]"
      >
        <h3 className="font-semibold text-[#0E1A2B]">{title}</h3>
        <motion.div
          animate={{ rotate: expandedSections[section] ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-[#8B96A6]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expandedSections[section] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#FFFEF9] px-4 py-3 space-y-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 z-40 h-screen w-full max-w-sm overflow-y-auto bg-white shadow-lg md:relative md:max-w-none md:h-auto md:translate-x-0 md:overflow-visible md:bg-transparent md:shadow-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8E3D6] bg-[#F6F4EF] px-4 py-4 md:border-b-0 md:bg-transparent md:p-0 md:pb-4">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-[#B98A3B]" />
            <h2 className="font-bold text-[#0E1A2B]">Filtres</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg hover:bg-white/50 p-1 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Sections */}
        <div className="md:bg-transparent md:border-none">
          {/* Geographic */}
          <FilterSection title="Localisation" section="geographic">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="geographic-type"
                  value="ville"
                  checked={filters.geographic?.type === 'ville'}
                  onChange={() => handleFilterChange('geographic', { ...filters.geographic, type: 'ville' })}
                  className="rounded"
                />
                <span className="text-[#5C6A7D]">Par Ville</span>
              </label>
              {filters.geographic?.type === 'ville' && (
                <select
                  value={filters.geographic?.value || 'Toutes'}
                  onChange={(e) => handleFilterChange('geographic', { type: 'ville', value: e.target.value })}
                  className="w-full rounded-lg border border-[#DCD5C6] bg-white px-3 py-2 text-sm text-[#0E1A2B]"
                >
                  {VILLES.map(ville => (
                    <option key={ville} value={ville}>{ville}</option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm mt-3">
                <input
                  type="radio"
                  name="geographic-type"
                  value="region"
                  checked={filters.geographic?.type === 'region'}
                  onChange={() => handleFilterChange('geographic', { ...filters.geographic, type: 'region' })}
                  className="rounded"
                />
                <span className="text-[#5C6A7D]">Par Région</span>
              </label>
              {filters.geographic?.type === 'region' && (
                <select
                  value={filters.geographic?.value || ''}
                  onChange={(e) => handleFilterChange('geographic', { type: 'region', value: e.target.value })}
                  className="w-full rounded-lg border border-[#DCD5C6] bg-white px-3 py-2 text-sm text-[#0E1A2B]"
                >
                  <option value="">Sélectionner une région</option>
                  {REGIONS.slice(1).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              )}
            </div>
          </FilterSection>

          {/* Budget */}
          <FilterSection title="Budget" section="budget">
            <div className="space-y-2">
              {Object.values(BUDGET_CATEGORIES).map(budget => (
                <label key={budget.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="budget"
                    value={budget.value}
                    checked={filters.budget === budget.value}
                    onChange={() => handleFilterChange('budget', budget.value)}
                    className="rounded"
                  />
                  <span className="text-[#5C6A7D]">{budget.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Type d'établissement */}
          <FilterSection title="Type d'établissement" section="type">
            <div className="space-y-2">
              {['Public', 'Privé'].map(type => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.typeEtablissement?.includes(type)}
                    onChange={(e) => {
                      let newTypes = filters.typeEtablissement || [];
                      if (e.target.checked) {
                        newTypes = [...newTypes, type];
                      } else {
                        newTypes = newTypes.filter(t => t !== type);
                      }
                      handleFilterChange('typeEtablissement', newTypes.length > 0 ? newTypes : null);
                    }}
                    className="rounded"
                  />
                  <span className="text-[#5C6A7D]">{type}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Durée */}
          <FilterSection title="Durée de la formation" section="duration">
            <div className="space-y-2">
              {Object.values(DURATION_CATEGORIES).map(duration => (
                <label key={duration.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="duration"
                    value={duration.value}
                    checked={filters.duree === duration.value}
                    onChange={() => handleFilterChange('duree', duration.value)}
                    className="rounded"
                  />
                  <span className="text-[#5C6A7D]">{duration.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Avantages */}
          <FilterSection title="Avantages & Services" section="benefits">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.bourse === 'available'}
                  onChange={(e) => handleFilterChange('bourse', e.target.checked ? 'available' : null)}
                  className="rounded"
                />
                <span className="text-[#5C6A7D]">Bourses disponibles</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.logement === true}
                  onChange={(e) => handleFilterChange('logement', e.target.checked)}
                  className="rounded"
                />
                <span className="text-[#5C6A7D]">Logement étudiant</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.alternance === true}
                  onChange={(e) => handleFilterChange('alternance', e.target.checked)}
                  className="rounded"
                />
                <span className="text-[#5C6A7D]">Alternance</span>
              </label>
            </div>
          </FilterSection>
        </div>

        {/* Footer - Reset & Apply */}
        <div className="sticky bottom-0 border-t border-[#E8E3D6] bg-[#F6F4EF] px-4 py-3 flex gap-2 md:border-t-0 md:bg-transparent md:p-0 md:mt-4">
          <button
            onClick={() => onFiltersChange({})}
            className="flex-1 rounded-lg border border-[#DCD5C6] bg-white py-2 text-sm font-semibold text-[#0E1A2B] hover:bg-[#F0EEEA]"
          >
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#B98A3B] py-2 text-sm font-semibold text-white hover:bg-[#A67930] md:hidden"
          >
            Appliquer
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default FilterPanel;
