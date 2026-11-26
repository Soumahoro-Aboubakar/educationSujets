const { mc, qcm, vf, glisser, ordre, relier, classer, entourer, b, lecon } = require('../dsl');

// Suite de CAFOP-PROF-PSYCHO : la didactique et la préparation de la classe, pour le concours de
// professeur de CAFOP (formateur des futurs instituteurs). Sujets de psychopédagogie 2004-2005
// (documents 6adf4c4b…, 6adf4c60…, 6adf8990…) : transfert, activités d'éveil au milieu,
// « apprendre à apprendre ». Principes généraux de didactique ; aucun formulaire officiel n'est imposé.

const DOC = { 'psy2004': { annee: 2004, documentId: '6adf4c4becb585bf0e4f3f12' }, 'psy2005a': { annee: 2005, documentId: '6adf4c60ecb585bf0e4f3f63' }, 'psy2005b': { annee: 2005, documentId: '6adf8990ecb585bf0e4f5054' } };
const annale = (cle, epreuve) => ({ type: 'annale', organisme: 'CAFOP', ...DOC[cle], epreuve });
const original = { type: 'original', inspireDe: 'Psychopédagogie et didactique, concours de professeur de CAFOP' };

const rappels = {
  'DID-BASES': mc('Didactique et pédagogie', 'La pédagogie concerne la conduite de la classe et la relation éducative en général. La didactique étudie l’enseignement et l’apprentissage d’une discipline précise : comment faire apprendre la lecture, les fractions ou l’éveil scientifique. Le triangle pédagogique de Jean Houssaye relie trois pôles : le savoir, l’enseignant et l’élève ; chaque méthode privilégie une relation entre deux pôles.', 'Didactique = enseigner une discipline.'),
  'DID-OBJ': mc('Objectifs et compétences', 'Un objectif opérationnel décrit ce que l’élève saura faire à la fin de la séance avec un verbe d’action observable (calculer, identifier, écrire), des conditions (avec quoi, en combien de temps) et un critère de réussite (combien de bonnes réponses). Une compétence est la capacité à mobiliser des savoirs et savoir-faire pour résoudre une situation. « Comprendre » ou « savoir » ne sont pas observables.', 'Verbe observable + conditions + critère.'),
  'DID-FICHE': mc('La fiche de préparation', 'Une fiche de préparation précise la discipline, le niveau, la durée, l’objectif ou la compétence visée, le matériel et le déroulement. Le déroulement suit en général : rappel ou mise en situation, découverte ou recherche par les élèves, mise en commun et synthèse (la règle retenue), application, puis évaluation. Chaque étape indique l’activité du maître, celle des élèves et la durée.', 'Rappel, recherche, synthèse, application, évaluation.'),
  'DID-DISC': mc('Didactique des disciplines', 'En lecture, on développe la conscience des sons (phonologie), le déchiffrage des syllabes et la compréhension. En mathématiques, on passe du concret (manipuler) à la représentation (dessiner, schématiser) puis à l’abstrait (écrire le calcul). En éveil, on suit une démarche d’investigation : observation, question, hypothèse, expérience ou recherche, conclusion.', 'Concret, représentation, abstraction.'),
  'DID-CLASSE': mc('Gérer la classe et former', 'Dans une classe nombreuse ou à plusieurs niveaux, on organise des groupes, du tutorat entre élèves et des consignes écrites au tableau pour que chacun travaille. Former un élève-maître, c’est l’observer en situation, analyser sa séance à partir de faits, puis lui proposer une amélioration précise. Une leçon modèle montre une pratique ; une leçon d’essai permet au stagiaire de s’exercer.', 'Groupes, tutorat ; observer, analyser, conseiller.'),
};
const spec = (notion, extra = {}) => ({ notions: [notion], miniCours: rappels[notion], source: original, ...extra });
const question = (i, notion, consigne, options, explication) => b.question(qcm({ ...spec(notion), code: `CAFOP-PROF-DIDACTIQUE-L${i}-Q1`, niveau: 1, consigne, options, bonne: 0, explication }));

