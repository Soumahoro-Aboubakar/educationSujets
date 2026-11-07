const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, surligner, b, lecon } = require('../dsl');

// ═════════════════════════════════════════════════════════════════════════
// Résumé et contraction de texte
// Épreuves : « Contraction de texte » (ISE cycle long / AS, CAPESA : résumé au nombre de mots fixé
// à 10 % près), « résumé ou commentaire de texte » (INFJ Greffes, arrêté du 1er mars 2017),
// « Résumé de texte » (ENS Éducateur, anciens sujets), Français (INPHB, ESATIC).
// ═════════════════════════════════════════════════════════════════════════
const resume = {
  code: 'FR-RESUME',
  matiere: 'Français',
  titre: 'Résumé et contraction de texte',
  resume: 'Dégager la thèse, maîtriser les connecteurs, reformuler et respecter le nombre de mots.',
  notions: [
    { code: 'THESE', libelle: 'Thème, thèse et idées essentielles' },
    { code: 'CONNECTEURS', libelle: 'Connecteurs logiques et rapports logiques' },
    { code: 'REGLES', libelle: 'Règles du résumé (énonciation, ordre, nombre de mots)' },
    { code: 'REFORMULER', libelle: 'Reformulation et condensation' },
  ],
  lecons: [
    lecon('FR-RESUME-L1', 'La méthode du résumé', 9, [
      b.texte('Résumer, c’est **réduire un texte** à une longueur imposée en conservant ses idées essentielles, leur **ordre** et leur **logique**, avec tes propres mots.'),
      b.titre('Les règles d’or'),
      b.liste([
        'Garder le **système d’énonciation** : si l’auteur dit « je », tu écris « je ».',
        'Respecter l’**ordre des idées** du texte.',
        'Ne **rien ajouter** : ni opinion, ni exemple personnel, ni commentaire.',
        'Ne pas écrire « l’auteur dit que… » ni « dans ce texte… ».',
        '**Reformuler** au lieu de recopier des phrases du texte.',
        'Respecter le **nombre de mots** demandé, avec la marge indiquée (souvent 10 % en plus ou en moins), et l’indiquer en fin de copie.',
      ], true),
      b.exemple('Calculer la marge', 'Consigne : 150 mots à 10 % près. 10 % de 150 = 15. Ton résumé doit compter entre 135 et 165 mots.'),
      b.piege('Les exemples et anecdotes illustrent une idée : on garde l’idée, on supprime l’exemple.'),
      b.question(vf({
        code: 'FR-RESUME-L1-Q1', niveau: 1,
        consigne: 'Vrai ou faux ?',
        affirmations: [['Dans un résumé, on peut commencer par « L’auteur affirme que ».', false, 'On parle à la place de l’auteur, sans le citer.']],
        explication: 'Le résumé conserve l’énonciation du texte : on ne parle pas de l’auteur.',
      })),
      b.retenir('Comptage des mots : vérifie la convention de l’épreuve. Généralement, chaque mot séparé par une espace ou une apostrophe compte pour un (« l’école » = 2 mots) et un nombre écrit en chiffres compte pour un mot.'),
      b.recap(['Énonciation et ordre du texte conservés.', 'Aucun ajout, aucune citation de l’auteur.', 'Reformuler, condenser, compter.']),
    ]),
    lecon('FR-RESUME-L2', 'Les connecteurs logiques', 7, [
      b.texte('Les connecteurs révèlent la **structure du raisonnement**. Les repérer permet de distinguer la thèse, les arguments et les concessions.'),
      b.tableau(['Rapport logique', 'Connecteurs'], [
        ['Addition', 'de plus, en outre, par ailleurs, d’abord… ensuite'],
        ['Cause', 'car, parce que, en effet, puisque, étant donné que'],
        ['Conséquence', 'donc, ainsi, c’est pourquoi, par conséquent, si bien que'],
        ['Opposition', 'mais, cependant, pourtant, en revanche, toutefois'],
        ['Concession', 'certes… mais, bien que, même si, quoique'],
        ['Illustration', 'par exemple, ainsi, notamment'],
      ]),
      b.piege('« Ainsi » peut annoncer une **conséquence** ou un **exemple** : c’est le contexte qui décide.'),
      b.question(qcm({
        code: 'FR-RESUME-L2-Q1', niveau: 1,
        consigne: '« Il pleuvait ; **pourtant**, il est sorti. » Quel rapport exprime « pourtant » ?',
        options: ['Opposition', 'Cause', 'Conséquence'], bonne: 0,
        explication: '« Pourtant » oppose deux faits : on s’attendait à ce qu’il reste.',
      })),
      b.retenir('Dans un résumé, un connecteur bien choisi permet de **remplacer une phrase entière** : c’est un gain de mots et de clarté.'),
      b.recap(['Repérer les connecteurs = voir le plan du texte.', 'Concession : l’auteur reconnaît un point puis s’y oppose.', 'Les connecteurs font gagner des mots.']),
    ]),
  ],
  exercices: [
    classer({
      code: 'FR-RESUME-E01', niveau: 1, notions: ['CONNECTEURS'],
      consigne: 'Classe chaque connecteur selon le rapport logique qu’il exprime.',
      categories: ['Cause', 'Conséquence', 'Opposition'],
      cartes: [['car', 0], ['donc', 1], ['cependant', 2], ['en effet', 0], ['c’est pourquoi', 1], ['pourtant', 2]],
      explication: 'Car / en effet : cause. Donc / c’est pourquoi : conséquence. Cependant / pourtant : opposition.',
      miniCours: mc('Cause ou conséquence ?', 'La cause explique pourquoi un fait se produit (il est absent car il est malade). La conséquence annonce ce qui en résulte (il est malade, donc il est absent). L’opposition met en tension deux idées.', 'Cause = pourquoi ; conséquence = résultat.'),
    }),
    vf({
      code: 'FR-RESUME-E02', niveau: 1, notions: ['REGLES'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Le résumé conserve le système d’énonciation du texte.', true],
        ['On peut ajouter son opinion pour enrichir le résumé.', false, 'Le résumé est fidèle : aucun ajout personnel.'],
        ['On respecte l’ordre des idées du texte.', true],
        ['On peut recopier les phrases clés du texte telles quelles.', false, 'Il faut reformuler avec ses propres mots.'],
      ],
      explication: 'Fidélité, ordre, énonciation conservée, reformulation : ce sont les quatre exigences.',
      miniCours: mc('Être fidèle', 'Le résumé est une réduction fidèle : même point de vue, même ordre, mêmes idées, mais en moins de mots et avec tes propres formulations. Il ne contient ni jugement ni idée nouvelle.', 'Fidèle, plus court, reformulé.'),
    }),
    qcm({
      code: 'FR-RESUME-E03', niveau: 1, notions: ['REGLES'],
      consigne: 'Consigne : résumer un texte en 150 mots, à 10 % près. Combien de mots au maximum ?',
      options: ['165', '160', '150', '175'], bonne: 0,
      explication: '10 % de 150 = 15 ; la fourchette est 135 à 165 mots.',
      miniCours: mc('La marge de 10 %', 'Calcule 10 % du nombre de mots demandé (en divisant par 10), puis ajoute-le et retire-le : tu obtiens la fourchette autorisée. En dehors, la copie est pénalisée.', 'Fourchette = nombre ± 10 %.'),
    }),
    surligner({
      code: 'FR-RESUME-E04', niveau: 2, notions: ['THESE'],
      consigne: 'Surligne la phrase qui exprime l’idée principale du paragraphe.',
      segments: [
        ['Dans de nombreux lycées, les élèves arrivent en classe avec un téléphone. ', false],
        ['Certains l’utilisent pour chercher une définition, d’autres pour jouer pendant le cours. ', false],
        ['L’outil n’est donc ni bon ni mauvais en lui-même : tout dépend de l’usage qu’on en fait et de l’encadrement proposé par l’école. ', true],
        ['Ainsi, un enseignant qui fixe des règles claires peut en faire un allié.', false],
      ],
      explication: 'La troisième phrase, introduite par « donc », généralise les constats et formule la thèse ; la dernière l’illustre.',
      miniCours: mc('Trouver l’idée principale', 'L’idée principale est souvent la phrase la plus générale, celle que les autres préparent ou illustrent. Les connecteurs de conclusion (donc, ainsi, c’est pourquoi) la signalent fréquemment. Les exemples précis sont secondaires.', 'Général = principal ; précis = exemple.'),
    }),
    ordre({
      code: 'FR-RESUME-E05', niveau: 2, notions: ['REGLES', 'THESE'],
      consigne: 'Remets dans l’ordre les étapes de la méthode du résumé.',
      elements: [
        'Lire le texte en entier sans annoter',
        'Dégager le thème et la thèse',
        'Repérer la structure et les connecteurs',
        'Reformuler chaque idée essentielle au brouillon',
        'Rédiger en respectant le nombre de mots',
        'Relire et compter les mots',
      ],
      explication: 'On comprend d’abord le texte global, puis sa structure, avant de reformuler, rédiger et vérifier.',
      miniCours: mc('Du global au détail', 'Commence par une lecture complète pour saisir le propos d’ensemble. Ensuite seulement, découpe le texte en mouvements grâce aux connecteurs. La rédaction vient en dernier, suivie d’une relecture et du comptage.', 'Comprendre, structurer, reformuler, vérifier.'),
    }),
    glisser({
      code: 'FR-RESUME-E06', niveau: 2, notions: ['CONNECTEURS'],
      consigne: 'Complète le paragraphe avec les connecteurs qui conviennent.',
      texte: 'Le numérique ouvre de nouvelles possibilités d’apprentissage. {{Cependant}}, il exige une solide maîtrise de la lecture. {{En effet}}, un élève qui lit mal se perd vite dans la masse d’informations. {{C’est pourquoi}} l’école doit d’abord consolider les savoirs de base.',
      distracteurs: ['Par exemple', 'Bien que'],
      explication: 'Opposition (cependant), justification (en effet), conséquence (c’est pourquoi).',
      miniCours: mc('Choisir le bon connecteur', 'Lis la phrase précédente et la suivante, puis demande-toi quel lien les unit : contraste, explication ou résultat. « En effet » introduit une justification de ce qui précède.', 'En effet = justification.'),
    }),
    qcm({
      code: 'FR-RESUME-E07', niveau: 3, notions: ['REFORMULER'],
      consigne: 'Quelle est la meilleure contraction de : « Les jeunes, qui représentent une part très importante de la population ivoirienne, constituent une richesse considérable pour le pays, à condition qu’on leur offre une formation de qualité. » ?',
      options: [
        'Bien formée, la jeunesse, majoritaire, est un atout pour le pays.',
        'Les jeunes représentent une part très importante de la population.',
        'L’auteur pense que les jeunes sont une richesse pour la Côte d’Ivoire.',
        'La jeunesse est une richesse considérable pour le pays.',
      ], bonne: 0,
      explication: 'La première option garde les trois idées (poids démographique, richesse, condition de formation) en peu de mots. Les autres oublient une idée ou citent l’auteur.',
      miniCours: mc('Condenser sans trahir', 'Une bonne contraction conserve toutes les idées utiles, y compris les conditions et les nuances (« à condition que »). Elle supprime les répétitions et remplace les tournures longues par des mots plus denses.', 'Garder les nuances, couper le superflu.'),
      raisonnement: {
        reference: 'La phrase contient trois idées : les jeunes sont nombreux, ils sont une richesse, mais seulement s’ils sont bien formés. Seule la première proposition garde les trois ; la deuxième perd la richesse et la condition, la troisième cite l’auteur, la quatrième oublie la condition.',
        etapes: ['Repérer les idées de la phrase', 'Repérer la condition « à condition que »', 'Éliminer les options incomplètes ou qui citent l’auteur'],
      },
    }),
    entourer({
      code: 'FR-RESUME-E08', niveau: 3, notions: ['REGLES'],
      consigne: 'Entoure les formulations interdites dans un résumé.',
      elements: [['L’auteur pense que', true], ['Selon le texte', true], ['Dans ce passage, il est dit que', true], ['Pourtant', false], ['Il faut donc', false], ['Certes… mais', false]],
      explication: 'Les formules qui parlent du texte ou de l’auteur sont interdites ; les connecteurs logiques sont au contraire précieux.',
      miniCours: mc('Parler à la place de l’auteur', 'Dans un résumé, tu reprends le discours de l’auteur comme s’il s’agissait du tien, au même niveau d’énonciation. Toute formule qui prend du recul (« le texte dit », « l’auteur montre ») transforme le résumé en analyse : c’est hors consigne.', 'Pas de « l’auteur », pas de « le texte ».'),
    }),
    surligner({
      code: 'FR-RESUME-E09', niveau: 3, notions: ['THESE', 'REFORMULER'],
      consigne: 'Surligne les passages que l’on peut supprimer dans un résumé (exemples et détails).',
      segments: [
        ['La lecture régulière développe le vocabulaire et l’esprit critique. ', false],
        ['Mon voisin, par exemple, lit un roman par semaine depuis l’âge de dix ans. ', true],
        ['Elle aide aussi à mieux écrire, ', false],
        ['comme le montrent les meilleures copies du baccalauréat de l’an dernier, ', true],
        ['car le lecteur assimile peu à peu la structure des phrases.', false],
      ],
      explication: 'L’anecdote du voisin et la référence aux copies du baccalauréat illustrent les idées sans en ajouter de nouvelles.',
      miniCours: mc('Idées et illustrations', 'Distingue ce qui fait avancer le raisonnement (idées, arguments) de ce qui l’illustre (exemples, anecdotes, chiffres ponctuels). On garde les premiers, on supprime les seconds, sauf si l’exemple porte lui-même une idée.', 'Supprimer l’exemple, garder l’idée.'),
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Anglais — grammaire essentielle (INPHB, ESATIC ; ISE : QCM d’anglais depuis la session 2026)
//
// Cours de langue étrangère : DEUX VERSIONS (décision du 2026-11-07).
//  - Version par défaut : explications en français, chaque notion (base verbale, auxiliaire,
//    participe passé…) étant définie avant d’être utilisée ; les phrases étudiées restent en anglais.
//  - Version cible (versionCible, « en ») : le cours entièrement en anglais.
// Les exercices sont communs (mêmes codes, mêmes phrases, mêmes clés) : seules les consignes,
// explications et mini-cours changent de langue. Statut : brouillon à valider (§ 26).
// ═════════════════════════════════════════════════════════════════════════
const anglais = {
  code: 'ANG-GRAM',
  matiere: 'Anglais',
  langueCible: 'en',
  titre: 'Grammaire anglaise essentielle',
  resume: 'Les temps, le present perfect, les phrases avec « if », la voix passive et le discours indirect, expliqués en français.',
  notions: [
    { code: 'TENSES', libelle: 'Présent simple, présent en -ing et prétérit' },
    { code: 'PERFECT', libelle: 'Present perfect ; for, since et ago' },
    { code: 'CONDITIONALS', libelle: 'Les phrases avec « if » (conditionnels 0 à 3)' },
    { code: 'PASSIVE', libelle: 'Voix passive et discours indirect' },
  ],
  lecons: [
    lecon('ANG-GRAM-L1', 'Les temps : présent, prétérit et present perfect', 11, [
      b.texte('En anglais, le **temps** du verbe dit **quand** se passe l’action et **comment** on la voit : une habitude, une action en cours, une action terminée ou une action passée qui compte encore aujourd’hui. Avant de commencer, trois mots que la leçon utilise :'),
      b.liste([
        'La **base verbale** : le verbe sans « to », tel qu’on le trouve dans le dictionnaire (go, work, be).',
        'L’**auxiliaire** : un petit verbe qui aide à conjuguer (do, be, have). C’est lui qui porte la négation et qui passe devant le sujet dans une question.',
        'Le **participe passé** : la forme du verbe placée après « have » (worked, seen, gone). Verbe régulier : on ajoute -ed. Verbe irrégulier : on l’apprend (3ᵉ colonne de la liste des verbes irréguliers).',
      ]),
      b.titre('Les quatre temps essentiels'),
      b.tableau(['Temps', 'Quand l’utiliser', 'Exemple'], [
        ['Présent simple', 'Habitudes, vérités générales', 'She **goes** to school every day. (Elle va à l’école tous les jours.)'],
        ['Présent en -ing (be + verbe-ing)', 'Action en train de se faire', 'She **is reading** right now. (Elle est en train de lire.)'],
        ['Prétérit (past simple)', 'Action terminée, à un moment passé précis', 'I **met** him in 2020. (Je l’ai rencontré en 2020.)'],
        ['Present perfect (have + participe passé)', 'Action passée liée au présent', 'I **have lived** here since 2019. (J’habite ici depuis 2019.)'],
      ]),
      b.retenir('Au présent simple, le verbe prend un **-s** avec he, she et it : she works, he goes. À la forme négative, c’est l’auxiliaire qui le prend : he **doesn’t** work.', 'Le -s de la 3ᵉ personne'),
      b.titre('For, since, ago : dire « depuis » et « il y a »'),
      b.liste([
        '**since** + point de départ (une date, un moment) : since 2019 = depuis 2019.',
        '**for** + durée : for five years = depuis cinq ans, ou pendant cinq ans.',
        '**ago** + prétérit : two years ago = il y a deux ans.',
      ]),
      b.piege('Le français dit « J’habite ici **depuis** 2019 » au présent. L’anglais exige le **present perfect** : « I have lived here since 2019 », jamais « I live here since 2019 ». Avec un moment terminé (yesterday, last year, in 2015, ago), c’est le **prétérit** : « I saw him yesterday », jamais « I have seen him yesterday ».'),
      b.question(qcm({
        code: 'ANG-GRAM-L1-Q1', niveau: 1,
        consigne: 'Complète : « I have known her ___ ten years. »',
        options: ['for', 'since', 'ago'], bonne: 0,
        explication: '« Ten years » est une durée : on emploie « for ».',
      })),
      b.recap(['Présent simple : habitudes, -s avec he, she, it.', 'Present perfect : have / has + participe passé.', 'for = durée ; since = point de départ ; ago = prétérit.']),
    ]),
    lecon('ANG-GRAM-L2', 'Conditionnels, voix passive et discours indirect', 11, [
      b.texte('Cette leçon réunit trois constructions très fréquentes aux concours. Chacune est d’abord expliquée en français, puis illustrée en anglais.'),
      b.titre('Les phrases avec « if » (conditionnels)'),
      b.texte('Une phrase conditionnelle a deux parties : la **condition**, introduite par « if » (si), et le **résultat**, dans la proposition principale. Plus la situation est éloignée de la réalité, plus le temps employé recule dans le passé. Le **past perfect** se forme avec had + participe passé (had studied = avait étudié).'),
      b.tableau(['Type', 'Après « if »', 'Dans le résultat', 'Sens'], [
        ['0', 'présent', 'présent', 'Vérité générale'],
        ['1', 'présent', 'will + base verbale', 'Futur possible, réel'],
        ['2', 'prétérit', 'would + base verbale', 'Situation imaginaire ou peu probable'],
        ['3', 'past perfect', 'would have + participe passé', 'Passé imaginaire (regret)'],
      ]),
      b.exemple('Exemples traduits', 'If you heat ice, it melts. — Si on chauffe de la glace, elle fond. (type 0)\nIf it rains, I will stay home. — S’il pleut, je resterai à la maison. (type 1)\nIf I were rich, I would travel. — Si j’étais riche, je voyagerais. (type 2)\nIf she had studied, she would have passed. — Si elle avait travaillé, elle aurait réussi. (type 3)'),
      b.piege('Comme en français, où l’on ne dit pas « si je serai », on ne met **jamais « will » juste après « if »**.'),
      b.titre('La voix passive'),
      b.texte('À la **voix passive**, le sujet subit l’action au lieu de la faire : « Le pont **a été construit** en 1990 ». On l’emploie quand l’action compte plus que celui qui l’a faite. On conjugue « be » au temps voulu, puis on ajoute le participe passé.'),
      b.formule('be (conjugué) + participe passé', 'The bridge **was built** in 1990. — Le pont a été construit en 1990.'),
      b.titre('Le discours indirect'),
      b.texte('Le **discours indirect** rapporte les paroles de quelqu’un sans les citer entre guillemets. Quand le verbe qui introduit les paroles est au passé (said, told), le temps du verbe rapporté **recule d’un cran** (am → was, will → would) et les pronoms s’adaptent : « I am tired » → He said (that) he **was** tired.'),
      b.retenir('« say » s’emploie sans personne après lui (he said that…) ; « tell » exige une personne (he told **me** that…).'),
      b.recap(['Jamais « will » juste après « if ».', 'Voix passive : be + participe passé.', 'Discours indirect : le temps recule d’un cran.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'ANG-GRAM-E01', niveau: 1, notions: ['TENSES'],
      consigne: 'Choisis la bonne forme : « She ___ to school every day. »',
      options: ['goes', 'go', 'is going', 'gone'], bonne: 0,
      explication: 'Une habitude quotidienne se dit au présent simple ; avec « she », le verbe prend -s ou -es : she goes.',
      miniCours: mc('Le présent simple', 'Le présent simple exprime les habitudes et les vérités générales. Avec he, she ou it, on ajoute -s ou -es au verbe (she works, he goes). Des mots comme « every day », « usually » ou « always » le signalent souvent.', 'He / she / it → verbe + s.'),
    }),
    glisser({
      code: 'ANG-GRAM-E02', niveau: 1, notions: ['PERFECT'],
      consigne: 'Complète avec for, since ou ago.',
      texte: 'I have lived here {{since}} 2019.\nShe has worked at the hospital {{for}} five years.\nWe met two years {{ago}}.',
      distracteurs: ['during', 'from'],
      explication: 'since + point de départ ; for + durée ; ago se place après une durée, avec le prétérit.',
      miniCours: mc('For, since, ago', '« Since » introduit le moment où l’action a commencé (since 2019 = depuis 2019). « For » introduit une durée (for five years = depuis cinq ans). « Ago » suit une durée et va avec le prétérit (two years ago = il y a deux ans).', 'since = point de départ ; for = durée.'),
    }),
    vf({
      code: 'ANG-GRAM-E03', niveau: 1, notions: ['TENSES', 'CONDITIONALS'],
      consigne: 'Vrai si la phrase est grammaticalement correcte, faux sinon.',
      affirmations: [
        ['If I were rich, I would travel the world.', true],
        ['He don’t like coffee.', false, 'Avec « he », on écrit he doesn’t like.'],
        ['They have been to London last year.', false, 'Moment terminé → prétérit : they went to London last year.'],
      ],
      explication: 'Le conditionnel de type 2 est correct ; « he doesn’t » ; un moment terminé impose le prétérit.',
      miniCours: mc('Les erreurs fréquentes', 'Avec he, she ou it, la négation se forme avec « doesn’t » suivi de la base verbale. Un moment passé précis (last year, yesterday) impose le prétérit, pas le present perfect.', 'he doesn’t / last year → prétérit.'),
    }),
    relier({
      code: 'ANG-GRAM-E04', niveau: 2, notions: ['CONDITIONALS'],
      consigne: 'Relie chaque type de conditionnel à sa construction.',
      paires: [
        ['Type 0', 'If + present, present'],
        ['Type 1', 'If + present, will + verb'],
        ['Type 2', 'If + past simple, would + verb'],
        ['Type 3', 'If + past perfect, would have + past participle'],
      ],
      intrus: ['If + will, would + verb'],
      explication: '« Will » n’apparaît jamais juste après « if ».',
      miniCours: mc('Les conditionnels', 'Plus la situation est éloignée de la réalité, plus le temps recule : présent pour les vérités générales et les possibilités réelles, prétérit pour une situation imaginaire au présent, past perfect pour un passé imaginaire.', 'Jamais « will » après « if ».'),
    }),
    qcm({
      code: 'ANG-GRAM-E05', niveau: 2, notions: ['PASSIVE'],
      consigne: 'Choisis la bonne forme : « The bridge ___ in 1990. »',
      options: ['was built', 'built', 'has been built', 'is building'], bonne: 0,
      explication: 'Voix passive au passé (1990 est un moment terminé) : was + built.',
      miniCours: mc('La voix passive', 'On emploie la voix passive quand l’action compte plus que son auteur. On conjugue « be » au bon temps et on ajoute le participe passé. Une date terminée impose le prétérit de « be » (was, were).', 'be + participe passé.'),
    }),
    ordre({
      code: 'ANG-GRAM-E06', niveau: 2, notions: ['PERFECT'],
      consigne: 'Remets les mots dans l’ordre pour former une question correcte.',
      elements: ['Where', 'have', 'you', 'been', '?'],
      mode: 'exact',
      explication: 'Mot interrogatif + auxiliaire + sujet + participe passé : Where have you been?',
      miniCours: mc('L’ordre des mots dans une question', 'Dans une question en anglais, l’auxiliaire passe devant le sujet : mot interrogatif + auxiliaire + sujet + verbe. Au present perfect, l’auxiliaire est have ou has.', 'Wh- + auxiliaire + sujet + verbe.'),
    }),
    qcm({
      code: 'ANG-GRAM-E07', niveau: 3, notions: ['CONDITIONALS'],
      consigne: 'Complète : « If she had studied harder, she ___ the exam. »',
      options: ['would have passed', 'would pass', 'will pass', 'had passed'], bonne: 0,
      explication: 'Conditionnel de type 3 (passé imaginaire) : if + past perfect, would have + participe passé.',
      miniCours: mc('Le conditionnel de type 3', 'Pour imaginer un passé différent, on met if + past perfect dans la condition et would have + participe passé dans le résultat. Il exprime souvent un regret.', 'had + participe passé → would have + participe passé.'),
      raisonnement: {
        reference: 'La condition est au past perfect (had studied) : la situation est un passé imaginaire. C’est un conditionnel de type 3, donc le résultat prend would have + participe passé : would have passed.',
        etapes: ['Repérer le past perfect après « if »', 'Reconnaître le conditionnel de type 3', 'Appliquer would have + participe passé'],
      },
    }),
    surligner({
      code: 'ANG-GRAM-E08', niveau: 3, notions: ['PERFECT'],
      consigne: 'Surligne l’erreur dans la phrase.',
      segments: [['Yesterday ', false], ['I ', false], ['have seen ', true], ['a very ', false], ['interesting ', false], ['film.', false]],
      explication: '« Yesterday » est un moment terminé : il faut le prétérit « saw ».',
      miniCours: mc('Le moment terminé', 'Les expressions comme yesterday, last week, in 2010 ou ago désignent une période terminée. Elles imposent le prétérit, jamais le present perfect.', 'Yesterday → prétérit.'),
    }),
    qcm({
      code: 'ANG-GRAM-E09', niveau: 3, notions: ['PASSIVE'],
      consigne: 'Mets au discours indirect : He said: « I am tired. »',
      options: ['He said that he was tired.', 'He said that I am tired.', 'He said that he is tired yesterday.', 'He told that he was tired.'], bonne: 0,
      explication: 'Le pronom change (I → he) et le temps recule (am → was). « Tell » exige une personne après lui (told me).',
      miniCours: mc('Le discours indirect', 'Quand le verbe introducteur est au passé, on adapte les pronoms à la personne qui parle et on fait reculer les temps d’un cran (am → was, will → would). « Say » s’emploie sans personne après lui ; « tell » en exige une (he told me).', 'say that… / tell someone that…'),
      raisonnement: {
        reference: 'Le verbe introducteur « said » est au passé : le présent « am » devient « was ». Celui qui parle, « I », devient « he ». « Told » exigerait une personne après lui. La réponse est : He said that he was tired.',
        etapes: ['Changer le pronom I → he', 'Faire reculer le temps am → was', 'Vérifier le verbe introducteur (said ou told)'],
      },
    }),
  ],

  // ── Version cible : le cours entièrement en anglais ────────────────────
  versionCible: {
    langue: 'en',
    titre: 'English grammar essentials',
    resume: 'Tenses, present perfect, conditionals, passive voice and reported speech.',
    notions: {
      TENSES: 'Present simple / continuous, past simple',
      PERFECT: 'Present perfect, for / since / ago',
      CONDITIONALS: 'Conditionals (types 0 to 3)',
      PASSIVE: 'Passive voice and reported speech',
    },
    lecons: {
      'ANG-GRAM-L1': {
        titre: 'Tenses: present, past and present perfect',
        duree: 9,
        blocs: [
          b.tableau(['Tense', 'Use', 'Example'], [
            ['Present simple', 'Habits, general truths', 'She **goes** to school every day.'],
            ['Present continuous', 'Action happening now', 'She **is reading** right now.'],
            ['Past simple', 'Finished action at a given time', 'I **met** him in 2020.'],
            ['Present perfect', 'Past action linked to the present', 'I **have lived** here since 2019.'],
          ]),
          b.titre('For, since, ago'),
          b.liste([
            '**since** + starting point: since 2019, since Monday',
            '**for** + duration: for five years, for two hours',
            '**ago** + past simple: two years ago',
          ]),
          b.piege('With a finished time (yesterday, last year, in 2015, ago), use the **past simple**, never the present perfect: « I **saw** him yesterday », not « I have seen him yesterday ».', 'Common trap'),
          b.question(qcm({
            code: 'ANG-GRAM-L1-Q1-EN', niveau: 1,
            consigne: 'I have known her ___ ten years.',
            options: ['for', 'since', 'ago'], bonne: 0,
            explication: '« Ten years » is a duration: use « for ».',
          })),
          b.recap(['Present simple: habits (3rd person -s).', 'Present perfect: have/has + past participle.', 'for = duration ; since = starting point ; ago = past simple.']),
        ],
      },
      'ANG-GRAM-L2': {
        titre: 'Conditionals, passive and reported speech',
        duree: 9,
        blocs: [
          b.tableau(['Type', 'If-clause', 'Main clause', 'Meaning'], [
            ['0', 'present', 'present', 'General truth'],
            ['1', 'present', 'will + verb', 'Real future possibility'],
            ['2', 'past simple', 'would + verb', 'Unreal present / unlikely'],
            ['3', 'past perfect', 'would have + past participle', 'Unreal past (regret)'],
          ]),
          b.exemple('Examples', 'If you heat ice, it melts. (0) · If it rains, I will stay home. (1) · If I were rich, I would travel. (2) · If she had studied, she would have passed. (3)'),
          b.titre('Passive voice'),
          b.formule('be (conjugated) + past participle', 'The bridge **was built** in 1990. The letters **are sent** every day.'),
          b.titre('Reported speech'),
          b.texte('After a reporting verb in the past, tenses usually move one step back: « I am tired » → He said (that) he **was** tired.'),
          b.recap(['Never « will » in the if-clause.', 'Passive: be + past participle.', 'Reported speech: shift tenses back.']),
        ],
      },
    },
    exercices: {
      'ANG-GRAM-E01': {
        consigne: 'She ___ to school every day.',
        explication: 'A daily habit takes the present simple; 3rd person singular adds -s/-es: she goes.',
        miniCours: mc('Present simple', 'Use the present simple for habits and general truths. With he, she or it, add -s or -es to the verb (she works, he goes). « Every day », « usually », « always » are typical signals.', 'He / she / it → verb + s.'),
      },
      'ANG-GRAM-E02': {
        consigne: 'Complete with for, since or ago.',
        explication: 'since + starting point ; for + duration ; ago comes after a period with the past simple.',
        miniCours: mc('For, since, ago', '« Since » introduces the moment something started (since 2019). « For » introduces a length of time (for five years). « Ago » follows a period and goes with the past simple (two years ago).', 'since = point ; for = length.'),
      },
      'ANG-GRAM-E03': {
        consigne: 'Is the sentence grammatically correct?',
        affirmations: [null, 'Third person: he doesn’t like.', 'Finished time → past simple: they went to London last year.'],
        explication: 'Second conditional is correct; « he doesn’t »; a finished time requires the past simple.',
        miniCours: mc('Common mistakes', 'With he, she or it, the negative is « doesn’t » + base verb. A precise past time (last year, yesterday) requires the past simple, not the present perfect.', 'he doesn’t / last year → past simple.'),
      },
      'ANG-GRAM-E04': {
        consigne: 'Match each conditional with its structure.',
        explication: '« Will » never appears in the if-clause of a conditional.',
        miniCours: mc('Conditionals', 'The further from reality, the further back the tense goes: present for general truths and real possibilities, past simple for unreal present situations, past perfect for unreal past situations.', 'Never « will » after « if ».'),
      },
      'ANG-GRAM-E05': {
        consigne: 'The bridge ___ in 1990.',
        explication: 'Passive voice in the past (1990 is a finished time): was + built.',
        miniCours: mc('Passive voice', 'Use the passive when the action matters more than who did it. Conjugate « be » in the right tense and add the past participle. A finished date requires the past simple of « be ».', 'be + past participle.'),
      },
      'ANG-GRAM-E06': {
        consigne: 'Put the words in order to make a correct question.',
        explication: 'Question word + auxiliary + subject + past participle: Where have you been?',
        miniCours: mc('Word order in questions', 'In English questions, the auxiliary comes before the subject: question word + auxiliary + subject + main verb. With the present perfect, the auxiliary is have / has.', 'Wh- + aux + subject + verb.'),
      },
      'ANG-GRAM-E07': {
        consigne: 'If she had studied harder, she ___ the exam.',
        explication: 'Third conditional (unreal past): if + past perfect, would have + past participle.',
        miniCours: mc('Third conditional', 'To imagine a different past, use if + past perfect in the condition and would have + past participle in the result. It often expresses regret.', 'had + pp → would have + pp.'),
        raisonnement: {
          reference: 'The if-clause uses the past perfect (had studied): the situation is an unreal past. This is a third conditional, so the main clause takes would have + past participle: would have passed.',
          etapes: ['Identify the past perfect in the if-clause', 'Recognise the third conditional', 'Apply would have + past participle'],
        },
      },
      'ANG-GRAM-E08': {
        consigne: 'Highlight the mistake in the sentence.',
        explication: '« Yesterday » is a finished time: the past simple « saw » is required.',
        miniCours: mc('Finished time', 'Time expressions such as yesterday, last week, in 2010 or ago refer to a finished period. They require the past simple, never the present perfect.', 'Yesterday → past simple.'),
      },
      'ANG-GRAM-E09': {
        consigne: 'He said: « I am tired. » → Reported speech:',
        explication: 'Pronoun changes (I → he) and tense moves back (am → was). « Tell » needs an object (told me).',
        miniCours: mc('Reported speech', 'When the reporting verb is in the past, change the pronouns to match the speaker and move the tenses one step back (am → was, will → would). « Say » has no direct object; « tell » needs one (he told me).', 'say that… / tell someone that…'),
        raisonnement: {
          reference: 'The reporting verb « said » is in the past, so the present « am » becomes « was ». The speaker « I » becomes « he ». « Told » would need an object. The answer is: He said that he was tired.',
          etapes: ['Change the pronoun I → he', 'Shift the tense am → was', 'Check the reporting verb (said vs told)'],
        },
      },
    },
  },
};

module.exports = [resume, anglais];
