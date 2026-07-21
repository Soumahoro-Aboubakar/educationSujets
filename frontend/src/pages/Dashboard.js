import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, LogOut, FileText, Upload,
  CheckCircle, BarChart3, Menu, X, Eye, Trash2, Clock, 
  MapPin, BookOpen, Layers, Briefcase, Calendar, GraduationCap, User,
  AlertTriangle, FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import CreatableSelect from '../components/CreatableSelect';
import ReferentialAdminPanel from '../components/ReferentialAdminPanel';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
import { usePdfWatermark } from '../hooks/usePdfWatermark';

const EMPTY_UPLOAD_DATA = {
  title: '', description: '', university: '', department: '', level: '', semester: '', category: '', file: null
};

const EMPTY_DUPLICATE_CHECK = { status: 'idle', matches: [], error: '' };

const Dashboard = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('documents');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [documents, setDocuments] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [myDocsPage, setMyDocsPage] = useState(1);
  const [myDocsPagination, setMyDocsPagination] = useState(null);
  const [pendingDocsPage, setPendingDocsPage] = useState(1);
  const [pendingDocsPagination, setPendingDocsPagination] = useState(null);
  
  // Filters data
  const [filtersData, setFiltersData] = useState({
    universities: [], departments: [], levels: [], semesters: [], categories: []
  });

  const [activeFilters, setActiveFilters] = useState({
    university: '', department: '', level: '', semester: '', category: ''
  });

  const [uploadData, setUploadData] = useState(EMPTY_UPLOAD_DATA);
  const [uploading, setUploading] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(EMPTY_DUPLICATE_CHECK);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [downloadingDocs, setDownloadingDocs] = useState({});
  const [validatingDocs, setValidatingDocs] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  const { processPdf, isProcessing: watermarking, progress: watermarkProgress, error: watermarkError, resetState: resetWatermark } = usePdfWatermark();

  const fetchDuplicateTitleMatches = useCallback(async (title) => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) return [];

    const res = await axios.get('/api/documents/duplicates/title', {
      params: { title: cleanTitle }
    });

    return res.data.data || [];
  }, []);

  const resetDuplicateCheck = () => {
    setDuplicateCheck(EMPTY_DUPLICATE_CHECK);
    setDuplicateAcknowledged(false);
  };

  const resetUploadForm = () => {
    setUploadData(EMPTY_UPLOAD_DATA);
    resetDuplicateCheck();
    if (resetWatermark) resetWatermark();
  };

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  useEffect(() => {
    const title = uploadData.title.trim();
    setDuplicateAcknowledged(false);

    if (activeTab !== 'upload' || title.length < 3) {
      setDuplicateCheck(EMPTY_DUPLICATE_CHECK);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setDuplicateCheck({ status: 'checking', matches: [], error: '' });

      try {
        const matches = await fetchDuplicateTitleMatches(title);
        if (!cancelled) {
          setDuplicateCheck({ status: 'checked', matches, error: '' });
        }
      } catch (error) {
        console.error('Erreur lors de la comparaison du titre:', error);
        if (!cancelled) {
          setDuplicateCheck({
            status: 'error',
            matches: [],
            error: 'Impossible de comparer ce titre pour le moment.'
          });
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeTab, uploadData.title, fetchDuplicateTitleMatches]);

  useEffect(() => {
    if (user && !isFetching && myDocsPage > 1) {
      fetchMyDocuments(myDocsPage);
    } else if (user && !isFetching && myDocsPage === 1 && myDocsPagination) {
      fetchMyDocuments(1);
    }
  }, [myDocsPage]);

  useEffect(() => {
    if (user && !isFetching && pendingDocsPage > 1 && (user?.role === 'admin' || user?.role === 'sub-admin')) {
      fetchPendingDocuments(pendingDocsPage);
    } else if (user && !isFetching && pendingDocsPage === 1 && pendingDocsPagination) {
      fetchPendingDocuments(1);
    }
  }, [pendingDocsPage]);

  const fetchMyDocuments = async (page) => {
    try {
      const res = await axios.get('/api/documents/my', { params: { page, limit: 12 } });
      setDocuments(res.data.data);
      setMyDocsPagination(res.data.meta?.pagination || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingDocuments = async (page) => {
    try {
      const res = await axios.get('/api/documents/pending', { params: { page, limit: 12 } });
      setPendingDocs(res.data.data);
      setPendingDocsPagination(res.data.meta?.pagination || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsFetching(true);
      const [docsRes, uniRes, deptRes, levelRes, semRes, catRes] = await Promise.all([
        axios.get('/api/documents/my', { params: { page: 1, limit: 12 } }),
        axios.get('/api/universities'),
        axios.get('/api/departments'),
        axios.get('/api/levels'),
        axios.get('/api/semesters'),
        axios.get('/api/categories'),
      ]);
      
      setDocuments(docsRes.data.data);
      setMyDocsPagination(docsRes.data.meta?.pagination || null);
      
      setFiltersData({
        universities: uniRes.data.data,
        departments: deptRes.data.data,
        levels: levelRes.data.data,
        semesters: semRes.data.data,
        categories: catRes.data.data,
      });

      if (user?.role === 'admin' || user?.role === 'sub-admin') {
        const pendingRes = await axios.get('/api/documents/pending', { params: { page: 1, limit: 12 } });
        setPendingDocs(pendingRes.data.data);
        setPendingDocsPagination(pendingRes.data.meta?.pagination || null);
        
        if (user?.role === 'admin') {
          const analyticsRes = await axios.get('/api/documents/analytics');
          setAnalytics(analyticsRes.data.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsFetching(false);
    } 
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { id: 'documents', label: 'Mes documents', icon: FileText },
    { id: 'upload', label: 'Uploader', icon: Upload },
    ...(user?.role === 'admin' || user?.role === 'sub-admin' ? [{ id: 'validate', label: 'Valider', icon: CheckCircle, badge: pendingDocs.length }] : []),
    ...(user?.isSuperAdmin ? [{ id: 'analytics', label: 'Analytiques', icon: BarChart3 }] : []),
    ...(user?.isSuperAdmin ? [{ id: 'referentials', label: 'Gestion des référentiels', icon: Layers }] : []),
  ];

  // Rest of functions...
  const handleCreateOption = async (fieldKey, dbKey, newName) => {
    try {
      const res = await axios.post(`/api/${dbKey}`, { name: newName });
      const newEntity = res.data.data;
      
      setFiltersData(prev => ({
        ...prev,
        [dbKey]: [...prev[dbKey], newEntity]
      }));
      
      setUploadData(prev => ({
        ...prev,
        [fieldKey]: newEntity._id
      }));
    } catch (error) {
      console.error(`Erreur lors de la création de l'option ${fieldKey}:`, error);
    }
  };

  const handleValidateDocument = async (id, status) => {
    try {
      setValidatingDocs(prev => ({ ...prev, [id]: status }));
      await axios.put(`/api/documents/${id}/validate`, { status });
      // Remove doc from pending list
      setPendingDocs(prev => prev.filter(doc => doc._id !== id));
      // Re-fetch appropriately
      fetchMyDocuments(myDocsPage);
      fetchPendingDocuments(pendingDocsPage);
      if (user?.role === 'admin') {
        const analyticsRes = await axios.get('/api/documents/analytics');
        setAnalytics(analyticsRes.data.data);
      }
    } catch (error) {
      console.error(`Erreur lors de la validation (${status}):`, error);
    } finally {
      setValidatingDocs(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleDownload = async (doc) => {
    if (downloadingDocs[doc._id]) return;
    try {
      setDownloadingDocs(prev => ({ ...prev, [doc._id]: true }));
      const res = await axios.get(`/api/documents/${doc._id}/download`);
      const url = res.data.data.url;
      window.open(url || `/uploads/${doc.file}`, '_blank');
    } catch (err) {
      console.error("Erreur lors de l'ouverture du document:", err);
      window.open(`/uploads/${doc.file}`, '_blank');
    } finally {
      setDownloadingDocs(prev => ({ ...prev, [doc._id]: false }));
    }
  };

  const handleCancelUpload = () => {
    resetUploadForm();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        const watermarkedFile = await processPdf(file);
        if (watermarkedFile) {
          setUploadData(prev => ({ ...prev, file: watermarkedFile }));
        } else {
          setUploadData(prev => ({ ...prev, file: null }));
        }
      } else {
        setUploadData(prev => ({ ...prev, file }));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const duplicateMatches = await fetchDuplicateTitleMatches(uploadData.title);
      if (duplicateMatches.length > 0 && !duplicateAcknowledged) {
        setDuplicateCheck({ status: 'checked', matches: duplicateMatches, error: '' });
        return;
      }

      const formData = new FormData();
      Object.keys(uploadData).forEach(key => {
        if (uploadData[key]) {
          if (key === 'file') {
            const file = uploadData[key];
            // Normalize filename: remove accents and replace special chars/spaces with underscore
            const cleanName = file.name
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9.\-]/g, '_');
            formData.append(key, file, cleanName);
          } else {
            formData.append(key, uploadData[key]);
          }
        }
      });
      await axios.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      resetUploadForm();
      fetchMyDocuments(1);
      setMyDocsPage(1);
      setActiveTab('documents');
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const hasBlockingDuplicate = duplicateCheck.matches.length > 0 && !duplicateAcknowledged;
  const uploadButtonDisabled =
    uploading || duplicateCheck.status === 'checking' || hasBlockingDuplicate || watermarking;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/70 backdrop-blur-xl border-r border-slate-200/60 sticky top-0 h-screen transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Éducation CI</span>
        </div>
        
        <div className="px-6 py-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Menu Principal</div>
          <nav className="flex flex-col gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <div className="flex items-center gap-3 font-medium">
                    <Icon size={18} className={isActive ? 'text-indigo-100' : 'text-slate-400'} />
                    {item.label}
                  </div>
                  {item.badge > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-xs font-medium text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors">
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full min-w-0 transition-all">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <BookOpen className="text-white" size={16} />
            </div>
            <span className="font-bold text-lg text-slate-800">Éducation CI</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Menu size={20} />
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-50 lg:hidden shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <span className="font-bold text-lg text-slate-800">Navigation</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <X size={18} />
                  </button>
                </div>
                <div className="px-6 py-6 flex-1 overflow-y-auto">
                  <nav className="flex flex-col gap-3">
                    {navItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                          className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3 font-semibold text-sm">
                            <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                            {item.label}
                          </div>
                          {item.badge > 0 && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-rose-100 text-rose-600'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                <div className="p-6 border-t border-slate-100">
                  <button onClick={handleLogout} className="flex flex-row items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold text-sm">
                    <LogOut size={18} /> Déconnexion
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Top Header / Search */}
        <div className="px-4 sm:px-8 py-6 w-full max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search Bar - Main Focus */}
            <div className="relative w-full flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Rechercher un document, niveau, matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-14 py-4 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl text-sm md:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm group-hover:shadow-md"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute inset-y-0 right-2 my-2 px-3 rounded-xl flex items-center justify-center transition-all ${
                  showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Advanced Filters Drawer (Dynamic) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 mt-2 mb-4">
                  {[
                    { key: 'university', icon: MapPin, label: 'Université', options: filtersData.universities },
                    { key: 'department', icon: Briefcase, label: 'Département', options: filtersData.departments },
                    { key: 'level', icon: GraduationCap, label: 'Niveau', options: filtersData.levels },
                    { key: 'semester', icon: Calendar, label: 'Semestre', options: filtersData.semesters },
                    { key: 'category', icon: Layers, label: 'Catégorie', options: filtersData.categories },
                  ].map((filter) => (
                    <div key={filter.key} className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ml-1 uppercase tracking-wide">
                        <filter.icon size={12} className="text-indigo-500" />
                        {filter.label}
                      </label>
                      <select
                        value={activeFilters[filter.key]}
                        onChange={(e) => setActiveFilters({ ...activeFilters, [filter.key]: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-sm font-medium text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:bg-slate-100 transition-colors appearance-none"
                      >
                        <option value="">Tous les {filter.label.toLowerCase()}s</option>
                        {filter.options.map((opt) => (
                          <option key={opt._id} value={opt._id}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div className="w-full flex justify-end">
                    <button
                      onClick={() => setActiveFilters({ university: '', department: '', level: '', semester: '', category: '' })}
                      className="text-sm font-semibold text-rose-500 hover:text-rose-600 px-4 py-2 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area */}
        <div className="px-4 sm:px-8 pb-10 w-full max-w-6xl mx-auto flex-1 h-full overflow-y-auto">
          {activeTab === 'documents' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mes Documents</h2>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
                  {documents.length} Total
                </span>
              </div>
              
              {isFetching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col h-[200px] animate-pulse">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                        <div className="w-20 h-6 bg-slate-100 rounded-lg" />
                      </div>
                      <div className="w-3/4 h-5 bg-slate-100 rounded mb-2" />
                      <div className="w-1/2 h-4 bg-slate-100 rounded mb-4" />
                      <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between">
                        <div className="w-16 h-4 bg-slate-100 rounded" />
                        <div className="flex gap-2">
                          <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                          <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun document</h3>
                  <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
                    Vous n'avez pas encore partagé de documents. Commencez par uploader votre premier fichier.
                  </p>
                  <button onClick={() => setActiveTab('upload')} className="bg-indigo-600 text-white font-semibold flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
                    <Upload size={18} /> Uploader maintenant
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {documents.map(doc => (
                    <div key={doc._id} className="group bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText size={22} strokeWidth={2.5} />
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                          doc.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          doc.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {doc.status === 'approved' ? 'Approuvé' : doc.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                      
                      <div className="relative z-10 mb-4">
                        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1" title={doc.title}>{doc.title}</h3>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><MapPin size={12}/> {doc.university?.name || 'Général'}</p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Eye size={14} className="text-slate-300" />
                          <span>{doc.views || 0} vues</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDownload(doc)} disabled={downloadingDocs[doc._id]} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-50">
                            {downloadingDocs[doc._id] ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Eye size={16} />}
                          </button>
                          <button onClick={() => {/* Handle delete */}} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination UI Mes Documents */}
              {myDocsPagination && myDocsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setMyDocsPage(p => Math.max(1, p - 1))}
                    disabled={myDocsPage <= 1}
                    className="px-4 py-2 bg-white rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                  >
                    Précédent
                  </button>
                  <span className="text-sm font-medium text-slate-500">
                    Page {myDocsPage} sur {myDocsPagination.pages}
                  </span>
                  <button
                    onClick={() => setMyDocsPage(p => Math.min(myDocsPagination.pages, p + 1))}
                    disabled={myDocsPage >= myDocsPagination.pages}
                    className="px-4 py-2 bg-white rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 sm:p-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Uploader un Document</h2>
                  <p className="text-sm font-medium text-slate-500">Partagez vos ressources avec la communauté. Veuillez remplir les détails consciencieusement.</p>
                </div>
                
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Titre du document</label>
                      <input
                        type="text" required
                        value={uploadData.title}
                        onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        placeholder="Ex: Épreuve de Mathématiques 2024"
                      />
                    </div>

                    <AnimatePresence>
                      {duplicateCheck.status === 'checking' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700"
                        >
                          <FileSearch size={18} />
                          Comparaison du titre avec la base...
                        </motion.div>
                      )}

                      {duplicateCheck.status === 'checked' && duplicateCheck.matches.length === 0 && uploadData.title.trim().length >= 3 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
                        >
                          <CheckCircle size={18} />
                          Aucun titre similaire détecté.
                        </motion.div>
                      )}

                      {duplicateCheck.status === 'error' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600"
                        >
                          {duplicateCheck.error}
                        </motion.div>
                      )}

                      {duplicateCheck.matches.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                              <AlertTriangle size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-amber-900">Document similaire détecté</h3>
                              <p className="mt-1 text-xs font-semibold leading-5 text-amber-800/80">
                                Vérifiez les titres existants avant de publier afin d'éviter un doublon.
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            {duplicateCheck.matches.map((match) => (
                              <div key={match._id} className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="line-clamp-1 text-sm font-black text-slate-900" title={match.title}>
                                    {match.title}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-500">
                                    {match.university?.name || 'Université non précisée'} · {match.matchPercent}% similaire
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(match)}
                                  disabled={!match.canView || downloadingDocs[match._id]}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  {downloadingDocs[match._id] ? (
                                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                  {match.canView ? 'Voir' : 'Non visible'}
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={handleCancelUpload}
                              className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100"
                            >
                              Annuler l'envoi
                            </button>
                            <button
                              type="button"
                              onClick={() => setDuplicateAcknowledged(true)}
                              className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-black transition ${
                                duplicateAcknowledged
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-950 text-white hover:bg-slate-800'
                              }`}
                            >
                              {duplicateAcknowledged ? 'Différence confirmée' : 'Mon fichier est différent'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Description</label>
                      <textarea
                        rows={3}
                        value={uploadData.description}
                        onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                        placeholder="Résumez brièvement le contenu du document..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-20 relative">
                      {[
                        { key: 'university', dbKey: 'universities', label: 'Université', icon: MapPin, options: filtersData.universities },
                        { key: 'department', dbKey: 'departments', label: 'Département', icon: Briefcase, options: filtersData.departments },
                        { key: 'level', dbKey: 'levels', label: 'Niveau', icon: GraduationCap, options: filtersData.levels },
                        { key: 'semester', dbKey: 'semesters', label: 'Semestre', icon: Calendar, options: filtersData.semesters },
                        { key: 'category', dbKey: 'categories', label: 'Catégorie', icon: Layers, options: filtersData.categories },
                      ].map(field => (
                        <div key={field.key} className={field.key === 'category' ? 'sm:col-span-2' : ''}>
                          <CreatableSelect
                            label={field.label}
                            options={field.options}
                            value={uploadData[field.key]}
                            onChange={(val) => setUploadData({ ...uploadData, [field.key]: val })}
                            onCreate={(newVal) => handleCreateOption(field.key, field.dbKey, newVal)}
                            placeholder={`Sélectionner ou ajouter ${field.label.toLowerCase()}`}
                            icon={field.icon}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Fichier (PDF, DOCX)</label>
                    <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group ${uploadData.file ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'} ${watermarking ? 'opacity-70 pointer-events-none' : ''}`}>
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${uploadData.file ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'}`}>
                        {watermarking ? (
                          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        ) : uploadData.file ? (
                          <CheckCircle size={28} />
                        ) : (
                          <Upload size={28} />
                        )}
                      </div>
                      
                      {watermarking ? (
                        <div className="flex flex-col items-center w-full max-w-[200px]">
                          <span className="text-sm font-bold text-indigo-600 mb-2">Application du filigrane... {watermarkProgress}%</span>
                          <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${watermarkProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm font-bold text-center px-4 ${uploadData.file ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {uploadData.file ? uploadData.file.name : 'Cliquez ou glissez-déposez un fichier'}
                          </span>
                          {!uploadData.file && <span className="text-xs font-medium text-slate-400 mt-2">PDF (Filigrané auto) ou DOCX - Max 10MB</span>}
                        </>
                      )}
                      
                      <input
                        type="file" className="hidden" required
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileChange}
                        disabled={watermarking}
                      />
                    </label>
                    {watermarkError && (
                      <div className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1.5 ml-1">
                        <AlertTriangle size={14} /> {watermarkError}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit" disabled={uploadButtonDisabled}
                    className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {uploading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                    ) : hasBlockingDuplicate ? (
                      <><AlertTriangle size={18} /> Vérifiez le doublon détecté</>
                    ) : duplicateCheck.status === 'checking' ? (
                      <><FileSearch size={18} /> Vérification du titre...</>
                    ) : (
                      <><Upload size={18} /> Publier le Document</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'validate' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Validation</h2>
              </div>
              
              {isFetching ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between animate-pulse">
                      <div className="flex items-start gap-4 flex-1 w-full">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0" />
                        <div className="flex-1 w-full space-y-2 mt-1">
                          <div className="w-1/2 h-5 bg-slate-100 rounded" />
                          <div className="w-3/4 h-4 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <div className="flex-1 md:flex-none w-24 h-11 bg-slate-100 rounded-xl" />
                        <div className="flex-1 md:flex-none w-24 h-11 bg-slate-100 rounded-xl" />
                        <div className="flex-1 md:flex-none w-24 h-11 bg-slate-100 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                     <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Tout est à jour !</h3>
                  <p className="text-sm text-slate-500">Aucun document en attente de validation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDocs.map(doc => (
                    <div key={doc._id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                          <Clock size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800 mb-1">{doc.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1"><User size={12}/> {doc.uploadedBy?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"/>
                            <span>{doc.university?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"/>
                            <span>{doc.level?.name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button onClick={() => handleDownload(doc)} disabled={downloadingDocs[doc._id]} className="flex-1 md:flex-none text-center px-5 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 flex justify-center items-center">
                          {downloadingDocs[doc._id] ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : 'Voir'}
                        </button>
                        <button onClick={() => handleValidateDocument(doc._id, 'rejected')} disabled={validatingDocs[doc._id]} className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center justify-center">
                          {validatingDocs[doc._id] === 'rejected' ? <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" /> : 'Rejeter'}
                        </button>
                        <button onClick={() => handleValidateDocument(doc._id, 'approved')} disabled={validatingDocs[doc._id]} className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center justify-center">
                          {validatingDocs[doc._id] === 'approved' ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : 'Valider'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination UI Pending Documents */}
              {pendingDocsPagination && pendingDocsPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setPendingDocsPage(p => Math.max(1, p - 1))}
                    disabled={pendingDocsPage <= 1}
                    className="px-4 py-2 bg-white rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                  >
                    Précédent
                  </button>
                  <span className="text-sm font-medium text-slate-500">
                    Page {pendingDocsPage} sur {pendingDocsPagination.pages}
                  </span>
                  <button
                    onClick={() => setPendingDocsPage(p => Math.min(pendingDocsPagination.pages, p + 1))}
                    disabled={pendingDocsPage >= pendingDocsPagination.pages}
                    className="px-4 py-2 bg-white rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'referentials' && user?.isSuperAdmin && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <ReferentialAdminPanel />
            </motion.div>
          )}

          {activeTab === 'analytics' && analytics && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Vue d'ensemble</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Documents', value: analytics.totalDocuments, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Documents Actifs', value: analytics.approvedDocuments, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Vues Globales', value: analytics.totalViews, icon: Eye, color: 'text-sky-600', bg: 'bg-sky-50' },
                  { label: 'Téléchargements', value: analytics.totalDownloads, icon: Upload, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-400 mb-1">{stat.label}</p>
                      <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={stat.color} size={24} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm lg:col-span-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition par Statut</h3>
                  <div className="h-64 flex items-center justify-center relative">
                    <Doughnut 
                      data={{
                        labels: ['Approuvés', 'En attente'],
                        datasets: [{
                          data: [analytics.approvedDocuments, analytics.pendingDocuments],
                          backgroundColor: ['#10B981', '#F59E0B'],
                          borderWidth: 0,
                          hoverOffset: 4
                        }]
                      }} 
                      options={{ cutout: '75%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: { family: 'Inter', weight: 'bold' } } } } }} 
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                      <span className="text-3xl font-black text-slate-800">{analytics.totalDocuments}</span>
                      <span className="text-xs font-bold text-slate-400">Total</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
