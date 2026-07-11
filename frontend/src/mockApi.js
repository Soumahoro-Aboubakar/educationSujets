import axios from 'axios';

// Initial Mock Data
const INITIAL_UNIVERSITIES = [
  { _id: 'uni1', name: 'Université Félix Houphouët-Boigny (Cocody)' },
  { _id: 'uni2', name: 'Université Nangui Abrogoua (Abobo-Adjamé)' },
  { _id: 'uni3', name: 'Université Alassane Ouattara (Bouaké)' },
  { _id: 'uni4', name: 'INPHB (Yamoussoukro)' }
];

const INITIAL_DEPARTMENTS = [
  { _id: 'dept1', name: 'Sciences des Structures et de la Matière (SSMT)' },
  { _id: 'dept2', name: 'Mathématiques et Informatique (MI)' },
  { _id: 'dept3', name: 'Biosciences' },
  { _id: 'dept4', name: 'Génie Civil' }
];

const INITIAL_LEVELS = [
  { _id: 'level1', name: 'Licence 1' },
  { _id: 'level2', name: 'Licence 2' },
  { _id: 'level3', name: 'Licence 3' },
  { _id: 'level4', name: 'Master 1' },
  { _id: 'level5', name: 'Master 2' }
];

const INITIAL_SEMESTERS = [
  { _id: 'sem1', name: 'Semestre 1' },
  { _id: 'sem2', name: 'Semestre 2' }
];

const INITIAL_CATEGORIES = [
  { _id: 'cat1', name: 'Cours' },
  { _id: 'cat2', name: 'Exercices / TD' },
  { _id: 'cat3', name: 'Sujets d\'Examens' },
  { _id: 'cat4', name: 'Corrigés' }
];

const INITIAL_USERS = [
  {
    _id: 'user_admin',
    name: 'Admin Éducation',
    email: 'admin@test.com',
    password: 'password',
    role: 'admin'
  },
  {
    _id: 'user_validator',
    name: 'Validateur Test',
    email: 'validator@test.com',
    password: 'password',
    role: 'sub-admin'
  },
  {
    _id: 'user_contrib',
    name: 'Kouassi Konan',
    email: 'user@test.com',
    password: 'password',
    role: 'contributor'
  }
];

const INITIAL_DOCUMENTS = [
  {
    _id: 'doc1',
    title: 'Examen Algèbre et Analyse L1 2025',
    description: 'Sujet de l\'examen de fin de semestre 1 de mathématiques générales L1.',
    university: 'uni1',
    department: 'dept2',
    level: 'level1',
    semester: 'sem1',
    category: 'cat3',
    file: 'examen_algebre_l1.pdf',
    fileType: 'PDF',
    views: 154,
    downloads: 32,
    status: 'approved',
    uploadedBy: 'user_admin',
    createdAt: '2026-06-15T10:00:00.000Z'
  },
  {
    _id: 'doc2',
    title: 'Cours Algorithmes et Structures de Données complexes',
    description: 'Polycopié complet du cours sur les structures de données (arbres, graphes) en Licence 2.',
    university: 'uni3',
    department: 'dept2',
    level: 'level2',
    semester: 'sem1',
    category: 'cat1',
    file: 'cours_algo_l2.pdf',
    fileType: 'PDF',
    views: 420,
    downloads: 87,
    status: 'approved',
    uploadedBy: 'user_admin',
    createdAt: '2026-06-20T14:30:00.000Z'
  },
  {
    _id: 'doc3',
    title: 'Devoir de Mécanique Quantique',
    description: 'Sujet et solution de l\'interrogation de Physique atomique Licence 3.',
    university: 'uni1',
    department: 'dept1',
    level: 'level3',
    semester: 'sem2',
    category: 'cat2',
    file: 'devoir_meca_quantique.pdf',
    fileType: 'PDF',
    views: 12,
    downloads: 3,
    status: 'pending',
    uploadedBy: 'user_contrib',
    createdAt: '2026-06-29T11:15:00.000Z'
  },
  {
    _id: 'doc4',
    title: 'TD Chimie Organique L2',
    description: 'Fiche d\'exercices sur les réactions d\'addition électrophile et de substitution nucléophile.',
    university: 'uni2',
    department: 'dept3',
    level: 'level2',
    semester: 'sem2',
    category: 'cat2',
    file: 'td_chimie_l2.pdf',
    fileType: 'PDF',
    views: 45,
    downloads: 12,
    status: 'approved',
    uploadedBy: 'user_contrib',
    createdAt: '2026-06-28T09:00:00.000Z'
  }
];

