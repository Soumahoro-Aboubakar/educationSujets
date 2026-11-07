/**
 * Programmes pilotes de la préparation (cahier des charges § 33.1 — réponse du propriétaire
 * le 2026-11-05 : INPHB, ESATIC, INFJ, INFAS, ENS, ENSEA).
 *
 * Chaque programme = organisme + cycle existants dans la taxonomie (docs/referentiel-sujets/taxonomie.json).
 * Les modules sont soit une référence à un module rédigé de la bibliothèque (chaîne de caractères),
 * soit un module « à venir » ({ code, titre, notions, publie: false }) issu du programme officiel :
 * il s'affiche « Bientôt disponible » dans l'application.
 *
 * `fiabilite` : « officielle » quand les épreuves proviennent d'un texte officiel consulté ;
 * « anciens-sujets » quand aucun programme officiel n'a été trouvé en ligne et que les matières
 * sont déduites des anciens sujets publiés sur Fatafalta (à confirmer par le propriétaire).
 */

const aVenir = (code, titre, notions) => ({ code, titre, notions, publie: false });

const SOURCES = {
  capesaAS: { titre: 'Brochure CAPESA « ISE cycle long / AS », concours 2026 (mise à jour octobre 2025)', url: 'https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISE-cycle-long-AS.pdf' },
  capesaEco: { titre: 'Brochure CAPESA « ISE option économie », concours 2026 (mise à jour octobre 2025)', url: 'https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISEeco.pdf' },
  infjMag: { titre: 'Arrêté n° 202 du 1er mars 2017 — concours direct de la Magistrature (INFJ)', url: 'https://www.justice.ci/wp-content/uploads/2022/11/ARRETE-N-202-DU-1ER-MARS-2017-Magistrature-2018-5.pdf' },
  infjCms: { titre: 'Arrêté n° 205 du 1er mars 2017 — concours direct cycle moyen supérieur des Greffes (INFJ)', url: 'https://www.justice.ci/wp-content/uploads/2022/11/ARRETE-N-205-DU-1ER-MARS-2017-CMS-direct-2018-2.pdf' },
  fatafalta: { titre: 'Anciens sujets publiés sur Fatafalta (référentiel docs/referentiel-sujets, synchronisé le 2026-11-04)', url: null },
  ensRapport: { titre: 'Rapport « ENS Côte d’Ivoire — sujets absents de Fatafalta » du 2026-11-04 (docs/rapports)', url: null },
};

