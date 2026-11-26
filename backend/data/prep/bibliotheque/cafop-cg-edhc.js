const { mc, qcm, vf, glisser, ordre, relier, classer, entourer, b, lecon } = require('../dsl');

// Suite de CG-INSTIT (institutions) et de CAFOP-CG-IA : la rubrique EDHC (éducation aux droits de
// l'homme et à la citoyenneté), apparue dans la culture générale du CAFOP-IA en 2025
// (document 6adf4d7f…) ; la classification élus/nommés figurait déjà en 2021 (document 6adf40cc…).
// Faits stables : textes internationaux et principes ; aucune donnée volatile.

const DOC = { 2021: '6adf40ccecb585bf0e4f3361', 2025: '6adf4d7fecb585bf0e4f4305' };
const annale = (annee, epreuve) => ({ type: 'annale', organisme: 'CAFOP', annee, epreuve: `IA, Culture générale, ${epreuve}`, documentId: DOC[annee] });
const original = { type: 'original', inspireDe: 'Rubrique EDHC du CAFOP-IA 2025 ; programme d’EDHC de l’école ivoirienne' };

const rappels = {
  'EDHC-DROITS': mc('Les grands textes', 'La Déclaration universelle des droits de l’homme est adoptée par l’ONU le 10 décembre 1948 à Paris. La Convention relative aux droits de l’enfant est adoptée le 20 novembre 1989. La Charte africaine des droits de l’homme et des peuples est adoptée en 1981 à Nairobi par l’OUA. La Constitution ivoirienne en vigueur date du 8 novembre 2016 ; elle garantit les droits et libertés et fixe les devoirs des citoyens.', '1948 DUDH ; 1989 droits de l’enfant ; 1981 Charte africaine.'),
  'EDHC-ENFANT': mc('Les droits de l’enfant', 'L’enfant est toute personne de moins de 18 ans. Il a droit à un nom et une nationalité, à la santé, à l’éducation, aux loisirs, à la protection contre la violence, l’exploitation et les pratiques néfastes comme le mariage précoce. En Côte d’Ivoire, l’école est obligatoire pour les enfants de 6 à 16 ans depuis 2015. L’adulte, la famille et l’école ont le devoir de protéger l’enfant et de signaler les abus.', 'Moins de 18 ans ; école obligatoire de 6 à 16 ans.'),
  'EDHC-CITOYEN': mc('Droits et devoirs du citoyen', 'Le citoyen a des droits : voter à partir de 18 ans, s’exprimer, s’associer, être protégé par la loi. Il a aussi des devoirs : respecter les lois et les biens publics, payer l’impôt, participer à la défense du pays, respecter les autres. Le vote est secret, personnel et libre. Un droit s’exerce dans le respect des droits des autres.', 'Pas de droit sans devoir.'),
  'EDHC-DEMO': mc('La démocratie', 'La démocratie est le gouvernement du peuple, par le peuple et pour le peuple. Elle repose sur des élections libres, le pluralisme politique et la séparation des pouvoirs : le pouvoir exécutif applique les lois, le pouvoir législatif les vote, le pouvoir judiciaire juge. Le suffrage universel direct permet aux citoyens d’élire eux-mêmes leurs représentants ; le suffrage indirect passe par des élus.', 'Exécutif, législatif, judiciaire.'),
  'EDHC-VIVRE': mc('Vivre ensemble', 'Le civisme est le respect des règles de la vie collective : propreté des lieux publics, respect du code de la route, protection de l’environnement. La tolérance consiste à accepter les différences d’ethnie, de religion ou d’opinion. La discrimination est un traitement injuste fondé sur ces différences ou sur le sexe ; l’égalité entre filles et garçons est un principe garanti.', 'Civisme, tolérance, égalité.'),
};
const spec = (notion, extra = {}) => ({ notions: [notion], miniCours: rappels[notion], source: original, ...extra });
const question = (i, notion, consigne, options, explication) => b.question(qcm({ ...spec(notion), code: `CAFOP-CG-EDHC-L${i}-Q1`, niveau: 1, consigne, options, bonne: 0, explication }));