// Load context from localStorage or set defaults
const loadDB = (key, defaults) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaults;
  }
};

const saveDB = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize DBs
let dbUsers = loadDB('mock_users', INITIAL_USERS);
let dbDocuments = loadDB('mock_documents', INITIAL_DOCUMENTS);
const dbUniversities = loadDB('mock_universities', INITIAL_UNIVERSITIES);
const dbDepartments = loadDB('mock_departments', INITIAL_DEPARTMENTS);
const dbLevels = loadDB('mock_levels', INITIAL_LEVELS);
const dbSemesters = loadDB('mock_semesters', INITIAL_SEMESTERS);
const dbCategories = loadDB('mock_categories', INITIAL_CATEGORIES);

// Helper function to extract user from Authorization header
const getUserFromHeaders = (headers) => {
  const authHeader = headers?.Authorization || headers?.authorization || axios.defaults.headers.common['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  // Token structure: "mock-token-<userId>"
  const match = token.match(/^mock-token-(.+)$/);
  if (match) {
    const userId = match[1];
    return dbUsers.find(u => u._id === userId) || null;
  }
  return null;
};

// Helper function to populate relations of a document
const populateDocument = (doc) => {
  if (!doc) return null;
  const university = dbUniversities.find(u => u._id === doc.university) || { _id: doc.university, name: 'Université inconnue' };
  const department = dbDepartments.find(d => d._id === doc.department) || { _id: doc.department, name: 'Département inconnu' };
  const level = dbLevels.find(l => l._id === doc.level) || { _id: doc.level, name: 'Niveau inconnu' };
  const semester = dbSemesters.find(s => s._id === doc.semester) || { _id: doc.semester, name: 'Semestre inconnu' };
  const category = dbCategories.find(c => c._id === doc.category) || { _id: doc.category, name: 'Catégorie inconnue' };
  const uploadedByUser = dbUsers.find(u => u._id === doc.uploadedBy) || { _id: doc.uploadedBy, name: 'Utilisateur anonyme' };
  
  return {
    ...doc,
    university,
    department,
    level,
    semester,
    category,
    uploadedBy: {
      _id: uploadedByUser._id,
      name: uploadedByUser.name,
      email: uploadedByUser.email,
      role: uploadedByUser.role
    }
  };
};

const normalizeTitle = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getTitleTokens = (value) =>
  normalizeTitle(value).split(' ').filter((token) => token.length > 2);

const getBigrams = (value) => {
  const compact = normalizeTitle(value).replace(/\s+/g, '');
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
};

const getTitleSimilarity = (sourceTitle, candidateTitle) => {
  const source = normalizeTitle(sourceTitle);
  const candidate = normalizeTitle(candidateTitle);
  if (!source || !candidate) return 0;
  if (source === candidate) return 1;

  const sourceTokens = getTitleTokens(source);
  const candidateTokens = getTitleTokens(candidate);
  const sharedTokens = sourceTokens.filter((token) => candidateTokens.includes(token));
  const tokenScore = sourceTokens.length && candidateTokens.length
    ? sharedTokens.length / Math.min(sourceTokens.length, candidateTokens.length)
    : 0;
  const sourceBigrams = getBigrams(source);
  const candidateBigrams = getBigrams(candidate);
  const sharedBigrams = sourceBigrams.filter((bigram) => candidateBigrams.includes(bigram));
  const bigramScore = sourceBigrams.length && candidateBigrams.length
    ? (2 * sharedBigrams.length) / (sourceBigrams.length + candidateBigrams.length)
    : 0;
  const containmentScore = source.includes(candidate) || candidate.includes(source)
    ? Math.min(source.length, candidate.length) / Math.max(source.length, candidate.length)
    : 0;

  return Math.min(1, Math.max(tokenScore * 0.92, bigramScore, containmentScore));
};

const canViewDocument = (doc, currentUser) => (
  doc.status === 'approved' ||
  currentUser?.role === 'admin' ||
  currentUser?.role === 'sub-admin' ||
  doc.uploadedBy === currentUser?._id
);

// Implement Axios Mock Adapter
const mockAdapter = (config) => {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      const { method, url, data, params, headers } = config;
      
      console.log(`[Mock API Call] ${method.toUpperCase()} ${url}`, { params, data });

      // GET /api/auth/me
      if (url === '/api/auth/me' && method === 'get') {
        const currentUser = getUserFromHeaders(headers);
        if (currentUser) {
          resolve({
            status: 200,
            data: { success: true, data: { _id: currentUser._id, name: currentUser.name, email: currentUser.email, role: currentUser.role } },
            headers: {},
            config
          });
        } else {
          reject({
            response: {
              status: 401,
              data: { error: 'Non autorisé' }
            }
          });
        }
        return;
      }

      // POST /api/auth/login
      if (url === '/api/auth/login' && method === 'post') {
        const body = typeof data === 'string' ? JSON.parse(data) : data;
        const userFound = dbUsers.find(u => u.email === body.email && u.password === body.password);
        if (userFound) {
          const token = `mock-token-${userFound._id}`;
          resolve({
            status: 250,
            data: {
              token,
              user: { _id: userFound._id, name: userFound.name, email: userFound.email, role: userFound.role }
            },
            headers: {},
            config
          });
        } else {
          reject({
            response: {
              status: 400,
              data: { error: 'E-mail ou mot de passe incorrect' }
            }
          });
        }
        return;
      }

      // POST /api/auth/register
      if (url === '/api/auth/register' && method === 'post') {
        const body = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (dbUsers.some(u => u.email === body.email)) {
          reject({
            response: {
              status: 400,
              data: { error: 'Cet e-mail est déjà utilisé' }
            }
          });
          return;
        }

        const newUser = {
          _id: `user_${Date.now()}`,
          name: body.name,
          email: body.email,
          password: body.password,
          role: 'contributor' // default role
        };

        dbUsers.push(newUser);
        saveDB('mock_users', dbUsers);

        const token = `mock-token-${newUser._id}`;
        resolve({
          status: 252,
          data: {
            token,
            user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
          },
          headers: {},
          config
        });
        return;
      }

      // GET static entities
      if (url === '/api/universities' && method === 'get') {
        resolve({ status: 200, data: { data: dbUniversities }, headers: {}, config });
        return;
      }
      if (url === '/api/departments' && method === 'get') {
        resolve({ status: 200, data: { data: dbDepartments }, headers: {}, config });
        return;
      }
      if (url === '/api/levels' && method === 'get') {
        resolve({ status: 200, data: { data: dbLevels }, headers: {}, config });
        return;
      }
      if (url === '/api/semesters' && method === 'get') {
        resolve({ status: 200, data: { data: dbSemesters }, headers: {}, config });
        return;
      }
      if (url === '/api/categories' && method === 'get') {
        resolve({ status: 200, data: { data: dbCategories }, headers: {}, config });
        return;
      }

      // POST static entities
      const handleStaticPost = (entityList, dbKey) => {
        const body = typeof data === 'string' ? JSON.parse(data) : data;
        const name = body.name?.trim();
        if (!name) {
          reject({ response: { status: 400, data: { error: 'Nom requis' } } });
          return;
        }

        // Case insensitive duplicate check
        const existing = entityList.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          resolve({ status: 200, data: { data: existing }, headers: {}, config });
          return;
        }

        const newEntity = { _id: `${dbKey}_${Date.now()}`, name };
        entityList.push(newEntity);
        saveDB(`mock_${dbKey}`, entityList);

        resolve({ status: 201, data: { data: newEntity }, headers: {}, config });
      };

      if (url === '/api/universities' && method === 'post') {
        handleStaticPost(dbUniversities, 'universities');
        return;
      }
      if (url === '/api/departments' && method === 'post') {
        handleStaticPost(dbDepartments, 'departments');
        return;
      }
      if (url === '/api/levels' && method === 'post') {
        handleStaticPost(dbLevels, 'levels');
        return;
      }
      if (url === '/api/semesters' && method === 'post') {
        handleStaticPost(dbSemesters, 'semesters');
        return;
      }
      if (url === '/api/categories' && method === 'post') {
        handleStaticPost(dbCategories, 'categories');
        return;
      }

      // GET /api/documents/duplicates/title
      if (url === '/api/documents/duplicates/title' && method === 'get') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser) {
          reject({ response: { status: 401, data: { error: 'Non autorisé' } } });
          return;
        }

        const title = params?.title || '';
        const matches = dbDocuments
          .map((doc) => {
            const duplicateScore = Math.max(
              getTitleSimilarity(title, doc.title),
              getTitleSimilarity(title, doc.file)
            );

            return {
              ...populateDocument(doc),
              duplicateScore: Number(duplicateScore.toFixed(2)),
              matchPercent: Math.round(duplicateScore * 100),
              canView: canViewDocument(doc, currentUser)
            };
          })
          .filter((doc) => doc.duplicateScore >= 0.68)
          .sort((a, b) => b.duplicateScore - a.duplicateScore)
          .slice(0, 5);

        resolve({ status: 200, data: { success: true, data: matches, count: matches.length }, headers: {}, config });
        return;
      }

      // GET /api/documents (Public searchable list of APPROVED documents)
      if (url === '/api/documents' && method === 'get') {
        let filtered = dbDocuments.filter(d => d.status === 'approved');
        
        if (params) {
          if (params.university) filtered = filtered.filter(d => d.university === params.university);
          if (params.department) filtered = filtered.filter(d => d.department === params.department);
          if (params.level) filtered = filtered.filter(d => d.level === params.level);
          if (params.semester) filtered = filtered.filter(d => d.semester === params.semester);
          if (params.category) filtered = filtered.filter(d => d.category === params.category);
        }

        const populated = filtered.map(populateDocument);
        resolve({ status: 200, data: { data: populated }, headers: {}, config });
        return;
      }

      // GET /api/documents/my
      if (url === '/api/documents/my' && method === 'get') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser) {
          reject({ response: { status: 401, data: { error: 'Non autorisé' } } });
          return;
        }

        const myDocs = dbDocuments.filter(d => d.uploadedBy === currentUser._id);
        const populated = myDocs.map(populateDocument);
        resolve({ status: 200, data: { data: populated }, headers: {}, config });
        return;
      }

      // GET /api/documents/pending
      if (url === '/api/documents/pending' && method === 'get') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sub-admin')) {
          reject({ response: { status: 403, data: { error: 'Accès refusé' } } });
          return;
        }

        const pendingDocs = dbDocuments.filter(d => d.status === 'pending');
        const populated = pendingDocs.map(populateDocument);
        resolve({ status: 200, data: { data: populated }, headers: {}, config });
        return;
      }

      // GET /api/documents/analytics
      if (url === '/api/documents/analytics' && method === 'get') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser || currentUser.role !== 'admin') {
          reject({ response: { status: 403, data: { error: 'Accès refusé' } } });
          return;
        }

        const totalDocuments = dbDocuments.length;
        const approvedDocuments = dbDocuments.filter(d => d.status === 'approved').length;
        const pendingDocuments = dbDocuments.filter(d => d.status === 'pending').length;
        const totalViews = dbDocuments.reduce((sum, d) => sum + (d.views || 0), 0);
        const totalDownloads = dbDocuments.reduce((sum, d) => sum + (d.downloads || 0), 0);

        resolve({
          status: 200,
          data: {
            data: {
              totalDocuments,
              approvedDocuments,
              pendingDocuments,
              totalViews,
              totalDownloads
            }
          },
          headers: {},
          config
        });
        return;
      }

      // POST /api/documents (Upload document)
      if (url === '/api/documents' && method === 'post') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser) {
          reject({ response: { status: 401, data: { error: 'Non autorisé' } } });
          return;
        }

        // Parse FormData manually
        let title = '';
        let description = '';
        let university = '';
        let department = '';
        let level = '';
        let semester = '';
        let category = '';
        let fileName = 'document.pdf';

        if (data instanceof FormData) {
          title = data.get('title') || 'Sans titre';
          description = data.get('description') || '';
          university = data.get('university') || '';
          department = data.get('department') || '';
          level = data.get('level') || '';
          semester = data.get('semester') || '';
          category = data.get('category') || '';
          const fileObj = data.get('file');
          if (fileObj && typeof fileObj === 'object') {
            fileName = fileObj.name;
          }
        } else {
          const body = typeof data === 'string' ? JSON.parse(data) : data;
          title = body?.title || 'Sans titre';
          description = body?.description || '';
          university = body?.university || '';
          department = body?.department || '';
          level = body?.level || '';
          semester = body?.semester || '';
          category = body?.category || '';
          fileName = body?.fileName || 'document.pdf';
        }

        const extension = fileName.split('.').pop().toUpperCase();
        const fileType = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'PNG', 'JPG', 'JPEG'].includes(extension) ? extension : 'PDF';

        const newDoc = {
          _id: `doc_${Date.now()}`,
          title,
          description,
          university,
          department,
          level,
          semester,
          category,
          file: fileName,
          fileType,
          views: 0,
          downloads: 0,
          status: 'pending', // Uploaded files are pending validation
          uploadedBy: currentUser._id,
          createdAt: new Date().toISOString()
        };

        dbDocuments.push(newDoc);
        saveDB('mock_documents', dbDocuments);

        resolve({
          status: 201,
          data: { success: true, data: populateDocument(newDoc) },
          headers: {},
          config
        });
        return;
      }

      // PUT /api/documents/:id/validate
      if (url.match(/^\/api\/documents\/[^/]+\/validate$/) && method === 'put') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'sub-admin')) {
          reject({ response: { status: 403, data: { error: 'Accès refusé' } } });
          return;
        }

        const match = url.match(/^\/api\/documents\/([^/]+)\/validate$/);
        const docId = match[1];
        
        const docIdx = dbDocuments.findIndex(d => d._id === docId);
        if (docIdx === -1) {
          reject({ response: { status: 404, data: { error: 'Document non trouvé' } } });
          return;
        }

        const body = typeof data === 'string' ? JSON.parse(data) : data;
        dbDocuments[docIdx].status = body.status; // 'approved' or 'rejected'
        saveDB('mock_documents', dbDocuments);

        resolve({
          status: 200,
          data: { success: true, data: populateDocument(dbDocuments[docIdx]) },
          headers: {},
          config
        });
        return;
      }

      // DELETE /api/documents/:id
      if (url.match(/^\/api\/documents\/[^/]+$/) && method === 'delete') {
        const currentUser = getUserFromHeaders(headers);
        if (!currentUser) {
          reject({ response: { status: 401, data: { error: 'Non autorisé' } } });
          return;
        }

        const match = url.match(/^\/api\/documents\/([^/]+)$/);
        const docId = match[1];

        const docIdx = dbDocuments.findIndex(d => d._id === docId);
        if (docIdx === -1) {
          reject({ response: { status: 404, data: { error: 'Document non trouvé' } } });
          return;
        }

        // Checks: only owner or admin can delete
        const doc = dbDocuments[docIdx];
        if (doc.uploadedBy !== currentUser._id && currentUser.role !== 'admin') {
          reject({ response: { status: 403, data: { error: 'Accès refusé' } } });
          return;
        }

        dbDocuments.splice(docIdx, 1);
        saveDB('mock_documents', dbDocuments);

        resolve({
          status: 200,
          data: { success: true, message: 'Document supprimé' },
          headers: {},
          config
        });
        return;
      }

      // Handle not found
      reject({
        response: {
          status: 404,
          data: { error: `Endpoint mock non implémenté: ${method} ${url}` }
        }
      });
    }, 400); // 400ms delay to make loading states visible and feel realistic
  });
};

// Register the request interceptor to use our mock adapter for all /api/* requests
axios.interceptors.request.use(
  (config) => {
    if (config.url && (config.url.startsWith('/api/') || config.url.startsWith('api/'))) {
      // Normalize url to start with /api/
      if (!config.url.startsWith('/')) {
        config.url = '/' + config.url;
      }
      config.adapter = mockAdapter;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

console.log('[Mock System] Axios interceptor registered successfully. E-mail list for test: admin@test.com, validator@test.com, user@test.com. Password is "password".');
