import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  FileText,
  Download,
  X,
  ChevronDown,
  Sparkles,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Layers,
  FolderOpen,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Filter Config (easily extensible)
   New filter entries auto-appear in the panel.
   The `endpoint` key maps to the API route that
   feeds the dropdown dynamically.
───────────────────────────────────────────── */
const FILTER_DEFINITIONS = [
  {
    key: 'university',
    label: 'Université',
    placeholder: 'Toutes les universités',
    icon: Building2,
    endpoint: '/api/universities',
  },
  {
    key: 'department',
    label: 'Département',
    placeholder: 'Tous les départements',
    icon: Layers,
    endpoint: '/api/departments',
  },
  {
    key: 'level',
    label: 'Niveau',
    placeholder: 'Tous les niveaux',
    icon: GraduationCap,
    endpoint: '/api/levels',
  },
  {
    key: 'semester',
    label: 'Semestre',
    placeholder: 'Tous les semestres',
    icon: Calendar,
    endpoint: '/api/semesters',
  },
  {
    key: 'category',
    label: 'Catégorie',
    placeholder: 'Toutes les catégories',
    icon: FolderOpen,
    endpoint: '/api/categories',
  },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Custom select with icon */
const FilterSelect = ({ def, value, options, onChange }) => {
  const Icon = def.icon;
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Icon size={16} />
      </div>
      <select
        name={def.key}
        value={value}
        onChange={onChange}
        className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl text-sm font-medium transition-default cursor-pointer"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-primary)';
          e.target.style.boxShadow = 'var(--shadow-glow)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border)';
          e.target.style.boxShadow = 'none';
        }}
      >
        <option value="">{def.placeholder}</option>
        {options.map((opt) => (
          <option key={opt._id} value={opt._id}>
            {opt.name}
          </option>
        ))}
      </select>
      <div
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ChevronDown size={14} />
      </div>
    </div>
  );
};

