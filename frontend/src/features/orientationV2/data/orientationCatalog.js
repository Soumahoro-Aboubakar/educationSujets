export const CATALOG = [
  // === UNIVERSITÉ ALASSANE OUATTARA (UAO) - BOUAKÉ ===
  {
    id: "UAO-INFO",
    nomEtablissement: "Université Alassane Ouattara (UAO)",
    filiere: "Informatique",
    typeEtablissement: "Public",
    ville: "Bouaké",
    region: "Région de la Vallée du Bandama",
    modeAcces: "Dossier",
    prix: 30000,
    duree: 3,
    ageLimite: 23,
    conditions: {
      bacsAcceptes: ["C", "D", "E"],
      notesMinimales: { math: 12, pc: 10, francais: 10 }
    },
    debouches: ["Développeur Web", "Administrateur Système", "Data Analyst", "Consultant IT"],
    scoreWeights: { math: 3, pc: 2, francais: 1 },
    bourses: { disponible: true, montant: 500000 },
    logement: true,
    alternance: true,
    taux_employabilite: 85,
    partenaires: ["Orange CI", "MTN CI", "Agence Nationale de l'Emploi"],
    stages: "Obligatoires (3-4 mois)"
  },
  {
    id: "UAO-GESTION",
    nomEtablissement: "Université Alassane Ouattara (UAO)",
    filiere: "Gestion d'Entreprise",
    typeEtablissement: "Public",
    ville: "Bouaké",
    region: "Région de la Vallée du Bandama",
    modeAcces: "Dossier",
    prix: 30000,
    duree: 3,
    ageLimite: 23,
    conditions: {
      bacsAcceptes: ["G2", "A1", "A2", "D"],
      notesMinimales: { math: 10, francais: 11, anglais: 10 }
    },
    debouches: ["Manager", "Contrôleur de Gestion", "Responsable RH", "Entrepreneur"],
    scoreWeights: { math: 2, francais: 2, anglais: 1 },
    bourses: { disponible: true, montant: 500000 },
    logement: true,
    alternance: true,
    taux_employabilite: 80,
    partenaires: ["CFAO", "BICICI", "Cabinet de Conseil"],
    stages: "Obligatoires (3-4 mois)"
  },

  // === ESATIC - ABIDJAN ===
  {
    id: "ESATIC-RT",
    nomEtablissement: "ESATIC (École Supérieure d'Afrique de l'Informatique et de Télécommunications)",
    filiere: "Réseaux et Télécoms",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Concours",
    prix: 50000,
    duree: 3,
    ageLimite: 22,
    conditions: {
      bacsAcceptes: ["C", "D", "E", "F2"],
      notesMinimales: { math: 12, pc: 12, francais: 10, anglais: 10 }
    },
    debouches: ["Ingénieur Télécoms", "Architecte Réseau", "Consultant Sécurité", "Responsable Infrastructure"],
    scoreWeights: { math: 3, pc: 3, anglais: 2 },
    bourses: { disponible: true, montant: 600000 },
    logement: true,
    alternance: true,
    taux_employabilite: 90,
    partenaires: ["Orange CI", "MTN CI", "Maroc Telecom", "Cisco Academy"],
    stages: "Obligatoires (4-6 mois)",
    concours_details: { matiere: "Math & Physique", date: "Juin", durée: "3h" }
  },
  {
    id: "ESATIC-IG",
    nomEtablissement: "ESATIC",
    filiere: "Informatique de Gestion",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Concours",
    prix: 50000,
    duree: 3,
    ageLimite: 22,
    conditions: {
      bacsAcceptes: ["D", "G2"],
      notesMinimales: { math: 11, francais: 10, anglais: 10 }
    },
    debouches: ["Analyste Programmeur", "DBA", "Responsable Système Information", "Consultant ERP"],
    scoreWeights: { math: 2, francais: 2, anglais: 2 },
    bourses: { disponible: true, montant: 600000 },
    logement: true,
    alternance: true,
    taux_employabilite: 88,
    partenaires: ["Microsoft", "Oracle", "IBM", "SAP"],
    stages: "Obligatoires (4-6 mois)",
    concours_details: { matiere: "Math & Français", date: "Juin", durée: "3h" }
  },

  // === INP-HB - YAMOUSSOUKRO ===
  {
    id: "INPHB-MPSI",
    nomEtablissement: "INP-HB (Institut National Polytechnique Félix Houphouët-Boigny)",
    filiere: "Cycle Ingénieur - Maths-Physique (MPSI)",
    typeEtablissement: "Public",
    ville: "Yamoussoukro",
    region: "Région de la Lacs",
    modeAcces: "Dossier + Concours",
    prix: 50000,
    duree: 5,
    ageLimite: 22,
    conditions: {
      bacsAcceptes: ["C", "E"],
      notesMinimales: { math: 14, pc: 14, francais: 12 }
    },
    debouches: ["Ingénieur Polyvalent", "Chercheur", "Ingénieur Travaux Publics", "Consultant"],
    scoreWeights: { math: 5, pc: 4, francais: 1 },
    bourses: { disponible: true, montant: 750000 },
    logement: true,
    alternance: true,
    taux_employabilite: 92,
    partenaires: ["Bouygues", "Lagardère", "Grands Travaux Ivoiriens", "SETAO"],
    stages: "Obligatoires (6 mois minimum)",
    concours_details: { matiere: "Math, Physique, Français", date: "Juillet", durée: "4h" }
  },
  {
    id: "INPHB-EEA",
    nomEtablissement: "INP-HB",
    filiere: "Cycle Ingénieur - Électricité-Électronique (EEA)",
    typeEtablissement: "Public",
    ville: "Yamoussoukro",
    region: "Région de la Lacs",
    modeAcces: "Dossier + Concours",
    prix: 50000,
    duree: 5,
    ageLimite: 22,
    conditions: {
      bacsAcceptes: ["C", "E"],
      notesMinimales: { math: 14, pc: 14, francais: 12 }
    },
    debouches: ["Ingénieur Électricien", "Électrotechnicien", "Responsable Projet Énergie"],
    scoreWeights: { math: 5, pc: 5, francais: 1 },
    bourses: { disponible: true, montant: 750000 },
    logement: true,
    alternance: true,
    taux_employabilite: 91,
    partenaires: ["CIPREL", "EDH", "GDF Suez", "Siemens"],
    stages: "Obligatoires (6 mois minimum)",
    concours_details: { matiere: "Math, Physique, Français", date: "Juillet", durée: "4h" }
  },

  // === UNIVERSITÉ FHB - ABIDJAN ===
  {
    id: "FHB-MED",
    nomEtablissement: "Université Félix Houphouët-Boigny (FHB)",
    filiere: "Médecine",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 30000,
    duree: 7,
    ageLimite: 21,
    conditions: {
      bacsAcceptes: ["C", "D"],
      notesMinimales: { math: 12, pc: 13, svt: 14, francais: 10 }
    },
    debouches: ["Médecin", "Chirurgien", "Pédiatre", "Chercheur en Santé"],
    scoreWeights: { svt: 4, pc: 3, math: 2 },
    bourses: { disponible: true, montant: 400000 },
    logement: true,
    alternance: false,
    taux_employabilite: 100,
    partenaires: ["CHU de Treichville", "Institut Pasteur", "Ministère Santé CI"],
    stages: "Stages cliniques obligatoires"
  },
  {
    id: "FHB-PHARM",
    nomEtablissement: "Université Félix Houphouët-Boigny (FHB)",
    filiere: "Pharmacie",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 30000,
    duree: 6,
    ageLimite: 21,
    conditions: {
      bacsAcceptes: ["C", "D"],
      notesMinimales: { math: 12, pc: 13, svt: 13, francais: 10 }
    },
    debouches: ["Pharmacien", "Responsable Qualité", "Pharmacien d'Officine", "Pharmacien Industriel"],
    scoreWeights: { svt: 4, pc: 3, math: 2 },
    bourses: { disponible: true, montant: 400000 },
    logement: true,
    alternance: false,
    taux_employabilite: 98,
    partenaires: ["Sanofi CI", "Cipla", "Pfizer", "Pharmacies Urbaines"],
    stages: "Stages en officine et industrie pharma"
  },
  {
    id: "FHB-DROIT",
    nomEtablissement: "Université Félix Houphouët-Boigny (FHB)",
    filiere: "Droit",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 25000,
    duree: 4,
    ageLimite: 24,
    conditions: {
      bacsAcceptes: ["A1", "A2", "D", "G2"],
      notesMinimales: { francais: 12, philo: 11, anglais: 10 }
    },
    debouches: ["Avocat", "Magistrat", "Notaire", "Juriste d'Entreprise"],
    scoreWeights: { francais: 3, philo: 2, anglais: 1 },
    bourses: { disponible: true, montant: 300000 },
    logement: true,
    alternance: true,
    taux_employabilite: 85,
    partenaires: ["Cour d'Appel", "Barreau CI", "Cabinet Juridiques"],
    stages: "Obligatoires (2-3 mois)"
  },

  // === INSTITUTS TECHNOLOGIQUES PRIVÉS ===
  {
    id: "HETEC-GES",
    nomEtablissement: "HETEC (Ecole de Gestion et Technologie)",
    filiere: "BTS Gestion Commerciale",
    typeEtablissement: "Privé",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 650000,
    duree: 2,
    ageLimite: 27,
    conditions: {
      bacsAcceptes: ["G2", "A1", "A2", "D"],
      notesMinimales: { francais: 10, math: 10, anglais: 10 }
    },
    debouches: ["Commercial", "Chargé de Clientèle", "Manager Ventes", "Assistant Directeur Commercial"],
    scoreWeights: { francais: 2, anglais: 2, math: 1 },
    bourses: { disponible: false, montant: 0 },
    logement: true,
    alternance: true,
    taux_employabilite: 82,
    partenaires: ["Carrefour CI", "Maxmart", "Grandes Surfaces"],
    stages: "En alternance"
  },
  {
    id: "HETEC-INFO",
    nomEtablissement: "HETEC",
    filiere: "BTS Informatique de Gestion",
    typeEtablissement: "Privé",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 700000,
    duree: 2,
    ageLimite: 25,
    conditions: {
      bacsAcceptes: ["C", "D", "E", "F2"],
      notesMinimales: { math: 11, pc: 10, francais: 9 }
    },
    debouches: ["Technicien Informatique", "Support Informatique", "Administrateur Réseau Junior"],
    scoreWeights: { math: 3, pc: 2, francais: 1 },
    bourses: { disponible: false, montant: 0 },
    logement: true,
    alternance: true,
    taux_employabilite: 80,
    partenaires: ["Systèmes Informatiques CI", "Tech Solutions"],
    stages: "En alternance"
  },

  // === ISTC - JOURNALISME ===
  {
    id: "ISTC-COM",
    nomEtablissement: "ISTC Polytechnique",
    filiere: "Journalisme & Communication",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Concours",
    prix: 300000,
    duree: 3,
    ageLimite: 24,
    conditions: {
      bacsAcceptes: ["A1", "A2", "D", "G2"],
      notesMinimales: { francais: 12, philo: 10, anglais: 12 }
    },
    debouches: ["Journaliste", "Chargé de Communication", "Rédacteur Web", "Community Manager"],
    scoreWeights: { francais: 3, anglais: 2, philo: 1 },
    bourses: { disponible: true, montant: 400000 },
    logement: true,
    alternance: true,
    taux_employabilite: 83,
    partenaires: ["RTI", "Mediaset CI", "Agences de Pub"],
    stages: "Obligatoires (3-4 mois)",
    concours_details: { matiere: "Culture Générale & Français", date: "Juillet", durée: "2h" }
  },

  // === ÉCOLES D'INGÉNIEURS PRIVÉES ===
  {
    id: "GROUPE-PIGIER-INFO",
    nomEtablissement: "Groupe Pigier Performance",
    filiere: "Informatique - Licence Professionnelle",
    typeEtablissement: "Privé",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 850000,
    duree: 3,
    ageLimite: 28,
    conditions: {
      bacsAcceptes: ["C", "D", "E", "F2"],
      notesMinimales: { math: 10, pc: 9, francais: 8 }
    },
    debouches: ["Développeur", "Administrateur Système", "Responsable IT PME"],
    scoreWeights: { math: 3, pc: 2, francais: 1 },
    bourses: { disponible: false, montant: 0 },
    logement: false,
    alternance: true,
    taux_employabilite: 78,
    partenaires: ["Entreprises locales"],
    stages: "Optionnels"
  },
  {
    id: "GROUPE-PIGIER-GES",
    nomEtablissement: "Groupe Pigier Performance",
    filiere: "Gestion d'Entreprise - Licence Professionnelle",
    typeEtablissement: "Privé",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier",
    prix: 800000,
    duree: 3,
    ageLimite: 28,
    conditions: {
      bacsAcceptes: ["G2", "A1", "A2", "D"],
      notesMinimales: { math: 10, francais: 10, anglais: 9 }
    },
    debouches: ["Manager", "Gestionnaire", "Responsable Administratif"],
    scoreWeights: { math: 2, francais: 2, anglais: 1 },
    bourses: { disponible: false, montant: 0 },
    logement: false,
    alternance: true,
    taux_employabilite: 76,
    partenaires: ["Entreprises locales"],
    stages: "Optionnels"
  },

  // === UNIVERSITÉS AUTRES RÉGIONS ===
  {
    id: "UJLOG-DROIT",
    nomEtablissement: "Université Jean Lorougnon Guédé (UJLOG)",
    filiere: "Droit",
    typeEtablissement: "Public",
    ville: "Daloa",
    region: "Haut-Sassandra",
    modeAcces: "Dossier",
    prix: 25000,
    duree: 4,
    ageLimite: 24,
    conditions: {
      bacsAcceptes: ["A1", "A2", "D", "G2"],
      notesMinimales: { francais: 11, philo: 10, anglais: 9 }
    },
    debouches: ["Avocat", "Magistrat", "Juriste"],
    scoreWeights: { francais: 3, philo: 2, anglais: 1 },
    bourses: { disponible: true, montant: 250000 },
    logement: true,
    alternance: true,
    taux_employabilite: 80,
    partenaires: ["Tribunal", "Barreau local"],
    stages: "Obligatoires"
  },
  {
    id: "UJLOG-AGRO",
    nomEtablissement: "Université Jean Lorougnon Guédé (UJLOG)",
    filiere: "Agronomie",
    typeEtablissement: "Public",
    ville: "Daloa",
    region: "Haut-Sassandra",
    modeAcces: "Dossier",
    prix: 30000,
    duree: 4,
    ageLimite: 23,
    conditions: {
      bacsAcceptes: ["C", "D", "F1", "F2"],
      notesMinimales: { svt: 12, math: 10, francais: 9 }
    },
    debouches: ["Agronome", "Ingénieur Agricole", "Consultant Agricole"],
    scoreWeights: { svt: 3, math: 2, francais: 1 },
    bourses: { disponible: true, montant: 300000 },
    logement: true,
    alternance: true,
    taux_employabilite: 84,
    partenaires: ["CNRA", "Ministère Agriculture"],
    stages: "Obligatoires (4 mois)"
  },

  // === ÉTABLISSEMENTS SPÉCIALISÉS ===
  {
    id: "ENQAI-AUDIT",
    nomEtablissement: "École Nationale de Qualité et d'Audit Interne (ENQAI)",
    filiere: "Audit et Contrôle Interne",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Dossier + Concours",
    prix: 200000,
    duree: 2,
    ageLimite: 28,
    conditions: {
      bacsAcceptes: ["D", "G2"],
      notesMinimales: { math: 11, francais: 11, anglais: 10 }
    },
    debouches: ["Auditeur", "Contrôleur", "Responsable Conformité"],
    scoreWeights: { math: 2, francais: 2, anglais: 2 },
    bourses: { disponible: true, montant: 200000 },
    logement: false,
    alternance: true,
    taux_employabilite: 89,
    partenaires: ["Banques", "Ministère Finance"],
    stages: "Obligatoires",
    concours_details: { matiere: "Comptabilité & Français", date: "Juin", durée: "2h" }
  },
  {
    id: "ENAM-ADMIN",
    nomEtablissement: "École Nationale d'Administration (ENAM)",
    filiere: "Administration Publique",
    typeEtablissement: "Public",
    ville: "Abidjan",
    region: "District d'Abidjan",
    modeAcces: "Concours",
    prix: 100000,
    duree: 2,
    ageLimite: 26,
    conditions: {
      bacsAcceptes: ["D", "A1", "A2", "G2"],
      notesMinimales: { francais: 12, philo: 10, anglais: 10 }
    },
    debouches: ["Fonctionnaire", "Responsable RH", "Manager Public"],
    scoreWeights: { francais: 3, philo: 2, anglais: 1 },
    bourses: { disponible: true, montant: 250000 },
    logement: false,
    alternance: false,
    taux_employabilite: 95,
    partenaires: ["Ministères", "Collectivités"],
    stages: "Stage final (2 mois)",
    concours_details: { matiere: "Droit & Culture Générale", date: "Avril", durée: "3h" }
  }
];

