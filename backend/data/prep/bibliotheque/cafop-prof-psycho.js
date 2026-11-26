const { mc, qcm, vf, glisser, ordre, relier, classer, entourer, numerique, b, lecon } = require('../dsl');

// Concours professionnel de professeur de CAFOP — épreuve de psychopédagogie (3 h, coefficient 2
// dans les sujets 2004-2005). Format : un texte et trois questions ouvertes (idées essentielles,
// explication illustrée par la pratique, analyse ou discussion). Les questions ouvertes ne pouvant
// pas être notées automatiquement, les exercices entraînent aux savoirs et aux choix d'analyse
// qu'elles mobilisent. Complète ENS-EDU-PSYCHOPEDA (adolescence), sans le répéter.

const DOC = {
  'psy2004': { annee: 2004, documentId: '6adf4c4becb585bf0e4f3f12' },
  'psy2005a': { annee: 2005, documentId: '6adf4c60ecb585bf0e4f3f63' },
  'psy2005b': { annee: 2005, documentId: '6adf8990ecb585bf0e4f5054' },
};
const annale = (cle, epreuve) => ({ type: 'annale', organisme: 'CAFOP', ...DOC[cle], epreuve });
const original = { type: 'original', inspireDe: 'Psychopédagogie, concours de professeur de CAFOP 2004-2005' };

const rappels = {
  'PP-DEV': mc('Le développement de l’enfant', 'Piaget décrit quatre stades : sensori-moteur (de la naissance à 2 ans environ), préopératoire (2 à 7 ans), opérations concrètes (7 à 11-12 ans), opérations formelles (à partir de 11-12 ans). À l’école primaire, l’enfant raisonne surtout sur du concret : il a besoin de manipuler et d’observer. Vygotski insiste sur le rôle des autres : la zone proximale de développement est ce que l’enfant réussit avec l’aide d’un adulte ou d’un pair, mais pas encore seul.', 'École primaire : opérations concrètes.'),
  'PP-THEORIES': mc('Les théories de l’apprentissage', 'Le béhaviorisme (Skinner) explique l’apprentissage par des stimulus, des réponses et des renforcements : on découpe la tâche en petites étapes et on récompense la bonne réponse. Le constructivisme (Piaget) montre que l’élève construit ses connaissances en agissant et en surmontant des déséquilibres. Le socioconstructivisme (Vygotski, Bruner) ajoute le rôle des interactions : échanges entre pairs, conflit sociocognitif, étayage par l’adulte.', 'Renforcer, construire, interagir.'),
  'PP-METHODES': mc('Méthodes et transfert', 'Une méthode transmissive expose le savoir ; une méthode active met l’élève en situation de chercher. L’approche par les compétences vise la capacité à mobiliser des savoirs pour résoudre des situations. Le transfert est la capacité à utiliser un apprentissage dans une situation nouvelle. Montaigne préférait « une tête bien faite plutôt que bien pleine » : former le jugement plutôt qu’accumuler des connaissances.', 'Savoir réutiliser, pas seulement réciter.'),
  'PP-EVAL': mc('Évaluer les apprentissages', 'L’évaluation diagnostique, avant l’apprentissage, repère les acquis et les lacunes. L’évaluation formative, pendant l’apprentissage, informe l’élève et le maître pour ajuster l’aide ; elle n’a pas pour but de classer. L’évaluation sommative, à la fin, fait le bilan et certifie. L’erreur est une information sur la façon dont l’élève raisonne : l’analyser permet de choisir une remédiation adaptée.', 'Avant, pendant, après.'),
  'PP-ECOLE': mc('L’école dans la société', 'L’école n’est plus la seule source de savoir : télévision, radio, internet et médias forment une « école parallèle ». L’éducation permanente considère qu’on apprend tout au long de la vie ; l’école doit donc apprendre à apprendre, développer l’autonomie et le goût de chercher. Le professeur de CAFOP forme les futurs maîtres : il observe leurs prestations, en analyse les forces et les faiblesses et propose des pistes d’amélioration.', 'Apprendre à apprendre, tout au long de la vie.'),
};
const spec = (notion, extra = {}) => ({ notions: [notion], miniCours: rappels[notion], source: original, ...extra });
const question = (i, notion, consigne, options, explication) => b.question(qcm({ ...spec(notion), code: `CAFOP-PROF-PSYCHO-L${i}-Q1`, niveau: 1, consigne, options, bonne: 0, explication }));

