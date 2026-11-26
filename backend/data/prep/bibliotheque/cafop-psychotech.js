const { mc, qcm, vf, glisser, ordre, relier, classer, entourer, numerique, b, lecon } = require('../dsl');

// Test psychotechnique du 2ᵉ tour du CAFOP-IA. Les cahiers DECO des sessions 2022 et 2025
// (documents 6adf4d3cecb585bf0e4f428f et 6adf4d9decb585bf0e4f434b, lus le 22/11/2026) contiennent un
// questionnaire de personnalité d'environ 180 affirmations, à noter de A « ne me caractérise pas du tout »
// à E « me caractérise tout à fait », sur une feuille de réponses à noircir.
// Le cahier interdit toute reproduction : AUCUNE affirmation n'est recopiée ici ; tous les exemples
// d'affirmations sont originaux. Le barème et les profils attendus ne sont pas publiés : le module
// explique le format et l'attitude à adopter, sans prétendre connaître la grille de lecture.

const doc = (annee) => ({ type: 'annale', organisme: 'CAFOP', annee, epreuve: 'IA, tests psychotechniques, format du cahier (exemples originaux)', documentId: annee === 2022 ? '6adf4d3cecb585bf0e4f428f' : '6adf4d9decb585bf0e4f434b' });
const original = { type: 'original', inspireDe: 'Format du questionnaire de personnalité du CAFOP-IA (cahiers 2022 et 2025)' };

const rappels = {
  'PSY-FORMAT': mc('Un questionnaire, pas un examen', 'Au 2ᵉ tour, le candidat lit une longue série d’affirmations sur sa façon d’agir, de travailler et de réagir. Pour chacune, il indique à quel point elle lui ressemble. Il n’y a ni calcul ni bonne réponse universelle : le questionnaire décrit un profil. Le barème et les profils recherchés ne sont pas publiés.', 'Décrire comment tu es, pas deviner une réponse.'),
  'PSY-ECHELLE': mc('L’échelle de A à E', 'A : ne me caractérise pas du tout. B : ne me caractérise pas. C : me caractérise plus ou moins. D : me caractérise. E : me caractérise tout à fait. On lit l’affirmation, on pense à des situations réelles, puis on choisit le degré. C sert quand la conduite dépend vraiment des situations, pas pour éviter de choisir.', 'A et B : non ; C : parfois ; D et E : oui.'),
  'PSY-FEUILLE': mc('La feuille de réponses', 'La feuille se remplit au crayon à papier, en noircissant une seule case par ligne. On y code aussi son nom et son prénom (une lettre par colonne), sa date de naissance, son sexe, son numéro de candidat et son niveau scolaire. Le cahier demande de vérifier qu’on a répondu à toutes les questions avant de passer à la colonne suivante.', 'Une case par ligne ; vérifier avant de changer de colonne.'),
  'PSY-COHERENCE': mc('Sincérité et cohérence', 'Un même trait est souvent évalué par plusieurs affirmations, dont certaines sont formulées en sens inverse. Qui répond pour « faire bonne impression » se contredit facilement. Répondre sincèrement donne des réponses cohérentes : si tu te dis très organisé, tu ne dois pas aussi te reconnaître dans « je remets souvent les choses à plus tard ».', 'Deux affirmations opposées ne peuvent pas recevoir toutes deux E.'),
  'PSY-TEMPS': mc('Rythme et concentration', 'Le questionnaire est long. On répond à la première impression réfléchie, sans relire dix fois une phrase. On garde un rythme régulier, on surveille la correspondance entre le numéro de l’affirmation et la ligne de la feuille, et on ne laisse aucune ligne vide. Une erreur de décalage peut fausser toutes les réponses suivantes.', 'Premier avis réfléchi, rythme régulier, numéros vérifiés.'),
};
const spec = (notion, extra = {}) => ({ notions: [notion], miniCours: rappels[notion], source: original, ...extra });
const question = (i, notion, consigne, options, explication) => b.question(qcm({ ...spec(notion), code: `CAFOP-PSYCHOTECH-L${i}-Q1`, niveau: 1, consigne, options, bonne: 0, explication }));

