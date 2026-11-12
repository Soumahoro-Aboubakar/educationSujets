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
        'ENSEA-AS-COMPLEXES',
        'ENSEA-AS-ANALYSE',
        'ENSEA-AS-INTEGR',
        'ENSEA-AS-GEOM',
        'ENSEA-AS-STAT',
      ] },
      { nom: 'Français', modules: ['FR-RESUME', 'ENSEA-AS-OG'] },
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
        'ISE-ECO-ALGLIN',
        'ISE-ECO-SERIES',
        'ISE-ECO-2VAR',
      ] },
      { nom: 'Économie', modules: [
        'ECO-MONNAIE',
        'ISE-ECO-CN',
        'ISE-ECO-MICRO',
        'ISE-ECO-MACRO',
      ] },
      { nom: 'Anglais', modules: ['ANG-GRAM', 'ANG-QCM'] },
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
      { nom: 'Droit civil', modules: ['DROIT-CONTRAT', 'INFJ-MAG-PERSONNES', 'INFJ-MAG-PROCCIV'] },
      { nom: 'Droit pénal', modules: ['DROIT-PENAL', 'INFJ-MAG-PROCPEN'] },
      { nom: 'Organisation judiciaire', modules: ['DROIT-ORGJUD'] },
      { nom: 'Droit commercial', modules: ['INFJ-MAG-COMMERCIAL'] },
      { nom: 'Droit administratif', modules: ['INFJ-MAG-ADMIN'] },
      { nom: 'Culture générale', modules: ['CG-INSTIT', 'ENSEA-AS-OG', 'INFJ-MAG-SYNTHESE'] },
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
      { nom: 'Droit constitutionnel', modules: ['CG-INSTIT', 'INFJ-MAG-ADMIN'] },
      { nom: 'Français', modules: ['FR-RESUME', 'ENSEA-AS-OG'] },
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
      { nom: 'Psychopédagogie et système éducatif', modules: ['EDU-SEI', 'ENS-EDU-PSYCHOPEDA'] },
      { nom: 'Culture générale', modules: ['FR-RESUME', 'CG-INSTIT', 'ENSEA-AS-OG'] },
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
      { nom: 'Mathématiques', modules: ['MATH-LNEXP', 'MATH-PROBA', 'ENSEA-AS-COMPLEXES', 'ENSEA-AS-ANALYSE'] },
      { nom: 'Sciences physiques', modules: ['PC-ELEC', 'INPHB-BAC-MECA'] },
      { nom: 'Français', modules: ['FR-RESUME'] },
      { nom: 'Culture générale', modules: ['CG-INSTIT'] },
      { nom: 'Anglais', modules: ['ANG-GRAM', 'ANG-QCM'] },
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
      { nom: 'Mathématiques', modules: ['MATH-LNEXP', 'MATH-SUITES', 'ENSEA-AS-COMPLEXES', 'ENSEA-AS-ANALYSE', 'ESATIC-BAC-ARITH'] },
      { nom: 'Sciences physiques', modules: ['PC-ELEC', 'INPHB-BAC-MECA', 'ESATIC-BAC-ONDES'] },
      { nom: 'Français', modules: ['FR-RESUME'] },
      { nom: 'Anglais', modules: ['ANG-GRAM', 'ANG-QCM'] },
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
      { nom: 'Biologie', modules: ['BIO-COEUR', 'INFAS-AUX-DIGESTION', 'INFAS-AUX-HYGIENE'] },
      { nom: 'Mathématiques', modules: ['CALC-SANTE'] },
      { nom: 'Culture générale', modules: ['CG-INSTIT'] },
      { nom: 'Français', modules: ['FR-RESUME'] },
    ],
  },
];