const edhc = {
  code: 'CAFOP-CG-EDHC',
  matiere: 'Culture générale',
  titre: 'EDHC : droits de l’homme et citoyenneté',
  resume: 'Les grands textes des droits humains, les droits de l’enfant, les droits et devoirs du citoyen, la démocratie et le vivre-ensemble, pour la rubrique EDHC du concours.',
  notions: [
    { code: 'EDHC-DROITS', libelle: 'Les grands textes des droits humains' },
    { code: 'EDHC-ENFANT', libelle: 'Les droits de l’enfant' },
    { code: 'EDHC-CITOYEN', libelle: 'Droits et devoirs du citoyen' },
    { code: 'EDHC-DEMO', libelle: 'Démocratie et élections' },
    { code: 'EDHC-VIVRE', libelle: 'Civisme, tolérance et égalité' },
  ],
  lecons: [
    lecon('CAFOP-CG-EDHC-L1', 'Qu’est-ce que l’EDHC ?', 4, [
      b.texte('À la fin de cette leçon, tu sauras ce que recouvre la rubrique EDHC et pourquoi elle concerne le futur instituteur. Prérequis : le module Les institutions de la Côte d’Ivoire.'),
      b.texte('L’**EDHC** (éducation aux droits de l’homme et à la citoyenneté) est une discipline de l’école ivoirienne. Elle apprend aux élèves leurs droits, leurs devoirs et les règles de la vie en société. Depuis 2025, la culture générale du CAFOP-IA comporte une rubrique EDHC.'),
      b.liste(['Les droits de l’homme et de l’enfant', 'Les droits et devoirs du citoyen', 'Les institutions et les élections', 'Le civisme et le vivre-ensemble', 'Les symboles de l’État'], false),
      b.exemple('Questions de 2025', 'Classer des responsables selon leur mode de désignation (élus ou nommés) ; citer les symboles de l’État.'),
      b.exemple('Pourquoi pour l’instituteur ?', 'L’instituteur enseigne l’EDHC à l’école primaire : il doit en maîtriser les notions et les vivre dans sa classe.'),
      b.retenir('L’EDHC relie connaissances (textes, institutions) et comportements (civisme, respect).'),
      b.piege('Confondre EDHC et histoire : l’EDHC porte sur les droits, les devoirs et la vie citoyenne d’aujourd’hui.'),
      question(1, 'EDHC-CITOYEN', 'Que signifie le sigle EDHC ?', ['Éducation aux droits de l’homme et à la citoyenneté', 'École de défense des hommes et des citoyens', 'Étude du droit et de l’histoire contemporaine'], 'EDHC signifie Éducation aux droits de l’homme et à la citoyenneté.'),
      b.recap(['EDHC : droits, devoirs, citoyenneté.', 'Rubrique du concours depuis 2025.', 'Discipline enseignée au primaire.']),
    ]),
    lecon('CAFOP-CG-EDHC-L2', 'Les grands textes des droits humains', 5, [
      b.texte('À la fin de cette leçon, tu sauras dater et situer les principaux textes de protection des droits. Prérequis : l’ONU et l’OUA (module CAFOP-CG-MONDE).'),
      b.tableau(['Texte', 'Date', 'Adopté par'], [['Déclaration universelle des droits de l’homme', '10 décembre 1948', 'Assemblée générale de l’ONU, à Paris'], ['Charte africaine des droits de l’homme et des peuples', '1981, à Nairobi', 'OUA'], ['Convention relative aux droits de l’enfant', '20 novembre 1989', 'Assemblée générale de l’ONU'], ['Constitution de la Côte d’Ivoire en vigueur', '8 novembre 2016', 'Adoptée par référendum']]),
      b.exemple('Une journée symbolique', 'Le 10 décembre est la Journée des droits de l’homme, en souvenir de l’adoption de la Déclaration universelle en 1948.'),
      b.exemple('Un article célèbre', 'L’article 1ᵉʳ de la Déclaration universelle affirme que tous les êtres humains naissent libres et égaux en dignité et en droits.'),
      b.retenir('La Charte africaine parle des droits de l’homme et des peuples : elle ajoute des droits collectifs, comme le droit des peuples au développement.'),
      b.piege('Confondre la Déclaration universelle (1948) et la Déclaration des droits de l’homme et du citoyen, texte français de 1789.'),
      question(2, 'EDHC-DROITS', 'En quelle année l’ONU a-t-elle adopté la Déclaration universelle des droits de l’homme ?', ['1948', '1789', '1989'], 'La Déclaration universelle date du 10 décembre 1948. 1789 est la Déclaration française ; 1989, la Convention relative aux droits de l’enfant.'),
      b.recap(['DUDH : 10 décembre 1948.', 'Charte africaine : 1981.', 'Droits de l’enfant : 20 novembre 1989.']),
    ]),
    lecon('CAFOP-CG-EDHC-L3', 'Les droits de l’enfant', 5, [
      b.texte('À la fin de cette leçon, tu sauras citer les droits de l’enfant et les situations où il faut le protéger. Prérequis : les grands textes.'),
      b.texte('Selon la Convention de 1989, un **enfant** est toute personne de **moins de 18 ans**. Ses droits se regroupent en quatre familles : **survie** (vie, santé, nourriture), **développement** (éducation, loisirs, culture), **protection** (contre la violence, l’exploitation, la discrimination), **participation** (donner son avis sur ce qui le concerne).'),
      b.exemple('L’école obligatoire', 'En Côte d’Ivoire, une loi de 2015 rend l’école obligatoire pour tous les enfants de 6 à 16 ans. Les parents ont le devoir de les y inscrire.'),
      b.exemple('Une situation à signaler', 'Une élève de 13 ans annonce qu’elle va être mariée et quitter l’école. Le maître informe le directeur, qui saisit les services sociaux : le mariage précoce viole ses droits.'),
      b.retenir('L’intérêt supérieur de l’enfant doit guider toutes les décisions qui le concernent.'),
      b.piege('Croire que le travail domestique lourd qui empêche d’aller à l’école est un simple service familial : il prive l’enfant de son droit à l’éducation.'),
      question(3, 'EDHC-ENFANT', 'Jusqu’à quel âge une personne est-elle considérée comme un enfant par la Convention de 1989 ?', ['Moins de 18 ans', 'Moins de 12 ans', 'Moins de 21 ans'], 'La Convention définit l’enfant comme tout être humain âgé de moins de 18 ans.'),
      b.recap(['Enfant : moins de 18 ans.', 'Survie, développement, protection, participation.', 'École obligatoire de 6 à 16 ans.']),
    ]),
    lecon('CAFOP-CG-EDHC-L4', 'Droits et devoirs du citoyen', 4, [
      b.texte('À la fin de cette leçon, tu sauras distinguer les droits et les devoirs du citoyen. Prérequis : les grands textes.'),
      b.tableau(['Droits', 'Devoirs'], [['Voter et être candidat', 'Respecter la Constitution et les lois'], ['S’exprimer librement', 'Payer l’impôt'], ['Se réunir et s’associer', 'Respecter les biens publics'], ['Être protégé par la justice', 'Participer à la défense du pays'], ['Aller à l’école, se soigner', 'Respecter les droits des autres']]),
      b.exemple('Le vote', 'À partir de 18 ans, le citoyen inscrit sur la liste électorale peut voter. Le vote est personnel et secret : il se fait seul dans l’isoloir.'),
      b.exemple('Un droit limité par celui des autres', 'La liberté d’expression ne permet pas d’injurier ou de diffamer quelqu’un : elle s’arrête où commence le droit d’autrui.'),
      b.retenir('Payer l’impôt finance les écoles, les routes et les hôpitaux : c’est un devoir civique.'),
      b.piege('Penser que voter est seulement un devoir : c’est d’abord un droit, que chacun exerce librement.'),
      question(4, 'EDHC-CITOYEN', 'Lequel de ces éléments est un devoir du citoyen ?', ['Payer l’impôt', 'S’exprimer librement', 'Créer une association'], 'Payer l’impôt est un devoir. S’exprimer et s’associer sont des droits.'),
      b.recap(['Droits : voter, s’exprimer, s’associer.', 'Devoirs : lois, impôt, biens publics.', 'Le droit de chacun s’arrête à celui des autres.']),
    ]),
    lecon('CAFOP-CG-EDHC-L5', 'Démocratie et séparation des pouvoirs', 5, [
      b.texte('À la fin de cette leçon, tu sauras définir la démocratie et associer chaque pouvoir à son rôle. Prérequis : les institutions ivoiriennes (CG-INSTIT).'),
      b.texte('La **démocratie** est souvent définie comme « le gouvernement du peuple, par le peuple et pour le peuple ». Elle repose sur des **élections libres**, le **pluralisme** (plusieurs partis) et la **séparation des pouvoirs**, qui évite qu’une seule autorité concentre tout.'),
      b.tableau(['Pouvoir', 'Rôle', 'En Côte d’Ivoire'], [['Exécutif', 'Appliquer les lois, diriger l’administration', 'Président de la République, gouvernement'], ['Législatif', 'Voter les lois, contrôler le gouvernement', 'Parlement : Assemblée nationale et Sénat'], ['Judiciaire', 'Juger les litiges et les infractions', 'Cours et tribunaux']]),
      b.exemple('Élus au suffrage direct ou indirect', 'Les députés sont élus directement par les citoyens. Le président de l’Assemblée nationale est élu par les députés : c’est un suffrage indirect.'),
      b.exemple('Comme au concours (2021 et 2025)', 'Le préfet, le chef de circonscription ou le directeur de la DECO sont nommés : ils n’ont pas été élus.'),
      b.retenir('Le pouvoir législatif vote la loi ; l’exécutif l’applique ; le judiciaire la fait respecter en jugeant.'),
      b.piege('Confondre nommé et élu : un ministre est nommé par le président de la République, il n’est pas élu à ce poste.'),
      question(5, 'EDHC-DEMO', 'Quel pouvoir vote les lois ?', ['Le pouvoir législatif', 'Le pouvoir exécutif', 'Le pouvoir judiciaire'], 'Le pouvoir législatif, exercé par le Parlement, vote les lois.'),
      b.recap(['Élections libres et pluralisme.', 'Trois pouvoirs séparés.', 'Élu ou nommé.']),
    ]),
    lecon('CAFOP-CG-EDHC-L6', 'Civisme et environnement', 4, [
      b.texte('À la fin de cette leçon, tu sauras reconnaître des comportements civiques et expliquer leur importance. Aucun prérequis.'),
      b.texte('Le **civisme** est le respect des règles et du bien commun. Il se voit dans les gestes quotidiens : jeter ses déchets dans une poubelle, respecter le code de la route, préserver les équipements publics, économiser l’eau et l’électricité.'),
      b.exemple('À l’école', 'Les élèves organisent une journée de salubrité pour nettoyer la cour et planter des arbres : ils apprennent à protéger leur cadre de vie.'),
      b.exemple('Sur la route', 'Traverser sur le passage piéton, respecter le feu rouge, porter un casque à moto : ces règles protègent la vie de chacun.'),
      b.retenir('Les biens publics (école, route, pompe) appartiennent à tous : les dégrader, c’est nuire à toute la communauté.'),
      b.piege('Penser que les règles ne s’appliquent que lorsqu’un agent surveille : le civisme est un comportement volontaire.'),
      question(6, 'EDHC-VIVRE', 'Lequel de ces gestes est un acte de civisme ?', ['Jeter ses déchets dans une poubelle', 'Écrire sur les murs de l’école', 'Brûler un feu rouge'], 'Jeter ses déchets à la poubelle respecte le cadre de vie commun. Les deux autres gestes dégradent les biens publics ou mettent la vie en danger.'),
      b.recap(['Civisme : respect du bien commun.', 'Salubrité, environnement, route.', 'Biens publics : à préserver.']),
    ]),
    lecon('CAFOP-CG-EDHC-L7', 'Tolérance, égalité et lutte contre les discriminations', 5, [
      b.texte('À la fin de cette leçon, tu sauras définir tolérance et discrimination et reconnaître une situation injuste. Prérequis : les droits de l’homme.'),
      b.texte('La **tolérance** est l’acceptation des différences d’origine, de religion ou d’opinion. Une **discrimination** est un traitement inégal et injuste d’une personne à cause de son sexe, de son origine, de sa religion ou de son handicap. L’égalité entre les filles et les garçons, à l’école comme dans la société, est un principe garanti.'),
      b.exemple('Une discrimination à l’école', 'Un maître confie toujours le nettoyage de la classe aux filles et les responsabilités de délégué aux garçons : il les traite inégalement à cause de leur sexe.'),
      b.exemple('Une pratique égalitaire', 'Les tâches de la classe tournent entre tous les élèves, filles et garçons, selon un tableau affiché.'),
      b.retenir('La différence de traitement n’est juste que si elle répond à un besoin réel : un élève malvoyant placé au premier rang n’est pas favorisé, il est aidé.'),
      b.piege('Confondre tolérance et indifférence : être tolérant, c’est respecter l’autre, pas l’ignorer.'),
      question(7, 'EDHC-VIVRE', 'Refuser un élève dans une équipe à cause de sa religion est…', ['une discrimination', 'un acte de civisme', 'un devoir du citoyen'], 'C’est un traitement injuste fondé sur la religion : une discrimination.'),
      b.recap(['Tolérance : accepter les différences.', 'Discrimination : traitement injuste.', 'Égalité filles-garçons.']),
    ]),
    lecon('CAFOP-CG-EDHC-L8', 'Bilan : répondre aux questions d’EDHC', 4, [
      b.texte('À la fin de cette leçon, tu sauras traiter rapidement les formats de questions d’EDHC. Prérequis : les leçons du module.'),
      b.liste(['Classer dans un tableau (élus / nommés, droits / devoirs)', 'Citer (les symboles de l’État, des droits de l’enfant)', 'Définir (citoyenneté, démocratie, discrimination)', 'Dater un texte (1948, 1989)', 'Dire quelle attitude adopter face à une situation'], false),
      b.exemple('Définir en une phrase', 'Citoyenneté : qualité d’une personne qui appartient à un État, avec des droits (voter, être protégée) et des devoirs (respecter les lois, payer l’impôt).'),
      b.exemple('Réagir à une situation', 'Un élève se moque d’un camarade handicapé : le maître fait cesser la moquerie, explique le respect dû à chacun et adapte l’activité pour que tous participent.'),
      b.retenir('Dans les questions de situation, le futur instituteur doit choisir l’attitude qui protège l’enfant et respecte ses droits.'),
      b.piege('Donner une opinion personnelle au lieu d’appliquer une règle ou un principe.'),
      question(8, 'EDHC-CITOYEN', 'Quel symbole de l’État est la devise « Union – Discipline – Travail » ?', ['La devise', 'L’hymne national', 'Les armoiries'], '« Union – Discipline – Travail » est la devise de la Côte d’Ivoire ; l’hymne national est L’Abidjanaise.'),
      b.recap(['Classer, citer, définir, dater.', 'Situation : protéger et respecter.', 'Appliquer un principe, pas une opinion.']),
    ]),
  ],
  exercices: [
    relier({ ...spec('EDHC-DROITS'), code: 'CAFOP-CG-EDHC-E01', niveau: 1, consigne: 'Relie chaque texte à sa date d’adoption.', paires: [['Déclaration universelle des droits de l’homme', '1948'], ['Charte africaine des droits de l’homme et des peuples', '1981'], ['Convention relative aux droits de l’enfant', '1989'], ['Constitution ivoirienne en vigueur', '2016']],
      explication: 'Déclaration universelle : 10 décembre 1948 ; Charte africaine : 1981 à Nairobi ; Convention relative aux droits de l’enfant : 20 novembre 1989 ; Constitution ivoirienne : 8 novembre 2016.' }),
    classer({ ...spec('EDHC-CITOYEN'), code: 'CAFOP-CG-EDHC-E02', niveau: 1, consigne: 'Classe chaque élément : droit ou devoir du citoyen.', categories: ['Droit', 'Devoir'],
      cartes: [['Voter', 0], ['S’exprimer librement', 0], ['Créer une association', 0], ['Payer l’impôt', 1], ['Respecter les lois', 1], ['Préserver les biens publics', 1]],
      explication: 'Voter, s’exprimer et s’associer sont des droits. Payer l’impôt, respecter les lois et préserver les biens publics sont des devoirs.' }),
    classer({ ...spec('EDHC-DEMO', { source: annale(2025, 'VI. EDHC, question 1') }), code: 'CAFOP-CG-EDHC-E03', niveau: 1, consigne: 'Classe chaque responsable selon son mode de désignation.', categories: ['Élu', 'Nommé'],
      cartes: [['Le député', 0], ['Le maire', 0], ['Le président de la République', 0], ['Le préfet', 1], ['L’inspecteur de l’enseignement', 1], ['Le directeur de la DECO', 1]],
      explication: '(CAFOP IA 2025, culture générale, EDHC, question 1) Députés, maires et président de la République sont élus au suffrage universel direct. Préfet, inspecteur et directeur de la DECO sont nommés par l’autorité administrative.' }),
    entourer({ ...spec('EDHC-ENFANT'), code: 'CAFOP-CG-EDHC-E04', niveau: 1, consigne: 'Sélectionne les droits de l’enfant.', elements: [['Le droit à l’éducation', true], ['Le droit à la santé', true], ['Le droit d’avoir un nom', true], ['Le droit aux loisirs', true], ['Le droit de voter à 12 ans', false], ['Le devoir de travailler pour nourrir sa famille', false]],
      explication: 'Éducation, santé, nom et loisirs sont des droits garantis par la Convention de 1989. Le vote est réservé aux majeurs ; le travail qui prive l’enfant d’école est une exploitation, pas un droit.' }),
    relier({ ...spec('EDHC-DEMO'), code: 'CAFOP-CG-EDHC-E05', niveau: 1, consigne: 'Relie chaque pouvoir à son rôle.', paires: [['Pouvoir législatif', 'Voter les lois'], ['Pouvoir exécutif', 'Appliquer les lois'], ['Pouvoir judiciaire', 'Juger les litiges']],
      explication: 'Le législatif vote les lois, l’exécutif les applique et le judiciaire juge en les faisant respecter : c’est la séparation des pouvoirs.' }),
    vf({ ...spec('EDHC-CITOYEN'), code: 'CAFOP-CG-EDHC-E06', niveau: 1, consigne: 'Indique si chaque affirmation sur le vote est vraie ou fausse.', affirmations: [['Le vote est secret.', true], ['On peut voter à la place d’un voisin absent sans procuration.', false], ['Il faut être majeur pour voter.', true]],
      explication: 'Le vote est secret et personnel : on ne vote pas à la place d’autrui sans procuration régulière. Il faut avoir l’âge de la majorité électorale, 18 ans.' }),
    qcm({ ...spec('EDHC-ENFANT'), code: 'CAFOP-CG-EDHC-E07', niveau: 2, consigne: 'Une élève de 13 ans annonce qu’elle va quitter l’école pour être mariée. Quelle est la bonne réaction du maître ?', options: ['Informer le directeur pour que les services compétents protègent l’élève.', 'Respecter la décision de la famille sans rien dire.', 'Féliciter l’élève.', 'Lui donner ses devoirs à faire à la maison.'], bonne: 0,
      explication: 'Le mariage précoce viole les droits de l’enfant et l’obligation scolaire jusqu’à 16 ans. Le maître doit signaler la situation pour que l’élève soit protégée.' }),
    glisser({ ...spec('EDHC-ENFANT'), code: 'CAFOP-CG-EDHC-E08', niveau: 2, consigne: 'Complète.', texte: 'Selon la Convention de 1989, un enfant est une personne de moins de {{18}} ans. En Côte d’Ivoire, l’école est obligatoire de {{6}} à {{16}} ans.', distracteurs: ['21', '5', '14'],
      explication: 'La Convention fixe la limite à 18 ans. La loi ivoirienne de 2015 rend l’école obligatoire de 6 à 16 ans.' }),
    classer({ ...spec('EDHC-VIVRE'), code: 'CAFOP-CG-EDHC-E09', niveau: 2, consigne: 'Classe chaque situation : discrimination ou traitement juste.', categories: ['Discrimination', 'Traitement juste'],
      cartes: [['Réserver le poste de délégué aux garçons', 0], ['Refuser un élève à cause de son ethnie', 0], ['Placer au premier rang un élève malvoyant', 1], ['Faire tourner les tâches de la classe entre tous', 1]],
      explication: 'Exclure à cause du sexe ou de l’ethnie est discriminatoire. Aider un élève malvoyant répond à un besoin réel ; une rotation des tâches traite tout le monde également.' }),
    relier({ ...spec('EDHC-VIVRE'), code: 'CAFOP-CG-EDHC-E10', niveau: 2, consigne: 'Relie chaque notion à sa définition.', paires: [['Civisme', 'Respect des règles et du bien commun'], ['Tolérance', 'Acceptation des différences'], ['Discrimination', 'Traitement injuste fondé sur une différence'], ['Citoyenneté', 'Appartenance à un État, avec des droits et des devoirs']],
      explication: 'Ces quatre définitions sont les formulations attendues dans les questions de culture générale et d’EDHC.' }),
    qcm({ ...spec('EDHC-DROITS'), code: 'CAFOP-CG-EDHC-E11', niveau: 2, consigne: 'Que proclame l’article 1ᵉʳ de la Déclaration universelle des droits de l’homme ?', options: ['Tous les êtres humains naissent libres et égaux en dignité et en droits.', 'Chaque pays choisit seul qui a des droits.', 'Les droits dépendent de la richesse de chacun.', 'Seuls les adultes ont des droits.'], bonne: 0,
      explication: 'L’article 1ᵉʳ affirme la liberté et l’égalité de tous les êtres humains en dignité et en droits. Les autres propositions contredisent ce principe d’universalité.' }),
    qcm({ ...spec('EDHC-DEMO', { source: annale(2021, 'V. Géographie, question 1') }), code: 'CAFOP-CG-EDHC-E12', niveau: 3, consigne: 'Comment le président de l’Assemblée nationale est-il désigné ?', options: ['Il est élu par les députés : suffrage indirect.', 'Il est élu directement par tous les citoyens.', 'Il est nommé par le préfet.', 'Il est désigné par tirage au sort.'], bonne: 0,
      explication: '(CAFOP IA 2021, culture générale, question 1 sur les élus) Les citoyens élisent les députés ; les députés élisent ensuite le président de l’Assemblée nationale. Ce mode d’élection par des élus est un suffrage indirect.' }),
    qcm({ ...spec('EDHC-VIVRE'), code: 'CAFOP-CG-EDHC-E13', niveau: 3, consigne: 'Un élève se moque d’un camarade handicapé pendant le jeu. Quelle attitude du maître applique le mieux les principes d’EDHC ?', options: ['Faire cesser la moquerie, expliquer le respect dû à chacun et adapter le jeu pour que tous participent.', 'Exclure l’élève handicapé du jeu pour éviter les problèmes.', 'Laisser faire, car ce sont des enfants.', 'Punir toute la classe sans explication.'], bonne: 0,
      explication: 'Le maître protège l’élève victime, fait comprendre la règle du respect et organise l’inclusion. Exclure la victime serait une discrimination ; laisser faire ou punir sans expliquer n’éduque pas.' }),
    ordre({ ...spec('EDHC-DROITS'), code: 'CAFOP-CG-EDHC-E14', niveau: 3, consigne: 'Range ces textes du plus ancien au plus récent.', elements: ['Déclaration universelle des droits de l’homme', 'Charte africaine des droits de l’homme et des peuples', 'Convention relative aux droits de l’enfant', 'Constitution ivoirienne en vigueur'],
      explication: '1948, 1981, 1989, puis 2016.' }),
  ],
};

module.exports = [edhc];
