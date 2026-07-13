# Architecture du Moteur d'Orientation Académique V2

## 📐 Diagramme Global

```
┌─────────────────────────────────────────────────────────────┐
│                  Interface Utilisateur                       │
│  (React Components - Mobile First / Responsive)             │
├─────────────────────────────────────────────────────────────┤
│  OrientationWizard  │  ResultCard  │  DetailModal  │  Filters │
├─────────────────────────────────────────────────────────────┤
│            Moteur d'Orientation (Logique)                   │
│  runOrientationEngine()  ↔  runTargetedMode()              │
│  runGeographicMode()     ↔  runAutopilotMode()             │
├─────────────────────────────────────────────────────────────┤
│              Module Filtrage & Scoring                      │
│  applyAdvancedFilters()   │  calculateScore()              │
│  filterByAcademicEligibility()  │  Filter helpers          │
├─────────────────────────────────────────────────────────────┤
│         Couche Données                                       │
│  CATALOG (20+ formations)  │  Constants  │  Utilities       │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Structure des Fichiers

```
frontend/src/features/orientationV2/
├── components/
│   ├── OrientationWizard.js      # Wizard principal (4 étapes)
│   ├── ResultCard.js              # Carte de résultat
│   ├── DetailModal.js             # Modal détails (NEW)
│   └── FilterPanel.js             # Panneau filtres (NEW)
├── data/
│   └── orientationCatalog.js       # Catalogue + constantes
├── logic/
│   ├── orientationEngine.js        # Moteur principal (refactorisé)
│   └── filters.js                  # Logique filtrage (NEW)
├── utils/
│   └── constants.js                # Constantes & config (NEW)
├── __tests__/
│   └── orientationEngine.test.js   # Tests (NEW)
├── README.md                       # Documentation API (NEW)
└── ARCHITECTURE.md                 # Ce fichier
```

## 🔄 Flux de Données

### 1. Initialisation - Profil Utilisateur

```javascript
Profile {
  bacType: string           // 'A1', 'A2', 'C', 'D', 'E', etc.
  age: number               // 15-50
  notes: {                  // Obtenues au BAC
    math, pc, svt, 
    francais, philo, anglais
  }
  socioProfile: {           // Optionnel
    budget, preferBourse, 
    needLogement, preferAlternance
  }
  preferredSectors: []      // Optionnel
}
```

### 2. Sélection du Mode

Le moteur dispatch automatiquement vers:
- **AUTOPILOT** (défaut) → Analyse complète catalogue
- **TARGETED** → Formation précise
- **GEOGRAPHIC** → Filtré par région/ville

### 3. Étapes du Traitement (Autopilot)

```
1. Appliquer filtres avancés
   └─ Geographic, Budget, Type établissement, etc.

2. Filtrer par éligibilité académique
   └─ Vérifier: Âge, Type BAC, Notes minimales

3. Calculer les scores de compatibilité
   ├─ Score académique (50%)
   ├─ Score socio-économique (30%)
   └─ Score professionnel (20%)

4. Catégoriser et trier
   ├─ Top Recommandations (score >= 80%)
   ├─ Options Secondaires (60-79%)
   ├─ Options Tertiaires (40-59%)
   └─ Rejetées (score < 40% ou critères éliminatoires)
```

### 4. Retour des Résultats

```javascript
{
  topRecommendations: [      // score >= 80%
    { ...formation, compatibilityScore, details }
  ],
  secondaryOptions: [         // score 60-79%
    { ...formation, compatibilityScore }
  ],
  tertiaryOptions: [          // score 40-59%
    { ...formation, compatibilityScore }
  ],
  rejected: [                 // score < 40% + rejet académique
    { ...formation, rejectReason }
  ]
}
```

## 📊 Système de Scoring

### Dimension Académique (50%)

```javascript
Score = (Σ(note[subject] / 20 * weight[subject])) / Σweight[subject] × 100
```

Les poids varient par formation (ex: Math 5, PC 4 pour Ingénierie).

### Dimension Socio-Économique (30%)

**Critères:**
- Budget (Match avec prix formation): 30 pts
- Bourses (Si formation offre bourses): 30 pts
- Logement (Si formation offre logement): 25 pts
- Alternance (Si formation offre alternance): 15 pts

**Calcul:**
```javascript
Score = (budget_match × 30 + bourse_match × 30 + 
         logement_match × 25 + alternance_match × 15) / 100
```

### Dimension Professionnelle (20%)

**Critères:**
- Correspondance de la filière avec secteurs préférés
- Taux d'employabilité
- Pertinence du nom de formation

**Calcul:**
```javascript
Score = (matches / total_sectors × 100) + 30
```

### Scoring Global

```javascript
Global = (Academic × 0.5) + (SocioEconomic × 0.3) + (Professional × 0.2)
```

## 🎯 Modes de Recherche

### Mode AUTOPILOT
```
Entrée: Profile + Filtres optionnels
Processus: Complet (4 étapes ci-dessus)
Sortie: 4 catégories de formations
Utilisation: Par défaut, recherche libre
```

### Mode TARGETED
```
Entrée: Profile + Nom école + Nom filière (optionnel)
Processus: 
  1. Localiser formation(s)
  2. Vérifier éligibilité académique
  3. Calculer score si eligible