module.exports = [
  // ── ENSEA ───────────────────────────────────────────────────────────────
  {
    code: 'ENSEA-AS',
    organisme: { sigle: 'ENSEA', recherche: ['ENSEA'] },
    parcoursType: 'ISE Cycle Long / AS',
    titre: 'Analystes statisticiens (AS)',
    description: 'Concours commun CAPESA ; l’ENSEA d’Abidjan recrute les AS par ce concours. Bac scientifique (C, D, E, S…) ou terminale.',
    fiabilite: 'officielle',
    sources: [SOURCES.capesaAS, SOURCES.fatafalta],
    epreuves: [
      { nom: '1ʳᵉ composition de mathématiques', duree: '4 h', coefficient: 30, note: 'Contient un exercice éliminatoire de 10 questions.' },
      { nom: 'Ordre général', duree: '3 h', coefficient: 25 },
      { nom: '2ᵉ composition de mathématiques', duree: '3 h', coefficient: 30 },
      { nom: 'Contraction de texte', duree: '3 h', coefficient: 15, note: 'Résumé au nombre de mots fixé, à 10 % près.' },
    ],
    concoursBlanc: { dureeMinutes: 40, nbQuestions: 24 },
    matieres: [
      { nom: 'Mathématiques', modules: [
        'MATH-LNEXP', 'MATH-SUITES', 'MATH-PROBA',
        aVenir('ENSEA-AS-COMPLEXES', 'Nombres complexes', ['Forme algébrique, module, argument', 'Formes trigonométrique et exponentielle, Moivre', 'Équations du second degré, racines n-ièmes']),
        aVenir('ENSEA-AS-ANALYSE', 'Limites, continuité, dérivation', ['Théorème des valeurs intermédiaires', 'Accroissements finis', 'Étude de fonctions et asymptotes']),
        aVenir('ENSEA-AS-INTEGR', 'Intégration et équations différentielles', ['Intégrale, valeur moyenne', 'Intégration par parties', 'y′ = ay + b']),
        aVenir('ENSEA-AS-GEOM', 'Géométrie dans l’espace', ['Produit scalaire', 'Représentations paramétriques', 'Équation cartésienne d’un plan']),
        aVenir('ENSEA-AS-STAT', 'Statistique descriptive', ['Moyenne, médiane, quartiles, écart-type', 'Séries doubles, droite des moindres carrés']),
      ] },
      { nom: 'Français', modules: ['FR-RESUME', aVenir('ENSEA-AS-OG', 'Ordre général : la dissertation', ['Analyser le sujet', 'Construire un plan', 'Argumenter et illustrer'])] },
    ],
  },
  {
    code: 'ENSEA-ISE-ECO',
    organisme: { sigle: 'ENSEA', recherche: ['ENSEA'] },
    parcoursType: 'ISE Option Économie',
    titre: 'ISE option économie',
    description: 'Concours CAPESA d’ingénieurs statisticiens économistes (licence 2 de sciences économiques ou classe préparatoire).',
    fiabilite: 'officielle',
    sources: [SOURCES.capesaEco, SOURCES.fatafalta],
    epreuves: [
      { nom: 'Ordre général', duree: '4 h', coefficient: 15 },
      { nom: '1ʳᵉ composition de mathématiques', duree: '4 h', coefficient: 30, note: 'Épreuve filtrante : note ≥ 5 exigée.' },
      { nom: 'Économie', duree: '4 h', coefficient: 30 },
      { nom: '2ᵉ composition de mathématiques', duree: '3 h', coefficient: 20 },
      { nom: 'Anglais (QCM)', duree: '1 h', coefficient: 5, note: 'Nouvelle épreuve depuis la session 2026.' },
    ],
    concoursBlanc: { dureeMinutes: 35, nbQuestions: 20 },
    matieres: [
      { nom: 'Mathématiques', modules: [
        'MATH-PROBA',
        aVenir('ISE-ECO-ALGLIN', 'Calcul matriciel et algèbre linéaire', ['Matrices, rang, inverse par pivot de Gauss', 'Espaces vectoriels, théorème du rang', 'Valeurs propres, diagonalisation']),
        aVenir('ISE-ECO-SERIES', 'Suites, séries et intégrales généralisées', ['Séries géométriques et de Riemann', 'Intégrales de Riemann, critères de comparaison']),
        aVenir('ISE-ECO-2VAR', 'Fonctions de deux variables', ['Dérivées partielles, Schwarz', 'Extremums, critère de Monge']),
      ] },
      { nom: 'Économie', modules: [
        'ECO-MONNAIE',
        aVenir('ISE-ECO-CN', 'Comptabilité nationale', ['Valeur ajoutée et PIB', 'Secteurs institutionnels, TCEI', 'Tableau ressources-emplois']),
        aVenir('ISE-ECO-MICRO', 'Microéconomie', ['Consommateur et demande', 'Producteur et offre', 'Structures de marché, équilibre de Nash']),
        aVenir('ISE-ECO-MACRO', 'Macroéconomie et politiques économiques', ['Approches classique et keynésienne', 'Politique budgétaire', 'Balance des paiements, régimes de change']),
      ] },
      { nom: 'Anglais', modules: ['ANG-GRAM'] },
    ],
  },

  // ── INFJ ────────────────────────────────────────────────────────────────
  {
    code: 'INFJ-MAG',
    organisme: { sigle: 'INFJ', recherche: ['INFJ'] },
    parcoursType: 'Magistrature',
    titre: 'École de la Magistrature',
    description: 'Concours direct d’entrée à l’École de la Magistrature de l’Institut national de formation judiciaire.',
    fiabilite: 'officielle',
    sources: [SOURCES.infjMag, SOURCES.fatafalta],
    epreuves: [
      { nom: 'Sujet d’ordre général ou note de synthèse', duree: '4 h', coefficient: 4 },
      { nom: 'Droit civil ou procédure civile', duree: '4 h', coefficient: 4 },
      { nom: 'Droit commercial', duree: '4 h', coefficient: 4 },
      { nom: 'Droit pénal général, droit pénal spécial ou procédure pénale', duree: '3 h', coefficient: 3 },
      { nom: 'Droit administratif', duree: '3 h', coefficient: 3 },
      { nom: 'Oral : organisation judiciaire', duree: '20 min', coefficient: 2 },
      { nom: 'Oral : procédure civile ou procédure pénale', duree: '20 min', coefficient: 2 },
      { nom: 'Oral : grand jury ou culture générale', duree: '30 min', coefficient: 4 },
    ],
    noteSources: 'Épreuves fixées par l’arrêté de 2017 (session 2018) : à vérifier sur l’avis de concours de l’année. Une note ≤ 5/20 est éliminatoire, sauf délibération motivée du jury.',
    concoursBlanc: { dureeMinutes: 40, nbQuestions: 24 },
    matieres: [
      { nom: 'Droit civil', modules: ['DROIT-CONTRAT', aVenir('INFJ-MAG-PERSONNES', 'Les personnes et la famille', ['Personnalité juridique, capacité', 'Mariage et filiation']), aVenir('INFJ-MAG-PROCCIV', 'Procédure civile', ['Action en justice', 'Compétence', 'Voies de recours'])] },
      { nom: 'Droit pénal', modules: ['DROIT-PENAL', aVenir('INFJ-MAG-PROCPEN', 'Procédure pénale', ['Action publique et action civile', 'Enquête et instruction', 'Jugement et voies de recours'])] },
      { nom: 'Organisation judiciaire', modules: ['DROIT-ORGJUD'] },
      { nom: 'Droit commercial', modules: [aVenir('INFJ-MAG-COMMERCIAL', 'Droit commercial général (OHADA)', ['Actes de commerce et commerçant', 'Fonds de commerce', 'Sociétés commerciales'])] },
      { nom: 'Droit administratif', modules: [aVenir('INFJ-MAG-ADMIN', 'Droit administratif', ['Organisation administrative', 'Actes administratifs', 'Responsabilité administrative'])] },
      { nom: 'Culture générale', modules: ['CG-INSTIT', aVenir('INFJ-MAG-SYNTHESE', 'Dissertation et note de synthèse', ['Problématiser', 'Plan en deux parties', 'Note de synthèse à partir d’un dossier'])] },
    ],
  },
  {
    code: 'INFJ-GREFFES-CMS',
    organisme: { sigle: 'INFJ', recherche: ['INFJ'] },
    parcoursType: 'Greffes - Cycle moyen supérieur',
    titre: 'Greffes — cycle moyen supérieur',
    description: 'Concours direct du cycle moyen supérieur judiciaire de l’École des Greffes (DEUG II, BTS, DUT ou équivalent).',
    fiabilite: 'officielle',
    sources: [SOURCES.infjCms, SOURCES.fatafalta],
    epreuves: [
      { nom: 'Dissertation sur un sujet d’ordre général', duree: '4 h', coefficient: 4 },
      { nom: 'Résumé ou commentaire de texte', duree: '3 h', coefficient: 3 },
      { nom: 'Droit pénal', duree: '2 h', coefficient: 2 },
      { nom: 'Droit administratif ou droit constitutionnel', duree: '3 h', coefficient: 3 },
      { nom: 'Organisation judiciaire en Côte d’Ivoire', duree: '2 h', coefficient: 2 },
      { nom: 'Oral : exposé sur un sujet d’ordre général', duree: '10 min (15 min de préparation)', coefficient: 5 },
    ],
    noteSources: 'Épreuves fixées par l’arrêté de 2017 : à vérifier sur l’avis de concours de l’année.',
    concoursBlanc: { dureeMinutes: 35, nbQuestions: 20 },
    matieres: [
      { nom: 'Organisation judiciaire', modules: ['DROIT-ORGJUD'] },
      { nom: 'Droit pénal', modules: ['DROIT-PENAL'] },
      { nom: 'Droit constitutionnel', modules: ['CG-INSTIT', aVenir('INFJ-CMS-ADMIN', 'Droit administratif', ['Organisation administrative', 'Actes administratifs'])] },
      { nom: 'Français', modules: ['FR-RESUME', aVenir('INFJ-CMS-DISSERT', 'Dissertation d’ordre général', ['Analyse du sujet', 'Plan', 'Introduction et conclusion'])] },
    ],
  },

  // ── ENS ─────────────────────────────────────────────────────────────────
  {
    code: 'ENS-EDUCATEUR',
    organisme: { sigle: 'ENS', recherche: ['ENS'] },
    parcoursType: 'Éducateur',
    titre: 'Éducateurs',
    description: 'Concours direct d’entrée à l’École normale supérieure d’Abidjan, emploi d’éducateur.',
    fiabilite: 'anciens-sujets',
    sources: [SOURCES.ensRapport, SOURCES.fatafalta],
    epreuves: [
      { nom: 'Culture générale (français : résumé, dissertation)', duree: null, coefficient: null },
      { nom: 'Psychopédagogie / Système éducatif ivoirien', duree: null, coefficient: null },
      { nom: 'ECM et fonction publique (concours professionnels)', duree: null, coefficient: null },
    ],
    noteSources: 'Aucun programme officiel détaillé n’a été trouvé en ligne : épreuves déduites des anciens sujets publiés (2018-2025). Durées et coefficients à confirmer.',
    concoursBlanc: { dureeMinutes: 30, nbQuestions: 18 },
    matieres: [
      { nom: 'Psychopédagogie et système éducatif', modules: ['EDU-SEI', aVenir('ENS-EDU-PSYCHOPEDA', 'Psychopédagogie de l’adolescent', ['Puberté et construction de l’identité', 'Motivation et apprentissage', 'Gestion des conflits'])] },
      { nom: 'Culture générale', modules: ['FR-RESUME', 'CG-INSTIT'] },
    ],
  },

  // ── INPHB ───────────────────────────────────────────────────────────────
  {
    code: 'INPHB-BAC',
    organisme: { sigle: 'INPHB', recherche: ['INPHB', 'inphb'] },
    parcoursType: 'Bacheliers',
    titre: 'Concours bacheliers',
    description: 'Concours d’entrée à l’INP-HB de Yamoussoukro pour les bacheliers (classes préparatoires et cycles techniciens).',
    fiabilite: 'anciens-sujets',
    sources: [SOURCES.fatafalta],
    epreuves: [
      { nom: 'Mathématiques', duree: null, coefficient: null },
      { nom: 'Culture scientifique (physique-chimie)', duree: null, coefficient: null },
      { nom: 'Français', duree: null, coefficient: null },
      { nom: 'Culture générale', duree: null, coefficient: null },
      { nom: 'Anglais', duree: null, coefficient: null },
    ],
    noteSources: 'Aucun programme officiel trouvé en ligne : matières déduites des anciens sujets « Bacheliers » publiés. Les épreuves varient selon la filière visée (série C/D/E, prépas scientifiques ou commerciales).',
    concoursBlanc: { dureeMinutes: 40, nbQuestions: 24 },
    matieres: [
      { nom: 'Mathématiques', modules: ['MATH-LNEXP', 'MATH-PROBA', aVenir('INPHB-BAC-COMPLEXES', 'Nombres complexes', ['Forme exponentielle', 'Équations dans ℂ'])] },
      { nom: 'Sciences physiques', modules: ['PC-ELEC', aVenir('INPHB-BAC-MECA', 'Mécanique : lois de Newton', ['Cinématique', 'Deuxième loi de Newton', 'Mouvement dans un champ uniforme'])] },
      { nom: 'Français', modules: ['FR-RESUME'] },
      { nom: 'Culture générale', modules: ['CG-INSTIT'] },
      { nom: 'Anglais', modules: ['ANG-GRAM'] },
    ],
  },

  // ── ESATIC ──────────────────────────────────────────────────────────────
  {
    code: 'ESATIC-BAC',
    organisme: { sigle: 'ESATIC', recherche: ['ESATIC'] },
    parcoursType: 'Bacheliers',
    titre: 'Concours bacheliers (Licence 1)',
    description: 'Concours d’entrée en première année à l’École supérieure africaine des TIC (bacheliers des séries scientifiques).',
    fiabilite: 'anciens-sujets',
    sources: [SOURCES.fatafalta],
    epreuves: [
      { nom: 'Mathématiques', duree: null, coefficient: null },
      { nom: 'Sciences physiques', duree: null, coefficient: null },
      { nom: 'Français', duree: null, coefficient: null },
      { nom: 'Anglais', duree: null, coefficient: null },
    ],
    noteSources: 'Aucun programme officiel trouvé en ligne : matières déduites des anciens sujets publiés (Mathématiques, Sciences physiques, Français, Anglais).',
    concoursBlanc: { dureeMinutes: 35, nbQuestions: 20 },
    matieres: [
      { nom: 'Mathématiques', modules: ['MATH-LNEXP', 'MATH-SUITES', aVenir('ESATIC-BAC-ARITH', 'Arithmétique', ['Divisibilité, PGCD', 'Congruences'])] },
      { nom: 'Sciences physiques', modules: ['PC-ELEC', aVenir('ESATIC-BAC-ONDES', 'Ondes et signaux', ['Ondes mécaniques', 'Oscillations électriques'])] },
      { nom: 'Français', modules: ['FR-RESUME'] },
      { nom: 'Anglais', modules: ['ANG-GRAM'] },
    ],
  },

  // ── INFAS ───────────────────────────────────────────────────────────────
  {
    code: 'INFAS-AUX',
    organisme: { sigle: 'INFAS', recherche: ['INFAS'] },
    parcoursType: 'Auxiliaires de santé',
    titre: 'Auxiliaires de santé',
    description: 'Concours d’entrée à l’Institut national de formation des agents de santé (INFAS).',
    fiabilite: 'anciens-sujets',
    sources: [SOURCES.fatafalta],
    epreuves: [
      { nom: 'QCM toutes matières (biologie, mathématiques, français, culture générale)', duree: null, coefficient: null },
    ],
    noteSources: 'Aucun programme officiel trouvé en ligne : les anciens sujets publiés sont des QCM « toutes matières ». Contenu à confirmer par le propriétaire pour chaque filière (infirmiers, sages-femmes, techniciens…).',
    concoursBlanc: { dureeMinutes: 30, nbQuestions: 20 },
    matieres: [
      { nom: 'Biologie', modules: ['BIO-COEUR', aVenir('INFAS-AUX-DIGESTION', 'Digestion et nutrition', ['Appareil digestif', 'Nutriments et équilibre alimentaire']), aVenir('INFAS-AUX-HYGIENE', 'Hygiène et santé publique', ['Maladies transmissibles', 'Vaccination'])] },
      { nom: 'Mathématiques', modules: ['CALC-SANTE'] },
      { nom: 'Culture générale', modules: ['CG-INSTIT'] },
      { nom: 'Français', modules: ['FR-RESUME'] },
    ],
  },
];