// Constantes supplémentaires
export const REGIONS = [
  "Toutes",
  "District d'Abidjan",
  "Région de la Vallée du Bandama",
  "Région de la Lacs",
  "Haut-Sassandra",
  "Bas-Sassandra",
  "Savanes",
  "Denguélé",
  "Woroba",
  "Marahoué"
];

export const BOURSES_TYPES = [
  { label: "Disponible", value: "available" },
  { label: "Non disponible", value: "none" }
];

export const BUDGET_RANGES = [
  { label: "Tous", value: "all" },
  { label: "< 100K XOF/an", value: "low" },
  { label: "100-500K XOF/an", value: "medium" },
  { label: "> 500K XOF/an", value: "high" }
];

export const VILLES = ["Toutes", "Abidjan", "Yamoussoukro", "Bouaké", "Daloa"];
export const BAC_TYPES = ["A1", "A2", "B", "C", "D", "E", "F1", "F2", "G1", "G2"];
export const SUBJECTS_LIST = [
  { key: "math", label: "Mathématiques" },
  { key: "pc", label: "Physique-Chimie" },
  { key: "svt", label: "SVT" },
  { key: "francais", label: "Français" },
  { key: "philo", label: "Philosophie" },
  { key: "anglais", label: "Anglais" }
];

export const MODE_ACCES = ["Dossier", "Concours", "Dossier + Concours"];
export const TYPES_ETABLISSEMENT = ["Public", "Privé"];
