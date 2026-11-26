const { mc, qcm, vf, glisser, ordre, relier, classer, entourer, surligner, b, lecon } = require('../dsl');

// Suite de tous les modules de français : trois épreuves officielles du CAFOP-IA traitées question par
// question. Sujets DECO lus le 22/11/2026 : 2021 (6adf40d0…, texte de la Banque mondiale sur la
// Covid-19), 2023 (6adf4d46…, texte de Robert Tadet sur l'avenir), 2025 (6adf4d85…, texte d'Anne
// Jellema et Elaine Unterhalter sur l'éducation des filles). Seules de courtes citations sont reprises.

const DOC = { 2021: '6adf40d0ecb585bf0e4f3378', 2023: '6adf4d46ecb585bf0e4f42ab', 2025: '6adf4d85ecb585bf0e4f431c' };
const annale = (annee, epreuve) => ({ type: 'annale', organisme: 'CAFOP', annee, epreuve: `IA, Français, ${epreuve}`, documentId: DOC[annee] });

const rappels = {
  'FSU-COMPR': mc('Répondre aux questions de compréhension', 'Relis la question et souligne le verbe : relever (recopier entre guillemets), énumérer (lister), dire pourquoi (expliquer avec tes mots et une preuve du texte), proposer un titre (une phrase nominale qui résume l’idée générale). Réponds par une phrase complète. Donne exactement le nombre d’éléments demandé.', 'Le verbe de la question fixe la forme de la réponse.'),
  'FSU-VOCAB': mc('Le vocabulaire en contexte', 'Expliquer en contexte, c’est donner le sens du mot ou de l’expression dans la phrase du texte, en t’aidant de ce qui précède et suit. Pour une famille de mots, cherche des mots formés sur le même radical (pauvre, pauvreté, appauvrir). Un antonyme a le sens contraire ; il doit être de la même nature que le mot de départ.', 'Sens dans la phrase ; même radical ; même nature.'),
  'FSU-SYNT': mc('Structure et syntaxe', 'Nature : la classe du mot (nom, verbe, adjectif…). Fonction : son rôle dans la phrase (sujet, COD, complément circonstanciel…). L’analyse logique découpe la phrase en propositions : une par verbe conjugué, avec leur nature (principale, subordonnée relative, conjonctive…) et leur fonction. À la voix passive, le sujet subit l’action : être + participe passé ; le temps se lit sur l’auxiliaire être.', 'Une proposition par verbe conjugué.'),
  'FSU-METHODE': mc('Gérer l’épreuve de deux heures', 'Barème 2025 : compréhension 5 points, vocabulaire 3, structure et syntaxe 6, essai 6. Lis le texte deux fois, réponds aux questions dans l’ordre en numérotant clairement, garde environ 25 minutes pour l’essai et 10 minutes pour relire. Une réponse juste mais mal rédigée perd des points : phrases complètes, orthographe soignée.', 'Compréhension 5, vocabulaire 3, syntaxe 6, essai 6.'),
};
const spec = (notion, extra = {}) => ({ notions: [notion], miniCours: rappels[notion], ...extra });
const question = (i, notion, source, consigne, options, explication) => b.question(qcm({ ...spec(notion, { source }), code: `CAFOP-FR-SUJETS-L${i}-Q1`, niveau: 1, consigne, options, bonne: 0, explication }));