Sortie: Details complets + raisons rejet si applicable
Utilisation: Vérifier candidature école précise
```

### Mode GEOGRAPHIC
```
Entrée: Profile + Région OU Ville
Processus: 
  1. Filtrer par localisation
  2. Exécuter Autopilot sur ensemble filtré
Sortie: 4 catégories pour la région/ville
Utilisation: Recherche locale
```

## 🔧 Modules Fonctionnels

### orientationEngine.js
```javascript
Exports:
- runOrientationEngine(profile, filters)    // Dispatcher principal
- runAutopilotMode(profile, filters)        // Mode complet
- runTargetedMode(profile, school, field)   // Formation précise
- runGeographicMode(profile, region, ville) // Par localisation
- calculateGlobalCompatibilityScore()       // Score 3D
- calculateAcademicScore()                  // Score académique
```

### filters.js
```javascript
Exports:
- applyAdvancedFilters(catalog, filters)
- filterByAcademicEligibility(catalog, profile)
- isAcademicallyEligible(formation, profile)
- calculateSocioEconomicScore(formation, profile)
- calculateProfessionalScore(formation, sectors)
- checkTargetedEligibility(profile, formation)
```

### orientationCatalog.js
```javascript
Exports:
- CATALOG: Array<Formation>     // 20+ formations
- VILLES: Array<string>          // Villes
- REGIONS: Array<string>         // Régions
- BAC_TYPES: Array<string>       // Types BAC
- SUBJECTS_LIST: Array<Subject>  // Matières
- BUDGET_RANGES, MODE_ACCES, etc.
```

### constants.js
```javascript
Exports:
- SCORE_THRESHOLDS
- SCORING_WEIGHTS
- SEARCH_MODES
- RESULT_CATEGORIES
- BUDGET_CATEGORIES
- DURATION_CATEGORIES
- MESSAGES, HELP_TEXTS, etc.
```

## 🎨 Composants UI

### OrientationWizard
**Rôle:** Capture profil utilisateur
**Étapes:**
1. Profil (BAC, Age)
2. Notes (Matières)
3. Préférences (Optionnel)
4. Résultats

### ResultCard
**Rôle:** Affiche une formation
**Contient:**
- Logo établissement
- Titre filière
- Info rapides (durée, coût, accès)
- Badges (bourses, logement, etc.)
- Score compatibilité
- Bouton détails

### DetailModal
**Rôle:** Détails complets
**Contient:**
- Conditions accès
- Débouchés professionnels
- Bourses et logement
- Partenaires
- Infos concours

### FilterPanel
**Rôle:** Filtres avancés
**Sections:**
- Localisation (Ville/Région)
- Budget
- Type établissement
- Durée
- Avantages

## 📱 Responsive Design

**Mobile (< 768px):**
- Stack vertical
- Filtres en modal side
- Cards compactes
- Navigation simplifiée

**Desktop (≥ 768px):**
- Layout 2-3 colonnes
- Filtres en sidebar
- Cards spacieux
- Navigation complète

## ⚙️ Performances

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Build size | < 300 KB | 227 KB ✅ |
| Time to analyze | < 200ms | ~50ms ✅ |
| Lighthouse Score | > 80 | TBD |
| Mobile FCP | < 3s | TBD |

## 🔐 Intégrité des Données

**Validations:**
- Notes: 0-20
- Âge: 15-50
- Type BAC: Whitelist (A1, A2, C, D, E, F1, F2, G1, G2)
- Budget: Valeur ou NULL

**Données sensibles:** Aucune (profil anonyme)

## 🚀 Déploiement

**Frontend:**
```bash
npm run build
# → build/ folder prêt pour production
```

**Checklist pré-production:**
- [ ] Tests tous les modes
- [ ] Tests responsiveness
- [ ] Lighthouse audit
- [ ] WCAG accessibility check
- [ ] Perf monitoring setup

## 📈 Extensibilité (V3+)

**API Backend:**
```
POST /api/orientation/analyze
{
  profile, filters
}
→ 
{
  results, savedId
}

GET /api/orientation/history
→ [{ results, date, id }, ...]
```

**ML Enhancement:**
- Clustering de formations similaires
- Recommandations personnalisées
- A/B testing des seuils

**Analytics:**
- Suivi des clics "Détails"
- Formation choisie vs recommandées
- Taux de conversion

## 📚 Références

- [React Documentation](https://react.dev)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

---

**Version:** 2.0.0  
**Dernière mise à jour:** 2026-07-13  
**Auteur:** Team Orientation CI
