
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, FileText, Download, Eye } from 'lucide-react';

const Home = () => {
  const [documents, setDocuments] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    university: '',
    department: '',
    level: '',
    semester: '',
    category: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [uniRes, deptRes, levelRes, semRes, catRes] = await Promise.all([
        axios.get('/api/universities'),
        axios.get('/api/departments'),
        axios.get('/api/levels'),
        axios.get('/api/semesters'),
        axios.get('/api/categories'),
      ]);
      setUniversities(uniRes.data.data);
      setDepartments(deptRes.data.data);
      setLevels(levelRes.data.data);
      setSemesters(semRes.data.data);
      setCategories(catRes.data.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.university) params.university = filters.university;
      if (filters.department) params.department = filters.department;
      if (filters.level) params.level = filters.level;
      if (filters.semester) params.semester = filters.semester;
      if (filters.category) params.category = filters.category;
      
      const res = await axios.get('/api/documents', { params });
      let filteredDocs = res.data.data;
      
      if (filters.search) {
        filteredDocs = filteredDocs.filter(doc =>
          doc.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          doc.description?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Plateforme de Partage de Documents Éducatifs</h1>
          <p className="text-xl opacity-90">Trouvez et partagez des ressources pédagogiques de qualité</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-dark">Filtres de recherche</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Rechercher un document..."
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <select
              name="university"
              value={filters.university}
              onChange={handleFilterChange}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Toutes les universités</option>
              {universities.map(uni => (
                <option key={uni._id} value={uni._id}>{uni.name}</option>
              ))}
            </select>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Tous les départements</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <select
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Tous les niveaux</option>
              {levels.map(level => (
                <option key={level._id} value={level._id}>{level.name}</option>
              ))}
            </select>
            <select
              name="semester"
              value={filters.semester}
              onChange={handleFilterChange}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Tous les semestres</option>
              {semesters.map(sem => (
                <option key={sem._id} value={sem._id}>{sem.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun document trouvé</p>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-xs bg-blue-100 text-primary px-2 py-1 rounded-full">
                        {doc.fileType}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-2">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{doc.views} vues</span>
                    </span>
                    <span>{doc.university?.name}</span>
                  </div>
                  <a
                    href={`/uploads/${doc.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-300"
                  >
                    <Download className="h-4 w-4" />
                    <span>Télécharger</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
