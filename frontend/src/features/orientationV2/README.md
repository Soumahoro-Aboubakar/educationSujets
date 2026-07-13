# Moteur d'Orientation Académique V2

## Vue d'ensemble

Le moteur d'orientation V2 est un système de recommandation intelligent qui analyse le profil d'un bachelier en Côte d'Ivoire et propose des formations adaptées basées sur des critères académiques, socio-économiques et professionnels.

## Architecture

### 1. **Couche Données** (`data/orientationCatalog.js`)
- **Catalogue enrichi**: 20+ formations provenant d'établissements réalistes en CI (UAO, ESATIC, INP-HB, FHB, ISTC, etc.)
- **Métadonnées complètes** par formation:
  - Conditions d'accès (Type de BAC, notes minimales, âge limite)
  - Financières (Prix, bourses disponibles)
  - Logement étudiant, alternance, stages
  - Débouchés et taux d'employabilité
  - Partenaires industriels
  - Détails des concours (si applicable)

### 2. **Moteur Logique** (`logic/orientationEngine.js`)
Trois modes de fonctionnement:

#### Mode **AUTOPILOT** (défaut)
Analyse complète du catalogue national avec filtres optionnels.

```javascript
import { runOrientationEngine } from './logic/orientationEngine';

const profile = {
  bacType: 'D',
  age: 19,
  notes: { math: 14, pc: 12, francais: 11, anglais: 10 },
  socioProfile: { budget: 'medium', preferBourse: true, needLogement: true },
  preferredSectors: ['Informatique', 'Ingénierie']
};

const filters = {
  mode: 'autopilot',
  ville: 'Abidjan',
  typeEtablissement: 'Public',
  budget: 'medium'
};

const results = runOrientationEngine(profile, filters);
// Retourne: { topRecommendations, secondaryOptions, tertiaryOptions, rejected }
```

#### Mode **TARGETED**
Analyse d'une formation/école précise.

```javascript
const result = runOrientationEngine(profile, {
  mode: 'targeted',
  targetedSchool: 'ESATIC',
  targetedField: 'Réseaux et Télécoms'
});
// Retourne: { found, schoolName, recommendations[], eligibleCount, rejectedCount }
```

#### Mode **GEOGRAPHIC**
Filtre par région ou ville.

```javascript
const result = runOrientationEngine(profile, {
  mode: 'geographic',
  region: 'District d\'Abidjan'
  // OU
  // ville: 'Abidjan'
});
```

### 3. **Module Filtrage** (`logic/filters.js`)
Logique de filtrage avancée:
- Éligibilité académique (BAC, notes, âge)
- Filtres géographiques (région, ville)
- Filtres budgétaires (min-max prix annuel)
- Filtres socio-économiques (bourses, logement, alternance)

#### Fonctions principales:
```javascript
import {
  applyAdvancedFilters,
  filterByAcademicEligibility,
  isAcademicallyEligible,
  calculateSocioEconomicScore,
  calculateProfessionalScore
} from './logic/filters';

// Appliquer les filtres
const filtered = applyAdvancedFilters(CATALOG, filters);

// Vérifier l'éligibilité académique
const { eligible, rejected } = filterByAcademicEligibility(filtered, profile);

// Calculer les scores de compatibilité
const socioScore = calculateSocioEconomicScore(formation, profile.socioProfile);
const profScore = calculateProfessionalScore(formation, profile.preferredSectors);
```

### 4. **Scoring Multi-Dimensions**

Le score global de compatibilité est calculé selon 3 dimensions:

| Dimension | Poids | Critères |
|-----------|-------|----------|
| **Académique** | 50% | Notes, Type de BAC, Notes minimales respectées |
| **Socio-économique** | 30% | Budget, Bourses, Logement, Alternance |
| **Professionnel** | 20% | Correspondance avec secteurs préférés |

**Seuils de catégorisation:**
- **80-100%**: Top Recommandations ⭐
- **60-79%**: Options Secondaires
- **40-59%**: Options Tertiaires
- **< 40%**: Filières Rejetées ❌

### 5. **Composants UI**

