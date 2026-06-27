
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Plus,
  Trash2,
  Eye,
  BookOpen,
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const Dashboard = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    university: '',
    department: '',
    level: '',
    semester: '',
    category: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
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
      setUniversities(uniRes.data.data);
      setDepartments(deptRes.data.data);
      setLevels(levelRes.data.data);
      setSemesters(semRes.data.data);
      setCategories(catRes.data.data);

      if (user.role === 'admin' || user.role === 'sub-admin') {
        const pendingRes = await axios.get('/api/documents/pending');
        setPendingDocs(pendingRes.data.data);

        if (user.role === 'admin') {
          const analyticsRes = await axios.get('/api/documents/analytics');
          setAnalytics(analyticsRes.data.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      await axios.post('/api/documents', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData({
        title: '',
        description: '',
        university: '',
        department: '',
        level: '',
        semester: '',
        category: '',
        file: null,
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleValidateDocument = async (id, status) => {
    try {
      await axios.put(`/api/documents/${id}/validate`, { status });
      fetchDashboardData();
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await axios.delete(`/api/documents/${id}`);
        fetchDashboardData();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartData = analytics ? {
    doughnut: {
      labels: ['Approuvés', 'En attente'],
      datasets: [
        {
          data: [analytics.approvedDocuments, analytics.pendingDocuments],
          backgroundColor: ['#10B981', '#F59E0B'],
        },
      ],
    },
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour, {user?.name} !
          </h1>
          <p className="text-gray-600 mt-1">
            Rôle : {user?.role === 'admin' ? 'Administrateur' : user?.role === 'sub-admin' ? 'Sous-administrateur' : 'Contributeur'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 font-medium ${activeTab === 'documents' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="h-5 w-5 inline mr-2" />
            Mes documents
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-medium ${activeTab === 'upload' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Upload className="h-5 w-5 inline mr-2" />
            Uploader un document
          </button>
          {(user?.role === 'admin' || user?.role === 'sub-admin') && (
            <button
              onClick={() => setActiveTab('validate')}
              className={`px-4 py-2 font-medium ${activeTab === 'validate' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckCircle className="h-5 w-5 inline mr-2" />
              Valider les documents
              {pendingDocs.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingDocs.length}
                </span>
              )}
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium ${activeTab === 'analytics' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Analytiques
            </button>
          )}
        </div>

        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mes documents</h2>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Vous n'avez pas encore uploadé de document</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map(doc => (
                  <div key={doc._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{doc.university?.name}</span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            {doc.views} vues
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${doc.status === 'approved' ? 'bg-green-100 text-green-700' : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {doc.status === 'approved' ? 'Approuvé' : doc.status === 'pending' ? 'En attente' : 'Rejeté'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/uploads/${doc.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-primary"
                      >
                        <Eye className="h-5 w-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="p-2 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Uploader un nouveau document</h2>
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Titre du document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Description du document"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Université</label>
                  <select
                    name="university"
                    value={formData.university}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {universities.map(uni => (
                      <option key={uni._id} value={uni._id}>{uni.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {levels.map(level => (
                      <option key={level._id} value={level._id}>{level.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semestre</label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {semesters.map(sem => (
                      <option key={sem._id} value={sem._id}>{sem.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      {formData.file ? formData.file.name : 'Cliquez pour sélectionner un fichier ou glissez-déposez'}
                    </p>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-primary hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Upload en cours...
                  </div>
                ) : (
                  <>
                    <Plus className="h-5 w-5 inline mr-2" />
                    Uploader le document
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'validate' && (user?.role === 'admin' || user?.role === 'sub-admin') && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Documents à valider</h2>
            {pendingDocs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun document à valider</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingDocs.map(doc => (
                  <div key={doc._id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{doc.title}</h3>
                        <p className="text-gray-600 mt-1">Uploadé par : {doc.uploadedBy?.name}</p>
                      </div>
                      <span className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                        <Clock className="h-4 w-4" />
                        En attente
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-gray-600 mb-4">{doc.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
                      <div><span className="font-medium">Université :</span> {doc.university?.name}</div>
                      <div><span className="font-medium">Département :</span> {doc.department?.name}</div>
                      <div><span className="font-medium">Niveau :</span> {doc.level?.name}</div>
                      <div><span className="font-medium">Semestre :</span> {doc.semester?.name}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <a
                        href={`/uploads/${doc.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-blue-600"
                      >
                        Voir le document
                      </a>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleValidateDocument(doc._id, 'rejected')}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleValidateDocument(doc._id, 'approved')}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          Approuver
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && user?.role === 'admin' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total documents</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalDocuments}</p>
                  </div>
                  <FileText className="h-12 w-12 text-primary opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Documents approuvés</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{analytics.approvedDocuments}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total vues</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{analytics.totalViews}</p>
                  </div>
                  <Eye className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total téléchargements</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.totalDownloads}</p>
                  </div>
                  <BookOpen className="h-12 w-12 text-purple-500 opacity-20" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Statut des documents</h3>
                {chartData && <Doughnut data={chartData.doughnut} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