const sujets = {
  code: 'CAFOP-FR-SUJETS',
  matiere: 'Français',
  titre: 'Sujets de français corrigés',
  resume: 'Trois épreuves officielles du CAFOP-IA (2021, 2023, 2025) traitées question par question : compréhension, vocabulaire, structure et syntaxe, essai et gestion du temps.',
  notions: [
    { code: 'FSU-COMPR', libelle: 'Compréhension' },
    { code: 'FSU-VOCAB', libelle: 'Vocabulaire' },
    { code: 'FSU-SYNT', libelle: 'Structure et syntaxe' },
    { code: 'FSU-METHODE', libelle: 'Méthode de l’épreuve' },
  ],
  lecons: [
    lecon('CAFOP-FR-SUJETS-L1', 'Sujet 2025 : la compréhension', 5, [
      b.texte('À la fin de cette leçon, tu sauras répondre aux questions de compréhension du sujet 2025. Prérequis : le module Étude de texte.'),
      b.texte('**Le texte (2025)** : d’après Anne Jellema et Elaine Unterhalter, l’éducation « n’est pas une panacée » : seule, elle ne supprime pas les privations dont souffrent les femmes, mais elle donne aux filles confiance dans leurs aptitudes et leurs droits. La pauvreté explique que beaucoup de filles ne soient pas scolarisées : plus l’éducation coûte cher, moins les familles investissent dans celle des filles.'),
      b.exemple('Q1. Relève deux raisons de la non-scolarisation des filles', 'La pauvreté (« La pauvreté est la raison pour laquelle l’écrasante majorité des filles n’est pas scolarisée ») et le coût de l’éducation (« Plus l’éducation est coûteuse et moins il est probable que les familles investissent dans celle des filles »).'),
      b.exemple('Q2. Énumère deux discriminations dont les femmes sont victimes', 'Le texte cite les discriminations sur le marché du travail et dans l’accès à la propriété foncière (ainsi que dans les choix concernant la sexualité et la reproduction).'),
      b.texte('**Q3. Titre** : « L’éducation, une chance pour les filles » ou « Instruire les filles malgré la pauvreté ».'),
      b.retenir('« Relève » exige une citation entre guillemets ; « énumère » une simple liste.'),
      b.piege('Donner une seule raison quand la question en demande deux.'),
      question(1, 'FSU-COMPR', annale(2025, 'compréhension, question 1'), 'Selon le texte de 2025, quelle est la principale raison de la non-scolarisation des filles ?', ['La pauvreté', 'Le manque d’écoles en ville', 'Le refus des filles'], 'Le texte affirme : « La pauvreté est la raison pour laquelle l’écrasante majorité des filles n’est pas scolarisée. »'),
      b.recap(['Relever = citer.', 'Énumérer = lister.', 'Titre = idée générale.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L2', 'Sujet 2025 : vocabulaire et syntaxe', 6, [
      b.texte('À la fin de cette leçon, tu sauras traiter les questions de vocabulaire et de syntaxe du sujet 2025. Prérequis : les modules Vocabulaire, Grammaire et Conjugaison.'),
      b.exemple('Vocabulaire', '« Une panacée » : un remède à tous les maux ; ici, l’éducation ne règle pas à elle seule tous les problèmes des femmes. « Assimiler des informations » : les comprendre et se les approprier. Famille de « pauvreté » : verbe appauvrir ; adjectif pauvre.'),
      b.exemple('Analyse logique', '« L’éducation ne suffit pas à elle seule à surmonter les causes multiples des privations et de l’oppression dont souffrent les femmes. » Deux verbes conjugués, deux propositions : la principale « L’éducation ne suffit pas … de l’oppression » et la subordonnée relative « dont souffrent les femmes », complément de l’antécédent « privations et oppression ».'),
      b.exemple('Voix et temps', '« L’écrasante majorité des filles n’est pas scolarisée » est à la voix passive (être + participe passé). Voix active : « On ne scolarise pas l’écrasante majorité des filles. » « Les familles investissent » est au présent ; aux autres temps simples de l’indicatif : investissaient, investirent, investiront, investiraient (conditionnel, mode à part).'),
      b.retenir('À la voix passive, le temps est celui de l’auxiliaire être : « n’est pas scolarisée » est au présent.'),
      b.piege('Prendre « scolarisée » pour un adjectif attribut sans voir la voix passive : ici, on peut retrouver l’agent (« par leurs familles »).'),
      question(2, 'FSU-VOCAB', annale(2025, 'vocabulaire, question 2'), 'Quel verbe appartient à la famille de « pauvreté » ?', ['Appauvrir', 'Pouvoir', 'Payer'], 'Appauvrir est formé sur le radical « pauvr- », comme pauvre et pauvreté.'),
      b.recap(['Panacée : remède universel.', 'Une proposition par verbe conjugué.', 'Passif : être + participe passé.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L3', 'Sujet 2025 : l’essai', 5, [
      b.texte('À la fin de cette leçon, tu sauras construire l’essai du sujet 2025. Prérequis : le module Rédiger l’essai.'),
      b.texte('**Consigne** : « L’éducation donne aux filles et aux femmes une confiance dans leurs aptitudes et droits. » Étaye cette assertion dans un développement structuré d’une dizaine de lignes.'),
      b.liste(['Introduction : l’instruction transforme la vie des filles', 'Argument 1 : la réussite scolaire prouve leurs capacités et leur ouvre des métiers', 'Argument 2 : savoir lire permet de connaître et défendre ses droits', 'Conclusion : instruire les filles, c’est renforcer la société'], true),
      b.exemple('Un paragraphe rédigé', 'D’abord, l’école donne aux filles confiance en leurs capacités. En réussissant leurs examens, elles constatent qu’elles peuvent apprendre comme les garçons ; une élève brillante au BEPC peut ainsi viser le CAFOP et devenir institutrice.'),
      b.exemple('Un exemple pour les droits', 'Une femme qui sait lire comprend un acte de naissance ou un contrat avant de le signer : elle défend elle-même ses droits.'),
      b.retenir('Étayer, c’est soutenir l’assertion : pas d’arguments contraires.'),
      b.piege('Reprendre mot pour mot les phrases du texte : il faut des exemples personnels.'),
      question(3, 'FSU-METHODE', annale(2025, 'essai'), 'Quelle longueur demande l’essai de 2025 ?', ['Une dizaine de lignes', 'Trois lignes', 'Deux pages'], 'La consigne demande « un développement structuré en une dizaine de lignes ».'),
      b.recap(['Étayer = soutenir.', 'Deux arguments illustrés.', 'Une dizaine de lignes.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L4', 'Sujet 2021 : compréhension et vocabulaire', 5, [
      b.texte('À la fin de cette leçon, tu sauras traiter la compréhension et le vocabulaire du sujet 2021. Prérequis : la méthode du sujet 2025.'),
      b.texte('**Le texte (2021)**, de la Banque mondiale : trois mois après son apparition, la Covid-19 a privé d’école environ 80 % des élèves du monde ; elle aggrave une crise des apprentissages et touche davantage les enfants défavorisés.'),
      b.exemple('Compréhension', 'Titre : « La Covid-19, une menace pour l’éducation ». Pourquoi est-elle un danger ? Elle prive les élèves d’école, entraîne un recul des apprentissages et des abandons scolaires, et prive certains enfants du repas de la cantine.'),
      b.exemple('Vocabulaire', '« Les enfants défavorisés subiront ces contrecoups de manière disproportionnée » : les enfants pauvres souffriront bien plus que les autres des conséquences de la crise. Famille d’« éducation » : éduquer, éducateur, éducatif. Antonyme de « scolarisés » : déscolarisés (ou non scolarisés).'),
      b.retenir('Pour une famille de mots, emploie chaque mot dans une phrase qui montre son sens, comme le demandait le sujet.'),
      b.piege('Donner « école » comme mot de la famille d’« éducation » : il n’a pas le même radical.'),
      question(4, 'FSU-VOCAB', annale(2021, 'vocabulaire, question 3'), 'Quel est l’antonyme de « scolarisés » ?', ['Déscolarisés', 'Éduqués', 'Instruits'], 'Déscolarisés exprime le contraire : les enfants qui ont quitté l’école ou n’y vont pas. Éduqués et instruits sont proches de scolarisés.'),
      b.recap(['Titre : la menace sur l’éducation.', 'Expliquer avec ses mots.', 'Antonyme de même nature.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L5', 'Sujet 2021 : analyse logique et essai', 6, [
      b.texte('À la fin de cette leçon, tu sauras faire l’analyse logique de la phrase du sujet 2021 et préparer son essai. Prérequis : les propositions subordonnées (module Grammaire).'),
      b.exemple('Analyse logique', '« La pandémie qui sévit actuellement risque d’aggraver encore davantage cette situation si nous n’agissons pas rapidement. » Trois verbes conjugués : risque, sévit, agissons. Principale : « La pandémie … risque d’aggraver encore davantage cette situation ». Subordonnée relative : « qui sévit actuellement », complément de l’antécédent « pandémie ». Subordonnée conjonctive circonstancielle de condition : « si nous n’agissons pas rapidement », complément de la principale.'),
      b.texte('**Essai 2021** : « Dis les mesures que doit prendre le maître dans sa classe pour lutter efficacement contre la Covid-19 » (8 à 12 lignes). Mesures possibles : lavage des mains, espacement des tables-bancs, aération de la salle, explication des gestes barrières, signalement d’un élève malade.'),
      b.exemple('Début d’essai', 'Le maître est en première ligne face à la Covid-19. D’abord, il impose le lavage des mains à l’entrée de la classe et après chaque récréation…'),
      b.retenir('« Aggraver » est un infinitif : il ne forme pas une proposition à lui seul.'),
      b.piege('Classer « si nous n’agissons pas » en complétive : « si » introduit ici une condition, c’est une circonstancielle.'),
      question(5, 'FSU-SYNT', annale(2021, 'structure et syntaxe, question 2'), 'Combien de propositions compte la phrase « La pandémie qui sévit actuellement risque d’aggraver cette situation si nous n’agissons pas rapidement » ?', ['Trois', 'Deux', 'Quatre'], 'Trois verbes conjugués (risque, sévit, agissons), donc trois propositions : une principale et deux subordonnées.'),
      b.recap(['Compter les verbes conjugués.', 'Relative et circonstancielle de condition.', 'Essai : mesures du maître.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L6', 'Sujet 2023 : préparer l’avenir', 5, [
      b.texte('À la fin de cette leçon, tu sauras traiter la compréhension et la grammaire du sujet 2023. Prérequis : les leçons précédentes.'),
      b.texte('**Le texte (2023)**, de Robert Tadet : il faut préparer l’avenir de nos enfants, « une promesse à remplir » ; le bonheur demande de l’effort, comme le cultivateur qui « a travaillé au soleil » avant de se reposer à l’ombre.'),
      b.exemple('Compréhension', 'Deux expressions qui montrent pourquoi prévoir l’avenir : « affronter le monde qui va venir » et « Prendre un pari dans l’avenir, pour l’avenir, c’est prendre un risque sérieux ». Pourquoi l’avenir est-il une promesse à remplir ? Parce qu’il dépend des efforts que nous faisons aujourd’hui.'),
      b.exemple('Nature et fonction', 'Dans « l’avenir est une promesse à remplir », « l’avenir » est un groupe nominal, sujet du verbe « est ». Dans « un cultivateur qui a travaillé au soleil », « au soleil » est un groupe prépositionnel, complément circonstanciel de lieu de « a travaillé ».'),
      b.retenir('Un titre possible : « Préparer l’avenir par l’effort ».'),
      b.piege('Répondre par une opinion personnelle à une question de compréhension : la réponse doit venir du texte.'),
      question(6, 'FSU-SYNT', annale(2023, 'structure et syntaxe'), 'Dans « L’avenir est une promesse à remplir », quelle est la fonction de « l’avenir » ?', ['Sujet du verbe « est »', 'Complément d’objet direct', 'Attribut du sujet'], '« L’avenir » fait l’action exprimée par le verbe être : il est sujet. « Une promesse à remplir » est l’attribut du sujet.'),
      b.recap(['Réponses tirées du texte.', 'Nature et fonction.', 'Titre : l’effort prépare l’avenir.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L7', 'Gérer les deux heures de l’épreuve', 4, [
      b.texte('À la fin de cette leçon, tu sauras répartir ton temps selon le barème. Prérequis : la structure des sujets étudiés.'),
      b.tableau(['Partie (barème 2025)', 'Points', 'Temps conseillé'], [['Lecture attentive du texte', '—', '10 min'], ['Compréhension', '5', '20 min'], ['Vocabulaire', '3', '15 min'], ['Structure et syntaxe', '6', '35 min'], ['Essai', '6', '30 min'], ['Relecture', '—', '10 min']]),
      b.exemple('Commencer par ce que l’on maîtrise', 'Un candidat sûr de lui en grammaire peut traiter d’abord la partie syntaxe, à condition de bien numéroter les réponses.'),
      b.exemple('Présenter la copie', 'Recopier le numéro et le titre de chaque partie : « I. Compréhension – 1. … ». Le correcteur retrouve facilement chaque réponse.'),
      b.retenir('La syntaxe et l’essai valent 12 points sur 20 : ils méritent plus d’une heure.'),
      b.piege('Passer 50 minutes sur la compréhension et bâcler l’essai.'),
      question(7, 'FSU-METHODE', annale(2025, 'barème'), 'Combien de points vaut la partie structure et syntaxe dans le sujet 2025 ?', ['6 points', '3 points', '5 points'], 'Barème 2025 : compréhension 5, vocabulaire 3, structure et syntaxe 6, essai 6.'),
      b.recap(['Barème : 5, 3, 6, 6.', 'Plus d’une heure pour syntaxe et essai.', 'Numéroter clairement.']),
    ]),
    lecon('CAFOP-FR-SUJETS-L8', 'Bilan : ta grille d’autocorrection', 4, [
      b.texte('À la fin de cette leçon, tu sauras vérifier ta copie avec une grille avant de la rendre. Prérequis : les sujets étudiés.'),
      b.liste(['Ai-je répondu à toutes les questions, dans l’ordre et numérotées ?', 'Mes réponses de compréhension s’appuient-elles sur le texte (citations entre guillemets quand on demande de relever) ?', 'Ai-je donné exactement le nombre d’éléments demandé ?', 'En syntaxe, ai-je indiqué la nature ET la fonction ?', 'Mon essai respecte-t-il la consigne et la longueur ?', 'Ai-je relu les accords et les majuscules ?'], true),
      b.exemple('Une erreur repérée à la relecture', '« Les filles que l’école a aidé » devient « Les filles que l’école a aidées » : le COD « que », mis pour les filles, est placé avant.'),
      b.exemple('Une réponse complétée', 'La question demandait deux discriminations ; une seule était donnée. La relecture permet d’ajouter la seconde.'),
      b.retenir('Dix minutes de relecture peuvent faire gagner plusieurs points.'),
      b.piege('Rendre la copie en avance sans relire.'),
      question(8, 'FSU-SYNT', annale(2025, 'structure et syntaxe, question 1'), 'Pour une question « Détermine la nature et la fonction », que faut-il donner ?', ['La classe du mot et son rôle dans la phrase', 'Seulement la classe du mot', 'Seulement le sens du mot'], 'La nature est la classe grammaticale ; la fonction est le rôle dans la phrase. Les deux sont exigées.'),
      b.recap(['Tout est numéroté.', 'Nombre d’éléments respecté.', 'Nature et fonction ; accords relus.']),
    ]),
  ],
  exercices: [
    entourer({ ...spec('FSU-COMPR', { source: annale(2025, 'compréhension, question 2') }), code: 'CAFOP-FR-SUJETS-E01', niveau: 1, consigne: 'Selon le texte de 2025, sélectionne les domaines où les femmes sont victimes de discrimination.', elements: [['Le marché du travail', true], ['La propriété foncière', true], ['Les choix concernant la sexualité et la reproduction', true], ['Le droit de marcher dans la rue', false], ['L’accès à la radio', false]],
      explication: '(CAFOP IA 2025, français, compréhension, question 2) Le texte cite les discriminations sur le marché du travail, dans la propriété foncière et dans les choix concernant la sexualité et la reproduction.' }),
    qcm({ ...spec('FSU-VOCAB', { source: annale(2025, 'vocabulaire, question 1 a') }), code: 'CAFOP-FR-SUJETS-E02', niveau: 1, consigne: '« L’éducation n’est pas une panacée. » Que signifie « panacée » ?', options: ['Un remède à tous les maux', 'Une perte de temps', 'Un diplôme', 'Une obligation'], bonne: 0,
      explication: '(CAFOP IA 2025, français, vocabulaire, question 1 a) Une panacée est un remède universel. Le texte précise que l’éducation, à elle seule, ne suffit pas à tout régler.' }),
    relier({ ...spec('FSU-VOCAB', { source: annale(2021, 'vocabulaire, question 2') }), code: 'CAFOP-FR-SUJETS-E03', niveau: 1, consigne: 'Relie chaque mot de la famille d’« éducation » à sa nature.', paires: [['Éduquer', 'Verbe'], ['Éducateur', 'Nom'], ['Éducatif', 'Adjectif']],
      explication: '(CAFOP IA 2021, français, vocabulaire, question 2) Les trois mots sont formés sur le radical « éduc- » : éduquer (verbe), éducateur (nom), éducatif (adjectif).' }),
    qcm({ ...spec('FSU-COMPR', { source: annale(2021, 'compréhension, question 1') }), code: 'CAFOP-FR-SUJETS-E04', niveau: 1, consigne: 'Quel titre convient le mieux au texte de 2021 ?', options: ['La Covid-19, une menace pour l’éducation', 'Les bienfaits du confinement', 'L’histoire de la Banque mondiale', 'Les vacances des élèves'], bonne: 0,
      explication: '(CAFOP IA 2021, français, compréhension, question 1) Le texte montre que la pandémie menace l’éducation : c’est l’idée générale que le titre doit résumer.' }),
    vf({ ...spec('FSU-SYNT', { source: annale(2025, 'structure et syntaxe, question 3') }), code: 'CAFOP-FR-SUJETS-E05', niveau: 1, consigne: 'Phrase : « L’écrasante majorité des filles n’est pas scolarisée. » Juge chaque affirmation.', affirmations: [['La phrase est à la voix passive.', true], ['Le verbe est au présent de l’indicatif.', true], ['« Scolarisée » est un complément d’objet direct.', false]],
      explication: '(CAFOP IA 2025, français, structure et syntaxe, question 3) « n’est pas scolarisée » est formé de être au présent et d’un participe passé : voix passive au présent. Le participe fait partie du verbe, ce n’est pas un COD.' }),
    glisser({ ...spec('FSU-VOCAB', { source: annale(2025, 'vocabulaire, question 2') }), code: 'CAFOP-FR-SUJETS-E06', niveau: 1, consigne: 'Complète avec des mots de la famille de « pauvreté ».', texte: 'Une famille {{pauvre}} hésite à payer l’école. La crise risque d’{{appauvrir}} encore les villages.', distracteurs: ['pouvoir', 'pauvreté'],
      explication: '(CAFOP IA 2025, français, vocabulaire, question 2) « Pauvre » est l’adjectif et « appauvrir » le verbe de la famille de « pauvreté ».' }),
    classer({ ...spec('FSU-SYNT', { source: annale(2021, 'structure et syntaxe, question 2') }), code: 'CAFOP-FR-SUJETS-E07', niveau: 2, consigne: 'Classe chaque proposition de la phrase « La pandémie qui sévit actuellement risque d’aggraver cette situation si nous n’agissons pas rapidement ».', categories: ['Principale', 'Subordonnée relative', 'Subordonnée circonstancielle'],
      cartes: [['La pandémie … risque d’aggraver cette situation', 0], ['qui sévit actuellement', 1], ['si nous n’agissons pas rapidement', 2]],
      explication: '(CAFOP IA 2021, français, structure et syntaxe, question 2) La principale porte le verbe « risque » ; « qui sévit actuellement » est une relative complétant « pandémie » ; « si nous n’agissons pas rapidement » est une circonstancielle de condition.' }),
    qcm({ ...spec('FSU-SYNT', { source: annale(2025, 'structure et syntaxe, question 3 b') }), code: 'CAFOP-FR-SUJETS-E08', niveau: 2, consigne: 'Mets à la voix active : « L’écrasante majorité des filles n’est pas scolarisée. »', options: ['On ne scolarise pas l’écrasante majorité des filles.', 'L’écrasante majorité des filles ne se scolarise pas.', 'L’écrasante majorité des filles n’a pas été scolarisée.', 'On n’a pas scolarisé l’écrasante majorité des filles.'], bonne: 0,
      explication: '(CAFOP IA 2025, français, structure et syntaxe, question 3) L’agent n’étant pas exprimé, on prend « on » comme sujet et on garde le temps de l’auxiliaire : présent. Les deux dernières propositions changent le temps.' }),
    relier({ ...spec('FSU-SYNT', { source: annale(2025, 'structure et syntaxe, question 4') }), code: 'CAFOP-FR-SUJETS-E09', niveau: 2, consigne: '« Les familles investissent dans celle des filles. » Relie chaque temps à la forme du verbe.', paires: [['Imparfait', 'investissaient'], ['Passé simple', 'investirent'], ['Futur simple', 'investiront']],
      explication: '(CAFOP IA 2025, français, structure et syntaxe, question 4) Investir est un verbe du 2ᵉ groupe : imparfait investissaient, passé simple investirent, futur investiront. La phrase de départ est au présent.' }),
    qcm({ ...spec('FSU-SYNT', { source: annale(2023, 'structure et syntaxe') }), code: 'CAFOP-FR-SUJETS-E10', niveau: 2, consigne: 'Dans « Seul un cultivateur qui a travaillé au soleil peut être fier », quelle est la nature et la fonction de « au soleil » ?', options: ['Groupe prépositionnel, complément circonstanciel de lieu de « a travaillé »', 'Nom, sujet de « peut »', 'Adjectif, attribut de « cultivateur »', 'Groupe nominal, COD de « a travaillé »'], bonne: 0,
      explication: '(CAFOP IA 2023, français, structure et syntaxe) « au soleil » est introduit par la préposition « à » (contractée en « au ») et indique où le cultivateur a travaillé : complément circonstanciel de lieu.' }),
    surligner({ ...spec('FSU-COMPR', { source: annale(2025, 'compréhension, question 1') }), code: 'CAFOP-FR-SUJETS-E11', niveau: 2, consigne: 'Surligne le passage qui montre que le coût de l’éducation freine la scolarisation des filles.', segments: [['La pauvreté n’est pas la seule cause. ', false], ['Plus l’éducation est coûteuse et moins il est probable que les familles investissent dans celle des filles. ', true], ['Cet objectif est réalisable.', false]],
      explication: '(CAFOP IA 2025, français, compréhension, question 1) La phrase surlignée relie directement le coût de l’éducation et le faible investissement des familles dans l’éducation des filles. La première phrase est une reformulation d’entraînement, la dernière une conclusion.' }),
    ordre({ ...spec('FSU-METHODE'), code: 'CAFOP-FR-SUJETS-E12', niveau: 3, consigne: 'Remets dans l’ordre une organisation efficace de l’épreuve de deux heures.', elements: ['Lire deux fois le texte', 'Répondre à la compréhension', 'Traiter le vocabulaire', 'Traiter la structure et la syntaxe', 'Rédiger l’essai', 'Relire toute la copie'],
      explication: 'On suit l’ordre du sujet, qui va du sens du texte à la langue puis à la production écrite, et on garde dix minutes pour relire.' }),
    qcm({ ...spec('FSU-VOCAB', { source: annale(2021, 'vocabulaire, question 1') }), code: 'CAFOP-FR-SUJETS-E13', niveau: 3, consigne: 'Explique : « les enfants défavorisés subiront ces contrecoups de manière disproportionnée ».', options: ['Les enfants pauvres souffriront beaucoup plus que les autres des conséquences de la crise.', 'Tous les enfants souffriront de la même manière.', 'Les enfants défavorisés seront épargnés par la crise.', 'Les enfants riches perdront leur place à l’école.'], bonne: 0,
      explication: '(CAFOP IA 2021, français, vocabulaire, question 1) « Défavorisés » désigne les enfants pauvres ; « contrecoups », les conséquences indirectes ; « de manière disproportionnée », bien plus fortement que les autres.' }),
    qcm({ ...spec('FSU-SYNT', { source: annale(2025, 'structure et syntaxe, question 2') }), code: 'CAFOP-FR-SUJETS-E14', niveau: 3, consigne: 'Dans « L’éducation ne suffit pas à elle seule à surmonter les causes multiples des privations et de l’oppression dont souffrent les femmes », quelle est la subordonnée et sa nature ?', options: ['« dont souffrent les femmes », subordonnée relative', '« à surmonter les causes multiples », subordonnée infinitive complétive', '« à elle seule », subordonnée circonstancielle', 'Il n’y a pas de subordonnée.'], bonne: 0,
      explication: '(CAFOP IA 2025, français, structure et syntaxe, question 2) Les verbes conjugués sont « suffit » et « souffrent ». « dont souffrent les femmes » est une subordonnée relative introduite par « dont », complément de l’antécédent « privations et oppression ». « surmonter » est un infinitif.' }),
  ],
};

module.exports = [sujets];
