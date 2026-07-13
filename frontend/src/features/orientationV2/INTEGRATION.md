# Guide d'Intégration - Moteur d'Orientation V2

## 🚀 Intégration dans les Composants

### 1. Importer les Modules

```javascript
// Composant page
import OrientationSimulatorPage from './pages/OrientationSimulatorPage';

// Dans App.js
import { BrowserRouter as Router, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Route path="/orientation" component={OrientationSimulatorPage} />
    </Router>
  );
}
```

### 2. Utiliser dans OrientationWizard

```javascript
// OrientationWizard.js
import { runOrientationEngine } from '../logic/orientationEngine';
import ResultCard from './ResultCard';
import FilterPanel from './FilterPanel';
import DetailModal from './DetailModal';

export default function OrientationWizard() {
  const [results, setResults] = useState(null);
  const [filters, setFilters] = useState({});

  const handleAnalyze = () => {
    const profile = {
      bacType: userBacType,
      age: userAge,
      notes: userNotes,
      socioProfile: userSocio,
      preferredSectors: userSectors
    };

    const results = runOrientationEngine(profile, filters);
    setResults(results);
  };

  // Retourner UI avec résultats triés
}
```

### 3. Afficher les Résultats

```javascript
// Utiliser ResultCard dans boucle
{results.topRecommendations.map((formation) => (
  <ResultCard 
    key={formation.id} 
    item={formation} 
    type="top"
    onViewDetails={(formation) => console.log(formation)}
  />
))}

{results.secondaryOptions.map((formation) => (
  <ResultCard key={formation.id} item={formation} type="secondary" />
))}

{results.tertiaryOptions.map((formation) => (
  <ResultCard key={formation.id} item={formation} type="tertiary" />
))}

{results.rejected.map((formation) => (
  <ResultCard key={formation.id} item={formation} type="rejected" />
))}
```

## 📊 Intégration Backend (Optionnel)

### 1. Créer les Routes

```javascript
// backend/routes/orientation.js
import express from 'express';
import { analyze, getHistory } from '../controllers/orientationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/analyze', authenticateToken, analyze);
router.get('/history', authenticateToken, getHistory);

export default router;
```

### 2. Implémenter le Controller

```javascript
// backend/controllers/orientationController.js
import UserProfile from '../models/UserProfile';
import OrientationResult from '../models/OrientationResult';

export const analyze = async (req, res) => {
  try {
    const { profile, filters } = req.body;
    
    // Valider le profil
    if (!profile.bacType || !profile.age || !profile.notes) {
      return res.status(400).json({ error: 'Invalid profile' });
    }

    // Sauvegarder le profil
    const userProfile = new UserProfile({
      userId: req.user.id,
      ...profile
    });
    await userProfile.save();

    // Exécuter le moteur (côté frontend, retournée au backend)
    const results = req.body.results; // Calculs frontend

    // Sauvegarder les résultats
    const result = new OrientationResult({
      userId: req.user.id,
      profileId: userProfile._id,
      results,
      filters,
      timestamp: new Date()
    });
    await result.save();

    res.json({
      success: true,
      profileId: userProfile._id,
      resultId: result._id,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const results = await OrientationResult.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('profileId');

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 3. Créer les Models

```javascript
// backend/models/UserProfile.js
import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  bacType: { type: String, required: true },
  age: { type: Number, required: true },
  notes: {
    math: Number,
    pc: Number,
    svt: Number,
    francais: Number,
    philo: Number,
    anglais: Number
  },
  socioProfile: {
    budget: String,
    preferBourse: Boolean,
    needLogement: Boolean,
    preferAlternance: Boolean
  },
  preferredSectors: [String],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('UserProfile', userProfileSchema);
```

```javascript
// backend/models/OrientationResult.js
import mongoose from 'mongoose';

const orientationResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  profileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'UserProfile' },
  results: {
    topRecommendations: [{}],
    secondaryOptions: [{}],
    tertiaryOptions: [{}],
    rejected: [{}]
  },
  filters: {},
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('OrientationResult', orientationResultSchema);
```

### 4. Mettre à jour server.js

```javascript
// backend/server.js
import orientationRoutes from './routes/orientation.js';