/** Document card */
const DocumentCard = ({ doc, index }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (downloading) return;
    try {
      setDownloading(true);
      const res = await axios.get(`/api/documents/${doc._id}/download`);
      const url = res.data.data.url;
      window.open(url || `/uploads/${doc.file}`, '_blank');
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      window.open(`/uploads/${doc.file}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group hover-lift rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
        className="group-hover:opacity-100"
      />

      <div className="p-5 sm:p-6">
        {/* Header: badge + date */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary)',
            }}
          >
            <FileText size={12} />
            {doc.fileType}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {new Date(doc.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-base font-semibold mb-2 line-clamp-2 transition-default"
          style={{ color: 'var(--color-text-primary)', lineHeight: 1.4 }}
        >
          {doc.title}
        </h3>

        {/* Description */}
        {doc.description && (
          <p
            className="text-sm mb-4 line-clamp-2"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            {doc.description}
          </p>
        )}

        {/* Meta tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {doc.university?.name && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Building2 size={10} />
              {doc.university.name.length > 25
                ? doc.university.name.slice(0, 25) + '…'
                : doc.university.name}
            </span>
          )}
          {doc.level?.name && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <GraduationCap size={10} />
              {doc.level.name}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          {/* Footer <span
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Eye size={13} />
              {doc.views}
            </span>*/}  
            <span
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Download size={13} />
              {doc.downloads}
            </span>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-default"
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              boxShadow: '0 1px 3px rgba(99,102,241,.25)',
              opacity: downloading ? 0.7 : 1,
              cursor: downloading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (downloading) return;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,.35)';
            }}
            onMouseLeave={(e) => {
              if (downloading) return;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(99,102,241,.25)';
            }}
          >
            {downloading ? (
              <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            {downloading ? 'Chargement...' : 'Télécharger'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/** Skeleton card */
const SkeletonCard = () => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border-light)',
    }}
  >
    <div className="p-5 sm:p-6">
      <div className="flex justify-between mb-4">
        <div className="skeleton" style={{ width: 60, height: 24 }} />
        <div className="skeleton" style={{ width: 80, height: 16 }} />
      </div>
      <div className="skeleton mb-2" style={{ width: '90%', height: 20 }} />
      <div className="skeleton mb-4" style={{ width: '70%', height: 16 }} />
      <div className="flex gap-2 mb-5">
        <div className="skeleton" style={{ width: 100, height: 20 }} />
        <div className="skeleton" style={{ width: 60, height: 20 }} />
      </div>
      <div className="flex justify-between items-center">
        <div className="skeleton" style={{ width: 80, height: 16 }} />
        <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8 }} />
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Main Home Component
───────────────────────────────────────────── */
const Home = () => {
  const [documents, setDocuments] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState({ search: '' });
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const searchRef = useRef(null);

  // Active filter count (excluding search)
  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => key !== 'search' && val
  ).length;

  /* ── Load filter options from API ── */
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const results = await Promise.all(
          FILTER_DEFINITIONS.map((def) => axios.get(def.endpoint))
        );
        const opts = {};
        FILTER_DEFINITIONS.forEach((def, i) => {
          opts[def.key] = results[i].data.data;
        });
        setFilterOptions(opts);
      } catch (err) {
        console.error('Erreur chargement filtres:', err);
      }
    };
    loadFilterOptions();
  }, []);

  /* ── Fetch documents with debounce ── */
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 12 };
      if (filters.search) params.search = filters.search;

      FILTER_DEFINITIONS.forEach((def) => {
        if (filters[def.key]) params[def.key] = filters[def.key];
      });

      const res = await axios.get('/api/documents', { params });
      setDocuments(res.data.data);
      setPagination(res.data.meta?.pagination || null);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDocuments(), 200);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const clearFilters = () => {
    const cleared = { search: filters.search };
    FILTER_DEFINITIONS.forEach((d) => (cleared[d.key] = ''));
    setFilters(cleared);
    setPage(1);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* ─── Hero Section ──────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #6366f1 70%, #818cf8 100%)',
          paddingTop: 80,
          paddingBottom: 56,
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            top: -120,
            right: -80,
            background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            bottom: -100,
            left: -60,
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <Sparkles size={14} className="text-cyan-300" />
            <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
              Ressources éducatives
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight"
            style={{ lineHeight: 1.15 }}
          >
            Trouvez le sujet
            <br className="hidden sm:block" />
            {' '}qu'il vous faut
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-base sm:text-lg font-medium mb-8"
            style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 480, margin: '0 auto 32px' }}
          >
            Explorez des milliers de documents académiques partagés par la communauté universitaire.
          </motion.p>

          {/* ─── Search Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-2xl mx-auto"
          >
            <div
              className="flex items-center rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 20px 60px -15px rgba(0,0,0,0.25)',
              }}
            >
              <div className="pl-5" style={{ color: 'var(--color-text-muted)' }}>
                <Search size={20} />
              </div>
              <input
                ref={searchRef}
                type="text"
                name="search"
                placeholder="Rechercher un sujet, un cours, un examen..."
                value={filters.search}
                onChange={handleFilterChange}
                className="flex-1 py-4 px-3 text-sm sm:text-base font-medium bg-transparent border-none outline-none"
                style={{
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex items-center gap-2 mr-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-default"
                style={{
                  backgroundColor: filtersOpen
                    ? 'var(--color-primary)'
                    : 'var(--color-surface-raised)',
                  color: filtersOpen ? 'white' : 'var(--color-text-secondary)',
                  border: filtersOpen
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                }}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden sm:inline">Filtres</span>
                {activeFilterCount > 0 && (
                  <span
                    className="flex items-center justify-center text-xs font-bold text-white rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      backgroundColor: filtersOpen
                        ? 'rgba(255,255,255,0.3)'
                        : 'var(--color-primary)',
                      fontSize: 10,
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Filters Panel (expandable) ────────── */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            key="filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border-light)',
              }}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={16}
                      style={{ color: 'var(--color-primary)' }}
                    />
                    <h2
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Filtres avancés
                    </h2>
                    {activeFilterCount > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--color-primary-50)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-default"
                        style={{
                          color: 'var(--color-text-muted)',
                          backgroundColor: 'var(--color-bg)',
                        }}
                      >
                        <X size={12} />
                        Réinitialiser
                      </button>
                    )}
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="flex items-center justify-center rounded-lg"
                      style={{
                        width: 32,
                        height: 32,
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'var(--color-bg)',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FILTER_DEFINITIONS.map((def) => (
                    <FilterSelect
                      key={def.key}
                      def={def}
                      value={filters[def.key] || ''}
                      options={filterOptions[def.key] || []}
                      onChange={handleFilterChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Results ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 36,
                height: 36,
                backgroundColor: 'var(--color-primary-50)',
              }}
            >
              <BookOpen size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Documents
              </h2>
              {!loading && pagination && (
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {pagination.total} résultat{pagination.total !== 1 ? 's' : ''} trouvé
                  {pagination.total !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-2xl mb-4"
              style={{
                width: 64,
                height: 64,
                backgroundColor: 'var(--color-bg)',
              }}
            >
              <FileText size={28} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Aucun document trouvé
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Essayez de modifier vos critères de recherche ou vos filtres.
            </p>
          </motion.div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {documents.map((doc, idx) => (
                <DocumentCard key={doc._id} doc={doc} index={idx} />
              ))}
            </div>

            {/* Pagination UI */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-default disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  Précédent
                </button>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Page {pagination.page} sur {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-default disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Footer ────────────────────────────── */}
      <footer
        className="py-8"
        style={{
          borderTop: '1px solid var(--color-border-light)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              }}
            >
              <BookOpen className="text-white" size={13} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Éducation CI
            </span>
          </div>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            © {new Date().getFullYear()} Éducation CI — Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