const didactique = {
  code: 'CAFOP-PROF-DIDACTIQUE',
  matiere: 'Psychopédagogie',
  titre: 'Didactique et préparation de la classe',
  resume: 'De la psychopédagogie à la didactique : objectifs, fiche de préparation, didactique de la lecture, des mathématiques et de l’éveil, gestion des classes nombreuses et formation des élèves-maîtres.',
  notions: [
    { code: 'DID-BASES', libelle: 'Pédagogie et didactique' },
    { code: 'DID-OBJ', libelle: 'Objectifs et compétences' },
    { code: 'DID-FICHE', libelle: 'La fiche de préparation' },
    { code: 'DID-DISC', libelle: 'Didactique des disciplines' },
    { code: 'DID-CLASSE', libelle: 'Gestion de classe et formation' },
  ],
  lecons: [
    lecon('CAFOP-PROF-DIDACTIQUE-L1', 'De la pédagogie à la didactique', 4, [
      b.texte('À la fin de cette leçon, tu sauras distinguer pédagogie et didactique et utiliser le triangle pédagogique. Prérequis : le module Psychopédagogie de l’enfant et didactique.'),
      b.texte('La **pédagogie** concerne la conduite de la classe et la relation éducative. La **didactique** étudie l’enseignement d’une **discipline** : ses notions, leurs difficultés, l’ordre dans lequel les enseigner. Le professeur de CAFOP forme les élèves-maîtres aux deux.'),
      b.tableau(['Relation privilégiée (triangle de Houssaye)', 'Processus', 'Exemple'], [['Enseignant – savoir', 'Enseigner', 'Exposé magistral'], ['Enseignant – élève', 'Former', 'Accompagnement individuel'], ['Élève – savoir', 'Apprendre', 'Recherche autonome, situation-problème']]),
      b.exemple('Une même séance vue deux fois', 'Pédagogie : comment le maître organise les groupes et maintient l’attention. Didactique : pourquoi il introduit la soustraction par un problème de bonbons partagés avant l’écriture du calcul.'),
      b.exemple('Lien avec la psychopédagogie', 'Savoir qu’un élève de 8 ans est au stade des opérations concrètes (Piaget) oriente le choix didactique : manipuler avant d’écrire.'),
      b.retenir('Le triangle pédagogique rappelle qu’une méthode laisse toujours un pôle « en retrait » : aucune ne convient à tout.'),
      b.piege('Réduire la didactique à la discipline elle-même : connaître les fractions ne suffit pas pour savoir les enseigner.'),
      question(1, 'DID-BASES', 'Que étudie la didactique ?', ['L’enseignement et l’apprentissage d’une discipline', 'Uniquement la discipline des élèves', 'L’administration de l’école'], 'La didactique porte sur la manière d’enseigner et d’apprendre une discipline précise.'),
      b.recap(['Pédagogie : conduite de classe.', 'Didactique : une discipline.', 'Triangle : savoir, enseignant, élève.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L2', 'Formuler des objectifs et viser des compétences', 5, [
      b.texte('À la fin de cette leçon, tu sauras écrire un objectif opérationnel et le distinguer d’une compétence. Prérequis : la taxonomie de Bloom (module de psychopédagogie).'),
      b.texte('Un **objectif opérationnel** dit ce que l’élève saura **faire** à la fin de la séance. Il comporte un **verbe d’action observable**, des **conditions** et un **critère de réussite**. Une **compétence** est plus large : la capacité à mobiliser plusieurs ressources pour résoudre une situation de la vie.'),
      b.exemple('Objectif mal formulé', '« Les élèves comprendront l’addition. » « Comprendre » ne s’observe pas.'),
      b.exemple('Objectif opérationnel', '« À la fin de la séance, l’élève de CE1 calcule sans erreur au moins 4 additions sur 5 de deux nombres à deux chiffres avec retenue, en dix minutes. »'),
      b.texte('**Compétence** : « Résoudre une situation de la vie courante faisant intervenir l’addition », par exemple calculer la dépense de deux achats au marché.'),
      b.retenir('Verbes observables : identifier, calculer, écrire, classer, lire à haute voix, tracer.'),
      b.piege('Écrire un objectif centré sur le maître (« expliquer l’addition ») au lieu de l’élève.'),
      question(2, 'DID-OBJ', 'Quel verbe convient à un objectif opérationnel ?', ['Calculer', 'Comprendre', 'Connaître'], 'Calculer est une action observable et vérifiable ; comprendre et connaître ne le sont pas directement.'),
      b.recap(['Verbe observable.', 'Conditions et critère.', 'Compétence : mobiliser en situation.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L3', 'Construire une fiche de préparation', 6, [
      b.texte('À la fin de cette leçon, tu sauras organiser le déroulement d’une séance et en évaluer la cohérence. Prérequis : formuler des objectifs.'),
      b.tableau(['Étape', 'Rôle', 'Activité des élèves'], [['Rappel ou mise en situation', 'Mobiliser les acquis, susciter l’intérêt', 'Répondent, observent une situation'], ['Découverte ou recherche', 'Confronter les élèves à la nouvelle notion', 'Cherchent, manipulent, en groupe'], ['Mise en commun et synthèse', 'Formuler la règle, le savoir à retenir', 'Comparent les procédures, formulent'], ['Application', 'Entraîner', 'Exercices'], ['Évaluation', 'Vérifier l’atteinte de l’objectif', 'Exercice court, individuel']]),
      b.exemple('En-tête de fiche', 'Discipline : mathématiques. Niveau : CE2. Durée : 45 minutes. Objectif : l’élève partage une quantité en parts égales et écrit la division correspondante. Matériel : bouchons, ardoises.'),
      b.exemple('Cohérence', 'Si l’objectif porte sur la division, l’évaluation doit faire diviser, pas additionner.'),
      b.retenir('Chaque étape indique ce que fait le maître, ce que font les élèves et combien de temps elle dure.'),
      b.piege('Donner la règle dès le début puis faire seulement répéter : la recherche des élèves disparaît.'),
      question(3, 'DID-FICHE', 'À quelle étape formule-t-on la règle à retenir ?', ['La synthèse', 'Le rappel', 'L’évaluation'], 'La synthèse, après la recherche et la mise en commun, permet de formuler le savoir à retenir.'),
      b.recap(['En-tête : discipline, niveau, durée, objectif, matériel.', 'Rappel, recherche, synthèse, application, évaluation.', 'Objectif et évaluation cohérents.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L4', 'Didactique de la lecture', 5, [
      b.texte('À la fin de cette leçon, tu sauras décrire les grandes méthodes d’apprentissage de la lecture et les compétences en jeu. Prérequis : le développement de l’enfant.'),
      b.tableau(['Méthode', 'Principe', 'Limite'], [['Syllabique', 'Partir des lettres et des sons pour former des syllabes puis des mots', 'Risque de déchiffrage sans compréhension'], ['Globale', 'Reconnaître des mots ou phrases entiers', 'Difficultés face aux mots inconnus'], ['Mixte', 'Associer reconnaissance de mots et étude des sons', 'Demande une progression rigoureuse']]),
      b.texte('Apprendre à lire, c’est maîtriser deux compétences : **identifier les mots** (déchiffrer, grâce à la conscience des sons) et **comprendre** le texte. Les deux se travaillent ensemble.'),
      b.exemple('Conscience phonologique', 'Le maître dit « banane » et demande combien de syllabes on entend : ba-na-ne, trois syllabes. Les élèves frappent dans les mains à chaque syllabe.'),
      b.exemple('Compréhension', 'Après la lecture d’un court texte, le maître pose une question dont la réponse n’est pas écrite mot pour mot : les élèves doivent déduire.'),
      b.retenir('Un élève qui lit vite sans comprendre n’a pas encore appris à lire.'),
      b.piege('Faire réciter un texte appris par cœur et croire que l’élève sait lire.'),
      question(4, 'DID-DISC', 'Quelle méthode part des lettres et des sons pour former des syllabes ?', ['La méthode syllabique', 'La méthode globale', 'La méthode transmissive'], 'La méthode syllabique part des unités sonores et graphiques pour construire les mots.'),
      b.recap(['Syllabique, globale, mixte.', 'Identifier les mots et comprendre.', 'Conscience des sons.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L5', 'Didactique des mathématiques', 5, [
      b.texte('À la fin de cette leçon, tu sauras organiser l’apprentissage d’une notion mathématique du concret à l’abstrait. Prérequis : les stades de Piaget.'),
      b.texte('À l’école primaire, une notion mathématique se construit en trois temps : **manipuler** des objets, **représenter** la situation (dessin, schéma), puis **écrire** le calcul ou la règle. La **situation-problème** met l’élève face à une question qu’il ne sait pas encore résoudre directement, ce qui donne du sens à la notion.'),
      b.exemple('La division au CE2', 'Manipuler : partager 24 bouchons entre 4 groupes. Représenter : dessiner 4 sacs avec 6 points chacun. Écrire : 24 ÷ 4 = 6.'),
      b.exemple('Une erreur à exploiter', 'Un élève écrit 23 − 9 = 26 : il soustrait le plus petit chiffre du plus grand dans chaque colonne. La remédiation revient au matériel (dizaines et unités) pour comprendre l’échange d’une dizaine.'),
      b.retenir('Le passage à l’écriture se fait quand la manipulation a donné du sens, pas avant.'),
      b.piege('Rester trop longtemps dans le concret : la manipulation est une étape, l’objectif reste l’abstraction.'),
      question(5, 'DID-DISC', 'Dans quel ordre construire une notion de calcul au primaire ?', ['Manipuler, représenter, écrire', 'Écrire, manipuler, représenter', 'Représenter, écrire, manipuler'], 'On part du concret (manipuler), on passe à la représentation, puis à l’écriture abstraite.'),
      b.recap(['Concret, représentation, abstraction.', 'Situation-problème.', 'Erreur = point de départ de la remédiation.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L6', 'Activités d’éveil et démarche d’investigation', 5, [
      b.texte('À la fin de cette leçon, tu sauras conduire une activité d’éveil selon une démarche d’investigation. Prérequis : l’école face aux médias (module de psychopédagogie).'),
      b.liste(['Observer une situation du milieu', 'Poser une question de recherche', 'Formuler des hypothèses', 'Vérifier par une expérience, une observation ou une recherche documentaire', 'Conclure et noter ce qu’on a appris'], true),
      b.exemple('Pourquoi la flaque disparaît-elle ?', 'Observation : après la pluie, la flaque de la cour diminue. Hypothèses : l’eau s’infiltre ; l’eau s’évapore. Expérience : une assiette d’eau au soleil, une autre à l’ombre. Conclusion : la chaleur accélère l’évaporation.'),
      b.exemple('Le sujet de 2005', 'Le texte de Lê Thành Khôi invitait à comparer télévision et manuel pour préparer une séance d’éveil au milieu. Un reportage récent peut servir de point de départ, mais il doit déboucher sur une observation et une question des élèves.'),
      b.retenir('Dans l’éveil, ce sont les élèves qui cherchent ; le maître guide sans donner la réponse.'),
      b.piege('Dicter un résumé d’éveil sans observation ni expérience : les élèves récitent sans comprendre.'),
      question(6, 'DID-DISC', 'Quelle étape suit la formulation des hypothèses ?', ['La vérification par l’expérience ou l’observation', 'La conclusion', 'L’observation de départ'], 'Après les hypothèses, on les teste par une expérience, une observation ou une recherche, puis on conclut.'),
      b.recap(['Observer, questionner, supposer.', 'Vérifier, conclure.', 'L’élève cherche.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L7', 'Classes nombreuses et classes à plusieurs niveaux', 5, [
      b.texte('À la fin de cette leçon, tu sauras proposer des organisations efficaces pour une classe nombreuse ou à plusieurs niveaux. Prérequis : la différenciation (module de psychopédagogie).'),
      b.texte('Beaucoup d’instituteurs exercent dans des classes à **effectif élevé** ou à **plusieurs niveaux** (classes multigrades). Le maître doit alors faire travailler tous les élèves en même temps, sans pouvoir suivre chacun en permanence.'),
      b.liste(['Groupes de travail avec un responsable par groupe', 'Tutorat : un élève avancé aide un camarade', 'Consignes écrites au tableau pour le groupe en autonomie', 'Alternance : un niveau avec le maître, l’autre en travail écrit', 'Ardoises pour vérifier en un coup d’œil les réponses de toute la classe'], false),
      b.exemple('Une classe CE1-CE2', 'Pendant que le maître lance la découverte de la multiplication avec les CE2, les CE1 font des additions préparées au tableau. Puis les rôles s’inversent.'),
      b.exemple('Évaluer vite 70 élèves', 'Chaque élève écrit sa réponse sur l’ardoise et la lève au signal : le maître repère d’un regard ceux qui se trompent.'),
      b.retenir('L’autonomie s’apprend : on la prépare par des consignes claires et des routines.'),
      b.piege('Laisser un groupe sans tâche précise pendant que le maître s’occupe de l’autre : le temps d’apprentissage est perdu.'),
      question(7, 'DID-CLASSE', 'Quel outil permet de vérifier rapidement les réponses de toute une classe nombreuse ?', ['L’ardoise levée au signal', 'La correction individuelle de chaque cahier pendant la séance', 'L’interrogation orale d’un seul élève'], 'Avec l’ardoise, toute la classe répond en même temps et le maître voit d’un coup d’œil les erreurs.'),
      b.recap(['Groupes et tutorat.', 'Consignes écrites, routines.', 'Ardoise pour évaluer vite.']),
    ]),
    lecon('CAFOP-PROF-DIDACTIQUE-L8', 'Former les élèves-maîtres', 5, [
      b.texte('À la fin de cette leçon, tu sauras organiser l’accompagnement d’un élève-maître en stage. Prérequis : observer et conseiller un élève-maître (module de psychopédagogie).'),
      b.tableau(['Dispositif', 'But'], [['Leçon modèle', 'Montrer une pratique à observer et à analyser'], ['Leçon d’essai', 'Permettre au stagiaire de s’exercer devant une classe'], ['Entretien de conseil', 'Analyser la séance à partir des faits et fixer une priorité'], ['Préparation commune', 'Construire ensemble une fiche avant la classe']]),
      b.exemple('Un entretien de conseil', 'Le formateur commence par demander au stagiaire ce qu’il pense de sa séance, puis s’appuie sur deux faits observés, cite une notion (le transfert, l’étayage) et propose une seule amélioration pour la prochaine fois.'),
      b.exemple('Le sujet de 2004', 'Le reproche fait au stagiaire (« ses élèves transféreront difficilement ») se traduit en conseil : varier les situations d’application et faire expliciter la démarche.'),
      b.retenir('Un formateur fait réfléchir le stagiaire sur sa pratique ; il ne se contente pas de juger.'),
      b.piege('Accumuler dix critiques à la fois : le stagiaire ne sait plus par où commencer.'),
      question(8, 'DID-CLASSE', 'Quel est le but d’une leçon modèle ?', ['Montrer une pratique à observer et analyser', 'Noter le stagiaire', 'Remplacer la préparation'], 'La leçon modèle donne à voir une pratique que les élèves-maîtres observent et analysent.'),
      b.recap(['Leçon modèle, leçon d’essai.', 'Entretien fondé sur les faits.', 'Une priorité à la fois.']),
    ]),
  ],
  exercices: [
    classer({ ...spec('DID-OBJ'), code: 'CAFOP-PROF-DIDACTIQUE-E01', niveau: 1, consigne: 'Classe chaque verbe : observable ou non observable pour un objectif opérationnel.', categories: ['Observable', 'Non observable'],
      cartes: [['Calculer', 0], ['Identifier', 0], ['Écrire', 0], ['Comprendre', 1], ['Savoir', 1], ['Prendre conscience', 1]],
      explication: 'Calculer, identifier et écrire produisent un résultat que le maître peut constater. Comprendre, savoir et prendre conscience sont des états internes, non observables directement.' }),
    ordre({ ...spec('DID-FICHE'), code: 'CAFOP-PROF-DIDACTIQUE-E02', niveau: 1, consigne: 'Remets dans l’ordre les étapes d’une séance.', elements: ['Rappel ou mise en situation', 'Découverte ou recherche', 'Mise en commun et synthèse', 'Application', 'Évaluation'],
      explication: 'On mobilise d’abord les acquis, les élèves cherchent, on formule la règle, on s’entraîne, puis on vérifie l’atteinte de l’objectif.' }),
    relier({ ...spec('DID-BASES'), code: 'CAFOP-PROF-DIDACTIQUE-E03', niveau: 1, consigne: 'Relie chaque relation du triangle pédagogique au processus correspondant.', paires: [['Enseignant – savoir', 'Enseigner'], ['Enseignant – élève', 'Former'], ['Élève – savoir', 'Apprendre']],
      explication: 'Selon Jean Houssaye, privilégier la relation enseignant-savoir, c’est enseigner ; enseignant-élève, former ; élève-savoir, apprendre.' }),
    relier({ ...spec('DID-DISC'), code: 'CAFOP-PROF-DIDACTIQUE-E04', niveau: 1, consigne: 'Relie chaque méthode de lecture à son principe.', paires: [['Syllabique', 'Partir des lettres et des sons'], ['Globale', 'Reconnaître des mots entiers'], ['Mixte', 'Associer mots entiers et étude des sons']],
      explication: 'La méthode syllabique part des unités sonores, la globale des mots entiers, la mixte combine les deux approches.' }),
    ordre({ ...spec('DID-DISC'), code: 'CAFOP-PROF-DIDACTIQUE-E05', niveau: 1, consigne: 'Remets dans l’ordre les étapes de la démarche d’investigation.', elements: ['Observer une situation', 'Poser une question', 'Formuler des hypothèses', 'Vérifier par une expérience', 'Conclure'],
      explication: 'La démarche part de l’observation, pose une question, propose des hypothèses, les vérifie et conclut.' }),
    vf({ ...spec('DID-BASES'), code: 'CAFOP-PROF-DIDACTIQUE-E06', niveau: 1, consigne: 'Indique si chaque affirmation est vraie ou fausse.', affirmations: [['La didactique porte sur l’enseignement d’une discipline.', true], ['Connaître parfaitement les fractions suffit pour savoir les enseigner.', false], ['Le triangle pédagogique relie savoir, enseignant et élève.', true]],
      explication: 'La didactique étudie l’enseignement d’une discipline. Maîtriser une notion ne dit pas comment la faire apprendre. Le triangle de Houssaye relie bien les trois pôles.' }),
    qcm({ ...spec('DID-OBJ'), code: 'CAFOP-PROF-DIDACTIQUE-E07', niveau: 2, consigne: 'Quel objectif est correctement formulé ?', options: ['L’élève écrit sans erreur au moins 8 mots sur 10 de la liste dictée.', 'Le maître explique l’orthographe des mots.', 'L’élève comprend l’orthographe.', 'Faire une dictée.'], bonne: 0,
      explication: 'Le premier objectif est centré sur l’élève, avec un verbe observable (écrit) et un critère (8 mots sur 10). Les autres sont centrés sur le maître, non observables ou réduits à une activité.' }),
    qcm({ ...spec('DID-FICHE'), code: 'CAFOP-PROF-DIDACTIQUE-E08', niveau: 2, consigne: 'L’objectif d’une séance est « partager une quantité en parts égales et écrire la division ». Quelle évaluation est cohérente ?', options: ['Partager 30 mangues entre 5 élèves et écrire 30 ÷ 5 = 6.', 'Additionner 30 et 5.', 'Réciter la table de 5.', 'Recopier la leçon.'], bonne: 0,
      explication: 'L’évaluation doit vérifier exactement ce que vise l’objectif : un partage équitable et l’écriture de la division.' }),
    qcm({ ...spec('DID-DISC'), code: 'CAFOP-PROF-DIDACTIQUE-E09', niveau: 2, consigne: 'Un élève écrit 52 − 17 = 45. Quelle remédiation est la plus adaptée ?', options: ['Revenir au matériel (dizaines et unités) pour comprendre l’échange d’une dizaine.', 'Lui faire recopier dix fois la bonne réponse.', 'Lui donner une punition.', 'Passer à la multiplication.'], bonne: 0,
      explication: 'L’élève soustrait le plus petit chiffre du plus grand dans chaque colonne (7 − 2 = 5 et 5 − 1 = 4). Il faut comprendre l’échange d’une dizaine, ce que le matériel rend visible.' }),
    classer({ ...spec('DID-CLASSE'), code: 'CAFOP-PROF-DIDACTIQUE-E10', niveau: 2, consigne: 'Classe chaque pratique pour une classe nombreuse : efficace ou inefficace.', categories: ['Efficace', 'Inefficace'],
      cartes: [['Ardoises levées au signal', 0], ['Tutorat entre élèves', 0], ['Consignes écrites pour le groupe autonome', 0], ['Laisser un groupe sans tâche', 1], ['Interroger toujours les mêmes élèves', 1]],
      explication: 'Les ardoises, le tutorat et les consignes écrites font travailler tout le monde. Un groupe sans tâche perd son temps et interroger toujours les mêmes élèves laisse les autres de côté.' }),
    entourer({ ...spec('DID-DISC', { source: annale('psy2005a', 'Professeur de CAFOP, psychopédagogie générale, question 3 (adaptation)') }), code: 'CAFOP-PROF-DIDACTIQUE-E11', niveau: 2, consigne: 'Pour une séance d’éveil sur la pluie préparée à partir d’un reportage télévisé, sélectionne les choix didactiques pertinents.', elements: [['Partir du reportage pour faire poser une question aux élèves', true], ['Faire formuler des hypothèses', true], ['Vérifier par une observation ou une expérience', true], ['Faire seulement recopier le commentaire du reportage', false], ['Remplacer toute la séance par le visionnage', false]],
      explication: '(CAFOP professeur 2005, psychopédagogie, question 3) Le support télévisé est utile s’il lance une démarche : question, hypothèses, vérification. Recopier ou seulement regarder ne fait pas apprendre.' }),
    qcm({ ...spec('DID-CLASSE', { source: annale('psy2004', 'Professeur de CAFOP, psychopédagogie générale, question 3 (adaptation)') }), code: 'CAFOP-PROF-DIDACTIQUE-E12', niveau: 3, consigne: 'Après une séance d’un stagiaire, quel conseil est le plus formateur ?', options: ['« Tes exercices reprenaient tous l’exemple : demain, ajoute une situation nouvelle pour vérifier que les élèves savent réutiliser la règle. »', '« Ta séance était mauvaise. »', '« Il faut tout recommencer. »', '« Fais comme moi. »'], bonne: 0,
      explication: '(CAFOP professeur 2004, psychopédagogie, question 3) Le bon conseil part d’un fait observé, s’appuie sur une notion (le transfert) et propose une action précise et réalisable.' }),
    qcm({ ...spec('DID-FICHE'), code: 'CAFOP-PROF-DIDACTIQUE-E13', niveau: 3, consigne: 'Dans une fiche, le maître donne la règle dès la première minute, puis fait faire vingt exercices identiques. Quel défaut didactique principal relèves-tu ?', options: ['L’absence de phase de recherche : les élèves appliquent sans construire la notion.', 'Il y a trop peu d’exercices.', 'La séance est trop courte.', 'Le maître parle trop doucement.'], bonne: 0,
      explication: 'Sans découverte ni recherche, l’élève applique mécaniquement une règle qu’il n’a pas construite, ce qui nuit à la compréhension et au transfert.' }),
    qcm({ ...spec('DID-BASES', { source: annale('psy2005b', 'Professeur de CAFOP, psychopédagogie, question 3 (adaptation)') }), code: 'CAFOP-PROF-DIDACTIQUE-E14', niveau: 3, consigne: 'Une conférence pédagogique insiste sur « apprendre à apprendre ». Quelle pratique de classe l’illustre le mieux ?', options: ['Faire expliciter à l’élève comment il a trouvé sa réponse et quelle méthode il réutiliserait.', 'Dicter le résumé à apprendre par cœur.', 'Corriger soi-même tous les exercices au tableau sans discussion.', 'Interdire l’usage du dictionnaire.'], bonne: 0,
      explication: '(CAFOP professeur 2005, psychopédagogie, question 3) Expliciter sa démarche développe des méthodes réutilisables : c’est le cœur d’« apprendre à apprendre ». Les autres pratiques rendent l’élève dépendant.' }),
  ],
};

module.exports = [didactique];