app.use('/api/orientation', orientationRoutes);
```

## 🔌 Appels API depuis le Frontend

```javascript
// src/features/orientationV2/api/orientationAPI.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const analyzeOrientation = async (profile, filters, results) => {
  try {
    const response = await axios.post(`${API_URL}/orientation/analyze`, {
      profile,
      filters,
      results
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Orientation analysis error:', error);
    throw error;
  }
};

export const getOrientationHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/orientation/history`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('History retrieval error:', error);
    throw error;
  }
};
```

## 📈 Monitoring & Analytics

```javascript
// src/features/orientationV2/utils/analytics.js
export const trackOrientationEvent = (eventName, data) => {
  if (window.gtag) {
    window.gtag('event', eventName, data);
  }
};

export const trackAnalysis = (profile, results) => {
  trackOrientationEvent('orientation_analysis', {
    bacType: profile.bacType,
    topRecommendations: results.topRecommendations.length,
    totalResults: results.topRecommendations.length + 
                  results.secondaryOptions.length +
                  results.tertiaryOptions.length
  });
};

export const trackDetailView = (formation) => {
  trackOrientationEvent('formation_detail_view', {
    formationId: formation.id,
    etablissement: formation.nomEtablissement,
    filiere: formation.filiere
  });
};

export const trackFormationSave = (formation) => {
  trackOrientationEvent('formation_saved', {
    formationId: formation.id
  });
};
```

## 🧪 Teste d'Intégration

```javascript
// src/features/orientationV2/__tests__/integration.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OrientationWizard from '../components/OrientationWizard';

describe('OrientationWizard Integration', () => {
  test('should analyze and display results', async () => {
    render(<OrientationWizard />);

    // Remplir le profil
    fireEvent.change(screen.getByLabelText(/Bac/i), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText(/Age/i), { target: { value: '19' } });

    // Remplir les notes
    fireEvent.change(screen.getByLabelText(/Mathématiques/i), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText(/Français/i), { target: { value: '11' } });

    // Analyser
    fireEvent.click(screen.getByRole('button', { name: /Analyser/i }));

    // Vérifier les résultats
    await waitFor(() => {
      expect(screen.getByText(/Top Recommandations/i)).toBeInTheDocument();
    });
  });

  test('should display rejected formations', async () => {
    render(<OrientationWizard />);

    // Profil avec notes très faibles
    fireEvent.change(screen.getByLabelText(/Bac/i), { target: { value: 'D' } });
    fireEvent.change(screen.getByLabelText(/Mathématiques/i), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /Analyser/i }));

    await waitFor(() => {
      expect(screen.getByText(/Filières Rejetées/i)).toBeInTheDocument();
    });
  });
});
```

## 📝 Checklist Déploiement

- [ ] Frontend build successful
- [ ] Backend routes tested
- [ ] MongoDB models created
- [ ] Environment variables configured
- [ ] API endpoints responding
- [ ] Frontend → Backend integration tested
- [ ] Analytics tracking implemented
- [ ] Error handling in place
- [ ] Loading states handled
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed
- [ ] Performance optimized

## 🔗 URLs Utiles

**Frontend:**
- http://localhost:3000/orientation
- http://localhost:3000/orientation/targeted

**Backend:**
- POST http://localhost:5000/api/orientation/analyze
- GET http://localhost:5000/api/orientation/history

**Documentation:**
- /frontend/src/features/orientationV2/README.md
- /frontend/src/features/orientationV2/ARCHITECTURE.md

## 🆘 Dépannage

### Build Error: Module not found
```bash
npm install
npm run build
```

### Infinite Loop in useEffect
→ Vérifier dépendances du tableau

### API 401 Unauthorized
→ Vérifier token JWT dans localStorage

### Scores toujours 0
→ Vérifier que notes sont remplies et convertis en nombres

---

**Questions?** Consultez la documentation dans le dossier `orientationV2/`.
