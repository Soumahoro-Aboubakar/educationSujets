import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CreatableSelect = ({ label, options, value, onChange, onCreate, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.find(opt => opt.name.toLowerCase() === search.toLowerCase().trim());

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreate = async () => {
    if (!search.trim() || exactMatch) return;
    setIsCreating(true);
    await onCreate(search.trim());
    setIsCreating(false);
    setIsOpen(false);
    setSearch('');
  };

  const selectedOption = options.find(opt => opt._id === value);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 bg-slate-50 border ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white' : 'border-slate-200'} rounded-2xl flex items-center justify-between transition-all hover:border-indigo-400 focus:outline-none group shadow-sm`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {Icon && <Icon size={18} className={selectedOption ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />}
          <span className={`truncate text-sm font-semibold ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-slate-50 relative">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher ou ajouter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredOptions.length > 0 && !search.trim()) {
                      handleSelect(filteredOptions[0]._id);
                    } else if (search.trim() && !exactMatch) {
                      handleCreate();
                    } else if (exactMatch) {
                      handleSelect(exactMatch._id);
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt._id}
                    type="button"
                    onClick={() => handleSelect(opt._id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${value === opt._id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <span>{opt.name}</span>
                    {value === opt._id && <Check size={16} className="text-indigo-600" />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm font-medium text-slate-400">
                  Aucun résultat trouvé
                </div>
              )}

              {search.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full mt-1 flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 transition-colors border border-indigo-100 border-dashed"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span className="truncate">Créer "{search.trim()}"</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatableSelect;