#### ResultCard
Affiche les informations clés d'une formation avec:
- Badge de recommandation (si top)
- Score de compatibilité
- Informations rapides (durée, coût, mode d'accès)
- Badges pour bourses, logement, alternance
- Taux d'employabilité
- Bouton "Détails"

#### DetailModal
Modal détaillée contenant:
- Informations complètes de la formation
- Débouchés professionnels
- Stages et opportunités d'alternance
- Bourses et logement
- Partenaires industriels
- Conditions d'accès détaillées
- Détails des concours (si applicable)

#### FilterPanel
Panneau de filtrage responsive avec:
- Filtres géographiques (Ville / Région)
- Budget (< 100K, 100-500K, > 500K)
- Type d'établissement (Public / Privé)
- Durée de formation (Court, Moyen, Long)
- Avantages (Bourses, Logement, Alternance)

## Structure du Profil Utilisateur

```javascript
{
  // Infos académiques (obligatoires)
  bacType: string,        // ex: "D", "C", "A1"
  age: number,           // 15-50
  notes: {
    math?: number,       // 0-20
    pc?: number,         // 0-20
    svt?: number,        // 0-20
    francais?: number,   // 0-20
    philo?: number,      // 0-20
    anglais?: number     // 0-20
  },

  // Infos socio-économiques (optionnelles)
  socioProfile?: {
    budget: 'low' | 'medium' | 'high' | 'all',
    preferBourse: boolean,
    needLogement: boolean,
    preferAlternance: boolean
  },

  // Préférences professionnelles (optionnelles)
  preferredSectors?: string[]  // ex: ['Informatique', 'Ingénierie']
}
```

## Structure d'une Formation

```javascript
{
  id: string,
  nomEtablissement: string,
  filiere: string,
  typeEtablissement: 'Public' | 'Privé',
  ville: string,
  region: string,
  modeAcces: 'Dossier' | 'Concours' | 'Dossier + Concours',
  prix: number,          // XOF
  duree: number,         // années
  ageLimite: number,
  
  conditions: {
    bacsAcceptes: string[],
    notesMinimales: { [subject]: number }
  },
  
  debouches: string[],
  scoreWeights: { [subject]: number },
  bourses: { disponible: boolean, montant: number },
  logement: boolean,
  alternance: boolean,
  taux_employabilite: number,    // 0-100
  partenaires: string[],
  stages: string,
  concours_details?: {
    matiere: string,
    date: string,
    durée: string
  }
}
```

## Constantes Disponibles

Voir `utils/constants.js`:
- `SCORE_THRESHOLDS`: Seuils de compatibilité
- `SCORING_WEIGHTS`: Pondérations du scoring
- `BUDGET_CATEGORIES`: Catégories budgétaires
- `DURATION_CATEGORIES`: Durées de formation
- `MESSAGES`: Templates de messages
- `PROFESSIONAL_SECTORS`: Secteurs disponibles
- Et plus...

## Exemple Complet

```javascript
import { runOrientationEngine } from './features/orientationV2/logic/orientationEngine';
import { SCORE_THRESHOLDS } from './features/orientationV2/utils/constants';

const profile = {
  bacType: 'D',
  age: 19,
  notes: {
    math: 14,
    pc: 12,
    francais: 11,
    anglais: 10,
    philo: 9,
    svt: 11
  },
  socioProfile: {
    budget: 'medium',      // 100-500K XOF
    preferBourse: true,
    needLogement: true,
    preferAlternance: true
  },
  preferredSectors: ['Informatique', 'Ingénierie']
};

const filters = {
  geographic: { type: 'ville', value: 'Abidjan' },
  typeEtablissement: 'Public',
  budget: 'medium',
  bourse: 'available',
  logement: true
};

const results = runOrientationEngine(profile, filters);

console.log('Top Recommandations:', results.topRecommendations);
// Formations avec score >= 80%

console.log('Options Secondaires:', results.secondaryOptions);
// Formations avec score 60-79%

console.log('Options Tertiaires:', results.tertiaryOptions);
// Formations avec score 40-59%

console.log('Rejetées:', results.rejected);
// Formations ne répondant pas aux critères minima
```

## Performance

- **Build size**: ~227 KB (gzipped)
- **Catalogue**: 20+ formations, traitement < 100ms
- **Scoring**: Tri-dimensionnel avec pondérations
- **UI**: Animations fluides avec Framer Motion

## Améliorations Futures (V3)

- [ ] Backend API pour sauvegarder les analyses utilisateur
- [ ] Machine Learning pour améliorer les recommandations
- [ ] Historique des candidatures
- [ ] Comparaison de formations côte à côte
- [ ] Export PDF des recommandations
- [ ] Intégration avec les portails d'inscription des écoles
- [ ] Tests utilisateur A/B
- [ ] Analytics et insights d'orientation

## Support

Pour des questions ou contributions, consultez la documentation de chaque module:
- `orientationEngine.js` - Logique principale
- `filters.js` - Filtrage et éligibilité
- `orientationCatalog.js` - Données et formation
- Composants React - UI/UX