const psycho = {
  code: 'CAFOP-PROF-PSYCHO',
  matiere: 'Psychopédagogie',
  titre: 'Psychopédagogie de l’enfant et didactique',
  resume: 'Développement de l’enfant, théories de l’apprentissage, méthodes et transfert, évaluation, école et société, formation des maîtres, et méthode de l’épreuve sur texte.',
  notions: [
    { code: 'PP-DEV', libelle: 'Développement de l’enfant' },
    { code: 'PP-THEORIES', libelle: 'Théories de l’apprentissage' },
    { code: 'PP-METHODES', libelle: 'Méthodes pédagogiques et transfert' },
    { code: 'PP-EVAL', libelle: 'Évaluation et pédagogie de l’erreur' },
    { code: 'PP-ECOLE', libelle: 'École, société et formation des maîtres' },
  ],
  lecons: [
    lecon('CAFOP-PROF-PSYCHO-L1', 'Les stades du développement selon Piaget', 5, [
      b.texte('À la fin de cette leçon, tu sauras situer un élève du primaire dans les stades de Piaget et en tirer une conséquence pour la classe. Aucun prérequis.'),
      b.tableau(['Stade', 'Âge indicatif', 'Caractéristique'], [['Sensori-moteur', '0 – 2 ans', 'L’enfant découvre le monde par les sens et l’action'], ['Préopératoire', '2 – 7 ans', 'Langage, jeu symbolique ; pensée encore centrée sur son point de vue'], ['Opérations concrètes', '7 – 11/12 ans', 'Raisonnement logique sur des objets réels : classer, ordonner, conserver les quantités'], ['Opérations formelles', 'À partir de 11/12 ans', 'Raisonnement sur des hypothèses et des idées abstraites']]),
      b.texte('Les âges sont **indicatifs** : l’ordre des stades est constant, mais le rythme varie selon les enfants et leur milieu.'),
      b.exemple('La conservation', 'On verse la même quantité d’eau dans un verre haut et étroit et dans un verre large. Avant 7 ans environ, l’enfant croit souvent qu’il y a plus d’eau dans le verre haut. Au stade des opérations concrètes, il comprend que la quantité est conservée.'),
      b.exemple('Conséquence pour le maître', 'Au CE1, pour enseigner les fractions, on partage d’abord réellement des objets (une galette, une bande de papier) avant d’écrire 1/2 ou 1/4.'),
      b.retenir('À l’école primaire, l’élève est surtout au stade des opérations concrètes : manipuler et observer précède l’abstraction.'),
      b.piege('Les stades ne sont pas des âges stricts : un élève de 8 ans peut encore avoir besoin du concret dans un domaine nouveau.'),
      question(1, 'PP-DEV', 'À quel stade de Piaget se trouve surtout un élève de CM1 (9-10 ans) ?', ['Les opérations concrètes', 'Les opérations formelles', 'Le stade sensori-moteur'], 'Entre 7 et 11-12 ans environ, l’enfant raisonne logiquement sur du concret : c’est le stade des opérations concrètes.'),
      b.recap(['Quatre stades, ordre constant.', 'Primaire : opérations concrètes.', 'Manipuler avant d’abstraire.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L2', 'Vygotski, Bruner et le rôle des autres', 5, [
      b.texte('À la fin de cette leçon, tu sauras définir la zone proximale de développement et l’étayage, et les utiliser pour organiser l’aide. Prérequis : les stades de Piaget.'),
      b.texte('Pour **Vygotski**, l’enfant apprend d’abord avec les autres, puis seul. La **zone proximale de développement** (ZPD) sépare ce que l’enfant réussit seul de ce qu’il réussit avec l’aide d’un adulte ou d’un camarade plus avancé. L’enseignement efficace vise cette zone : ni trop facile, ni hors de portée.'),
      b.texte('**Bruner** appelle **étayage** l’ensemble des aides de l’adulte : susciter l’intérêt, simplifier la tâche, maintenir l’orientation, signaler les éléments importants, montrer un modèle. L’aide est ensuite **retirée progressivement** pour que l’élève devienne autonome.'),
      b.exemple('Lire un problème', 'Seul, Koffi ne trouve pas l’opération. Quand le maître lui demande « que cherche-t-on ? » puis « que sait-on ? », il réussit. Ce problème est dans sa zone proximale de développement.'),
      b.exemple('Le travail en groupe', 'Deux élèves qui ne sont pas d’accord sur un résultat doivent justifier leur réponse. Ce conflit sociocognitif les oblige à réorganiser leur raisonnement.'),
      b.retenir('Une aide utile est temporaire : on la retire dès que l’élève peut réussir seul.'),
      b.piege('Faire la tâche à la place de l’élève n’est pas de l’étayage : il ne construit rien.'),
      question(2, 'PP-THEORIES', 'Comment appelle-t-on l’écart entre ce que l’enfant réussit seul et ce qu’il réussit avec de l’aide ?', ['La zone proximale de développement', 'Le stade préopératoire', 'L’évaluation sommative'], 'C’est la zone proximale de développement, notion de Vygotski. Le stade préopératoire vient de Piaget ; l’évaluation sommative fait un bilan.'),
      b.recap(['ZPD : réussir avec aide.', 'Étayage : aides de l’adulte (Bruner).', 'Retirer l’aide progressivement.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L3', 'Trois théories de l’apprentissage', 5, [
      b.texte('À la fin de cette leçon, tu sauras reconnaître une pratique de classe béhavioriste, constructiviste ou socioconstructiviste. Prérequis : Piaget et Vygotski.'),
      b.tableau(['Théorie', 'Auteur', 'Idée centrale', 'En classe'], [['Béhaviorisme', 'Skinner', 'Apprendre = associer une réponse à un stimulus, renforcée par une récompense', 'Petites étapes, exercices répétés, félicitations immédiates'], ['Constructivisme', 'Piaget', 'L’élève construit ses connaissances par l’action et le déséquilibre', 'Situation-problème, manipulation, recherche'], ['Socioconstructivisme', 'Vygotski, Bruner', 'Les interactions sociales sont le moteur de l’apprentissage', 'Travail de groupe, débat, étayage']]),
      b.exemple('Une séance de tables de multiplication', 'Récitation, exercices rapides et bons points : démarche béhavioriste, efficace pour automatiser.'),
      b.exemple('Une situation-problème', 'Les élèves doivent partager 36 mangues entre 4 classes sans avoir appris la division. Ils cherchent, comparent leurs procédures, puis le maître institutionnalise la division : démarche constructiviste et socioconstructiviste.'),
      b.retenir('Les théories se complètent : on peut chercher pour comprendre, puis s’entraîner pour automatiser.'),
      b.piege('La répétition n’est pas à rejeter : elle sert à automatiser ce qui a d’abord été compris.'),
      question(3, 'PP-THEORIES', 'Quelle théorie insiste sur le renforcement de la bonne réponse ?', ['Le béhaviorisme', 'Le socioconstructivisme', 'Le constructivisme'], 'Le béhaviorisme de Skinner explique l’apprentissage par le renforcement des bonnes réponses.'),
      b.recap(['Béhaviorisme : renforcement.', 'Constructivisme : action et recherche.', 'Socioconstructivisme : interactions.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L4', 'Une tête bien faite : former au transfert', 5, [
      b.texte('À la fin de cette leçon, tu sauras expliquer pourquoi l’accumulation de connaissances ne suffit pas et comment enseigner pour le transfert. Aucun prérequis.'),
      b.texte('Le sujet de 2004 critiquait l’accumulation de connaissances inutiles et la préparation de l’enfant à des actes prédéterminés dans un monde qui change. Il reprenait l’idée de **Montaigne** : mieux vaut « une tête bien faite que bien pleine ». Former, c’est développer le jugement, la souplesse intellectuelle et l’autonomie.'),
      b.texte('Le **transfert** est la capacité à utiliser une connaissance dans une situation nouvelle. Il se prépare : varier les situations, faire expliciter la démarche, demander à l’élève de dire quand et pourquoi une règle s’applique.'),
      b.exemple('Sans transfert', 'Des élèves récitent la règle d’accord du participe passé mais font les fautes dans leurs rédactions : la règle est sue, pas transférée.'),
      b.exemple('Comme au concours (2004)', 'Le professeur de CAFOP reproche à un stagiaire un enseignement qui « permettra difficilement aux élèves de transférer leurs connaissances ». Il faut expliquer : leçon trop centrée sur la mémorisation, exercices identiques à l’exemple, absence de situation nouvelle.'),
      b.retenir('L’approche par les compétences vise justement la mobilisation des savoirs dans des situations variées.'),
      b.piege('Multiplier les exercices identiques à l’exemple du cours entraîne la répétition, pas le transfert.'),
      question(4, 'PP-METHODES', 'Qu’est-ce que le transfert des connaissances ?', ['Utiliser un apprentissage dans une situation nouvelle', 'Recopier la leçon dans un autre cahier', 'Changer d’enseignant en cours d’année'], 'Le transfert consiste à mobiliser ce qu’on a appris pour résoudre une situation différente de celle de l’apprentissage.'),
      b.recap(['Tête bien faite plutôt que bien pleine.', 'Transfert : situation nouvelle.', 'Varier les situations, expliciter.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L5', 'Évaluer pour faire apprendre', 5, [
      b.texte('À la fin de cette leçon, tu sauras distinguer les trois fonctions de l’évaluation et utiliser l’erreur pour remédier. Aucun prérequis.'),
      b.tableau(['Évaluation', 'Moment', 'But'], [['Diagnostique', 'Avant l’apprentissage', 'Repérer acquis et lacunes pour adapter la séquence'], ['Formative', 'Pendant l’apprentissage', 'Informer l’élève et le maître pour ajuster ; ne pas classer'], ['Sommative', 'À la fin', 'Faire le bilan, noter, certifier']]),
      b.texte('Dans la **pédagogie de l’erreur**, l’erreur n’est pas une faute à punir mais un **indice** du raisonnement de l’élève. Le maître cherche son origine (consigne mal comprise, règle mal appliquée, connaissance manquante) puis propose une **remédiation** ciblée.'),
      b.exemple('Une erreur instructive', 'Un élève écrit 0,5 + 0,25 = 0,30. Il additionne les parties décimales comme des entiers (5 + 25). La remédiation porte sur la valeur des chiffres après la virgule, pas sur une nouvelle série d’additions.'),
      b.exemple('Une évaluation formative', 'En fin de séance, trois questions rapides sur l’ardoise montrent au maître que la moitié de la classe confond périmètre et aire : il reprend ce point le lendemain.'),
      b.retenir('La taxonomie de Bloom classe les objectifs du plus simple au plus complexe : connaissance, compréhension, application, analyse, synthèse, évaluation.'),
      b.piege('Noter chaque exercice d’entraînement transforme l’évaluation formative en sommative et décourage l’essai.'),
      question(5, 'PP-EVAL', 'Quelle évaluation a lieu avant l’apprentissage pour repérer les acquis ?', ['L’évaluation diagnostique', 'L’évaluation sommative', 'L’évaluation certificative'], 'L’évaluation diagnostique précède l’apprentissage. La sommative et la certificative font le bilan à la fin.'),
      b.recap(['Diagnostique, formative, sommative.', 'L’erreur informe sur le raisonnement.', 'Remédiation ciblée.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L6', 'L’école face aux médias et à l’éducation permanente', 5, [
      b.texte('À la fin de cette leçon, tu sauras analyser la place de l’école quand elle n’est plus la seule source de savoir. Aucun prérequis.'),
      b.texte('Le sujet de 2005 s’appuyait sur un texte de **Lê Thành Khôi** (*L’industrie de l’enseignement*, 1967). Télévision, radio, cinéma et presse forment une **école parallèle**. Ils éveillent l’attention, l’imagination et l’ouverture au monde, mais peuvent aussi donner à l’enfant des informations inadaptées à son âge et une maturation désordonnée.'),
      b.texte('L’**éducation permanente** considère qu’on apprend tout au long de la vie. L’école doit donc moins tout transmettre qu’**apprendre à apprendre** : chercher l’information, la trier, la critiquer, travailler en autonomie.'),
      b.exemple('Exploiter la télévision', 'Pour une séance d’éveil sur la pluie, un reportage télévisé récent sur une inondation locale peut intéresser davantage les élèves qu’une page ancienne du manuel. Le maître doit cependant le préparer, guider l’observation et faire vérifier les informations.'),
      b.exemple('Apprendre à apprendre', 'Au lieu de dicter un résumé, le maître fait chercher aux élèves les mots clés d’un texte, puis leur fait construire eux-mêmes une fiche : ils apprennent une méthode réutilisable.'),
      b.retenir('Un support n’est jamais pédagogique en lui-même : c’est son exploitation par le maître qui le rend utile.'),
      b.piege('Opposer simplement la télévision et le livre est trop pauvre : l’analyse attendue pèse les apports et les risques de chaque support.'),
      question(6, 'PP-ECOLE', 'Que signifie « apprendre à apprendre » ?', ['Acquérir des méthodes pour apprendre seul tout au long de la vie', 'Répéter la leçon jusqu’à la savoir par cœur', 'Apprendre uniquement à l’école'], 'Apprendre à apprendre, c’est acquérir des méthodes (chercher, trier, organiser) qui rendent autonome, dans l’esprit de l’éducation permanente.'),
      b.recap(['Médias : école parallèle.', 'Éducation permanente.', 'Apprendre à apprendre.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L7', 'Observer et conseiller un élève-maître', 5, [
      b.texte('À la fin de cette leçon, tu sauras analyser une prestation pédagogique et formuler un conseil utile à un stagiaire. Prérequis : les méthodes et l’évaluation.'),
      b.texte('Le professeur de CAFOP observe les **prestations** des élèves-maîtres. Une analyse rigoureuse suit trois temps : **décrire** ce qui s’est passé, **interpréter** avec des notions de psychopédagogie, **proposer** des pistes concrètes.'),
      b.liste(['Les objectifs de la séance étaient-ils clairs et mesurables ?', 'Les élèves étaient-ils actifs ou seulement auditeurs ?', 'La consigne a-t-elle été comprise ?', 'Les erreurs ont-elles été exploitées ?', 'Une évaluation a-t-elle vérifié l’atteinte de l’objectif ?'], false),
      b.exemple('Un conseil inutile', '« Ta leçon n’était pas bonne. » Le stagiaire ne sait ni ce qui n’allait pas, ni quoi changer.'),
      b.exemple('Un conseil utile', '« Tu as donné la règle avant tout essai : les élèves ont copié sans chercher. Demain, propose d’abord deux exemples à observer et fais-leur formuler la règle. »'),
      b.retenir('Un bon conseil part d’un fait observé, s’appuie sur une notion et propose une action précise.'),
      b.piege('Juger la personne du stagiaire plutôt que sa pratique décourage et ne fait pas progresser.'),
      question(7, 'PP-ECOLE', 'Par quoi commence une analyse rigoureuse de prestation ?', ['La description des faits observés', 'La note finale', 'Un jugement sur la personnalité du stagiaire'], 'On décrit d’abord ce qui s’est passé, puis on l’interprète, puis on propose des améliorations.'),
      b.recap(['Décrire, interpréter, proposer.', 'Partir des faits.', 'Conseil précis et réalisable.']),
    ]),
    lecon('CAFOP-PROF-PSYCHO-L8', 'Méthode de l’épreuve : un texte, trois questions', 6, [
      b.texte('À la fin de cette leçon, tu sauras organiser tes trois heures pour l’épreuve de psychopédagogie. Prérequis : les leçons précédentes.'),
      b.texte('Les sujets de 2004 et 2005 suivent le même modèle : un **texte** puis **trois questions ouvertes**, en **3 heures**. Les questions vont du texte vers la pratique : dégager les idées, expliquer une phrase avec des exemples, discuter ou appliquer à une situation de formation.'),
      b.tableau(['Question type', 'Ce qui est attendu'], [['Dégager les idées essentielles', 'Les idées dans l’ordre du texte, reformulées, sans paraphrase ni opinion'], ['Expliquer une phrase avec des exemples de sa pratique', 'Définir les mots clés, expliquer le sens, donner deux ou trois exemples concrets de classe'], ['Discuter, montrer la justesse, analyser une critique', 'Argumenter avec des notions (Piaget, Vygotski, transfert, évaluation…) et le contexte ivoirien']]),
      b.liste(['20 min : lire deux fois le texte et souligner les idées', '20 min : brouillon des trois questions', '2 h : rédaction', '20 min : relecture (orthographe, exemples, cohérence)'], true),
      b.exemple('Un exemple bien choisi', 'Pour expliquer « trop armer l’enfant », un exemple précis : faire apprendre par cœur la liste des fleuves sans jamais les situer sur une carte ni les relier à la vie des populations.'),
      b.retenir('Chaque exemple doit être concret, tiré de la classe, et relié explicitement à l’idée expliquée.'),
      b.piege('Recopier le texte avec d’autres mots n’est pas l’expliquer : il faut en dégager le sens et les enjeux pédagogiques.'),
      question(8, 'PP-METHODES', 'Que faut-il éviter quand on dégage les idées essentielles d’un texte ?', ['La paraphrase et l’ajout de son opinion', 'La reformulation des idées', 'Le respect de l’ordre du texte'], 'Dégager les idées, c’est les reformuler fidèlement et dans l’ordre. La paraphrase et l’opinion personnelle sont hors sujet à cette étape.'),
      b.recap(['Texte + trois questions, 3 heures.', 'Idées, explication, discussion.', 'Exemples concrets de la classe.']),
    ]),
  ],
  exercices: [
    ordre({ ...spec('PP-DEV'), code: 'CAFOP-PROF-PSYCHO-E01', niveau: 1, consigne: 'Range les stades de Piaget dans l’ordre.', elements: ['Sensori-moteur', 'Préopératoire', 'Opérations concrètes', 'Opérations formelles'],
      explication: 'Piaget décrit une succession constante : sensori-moteur (0-2 ans), préopératoire (2-7 ans), opérations concrètes (7-11/12 ans), opérations formelles (à partir de 11/12 ans).' }),
    relier({ ...spec('PP-THEORIES'), code: 'CAFOP-PROF-PSYCHO-E02', niveau: 1, consigne: 'Relie chaque auteur à la notion qui lui est associée.', paires: [['Piaget', 'Stades du développement'], ['Vygotski', 'Zone proximale de développement'], ['Bruner', 'Étayage'], ['Skinner', 'Renforcement']],
      explication: 'Piaget a décrit les stades ; Vygotski, la zone proximale de développement ; Bruner, l’étayage ; Skinner, le renforcement dans le béhaviorisme.' }),
    classer({ ...spec('PP-EVAL'), code: 'CAFOP-PROF-PSYCHO-E03', niveau: 1, consigne: 'Classe chaque situation selon la fonction de l’évaluation.', categories: ['Diagnostique', 'Formative', 'Sommative'],
      cartes: [['Test en début d’année pour connaître le niveau en lecture', 0], ['Questions sur l’ardoise en cours de séance', 1], ['Composition de fin de trimestre notée', 2], ['Examen du CEPE', 2]],
      explication: 'Le test de début d’année est diagnostique. Les questions sur l’ardoise informent pendant l’apprentissage : formative. La composition notée et le CEPE font un bilan : sommative.' }),
    qcm({ ...spec('PP-METHODES', { source: annale('psy2004', 'Professeur de CAFOP, psychopédagogie générale, texte support (adaptation)') }), code: 'CAFOP-PROF-PSYCHO-E04', niveau: 1, consigne: 'Que signifie la formule de Montaigne « une tête bien faite plutôt que bien pleine » ?', options: ['Former le jugement compte plus qu’accumuler des connaissances.', 'Il faut apprendre le plus de choses possible.', 'Les élèves doivent apprendre par cœur.', 'L’école doit surtout soigner la santé des élèves.'], bonne: 0,
      explication: '(CAFOP professeur 2004, psychopédagogie, texte support) Le texte reprend Montaigne pour critiquer l’accumulation de connaissances inutiles : il vaut mieux développer le jugement et l’autonomie que remplir la mémoire.' }),
    vf({ ...spec('PP-DEV'), code: 'CAFOP-PROF-PSYCHO-E05', niveau: 1, consigne: 'Indique si chaque affirmation est vraie ou fausse.', affirmations: [['L’ordre des stades de Piaget est le même pour tous les enfants.', true], ['Tous les enfants changent de stade exactement au même âge.', false], ['À l’école primaire, la manipulation aide l’élève à comprendre.', true]],
      explication: 'L’ordre des stades est constant, mais les âges sont indicatifs. Au stade des opérations concrètes, la manipulation et l’observation soutiennent le raisonnement.' }),
    qcm({ ...spec('PP-THEORIES'), code: 'CAFOP-PROF-PSYCHO-E06', niveau: 1, consigne: 'Le maître pose deux questions qui guident un élève bloqué, puis le laisse finir seul. Comment appelle-t-on cette aide ?', options: ['L’étayage', 'Le renforcement négatif', 'L’évaluation sommative', 'La conservation'], bonne: 0,
      explication: 'Guider sans faire à la place, puis retirer l’aide, c’est l’étayage décrit par Bruner. Les autres notions ne désignent pas une aide temporaire.' }),
    classer({ ...spec('PP-THEORIES'), code: 'CAFOP-PROF-PSYCHO-E07', niveau: 2, consigne: 'Classe chaque pratique selon la théorie qu’elle illustre le mieux.', categories: ['Béhaviorisme', 'Constructivisme', 'Socioconstructivisme'],
      cartes: [['Exercices répétés avec bon point immédiat', 0], ['Élèves qui cherchent seuls une situation-problème', 1], ['Débat en groupe pour comparer deux procédures', 2], ['Tâche découpée en petites étapes renforcées', 0], ['Manipulation de bouchons pour découvrir la soustraction', 1], ['Tutorat entre un élève avancé et un camarade', 2]],
      explication: 'Répétition, petites étapes et récompense relèvent du béhaviorisme. La recherche et la manipulation individuelles illustrent le constructivisme. Le débat et le tutorat entre pairs illustrent le socioconstructivisme.' }),
    qcm({ ...spec('PP-METHODES', { source: annale('psy2004', 'Professeur de CAFOP, psychopédagogie générale, question 3 (adaptation)') }), code: 'CAFOP-PROF-PSYCHO-E08', niveau: 2, consigne: 'Un stagiaire fait apprendre la règle de l’aire du rectangle puis donne dix exercices identiques à l’exemple. Pourquoi son enseignement favorise-t-il peu le transfert ?', options: ['Les élèves ne rencontrent aucune situation nouvelle où mobiliser la règle.', 'Il y a trop peu d’exercices.', 'La règle de l’aire est trop difficile pour le primaire.', 'Les élèves ont manipulé du matériel.'], bonne: 0,
      explication: '(CAFOP professeur 2004, psychopédagogie, question 3) Le transfert se prépare en variant les situations : carreler une cour, comparer deux champs, choisir la formule utile. Dix exercices identiques entraînent la répétition, pas l’adaptation.' }),
    qcm({ ...spec('PP-EVAL'), code: 'CAFOP-PROF-PSYCHO-E09', niveau: 2, consigne: 'Un élève écrit 0,4 + 0,35 = 0,39. Quelle remédiation est la plus adaptée ?', options: ['Retravailler la valeur des chiffres après la virgule (dixièmes, centièmes).', 'Lui faire recopier dix fois la bonne réponse.', 'Lui donner une punition pour inattention.', 'Passer à la leçon suivante.'], bonne: 0,
      explication: 'L’élève additionne 4 et 35 comme des entiers : il ne distingue pas dixièmes et centièmes (0,4 = 0,40). La remédiation porte sur cette cause. Recopier ou punir ne corrige pas le raisonnement.' }),
    qcm({ ...spec('PP-ECOLE', { source: annale('psy2005a', 'Professeur de CAFOP, psychopédagogie générale, questions 1 et 2 (adaptation)') }), code: 'CAFOP-PROF-PSYCHO-E10', niveau: 2, consigne: 'Selon le texte de Lê Thành Khôi étudié en 2005, quel problème pédagogique posent les communications de masse ?', options: ['L’enfant reçoit hors de l’école des informations nombreuses, parfois inadaptées à son âge, que l’école doit aider à organiser.', 'Les médias rendent l’école inutile.', 'L’enfant ne s’intéresse plus du tout aux images.', 'La télévision remplace l’apprentissage de la lecture.'], bonne: 0,
      explication: '(CAFOP professeur 2005, psychopédagogie, questions 1 et 2) Le texte décrit une « école parallèle » qui stimule l’attention et l’imagination mais peut provoquer une maturation désordonnée. L’école ne disparaît pas : elle doit aider à trier, comprendre et critiquer.' }),
    entourer({ ...spec('PP-ECOLE', { source: annale('psy2005b', 'Professeur de CAFOP, psychopédagogie, question 3 (adaptation)') }), code: 'CAFOP-PROF-PSYCHO-E11', niveau: 2, consigne: 'Sélectionne les pratiques qui aident les élèves à « apprendre à apprendre ».', elements: [['Faire chercher les mots clés d’un texte avant de le résumer', true], ['Apprendre à utiliser le dictionnaire', true], ['Faire expliquer à l’élève comment il a trouvé sa réponse', true], ['Dicter tous les résumés à recopier', false], ['Interdire les questions pendant la leçon', false]],
      explication: '(CAFOP professeur 2005, psychopédagogie, question 3) Chercher les mots clés, utiliser le dictionnaire et expliciter sa démarche donnent des méthodes réutilisables. Dicter tous les résumés ou interdire les questions rend l’élève dépendant.' }),
    ordre({ ...spec('PP-ECOLE'), code: 'CAFOP-PROF-PSYCHO-E12', niveau: 3, consigne: 'Remets dans l’ordre les étapes de l’analyse d’une prestation d’élève-maître.', elements: ['Décrire les faits observés pendant la séance', 'Interpréter ces faits avec des notions de psychopédagogie', 'Identifier une priorité d’amélioration', 'Proposer une action précise pour la prochaine séance'],
      explication: 'Une analyse rigoureuse part des faits, les interprète, choisit une priorité pour ne pas submerger le stagiaire, puis propose une action concrète et réalisable.' }),
    qcm({ ...spec('PP-DEV'), code: 'CAFOP-PROF-PSYCHO-E13', niveau: 3, consigne: 'Au CE2, des élèves échouent à résoudre « 3/4 de 24 ». Quelle démarche respecte le mieux leur stade de développement ?', options: ['Partager réellement 24 objets en 4 groupes, en prendre 3, puis écrire le calcul.', 'Donner la formule (24 ÷ 4) × 3 et faire 20 exercices.', 'Expliquer la notion abstraite de nombre rationnel.', 'Passer directement à 5/8 de 40 pour varier.'], bonne: 0,
      explication: 'À 8-9 ans, l’élève est au stade des opérations concrètes : la manipulation donne du sens au calcul avant sa formalisation. La formule seule ou l’abstraction risquent de produire une application mécanique.' }),
    qcm({ ...spec('PP-METHODES', { source: annale('psy2004', 'Professeur de CAFOP, psychopédagogie générale, questions 1 et 2 (adaptation)') }), code: 'CAFOP-PROF-PSYCHO-E14', niveau: 3, consigne: 'Pour la question « Expliquez la première phrase du texte en vous appuyant sur des exemples tirés de votre pratique », quelle réponse est la mieux construite ?', options: ['Définir les mots clés, expliquer le sens de la phrase, puis donner deux exemples précis de classe reliés à cette idée.', 'Recopier la phrase puis dire qu’on est d’accord.', 'Résumer tout le texte sans revenir à la phrase.', 'Donner son opinion sur l’auteur sans exemple.'], bonne: 0,
      explication: '(CAFOP professeur 2004, psychopédagogie, questions 1 et 2) La consigne demande d’expliquer et d’illustrer. Une bonne réponse définit, explique, puis relie des exemples concrets à l’idée. Recopier, résumer ou donner un avis sans exemple ne répond pas à la question.' }),
  ],
};

module.exports = [psycho];