const psychotech = {
  code: 'CAFOP-PSYCHOTECH',
  matiere: 'Test psychotechnique',
  titre: 'Réussir le test psychotechnique',
  resume: 'Le questionnaire de personnalité du 2ᵉ tour : son format, l’échelle de A à E, la feuille de réponses, la cohérence des réponses et la gestion du temps.',
  notions: [
    { code: 'PSY-FORMAT', libelle: 'Nature du questionnaire' },
    { code: 'PSY-ECHELLE', libelle: 'L’échelle de réponse' },
    { code: 'PSY-FEUILLE', libelle: 'La feuille de réponses' },
    { code: 'PSY-COHERENCE', libelle: 'Sincérité et cohérence' },
    { code: 'PSY-TEMPS', libelle: 'Rythme et concentration' },
  ],
  lecons: [
    lecon('CAFOP-PSYCHOTECH-L1', 'Ce qu’est le test du 2ᵉ tour', 4, [
      b.texte('À la fin de cette leçon, tu sauras décrire le test psychotechnique du CAFOP-IA et ce qui le distingue d’une épreuve écrite. Aucun prérequis.'),
      b.texte('Les candidats admis au 1ᵉʳ tour passent un **test psychotechnique**. Dans les cahiers officiels des sessions **2022 et 2025**, il s’agit d’un **questionnaire de personnalité** : environ 180 affirmations sur la manière de travailler, de s’organiser, de vivre avec les autres et de réagir aux difficultés.'),
      b.texte('Pour chaque affirmation, le candidat indique **à quel point elle le décrit**. Il n’y a ni calcul, ni texte à analyser, ni réponse juste à trouver dans un corrigé. Le questionnaire dresse un **profil** ; la grille de lecture utilisée par le jury n’est pas publiée.'),
      b.exemple('Une affirmation du même genre (exemple original)', '« Je prépare mes affaires de la journée dès la veille. » Le candidat se demande s’il le fait vraiment, puis choisit une lettre de A à E.'),
      b.exemple('Ce que ce n’est pas', 'Ce n’est pas une épreuve de suites de nombres ni de logique. Les cahiers 2022 et 2025 ne contiennent que le questionnaire et la feuille de réponses.'),
      b.retenir('Le format peut évoluer : lis toujours les consignes du cahier le jour du test.'),
      b.piege('Croire qu’il existe une « bonne » réponse à apprendre par cœur. Le questionnaire est fait pour décrire, pas pour noter des connaissances.'),
      question(1, 'PSY-FORMAT', 'Que contient le test psychotechnique des sessions 2022 et 2025 ?', ['Un questionnaire de personnalité', 'Un QCM de mathématiques', 'Une dictée'], 'Les cahiers 2022 et 2025 contiennent un questionnaire de personnalité d’environ 180 affirmations, à noter de A à E.'),
      b.recap(['2ᵉ tour : questionnaire de personnalité.', 'Environ 180 affirmations.', 'Pas de bonne réponse universelle.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L2', 'L’échelle de réponse de A à E', 4, [
      b.texte('À la fin de cette leçon, tu sauras choisir le degré qui correspond à ta conduite réelle. Prérequis : la nature du test.'),
      b.tableau(['Lettre', 'Signification', 'Quand la choisir'], [['A', 'Ne me caractérise pas du tout', 'Tu ne fais presque jamais cela'], ['B', 'Ne me caractérise pas', 'Cela t’arrive rarement'], ['C', 'Me caractérise plus ou moins', 'Cela dépend vraiment des situations'], ['D', 'Me caractérise', 'C’est ta façon habituelle de faire'], ['E', 'Me caractérise tout à fait', 'C’est un trait très net, presque toujours vrai']]),
      b.exemple('Choisir avec des faits', '« Je prends facilement la parole devant un groupe » (exemple original). Awa pense aux exposés en classe et aux réunions de son association : elle parle souvent, mais avec un peu de trac. Elle choisit D.'),
      b.exemple('Ne pas abuser du milieu', 'Répondre C à presque tout donne un profil flou. C convient quand ta conduite change réellement selon les situations.'),
      b.retenir('Pense à des situations concrètes de ta vie avant de choisir la lettre.'),
      b.piege('Choisir E partout où l’affirmation semble « positive » : c’est souvent incohérent et peu crédible.'),
      question(2, 'PSY-ECHELLE', 'Que signifie la lettre E ?', ['Me caractérise tout à fait', 'Ne me caractérise pas du tout', 'Me caractérise plus ou moins'], 'E est le degré le plus fort : l’affirmation te décrit tout à fait. A est l’opposé, C le degré intermédiaire.'),
      b.recap(['A, B : non.', 'C : selon les situations.', 'D, E : oui, de plus en plus nettement.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L3', 'Remplir la feuille de réponses', 5, [
      b.texte('À la fin de cette leçon, tu sauras remplir sans erreur la feuille de réponses à lecture optique. Aucun prérequis.'),
      b.liste(['Utiliser un crayon à papier', 'Écrire son nom et son prénom en capitales, une lettre par colonne (15 premières lettres au plus), puis noircir la lettre correspondante dans chaque colonne', 'Coder la date de naissance (jour, mois, année), le sexe, le numéro de candidat et le niveau scolaire', 'Pour chaque affirmation, noircir une seule case entre A et E', 'Vérifier qu’aucune ligne n’est vide avant de passer à la colonne suivante'], true),
      b.exemple('Marquer correctement', 'On noircit entièrement la case, sans la cocher d’une croix ni l’entourer : la feuille est lue par une machine.'),
      b.exemple('Éviter le décalage', 'Tous les dix numéros, Koffi vérifie que le numéro de l’affirmation lue correspond bien à la ligne qu’il noircit.'),
      b.retenir('Un décalage d’une ligne fausse toutes les réponses suivantes : contrôle régulièrement les numéros.'),
      b.piege('Noircir deux cases sur une même ligne rend la réponse illisible pour la machine.'),
      question(3, 'PSY-FEUILLE', 'Combien de cases peut-on noircir pour une même affirmation ?', ['Une seule', 'Deux au plus', 'Autant qu’on veut'], 'La consigne demande de noircir une seule case par ligne. Plusieurs cases rendent la réponse inexploitable.'),
      b.recap(['Crayon à papier, case entièrement noircie.', 'Une case par affirmation.', 'Vérifier les numéros et les lignes vides.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L4', 'Ce qu’explorent les affirmations', 5, [
      b.texte('À la fin de cette leçon, tu sauras reconnaître les grands thèmes abordés par un questionnaire de personnalité. Aucun prérequis.'),
      b.texte('Les affirmations du cahier portent sur la vie au travail. On peut les regrouper en grands thèmes, comme dans la plupart des questionnaires de ce type. Ce regroupement aide à comprendre le test ; ce n’est pas la grille officielle du jury.'),
      b.tableau(['Thème', 'Exemple original d’affirmation'], [['Organisation et rigueur', '« Je note mes tâches dans un carnet pour ne rien oublier. »'], ['Relations et coopération', '« J’aime travailler en équipe sur un projet commun. »'], ['Gestion du stress', '« Je reste calme quand un imprévu bouscule ma journée. »'], ['Énergie et motivation', '« Je termine ce que je commence, même quand c’est difficile. »'], ['Ouverture et curiosité', '« J’aime essayer une nouvelle façon de faire. »'], ['Influence', '« Dans un groupe, je propose souvent l’organisation du travail. »']]),
      b.exemple('Un thème, plusieurs affirmations', 'L’organisation peut être abordée par la préparation, la ponctualité, le respect d’un planning ou le rangement.'),
      b.exemple('Le lien avec le métier', 'Un instituteur prépare ses leçons, travaille avec ses collègues et les parents, et garde son calme face à une classe nombreuse : ces thèmes ont du sens pour le métier.'),
      b.retenir('Connaître les thèmes aide à réfléchir sur soi, pas à fabriquer un faux profil.'),
      b.piege('Penser qu’un seul trait compte : le profil se lit sur l’ensemble des réponses.'),
      question(4, 'PSY-FORMAT', 'L’affirmation « Je reste calme quand un imprévu bouscule ma journée » concerne surtout…', ['la gestion du stress', 'la curiosité', 'l’orthographe'], 'Elle décrit la réaction face aux imprévus, donc la gestion du stress et des émotions.'),
      b.recap(['Organisation, relations, stress.', 'Énergie, ouverture, influence.', 'Le profil se lit sur l’ensemble.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L5', 'Répondre sincèrement et rester cohérent', 5, [
      b.texte('À la fin de cette leçon, tu sauras pourquoi la sincérité protège ta cohérence et reconnaître deux affirmations de sens opposé. Prérequis : les thèmes du questionnaire.'),
      b.texte('Un même trait revient sous plusieurs formes. Certaines affirmations vont **dans le même sens**, d’autres **en sens inverse**. Si tu te décris très ponctuel, tu ne peux pas aussi te reconnaître pleinement dans une affirmation qui dit que tu arrives souvent en retard.'),
      b.tableau(['Affirmation 1 (exemple original)', 'Affirmation 2 (exemple original)', 'Relation'], [['Je prépare mes leçons à l’avance.', 'J’improvise souvent au dernier moment.', 'Sens opposé'], ['J’aime aider un camarade en difficulté.', 'Je prends le temps d’expliquer à ceux qui n’ont pas compris.', 'Même sens'], ['Je me décourage vite face à un échec.', 'Je persévère jusqu’à réussir.', 'Sens opposé']]),
      b.exemple('Une incohérence', 'Yao répond E à « Je prépare mes leçons à l’avance » et E à « J’improvise souvent au dernier moment ». Ces deux réponses se contredisent.'),
      b.exemple('Une réponse cohérente', 'S’il prépare souvent à l’avance, il répond D à la première et B à la seconde.'),
      b.retenir('Répondre pour plaire conduit à des contradictions ; répondre sincèrement donne un profil cohérent.'),
      b.piege('Vouloir paraître parfait : personne n’a la note maximale dans tous les domaines, et un profil « trop beau » paraît peu crédible.'),
      question(5, 'PSY-COHERENCE', '« Je respecte toujours les délais » et « Je rends souvent mon travail en retard » sont…', ['de sens opposé', 'de même sens', 'sans rapport'], 'Les deux affirmations portent sur le respect des délais, mais en sens contraire. Elles ne peuvent pas recevoir toutes les deux E.'),
      b.recap(['Plusieurs affirmations par trait.', 'Certaines sont en sens inverse.', 'Sincérité = cohérence.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L6', 'Mieux se connaître avant le test', 4, [
      b.texte('À la fin de cette leçon, tu sauras préparer le test en observant tes propres conduites. Aucun prérequis.'),
      b.texte('On ne « révise » pas un questionnaire de personnalité, mais on peut s’y préparer en **réfléchissant à sa façon d’agir** : à l’école, en famille, dans une association, au travail.'),
      b.liste(['Comment je m’organise pour une tâche importante', 'Comment je réagis à une critique ou à un échec', 'Ce que je fais dans un groupe : proposer, écouter, suivre', 'Ce qui me motive ou me décourage', 'Ce qui me stresse et comment je me calme'], false),
      b.exemple('Un carnet d’observation', 'Pendant une semaine, Mariam note chaque soir une situation où elle s’est bien organisée et une où elle s’est laissé déborder. Elle se connaît mieux et répondra plus vite et plus justement.'),
      b.exemple('Lien avec le métier visé', 'Réfléchir à ses points forts (patience, sens de l’organisation) et à ses points de progrès est aussi utile pour la formation au CAFOP.'),
      b.retenir('Se connaître permet de répondre vite et de manière cohérente.'),
      b.piege('Apprendre par cœur des « réponses idéales » trouvées en ligne : elles ne correspondent pas à ta vraie conduite et rendent tes réponses incohérentes.'),
      question(6, 'PSY-FORMAT', 'Quelle préparation est la plus utile pour un questionnaire de personnalité ?', ['Observer ses propres conduites dans des situations réelles', 'Apprendre des réponses idéales par cœur', 'Réviser les formules de mathématiques'], 'Le questionnaire décrit tes conduites : les observer t’aide à répondre sincèrement et rapidement.'),
      b.recap(['Pas de révision par cœur.', 'Observer ses conduites.', 'Connaître ses points forts et ses progrès.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L7', 'Gérer le temps et la concentration', 4, [
      b.texte('À la fin de cette leçon, tu sauras garder un rythme régulier sur un questionnaire long. Prérequis : la feuille de réponses.'),
      b.texte('Avec environ 180 affirmations, la régularité compte. La durée exacte du test n’est pas publiée : écoute l’annonce le jour même et calcule ton rythme.'),
      b.formule('Temps par affirmation = durée totale ÷ nombre d’affirmations', 'Exemple : 30 minutes = 1 800 secondes ; 1 800 ÷ 180 = 10 secondes.'),
      b.exemple('Répondre à la première impression réfléchie', 'On lit l’affirmation une fois, on pense à une situation réelle, on choisit. Relire cinq fois une phrase fait perdre du temps sans améliorer la réponse.'),
      b.exemple('Faire des points de contrôle', 'Toutes les vingt affirmations, vérifier le numéro de la ligne et l’heure : on sait où l’on en est.'),
      b.retenir('Ne laisse aucune ligne vide : vérifie avant de changer de colonne, comme le demande le cahier.'),
      b.piege('Ralentir sur les premières affirmations puis bâcler les dernières : la fatigue augmente les erreurs de décalage.'),
      question(7, 'PSY-TEMPS', 'Pour 180 affirmations en 30 minutes, combien de secondes en moyenne par affirmation ?', ['10 secondes', '30 secondes', '6 secondes'], '30 minutes font 1 800 secondes ; 1 800 ÷ 180 = 10 secondes par affirmation.'),
      b.recap(['Rythme régulier.', 'Points de contrôle.', 'Aucune ligne vide.']),
    ]),
    lecon('CAFOP-PSYCHOTECH-L8', 'Le jour du test : la méthode complète', 4, [
      b.texte('À la fin de cette leçon, tu sauras te présenter au test et le passer dans de bonnes conditions. Prérequis : les leçons précédentes.'),
      b.liste(['La veille : dormir suffisamment, préparer la convocation, la pièce d’identité, deux crayons à papier, une gomme, un taille-crayon', 'Avant de commencer : lire toutes les consignes et l’exemple de marquage', 'Remplir l’identité sur la feuille avec soin', 'Répondre à chaque affirmation avec sincérité, au rythme prévu', 'Contrôler les numéros et les lignes vides à chaque changement de colonne', 'Rendre la feuille sans pli ni rature'], true),
      b.exemple('Une hésitation', 'Si deux lettres te semblent possibles, pense à ta conduite la plus fréquente, pas à la plus flatteuse, et choisis.'),
      b.exemple('Une erreur de marquage', 'Si tu t’es trompé, gomme proprement la case avant d’en noircir une autre : deux cases noircies seraient illisibles.'),
      b.retenir('Calme, sincérité, régularité et vérification : ce sont les quatre clés.'),
      b.piege('Arriver sans crayon à papier : un stylo ne permet pas de corriger proprement une case.'),
      question(8, 'PSY-FEUILLE', 'Avec quoi remplit-on la feuille de réponses ?', ['Un crayon à papier', 'Un stylo rouge', 'Un surligneur'], 'La consigne demande de noircir au crayon à papier, ce qui permet de gommer une erreur.'),
      b.recap(['Matériel prêt la veille.', 'Consignes lues en entier.', 'Sincérité et vérification.']),
    ]),
  ],
  exercices: [
    relier({ ...spec('PSY-ECHELLE', { source: doc(2025) }), code: 'CAFOP-PSYCHOTECH-E01', niveau: 1, consigne: 'Relie chaque lettre de l’échelle à sa signification.', paires: [['A', 'Ne me caractérise pas du tout'], ['B', 'Ne me caractérise pas'], ['C', 'Me caractérise plus ou moins'], ['D', 'Me caractérise'], ['E', 'Me caractérise tout à fait']],
      explication: '(CAFOP IA 2025, tests psychotechniques, en-tête du cahier) L’échelle va du désaccord total (A) à l’accord total (E), avec un degré intermédiaire (C).' }),
    vf({ ...spec('PSY-FORMAT', { source: doc(2022) }), code: 'CAFOP-PSYCHOTECH-E02', niveau: 1, consigne: 'Indique si chaque affirmation sur le test du 2ᵉ tour est vraie ou fausse.', affirmations: [['Il s’agit d’un questionnaire de personnalité.', true], ['Chaque affirmation a une seule bonne réponse donnée dans un corrigé.', false], ['Le cahier compte environ 180 affirmations.', true]],
      explication: '(CAFOP IA 2022, tests psychotechniques) Le cahier présente environ 180 affirmations à noter de A à E. Il décrit un profil ; aucun corrigé ne donne une « bonne réponse » par affirmation.' }),
    qcm({ ...spec('PSY-FEUILLE', { source: doc(2022) }), code: 'CAFOP-PSYCHOTECH-E03', niveau: 1, consigne: 'Comment marque-t-on une réponse sur la feuille ?', options: ['On noircit entièrement une seule case au crayon à papier.', 'On entoure la lettre au stylo.', 'On coche deux cases pour nuancer.', 'On écrit la lettre dans la marge.'], bonne: 0,
      explication: '(CAFOP IA 2022, consignes de la feuille de réponses) La feuille est lue par une machine : une seule case, entièrement noircie, au crayon à papier.' }),
    classer({ ...spec('PSY-FORMAT'), code: 'CAFOP-PSYCHOTECH-E04', niveau: 1, consigne: 'Classe chaque affirmation (exemples originaux) selon le thème qu’elle explore.', categories: ['Organisation', 'Relations', 'Gestion du stress'],
      cartes: [['Je prépare mon emploi du temps chaque dimanche.', 0], ['Je range mes documents dans des chemises par matière.', 0], ['J’aime travailler en groupe.', 1], ['Je demande l’avis de mes collègues avant de décider.', 1], ['Je garde mon calme quand on me critique.', 2], ['Je dors mal la veille d’un événement important.', 2]],
      explication: 'Planifier et ranger relèvent de l’organisation. Travailler en groupe et consulter les autres relèvent des relations. Rester calme face à la critique ou mal dormir avant un événement concernent la gestion du stress.' }),
    ordre({ ...spec('PSY-FEUILLE'), code: 'CAFOP-PSYCHOTECH-E05', niveau: 1, consigne: 'Remets dans l’ordre les étapes du remplissage de la feuille.', elements: ['Lire les consignes et l’exemple de marquage', 'Coder son nom, son prénom et sa date de naissance', 'Noircir une case pour chaque affirmation', 'Vérifier qu’aucune ligne n’est vide avant de changer de colonne'],
      explication: 'On lit d’abord les consignes, on remplit l’identité, on répond affirmation par affirmation et on contrôle les lignes avant chaque nouvelle colonne, comme le demande le cahier.' }),
    numerique({ ...spec('PSY-TEMPS'), code: 'CAFOP-PSYCHOTECH-E06', niveau: 1, consigne: 'Si le test dure 30 minutes pour 180 affirmations, combien de secondes peux-tu consacrer en moyenne à chaque affirmation ?', valeur: 10, unite: 's', tolerance: { type: 'abs', valeur: 0 },
      calcul: ['30 min = 30 × 60 = 1 800 s', '1 800 ÷ 180 = 10 s'],
      explication: 'La durée de 30 minutes est une hypothèse d’entraînement : la durée réelle est annoncée le jour du test. 1 800 secondes divisées par 180 affirmations donnent 10 secondes par affirmation.' }),
    classer({ ...spec('PSY-COHERENCE'), code: 'CAFOP-PSYCHOTECH-E07', niveau: 2, consigne: 'Pour chaque paire d’affirmations (exemples originaux), indique si elles vont dans le même sens ou en sens opposé.', categories: ['Même sens', 'Sens opposé'],
      cartes: [['« J’arrive toujours à l’heure » / « Je suis ponctuel à mes rendez-vous »', 0], ['« J’aime la nouveauté » / « Je préfère toujours mes vieilles habitudes »', 1], ['« Je garde mon calme » / « Je m’énerve facilement »', 1], ['« J’aide volontiers les autres » / « Je partage mes notes avec mes camarades »', 0]],
      explication: 'Les paires sur la ponctualité et sur l’entraide décrivent le même trait dans le même sens. Les paires sur la nouveauté et sur le calme opposent deux conduites contraires : elles ne peuvent pas recevoir toutes deux E.' }),
    qcm({ ...spec('PSY-COHERENCE'), code: 'CAFOP-PSYCHOTECH-E08', niveau: 2, consigne: 'Ali a répondu E à « Je termine toujours mes tâches à temps ». Quelle réponse à « Je rends souvent mon travail en retard » serait cohérente ?', options: ['A ou B', 'D ou E', 'C obligatoirement', 'N’importe quelle lettre'], bonne: 0,
      explication: 'Les deux affirmations sont de sens opposé. Si la première le décrit tout à fait, la seconde ne le décrit pas : A ou B est cohérent. D ou E serait contradictoire.' }),
    vf({ ...spec('PSY-COHERENCE'), code: 'CAFOP-PSYCHOTECH-E09', niveau: 2, consigne: 'Juge ces conseils.', affirmations: [['Répondre E à toutes les affirmations positives donne un profil crédible.', false], ['Penser à des situations réelles aide à choisir la bonne lettre.', true], ['La lettre C convient quand la conduite dépend vraiment des situations.', true]],
      explication: 'Un profil « parfait » partout est peu crédible et souvent incohérent. Des situations concrètes aident à choisir. C est utile quand la conduite varie vraiment, pas pour éviter de répondre.' }),
    entourer({ ...spec('PSY-FEUILLE', { source: doc(2022) }), code: 'CAFOP-PSYCHOTECH-E10', niveau: 2, consigne: 'Sélectionne les informations que l’on code sur la feuille de réponses, d’après le modèle du cahier.', elements: [['Le nom et le prénom', true], ['La date de naissance', true], ['Le numéro de candidat', true], ['Le niveau scolaire', true], ['Le nom de l’établissement d’origine', false], ['La note obtenue au 1ᵉʳ tour', false]],
      explication: '(CAFOP IA 2022, modèle de feuille de réponses) Le modèle fait coder le nom et le prénom, la date de naissance, le sexe, le numéro de candidat et le niveau scolaire. Il ne demande ni l’établissement ni la note du 1ᵉʳ tour.' }),
    qcm({ ...spec('PSY-TEMPS'), code: 'CAFOP-PSYCHOTECH-E11', niveau: 2, consigne: 'En arrivant à l’affirmation 60, Fanta voit qu’elle a noirci la ligne 61. Que doit-elle faire ?', options: ['Retrouver où le décalage a commencé et corriger les lignes concernées à la gomme', 'Continuer sans rien changer', 'Recommencer une nouvelle feuille', 'Laisser la ligne 60 vide'], bonne: 0,
      explication: 'Un décalage fausse toutes les réponses suivantes. Il faut repérer où il a commencé, gommer proprement et remettre chaque réponse sur sa ligne. D’où l’intérêt de contrôler les numéros régulièrement.' }),
    qcm({ ...spec('PSY-ECHELLE'), code: 'CAFOP-PSYCHOTECH-E12', niveau: 3, consigne: 'Affirmation (exemple original) : « Je prends facilement la parole en public. » Seydou parle souvent en réunion d’association, mais reste très silencieux en classe. Quelle lettre décrit le mieux sa conduite ?', options: ['C : me caractérise plus ou moins', 'E : me caractérise tout à fait', 'A : ne me caractérise pas du tout', 'Aucune, il faut laisser la ligne vide'], bonne: 0,
      explication: 'Sa conduite dépend nettement de la situation : à l’aise en association, silencieux en classe. C, « plus ou moins », est le degré le plus juste. On ne laisse jamais une ligne vide.' }),
    classer({ ...spec('PSY-COHERENCE'), code: 'CAFOP-PSYCHOTECH-E13', niveau: 3, consigne: 'Voici les réponses de Brou à trois paires d’affirmations de sens opposé (exemples originaux). Classe chaque paire : cohérente ou contradictoire.', categories: ['Cohérente', 'Contradictoire'],
      cartes: [['« Je suis patient » : D ; « Je m’impatiente vite » : B', 0], ['« J’aime l’ordre » : E ; « Mon bureau est toujours en désordre » : E', 1], ['« Je persévère » : C ; « J’abandonne vite » : C', 0]],
      explication: 'Pour deux affirmations de sens opposé, une réponse forte d’un côté appelle une réponse faible de l’autre. D et B, ou C et C, restent cohérents. E aux deux affirmations sur l’ordre est contradictoire.' }),
    qcm({ ...spec('PSY-FORMAT', { source: doc(2025) }), code: 'CAFOP-PSYCHOTECH-E14', niveau: 3, consigne: 'Un camarade te propose une liste de « réponses idéales » au test, trouvée en ligne. Quelle attitude adopter ?', options: ['La refuser : répondre selon sa conduite réelle donne un profil cohérent et honnête.', 'L’apprendre par cœur pour gagner du temps.', 'La recopier sur la feuille le jour du test.', 'Répondre E partout pour être sûr de plaire.'], bonne: 0,
      explication: '(CAFOP IA 2025, tests psychotechniques) Le questionnaire décrit ta personnalité ; sa grille de lecture n’est pas publiée. Des réponses toutes faites produisent des contradictions et ne disent rien de toi. De plus, le cahier interdit toute reproduction en dehors du concours.' }),
  ],
};

module.exports = [psychotech];
