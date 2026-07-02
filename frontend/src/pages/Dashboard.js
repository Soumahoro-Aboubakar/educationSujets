import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, LogOut, FileText, Upload,
  CheckCircle, BarChart3, Menu, X, Eye, Trash2, Clock, 
  MapPin, BookOpen, Layers, Briefcase, Calendar, GraduationCap, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
  
  // Filters data
  const [filtersData, setFiltersData] = useState({
    universities: [], departments: [], levels: [], semesters: [], categories: []
  });

  const [activeFilters, setActiveFilters] = useState({
    university: '', department: '', level: '', semester: '', category: ''
  });

  const [uploadData, setUploadData] = useState({
    title: '', description: '', university: '', department: '', level: '', semester: '', category: '', file: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [docsRes, uniRes, deptRes, levelRes, semRes, catRes] = await Promise.all([
        axios.get('/api/documents/my'),
        axios.get('/api/universities'),
        axios.get('/api/departments'),
        axios.get('/api/levels'),
        axios.get('/api/semesters'),
        axios.get('/api/categories'),
      ]);
      setDocuments(docsRes.data.data);
      setFiltersData({
        universities: uniRes.data.data,
        departments: deptRes.data.data,
        levels: levelRes.data.data,
        semesters: semRes.data.data,
        categories: catRes.data.data,
      });

      if (user?.role === 'admin' || user?.role === 'sub-admin') {
        const pendingRes = await axios.get('/api/documents/pending');
        setPendingDocs(pendingRes.data.data);
        if (user?.role === 'admin') {
          const analyticsRes = await axios.get('/api/documents/analytics');
          setAnalytics(analyticsRes.data.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
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
    ...(user?.role === 'admin' ? [{ id: 'analytics', label: 'Analytiques', icon: BarChart3 }] : []),
  ];

  // Rest of functions...
  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      Object.keys(uploadData).forEach(key => {
        if (uploadData[key]) formData.append(key, uploadData[key]);
      });
      await axios.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadData({ title: '', description: '', university: '', department: '', level: '', semester: '', category: '', file: null });
      fetchDashboardData();
      setActiveTab('documents');
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
    } finally {
      setUploading(false);
    }
  };

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
              
              {documents.length === 0 ? (
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
                          <a href={`/uploads/${doc.file}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                            <Eye size={16} />
                          </a>
                          <button onClick={() => {/* Handle delete */}} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[
                        { key: 'university', label: 'Université', options: filtersData.universities },
                        { key: 'department', label: 'Département', options: filtersData.departments },
                        { key: 'level', label: 'Niveau', options: filtersData.levels },
                        { key: 'semester', label: 'Semestre', options: filtersData.semesters },
                        { key: 'category', label: 'Catégorie', options: filtersData.categories },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">{field.label}</label>
                          <select
                            required
                            value={uploadData[field.key]}
                            onChange={(e) => setUploadData({ ...uploadData, [field.key]: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 appearance-none focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                          >
                            <option value="">Sélectionner</option>
                            {field.options.map((opt) => (
                              <option key={opt._id} value={opt._id}>{opt.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Fichier (PDF, DOCX)</label>
                    <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group ${uploadData.file ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${uploadData.file ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'}`}>
                        {uploadData.file ? <CheckCircle size={28} /> : <Upload size={28} />}
                      </div>
                      <span className={`text-sm font-bold ${uploadData.file ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {uploadData.file ? uploadData.file.name : 'Cliquez ou glissez-déposez un fichier'}
                      </span>
                      {!uploadData.file && <span className="text-xs font-medium text-slate-400 mt-2">Maximum 10MB</span>}
                      
                      <input
                        type="file" className="hidden" required
                        onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                      />
                    </label>
                  </div>

                  <button
                    type="submit" disabled={uploading}
                    className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {uploading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
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
              
              {pendingDocs.length === 0 ? (
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
                        <a href={`/uploads/${doc.file}`} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none text-center px-5 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
                          Voir
                        </a>
                        <button className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors">
                          Rejeter
                        </button>
                        <button className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors">
                          Valider
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
