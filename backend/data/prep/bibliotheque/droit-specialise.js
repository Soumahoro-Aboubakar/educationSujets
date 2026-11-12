const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, b, lecon } = require('../dsl');

// Textes officiels, annales lues et migration des codes : docs/prep-contenus/07-droit.md.
// Les dates de session priment sur l'année d'entrée annoncée par les sujets.
const original = { type: 'original', inspireDe: 'INFJ, présélection magistrature avril 2025 et greffes CMS juillet 2025' };
const preselection = { type: 'annale', organisme: 'INFJ', annee: 2025, epreuve: 'Magistrature, présélection, session avril 2025 (entrée 2026)', documentId: '6ad4436cdd410f0b0256bc34' };
const admin2025 = { type: 'annale', organisme: 'INFJ', annee: 2025, epreuve: 'Greffes cycle supérieur, droit administratif, juin 2025 (entrée 2026)', documentId: '6ad44319dd410f0b0256bc11' };
const outils = { qcm, vf, glisser, entourer, ordre, relier, classer };

// Une idée par fiche ; les deux exemples sont rédigés, jamais tirés d'une banque générique.
function cours(module, i, notion, titre, s) {
  const [consigne, options, bonne, explication] = s.question;
  return lecon(`${module}-L${i}`, titre, s.duree || 4, [
    b.texte(s.objectif), b.texte(s.regle),
    ...s.exemples.map(([t, texte]) => b.exemple(t, texte)), b.piege(s.piege),
    b.question(qcm({ code: `${module}-L${i}-Q1`, niveau: 1, notions: [notion], source: original,
      consigne, options, bonne, explication,
      miniCours: mc(titre, s.regle, s.recap[0]),
    })), b.recap(s.recap),
  ]);
}
function exercice(module, i, type, niveau, notions, rappel, s) {
  return outils[type]({ code: `${module}-E${String(i).padStart(2, '0')}`, niveau, notions,
    miniCours: mc(...rappel), source: original, ...s });
}

const personnes = {
  code: 'INFJ-MAG-PERSONNES', matiere: 'Droit civil', titre: 'Les personnes et la famille',
  resume: 'Personnalité, capacité, état civil, mariage, patrimoine familial et filiation en droit ivoirien.',
  notions: [
    { code: 'PERS-PERSONNALITE', libelle: 'Personne physique et personne morale' },
    { code: 'PERS-CAPACITE', libelle: 'Capacité, minorité et protection' },
    { code: 'PERS-IDENTITE', libelle: 'Nom, domicile et état civil' },
    { code: 'PERS-MARIAGE', libelle: 'Formation et effets du mariage' },
    { code: 'PERS-REGIMES', libelle: 'Régimes matrimoniaux et séparation' },
    { code: 'PERS-FILIATION', libelle: 'Établissement de la filiation' },
  ],
  lecons: [
    cours('INFJ-MAG-PERSONNES', 1, 'PERS-PERSONNALITE', 'Qui peut avoir des droits ?', {
      objectif: 'Nous allons distinguer la personne au sens du droit et la simple chose, pour comprendre qui peut être créancier ou débiteur.',
      regle: 'La **personnalité juridique** est l’aptitude à être titulaire de droits et d’obligations. La **personne physique** est un être humain ; la **personne morale** est un groupement ou une organisation auquel le droit reconnaît cette personnalité dans les conditions légales. Être titulaire d’un droit ne signifie pas pouvoir l’exercer seul : cette seconde question relève de la capacité, étudiée ensuite. Une obligation relie un créancier, qui peut réclamer, à un débiteur, qui doit la prestation.',
      exemples: [['Un enfant propriétaire', 'Un enfant peut avoir un droit sur un bien sans pouvoir accomplir seul tous les actes qui le concernent. Il faut distinguer le droit et son exercice.'], ['Une société', 'Une société immatriculée peut avoir un patrimoine distinct de celui de ses associés, selon son régime. Un simple nom de groupe ne suffit pas à démontrer la personnalité morale.']],
      piege: 'Une personne morale n’est pas une personne « vertueuse ». Le mot moral désigne ici une personnalité reconnue à une organisation.',
      question: ['La personnalité juridique est l’aptitude…', ['à être titulaire de droits et obligations', 'à toujours agir sans représentant', 'à n’avoir aucune dette'], 0, 'La personnalité concerne la titularité. La possibilité d’agir seul sera étudiée avec la capacité ; elle ne découle pas automatiquement de la personnalité.'],
      recap: ['Personnalité : aptitude à avoir des droits.', 'Personne physique : être humain.', 'Personne morale : organisation reconnue par le droit.'],
    }),
    cours('INFJ-MAG-PERSONNES', 2, 'PERS-CAPACITE', 'Avoir un droit et l’exercer soi-même', {
      objectif: 'Nous allons comprendre pourquoi une protection peut encadrer les actes d’une personne sans lui retirer tous ses droits.',
      regle: 'La **capacité de jouissance** concerne l’aptitude à avoir un droit ; la **capacité d’exercice**, l’aptitude à l’exercer soi-même. La loi ivoirienne relative à la minorité de 2019 retient le seuil de **dix-huit ans accomplis**. Le mineur bénéficie de mécanismes de protection, notamment représentation ou autorisation selon l’acte et sa situation. La **représentation** permet à une personne habilitée d’agir au nom d’une autre. Chaque acte doit être examiné selon son régime.',
      exemples: [['Une opération patrimoniale', 'Pour vendre un bien appartenant à un mineur, on ne déduit pas la validité de sa seule signature. On vérifie le représentant habilité et les autorisations requises.'], ['Un droit maintenu', 'La protection du mineur ne signifie pas qu’il n’a pas de patrimoine ou aucun droit à réparation. Elle encadre la manière d’agir.']],
      piege: '« Incapacité d’exercice » ne veut pas dire absence de personnalité. Ne pas supposer non plus qu’un représentant peut accomplir librement tous les actes.',
      question: ['Agir au nom d’une autre personne selon une habilitation est…', ['la représentation', 'la perte automatique de personnalité', 'une cassation'], 0, 'Le représentant accomplit l’acte pour la personne protégée dans les limites de son habilitation. Cette technique ne retire pas à celle-ci la titularité de ses droits.'],
      recap: ['Jouissance : avoir le droit ; exercice : agir soi-même.', 'Minorité civile : moins de dix-huit ans accomplis.', 'Représentation et autorisations à vérifier pour l’acte.'],
    }),
    cours('INFJ-MAG-PERSONNES', 3, 'PERS-IDENTITE', 'Identifier une personne par l’état civil', {
      objectif: 'Nous allons repérer les informations qui identifient une personne et les actes qui les constatent.',
      regle: 'L’**état civil** regroupe les qualités relatives à la situation d’une personne et les actes qui les constatent, notamment naissance, mariage et décès. Le **nom** identifie la personne selon les règles légales. Le **domicile** est un rattachement juridique ; il se distingue de la résidence, lieu où l’on vit en fait. Une copie d’acte ne crée pas librement une nouvelle identité : les corrections d’erreurs suivent les procédures de rectification applicables.',
      exemples: [['Deux documents différents', 'Un acte de naissance et un acte de mariage constatent des événements distincts. Le second peut entraîner des mentions sur d’autres actes selon les textes.'], ['Une adresse temporaire', 'Passer quelques semaines chez un proche ne suffit pas à conclure que tous les rattachements juridiques ont changé. Il faut examiner le domicile pertinent.']],
      piege: 'Ne pas corriger soi-même une copie d’acte pour régler une erreur : on vérifie la voie de rectification et l’autorité compétente.',
      question: ['Quel acte constate principalement la naissance ?', ['L’acte de naissance', 'Un arrêt de cassation', 'Une simple facture de téléphone'], 0, 'L’état civil consigne les événements dans les actes correspondants. Une facture peut donner une information matérielle mais ne remplace pas l’acte de naissance.'],
      recap: ['État civil : situation et actes de la personne.', 'Domicile et résidence ne sont pas synonymes.', 'Une erreur appelle une procédure de rectification.'],
    }),
    cours('INFJ-MAG-PERSONNES', 4, 'PERS-MARIAGE', 'Vérifier les conditions du mariage', {
      objectif: 'Nous allons appliquer les premières conditions de la loi ivoirienne de 2019 avant de parler des effets du mariage.',
      regle: 'La loi n° 2019-570 du 26 juin 2019 définit le mariage comme l’union d’un homme et d’une femme célébrée devant l’officier de l’état civil. Les futurs époux doivent avoir **dix-huit ans révolus** et consentir personnellement. La loi encadre les vices de ce consentement. Un nouveau mariage ne peut être contracté tant que le précédent n’est pas dissous dans les conditions légales. D’autres empêchements, notamment familiaux, doivent aussi être vérifiés.',
      exemples: [['L’âge', 'Une personne de 17 ans ne satisfait pas au seuil de l’article 2. Le seul accord de ses parents ne remplace pas cette condition.'], ['Un premier mariage', 'Dire qu’on vit séparé ne prouve pas que le mariage précédent est juridiquement dissous. On vérifie la décision ou l’acte requis et les formalités applicables.']],
      piege: 'Ne pas reprendre l’ancien âge différent selon le sexe. Une séparation de fait ne vaut pas à elle seule divorce.',
      question: ['Quel âge minimal retient l’article 2 de la loi de 2019 pour les deux futurs époux ?', ['Dix-huit ans révolus', 'Seize ans pour tous', 'Un âge choisi par les familles'], 0, 'Le texte fixe le même seuil de dix-huit ans pour l’homme et la femme. Une préférence familiale ne peut remplacer la condition légale.'],
      recap: ['Loi sur le mariage de 2019.', 'Dix-huit ans pour les deux époux.', 'Consentement personnel et absence d’empêchement.'],
    }),
    cours('INFJ-MAG-PERSONNES', 5, 'PERS-MARIAGE', 'Célébration et devoirs des époux', {
      objectif: 'Nous allons distinguer la formation légale du mariage des devoirs qu’il fait naître.',
      regle: 'La célébration devant l’**officier de l’état civil**, autorité habilitée à recevoir le mariage civil, s’inscrit dans les formes légales. Le mariage crée notamment des devoirs mutuels de respect, fidélité, secours et assistance, ainsi qu’une communauté de vie. Le **secours** porte notamment sur l’aide matérielle ; l’**assistance**, sur le soutien à l’autre. Les époux ne perdent pas leur personnalité juridique en se mariant.',
      exemples: [['Cérémonie et statut', 'Une cérémonie familiale ou religieuse ne remplace pas à elle seule la célébration civile exigée pour le mariage au sens de la loi de 2019.'], ['Devoir réciproque', 'Le devoir de secours n’est pas seulement une attente morale unilatérale : la loi le formule comme un devoir mutuel des époux.']],
      piege: 'La communauté de vie n’autorise pas les violences. La loi prévoit des mesures de résidence séparée en cas de danger, selon leurs conditions.',
      question: ['Les devoirs de respect et d’assistance sont…', ['mutuels entre époux', 'à la charge d’un seul époux par nature', 'supprimés par la cérémonie civile'], 0, 'L’article 45 présente ces devoirs comme réciproques. La célébration fait naître le statut matrimonial ; elle ne supprime pas les protections des personnes.'],
      recap: ['Célébration civile dans les formes légales.', 'Respect, fidélité, secours et assistance mutuels.', 'Le mariage ne supprime pas les droits de la personne.'],
    }),
    cours('INFJ-MAG-PERSONNES', 6, 'PERS-REGIMES', 'Distinguer mariage et régime des biens', {
      objectif: 'Nous allons poser la bonne question sur un bien : à qui appartient-il et selon quel régime ?',
      regle: 'Le **régime matrimonial** organise les rapports patrimoniaux des époux. Le **patrimoine** regroupe leurs droits et obligations évaluables en argent. La loi distingue notamment communauté de biens et séparation de biens. Un **bien propre** appartient personnellement à un époux ; un **bien commun** relève de la masse commune selon les règles du régime. La date, l’origine du bien et le régime choisi doivent être examinés avant de le classer.',
      exemples: [['Ne pas tout confondre', 'Le mariage ne rend pas automatiquement tous les biens communs. Un bien reçu par succession demande l’examen des règles sur les biens propres.'], ['Un titre et un financement', 'Voir un seul nom sur un document ne suffit pas toujours à régler toute question patrimoniale entre époux. On vérifie le régime et le mode d’acquisition.']],
      piege: 'Les devoirs du mariage et les règles de propriété sont deux plans différents. La séparation de biens ne supprime pas les devoirs de secours et d’assistance.',
      question: ['Avant de qualifier un bien de commun, on doit notamment connaître…', ['le régime matrimonial et l’origine du bien', 'uniquement sa couleur', 'uniquement le nombre d’enfants'], 0, 'La qualification patrimoniale dépend du régime et des conditions d’acquisition. Les informations sans rapport avec ces règles ne permettent pas de conclure.'],
      recap: ['Régime matrimonial : organisation du patrimoine.', 'Distinguer bien propre et masse commune.', 'Vérifier régime, date et origine du bien.'],
    }),
    cours('INFJ-MAG-PERSONNES', 7, 'PERS-REGIMES', 'Séparation, divorce et dissolution', {
      objectif: 'Nous allons distinguer trois situations que le langage courant appelle parfois toutes « séparation ».',
      regle: 'La **séparation de fait** est une situation matérielle de vie séparée. La **séparation de corps** est un mécanisme juridique qui aménage notamment la vie commune sans dissoudre le mariage. Le **divorce** dissout le mariage selon la procédure légale ; la loi ivoirienne relative au divorce et à la séparation de corps date de **2022**. La **liquidation** d’un régime matrimonial règle les comptes patrimoniaux. Le sort des enfants constitue une question distincte à traiter selon les textes.',
      exemples: [['Partir du domicile', 'Deux époux vivent dans deux villes. Ce fait ne prouve pas l’existence d’un divorce définitif.'], ['Plusieurs conséquences', 'Une décision de divorce pose la fin du lien conjugal. Il faut aussi régler les conséquences patrimoniales et les questions relatives aux enfants, sans les confondre.']],
      piege: 'La séparation de corps ne permet pas de se dire automatiquement libre de se remarier. Une décision doit être examinée avec ses effets et son caractère définitif.',
      question: ['Laquelle de ces situations dissout le mariage selon les conditions légales ?', ['Le divorce', 'Le simple départ temporaire', 'La seule séparation de fait'], 0, 'Le divorce produit une dissolution juridique. Vivre séparément, même longtemps, ne remplace pas le mécanisme légal de dissolution.'],
      recap: ['Fait matériel et statut juridique sont distincts.', 'Séparation de corps : mariage maintenu.', 'Divorce : dissolution et conséquences à régler.'],
    }),
    cours('INFJ-MAG-PERSONNES', 8, 'PERS-FILIATION', 'Établir un lien de filiation', {
      objectif: 'Nous allons reconnaître les principaux modes d’établissement du lien juridique parent-enfant.',
      regle: 'La **filiation** est le lien juridique entre un enfant et un parent. La loi n° 2019-571 du 26 juin 2019 organise son établissement. La **présomption** permet de tenir un fait pour établi selon une règle, sous les conditions de celle-ci : une présomption de paternité intervient pour les enfants dans le mariage. Hors mariage, la filiation paternelle se prouve par une reconnaissance ou un jugement. Une **reconnaissance** est un acte juridique établissant le lien dans les conditions légales.',
      exemples: [['Un acte pertinent', 'Pour établir la filiation, on cherche les actes d’état civil et le mode légal applicable. Une simple ressemblance physique n’est pas l’acte de reconnaissance.'], ['Lien et exercice', 'Établir qui est juridiquement parent ne règle pas à lui seul toutes les modalités de résidence ou d’exercice de l’autorité parentale. Ce sont des questions liées mais distinctes.']],
      piege: 'Ne pas déduire toute filiation d’un nom porté. Chaque mode d’établissement et chaque contestation ont leurs conditions.',
      question: ['Hors mariage, quel mode peut établir la filiation paternelle selon la loi étudiée ?', ['Une reconnaissance ou un jugement', 'Une simple rumeur', 'Le seul choix du voisinage'], 0, 'La loi prévoit reconnaissance ou jugement. Le lien ne se prouve pas par la seule opinion de tiers, même si certains faits peuvent être examinés selon les procédures prévues.'],
      recap: ['Filiation : lien juridique parent-enfant.', 'Vérifier le mode légal d’établissement.', 'Distinguer filiation et modalités d’autorité parentale.'],
    }),
  ],
  exercices: [
    exercice('INFJ-MAG-PERSONNES', 1, 'classer', 1, ['PERS-PERSONNALITE'], ['Les personnes', 'La personne physique est un être humain ; la personne morale est une organisation reconnue selon les conditions légales. Un objet n’est pas une personne.', 'Vérifier la reconnaissance juridique du groupement.'], {
      consigne: 'Classe ces titulaires de droits.', categories: ['Personne physique', 'Personne morale'], cartes: [['Un enfant', 0], ['Une société dotée de la personnalité morale', 1], ['Une adulte', 0]],
      explication: 'L’enfant et l’adulte sont des êtres humains : personnes physiques. La société décrite est dotée par hypothèse de personnalité : personne morale. L’âge n’enlève pas la qualité de personne.',
    }),
    exercice('INFJ-MAG-PERSONNES', 2, 'qcm', 1, ['PERS-CAPACITE'], ['Titularité et exercice', 'Avoir un droit et agir personnellement sont deux aptitudes distinctes. Une mesure de protection encadre l’exercice sans supprimer tous les droits.', 'Distinguer jouissance et exercice.'], {
      consigne: 'Un enfant possède un bien mais ne peut pas accomplir seul certains actes sur celui-ci. Quelle distinction explique la situation ?', options: ['Personnalité et capacité d’exercice', 'Appel et cassation seulement', 'Grâce et amnistie'], bonne: 0,
      explication: 'L’enfant peut être titulaire du bien. La loi peut pourtant exiger représentation ou autorisation pour un acte. La capacité d’exercice explique cette protection ; elle n’abolit pas la personnalité.',
    }),
    exercice('INFJ-MAG-PERSONNES', 3, 'relier', 1, ['PERS-IDENTITE'], ['État civil', 'Les actes d’état civil constatent des événements de la vie juridique. Le domicile est un rattachement juridique, distinct d’un séjour matériel.', 'Choisir le document correspondant à l’événement.'], {
      consigne: 'Relie l’événement à l’acte correspondant.', paires: [['Naissance', 'Acte de naissance'], ['Mariage civil', 'Acte de mariage'], ['Décès', 'Acte de décès']],
      explication: 'Chaque événement est inscrit dans l’acte approprié. Les éventuelles mentions sur d’autres actes permettent des liens, mais ne rendent pas naissance, mariage et décès interchangeables.',
    }),
    exercice('INFJ-MAG-PERSONNES', 4, 'qcm', 1, ['PERS-MARIAGE'], ['Conditions du mariage', 'La loi de 2019 fixe des conditions personnelles et des formes. Le consentement des familles ne remplace ni l’âge légal ni le consentement personnel des futurs époux.', 'Vérifier chaque condition.'], {
      consigne: 'Une future épouse a 17 ans et son futur époux 20 ans. L’accord des parents suffit-il à satisfaire l’âge exigé par l’article 2 ?', options: ['Non : elle n’a pas dix-huit ans révolus', 'Oui, dès lors que le futur époux est majeur', 'Oui, si les familles signent'], bonne: 0,
      explication: 'L’article 2 exige dix-huit ans pour l’homme et la femme. La future épouse ne remplit pas le seuil ; l’âge de l’autre et l’accord parental ne le remplacent pas.',
    }),
    exercice('INFJ-MAG-PERSONNES', 5, 'vf', 1, ['PERS-MARIAGE'], ['Forme civile', 'Le mariage au sens de la loi de 2019 est célébré devant l’officier de l’état civil dans les conditions légales. Les cérémonies sociales ont une autre fonction.', 'Distinguer cérémonie et statut légal.'], {
      consigne: 'Vrai ou faux ?', affirmations: [['Une cérémonie familiale suffit à elle seule à remplacer la célébration civile exigée par la loi de 2019.', false], ['Le mariage crée des devoirs mutuels de respect et d’assistance.', true]],
      explication: 'La première phrase confond cérémonie familiale et célébration légale : elle est fausse. La seconde reprend la réciprocité des devoirs du mariage : elle est vraie.',
    }),
    exercice('INFJ-MAG-PERSONNES', 6, 'relier', 2, ['PERS-REGIMES'], ['Patrimoine familial', 'Le régime organise les relations patrimoniales. La qualification d’un bien dépend des règles de ce régime et des conditions de son acquisition.', 'Le mariage ne rend pas tous les biens identiques.'], {
      consigne: 'Relie chaque terme à sa définition.', paires: [['Régime matrimonial', 'Organisation des rapports patrimoniaux des époux'], ['Bien propre', 'Bien personnel à un époux selon le régime'], ['Liquidation', 'Règlement des comptes du régime']],
      explication: 'Le régime donne les règles générales. Le bien propre appartient personnellement à l’époux selon ces règles. La liquidation intervient pour établir et régler les comptes, notamment lors de la dissolution du régime.',
    }),
    exercice('INFJ-MAG-PERSONNES', 7, 'classer', 2, ['PERS-REGIMES'], ['Séparations', 'Une situation matérielle ne remplace pas une décision juridique. La séparation de corps maintient le lien conjugal, tandis que le divorce le dissout selon la loi.', 'Identifier l’effet sur le mariage.'], {
      consigne: 'Classe ces situations selon l’effet indiqué.', categories: ['Mariage non dissous par ce seul fait', 'Dissolution du mariage'], cartes: [['Simple vie séparée', 0], ['Séparation de corps', 0], ['Divorce devenu définitif selon la loi', 1]],
      explication: 'La vie séparée est un fait ; la séparation de corps aménage le statut sans dissoudre le lien. Le divorce définitif réalise la dissolution prévue, sous réserve des formalités et conséquences applicables.',
    }),
    exercice('INFJ-MAG-PERSONNES', 8, 'qcm', 2, ['PERS-FILIATION'], ['Filiation', 'La filiation est établie par des modes légaux adaptés à la situation. L’état civil, la reconnaissance et le jugement doivent être distingués d’indices sociaux.', 'Chercher le fondement juridique du lien.'], {
      consigne: 'Hors mariage, un homme dit oralement à des voisins être le père d’un enfant. Quelle démarche juridique faut-il examiner ?', options: ['Le mode légal d’établissement, notamment reconnaissance ou jugement', 'La transformation automatique de la rumeur en acte', 'Une simple décision des voisins'], bonne: 0,
      explication: 'L’opinion du voisinage ne remplace pas la reconnaissance ni le jugement requis pour établir la filiation paternelle hors mariage. Il faut vérifier la forme et les conditions du mode légal envisagé.',
    }),
    exercice('INFJ-MAG-PERSONNES', 9, 'qcm', 2, ['PERS-IDENTITE'], ['Rectification', 'Une erreur d’état civil se corrige par la voie compétente. Une modification personnelle d’une copie ne rectifie pas le registre.', 'Identifier l’acte et l’autorité de correction.'], {
      consigne: 'Un prénom est erroné dans un acte d’état civil. Quelle démarche est rigoureuse ?', options: ['Vérifier la procédure de rectification applicable', 'Modifier soi-même toutes les copies au stylo', 'Ignorer l’acte et fabriquer une nouvelle identité'], bonne: 0,
      explication: 'L’erreur concerne un acte officiel. On doit vérifier la procédure et l’autorité permettant la rectification ; une retouche sur une copie ne modifie pas légalement l’état civil.',
    }),
    exercice('INFJ-MAG-PERSONNES', 10, 'entourer', 2, ['PERS-MARIAGE'], ['Contrôler la formation', 'Le mariage demande notamment un âge légal, un consentement personnel et l’absence d’empêchement. Les formes légales restent à respecter.', 'Un accord social n’efface pas les exigences légales.'], {
      consigne: 'Sélectionne les vérifications juridiquement pertinentes avant un mariage.', elements: [['Âge des futurs époux', true], ['Consentement personnel', true], ['Existence d’un mariage antérieur non dissous', true], ['Popularité de la cérémonie', false]],
      explication: 'L’âge et le consentement sont des conditions personnelles. Un mariage antérieur non dissous est un obstacle légal. La popularité de la cérémonie n’est pas un critère de validité.',
    }),
    exercice('INFJ-MAG-PERSONNES', 11, 'qcm', 3, ['PERS-CAPACITE', 'PERS-PERSONNALITE'], ['Actes d’une personne protégée', 'On distingue propriété du droit, capacité d’exercice et pouvoir du représentant. Les conditions dépendent de l’acte envisagé.', 'Vérifier les pouvoirs et autorisations.'], {
      consigne: 'Un représentant veut vendre un immeuble appartenant à un mineur. Quelle analyse est correcte ?', options: ['Vérifier son habilitation et les autorisations propres à la vente', 'Considérer qu’il peut tout faire sans contrôle', 'Considérer que le bien ne peut appartenir à un mineur'], bonne: 0,
      explication: 'Le mineur peut être propriétaire. L’acte important doit être accompli suivant son régime de protection : pouvoirs du représentant et autorisations sont à examiner. La représentation n’est pas un pouvoir illimité.',
    }),
    exercice('INFJ-MAG-PERSONNES', 12, 'qcm', 3, ['PERS-REGIMES', 'PERS-MARIAGE'], ['Deux plans du mariage', 'La propriété des biens est régie par le régime matrimonial. Les devoirs personnels et familiaux obéissent à d’autres dispositions qui ne disparaissent pas par le seul choix patrimonial.', 'Ne pas confondre biens et devoirs.'], {
      consigne: 'Des époux sont séparés de biens. Cela supprime-t-il à soi seul leur devoir mutuel d’assistance ?', options: ['Non, régime des biens et devoirs du mariage sont distincts', 'Oui, toute obligation disparaît', 'Oui, le mariage devient inexistant'], bonne: 0,
      explication: 'La séparation de biens organise le patrimoine. Elle ne supprime pas le lien matrimonial ni les devoirs mutuels prévus par la loi, dont l’assistance.',
    }),
    exercice('INFJ-MAG-PERSONNES', 13, 'qcm', 3, ['PERS-FILIATION'], ['Lien et conséquences', 'Établir la filiation identifie un parent en droit. Les modalités d’autorité parentale, de résidence et d’entretien appellent des analyses complémentaires.', 'Un lien établi ne règle pas toute conséquence.'], {
      consigne: 'La filiation paternelle est établie. Peut-on en déduire sans autre examen toutes les modalités de résidence de l’enfant ?', options: ['Non, ces modalités répondent à des règles et décisions distinctes', 'Oui, automatiquement dans tous les cas', 'Oui, au seul choix des voisins'], bonne: 0,
      explication: 'Le lien parent-enfant est la première question. La résidence et l’exercice de l’autorité parentale nécessitent ensuite l’examen des règles et décisions pertinentes ; la filiation ne résout pas seule tous les conflits.',
    }),
    exercice('INFJ-MAG-PERSONNES', 14, 'ordre', 3, ['PERS-MARIAGE', 'PERS-REGIMES'], ['Méthode familiale', 'Un cas familial demande de partir des faits et actes, puis des règles applicables et de leurs effets. Une séparation matérielle ne prouve pas une dissolution.', 'Qualifier avant de conclure.'], {
      consigne: 'Ordonne l’analyse d’une personne mariée souhaitant se remarier après une séparation.', mode: 'exact', elements: ['Identifier le mariage antérieur et les actes disponibles', 'Vérifier s’il est juridiquement dissous et les formalités requises', 'Examiner les autres conditions du nouveau mariage', 'Conclure sur la possibilité légale de la nouvelle union'],
      explication: 'On établit d’abord le statut existant. On recherche une dissolution légale, pas seulement une vie séparée, puis les formalités. Les autres conditions du nouveau mariage restent à contrôler avant la conclusion.',
    }),
  ],
};


const procedureCivile = {
  code: 'INFJ-MAG-PROCCIV', matiere: 'Droit civil', titre: 'Procédure civile',
  resume: 'De l’action en justice au jugement : recevabilité, compétence, saisine, preuve, urgence et recours.',
  notions: [
    { code: 'PC-ACTION', libelle: 'Action, intérêt, qualité et capacité' },
    { code: 'PC-COMPETENCE', libelle: 'Compétence matérielle et territoriale' },
    { code: 'PC-INSTANCE', libelle: 'Saisine et contradictoire' },
    { code: 'PC-PREUVE', libelle: 'Prétentions, moyens et preuve' },
    { code: 'PC-DEFENSE', libelle: 'Défenses et recevabilité' },
    { code: 'PC-RECOURS', libelle: 'Jugement, référé et voies de recours' },
  ],
  lecons: [
    cours('INFJ-MAG-PROCCIV', 1, 'PC-ACTION', 'Du droit invoqué à l’action en justice', {
      objectif: 'Nous allons passer des obligations étudiées dans DROIT-CONTRAT à la manière de les faire examiner par un juge.',
      regle: 'Une obligation permet au créancier de réclamer une prestation au débiteur. L’**action en justice** permet de soumettre une prétention au juge. La **procédure** fixe la manière d’agir : forme, délais et échanges. Le droit ivoirien s’appuie notamment sur le Code de procédure civile, commerciale et administrative de 1972, modifié depuis, ainsi que sur les textes spéciaux et OHADA applicables. Une action **recevable** peut être examinée ; elle n’est pas nécessairement **fondée**, c’est-à-dire justifiée sur le fond.',
      exemples: [['Deux examens', 'Une demande de remboursement peut être recevable puis rejetée faute de preuve de la dette. Le droit d’être entendu ne garantit pas de gagner.'], ['Un obstacle préalable', 'Un défaut de recevabilité peut empêcher le juge d’examiner le fond. Il faut donc vérifier la procédure même si l’on pense avoir raison.']],
      piege: 'Une bonne argumentation sur la dette ne corrige pas automatiquement un recours tardif ou une autre condition de recevabilité manquante.',
      question: ['« Recevable » signifie que la demande…', ['peut être examinée selon ses conditions procédurales', 'est nécessairement gagnante', 'est déjà exécutée'], 0, 'La recevabilité ouvre l’examen. Le juge doit encore vérifier si la prétention est bien fondée sur le droit et les faits.',
      ], recap: ['Procédure : règles pour agir.', 'Recevabilité et bien-fondé sont distincts.', 'Textes généraux et spéciaux à articuler.'],
    }),
    cours('INFJ-MAG-PROCCIV', 2, 'PC-ACTION', 'Qui peut agir et pour quel intérêt ?', {
      objectif: 'Nous allons contrôler la situation du demandeur avant d’examiner le juge à saisir.',
      regle: 'L’**intérêt à agir** est l’utilité juridiquement protégée recherchée par l’action. La **qualité à agir** est le titre permettant de présenter la demande lorsque le droit le requiert. La **capacité d’exercice**, rappelée dans PERSONNES, est l’aptitude à agir soi-même ; la représentation peut être nécessaire. L’**habilitation** du représentant détermine ses pouvoirs. Ces contrôles se distinguent de la preuve du droit invoqué.',
      exemples: [['Un droit personnel', 'Une personne réclame le paiement d’une dette qu’elle présente comme la sienne. Le voisin ne peut pas la réclamer en son nom propre par simple curiosité. Savoir si la dette existe réellement relève ensuite du fond.'], ['Représenter un mineur', 'Le droit peut appartenir à un mineur, mais la procédure exige de vérifier qui peut agir pour lui et avec quels pouvoirs.']],
      piege: 'Avoir un intérêt affectif pour un conflit ne donne pas automatiquement qualité pour présenter toutes les demandes. Être titulaire d’un droit ne suffit pas toujours à agir seul.',
      question: ['Agir au nom d’un mineur impose notamment de vérifier…', ['l’habilitation et les pouvoirs du représentant', 'uniquement la distance du tribunal', 'le nombre de pages de la demande'], 0, 'La représentation protège l’exercice des droits. Il faut identifier la personne habilitée et les limites de ses pouvoirs avant d’engager la procédure.'],
      recap: ['Intérêt, qualité et capacité se vérifient séparément.', 'Le représentant doit être habilité.', 'Ces conditions ne prouvent pas encore le fond.'],
    }),
    cours('INFJ-MAG-PROCCIV', 3, 'PC-COMPETENCE', 'Quel juge peut connaître de l’affaire ?', {
      objectif: 'Nous allons utiliser les distinctions de DROIT-ORGJUD dans un raisonnement de compétence concret.',
      regle: 'La compétence **matérielle** dépend du type de litige et des attributions légales. La compétence **territoriale** détermine le ressort pertinent. La juridiction de **droit commun** traite les affaires non attribuées spécialement ; une juridiction spécialisée reçoit les matières définies par la loi. Le domicile du défendeur est un repère de droit commun territorial, mais des règles spéciales ou options existent, notamment selon l’objet du litige. Il faut vérifier le texte applicable.',
      exemples: [['Deux contrôles', 'Une affaire peut être commerciale sans relever du ressort du tribunal de commerce d’Abidjan. Matière et territoire doivent être établis.'], ['Un immeuble', 'Un conflit portant sur un immeuble demande l’examen de la règle territoriale propre à la demande. On ne choisit pas le tribunal par simple convenance personnelle.']],
      piege: 'Droit commun ne signifie pas compétence universelle. La présence d’une clause contractuelle de compétence exige aussi d’en vérifier la validité et la portée.',
      question: ['Le ressort d’une juridiction relève de la compétence…', ['territoriale', 'morale', 'matrimoniale uniquement'], 0, 'Le ressort délimite l’espace couvert. La compétence matérielle concerne, elle, la nature des affaires confiées à la juridiction.'],
      recap: ['Matière : quel type de juridiction ?', 'Territoire : quel ressort ?', 'Vérifier les règles et exceptions de la demande.'],
    }),
    cours('INFJ-MAG-PROCCIV', 4, 'PC-INSTANCE', 'Saisir le juge et informer l’adversaire', {
      objectif: 'Nous allons suivre l’entrée d’une demande dans le procès sans supposer une forme identique pour toutes les affaires.',
      regle: 'La **saisine** porte une demande devant une juridiction selon une forme légale. L’**assignation** est un acte qui appelle l’adversaire à comparaître ; d’autres procédures utilisent une requête ou une autre forme prévue. L’**instance** est le déroulement procédural du procès. La **notification** porte officiellement un acte à connaissance ; la **signification** en est une forme accomplie par un professionnel habilité. Le **contradictoire** permet à chacun de discuter demandes, arguments et pièces.',
      exemples: [['Un acte précis', 'L’assignation doit permettre d’identifier la demande et la comparution attendue. Envoyer un message informel n’est pas automatiquement une saisine régulière.'], ['Un dossier échangé', 'Une pièce produite doit être communiquée selon la procédure pour que l’adversaire puisse y répondre. Le juge ne travaille pas sur une preuve secrète acceptée sans discussion.']],
      piege: 'Tous les procès ne commencent pas par la même forme. Une audience publique ne remplace pas la communication des pièces entre les parties.',
      question: ['Le contradictoire permet principalement…', ['de connaître et discuter les éléments débattus', 'de choisir seul le juge', 'de supprimer toute formalité'], 0, 'La partie adverse doit pouvoir répondre aux demandes et preuves. La contradiction est une possibilité de discussion, pas un pouvoir de modifier les règles du procès.'],
      recap: ['Vérifier la forme légale de saisine.', 'Notification et signification portent l’acte à connaissance.', 'Échanger les pièces et arguments.'],
    }),
    cours('INFJ-MAG-PROCCIV', 5, 'PC-PREUVE', 'Demander, argumenter, prouver', {
      objectif: 'Nous allons distinguer ce qu’on réclame, pourquoi on le réclame et comment on l’établit.',
      regle: 'Une **prétention** est le résultat demandé au juge. Un **moyen** est un argument de fait ou de droit qui la soutient. Une **preuve** établit un fait pertinent dans les conditions légales. La **charge de la preuve** indique qui doit démontrer quoi : celui qui réclame l’exécution doit établir l’obligation ; celui qui se dit libéré doit justifier le paiement ou le fait qui éteint la dette, sous réserve des règles spéciales.',
      exemples: [['Demander un remboursement', '« Condamner au paiement » est une prétention. « Il existe un prêt exigible » est un moyen ; l’acte de prêt et les éléments recevables servent de preuves.'], ['Opposer le paiement', 'Le défendeur affirme avoir payé. Il doit produire les éléments établissant ce paiement selon le régime de preuve applicable.']],
      piege: 'Une affirmation répétée n’est pas une preuve. Les règles sur l’admissibilité des moyens de preuve varient ; tout support n’est pas automatiquement suffisant.',
      question: ['« J’ai déjà remboursé » est une affirmation qui appelle…', ['la justification du paiement allégué', 'une victoire automatique', 'la suppression du contradictoire'], 0, 'Le paiement est le fait libératoire invoqué. Il doit être établi selon les règles de preuve, puis discuté contradictoirement.'],
      recap: ['Prétention : résultat ; moyen : argument.', 'Preuve : établir le fait pertinent.', 'Distinguer obligation alléguée et libération alléguée.'],
    }),
    cours('INFJ-MAG-PROCCIV', 6, 'PC-DEFENSE', 'Trois manières de contester une demande', {
      objectif: 'Nous allons classer les objections pour comprendre ce que le juge doit examiner.',
      regle: 'La **défense au fond** conteste le bien-fondé : la dette n’existe pas ou a été payée. Une **exception de procédure** conteste notamment la régularité de la procédure ou la compétence. Une **fin de non-recevoir** vise la recevabilité sans faire trancher le fond, par exemple un défaut de qualité dans les conditions applicables. Le moment et la forme pour soulever chaque objection doivent être vérifiés dans les textes.',
      exemples: [['Mauvais juge', 'Dire « cette juridiction n’est pas compétente » soulève une question de procédure, pas la preuve du remboursement.'], ['Pas de dette', 'Dire « je n’ai jamais emprunté cette somme » conteste le fond du droit invoqué. Cela se distingue d’un défaut de qualité à agir.']],
      piege: 'Ne pas confondre nullité du contrat et nullité d’un acte de procédure. La première concerne l’opération civile, la seconde la régularité du procès.',
      question: ['« La somme a été intégralement remboursée » constitue principalement…', ['une défense au fond', 'une exception d’incompétence', 'une élection de domicile seulement'], 0, 'La partie soutient que la dette n’est plus due. Elle conteste donc le bien-fondé de la prétention en paiement, et non le pouvoir du tribunal de l’examiner.'],
      recap: ['Fond : droit invoqué.', 'Exception : procédure.', 'Non-recevoir : recevabilité ; calendrier à vérifier.'],
    }),
    cours('INFJ-MAG-PROCCIV', 7, 'PC-RECOURS', 'Le référé répond à certaines urgences', {
      objectif: 'Nous allons comprendre pourquoi une mesure rapide ne tranche pas forcément tout le litige.',
      regle: 'Le **référé** est une procédure permettant d’obtenir des mesures dans les conditions prévues, notamment d’urgence. Le juge statue par **ordonnance**, nom donné à certaines décisions. Il ne doit pas **préjudicier au principal**, c’est-à-dire trancher définitivement le fond du droit à la place du juge du fond. Les pouvoirs exacts et l’existence d’une contestation sérieuse doivent être vérifiés au regard de la mesure demandée.',
      exemples: [['Conserver une situation', 'Une mesure provisoire peut protéger un intérêt en attendant la décision au fond. Son caractère rapide ne prouve pas que tout le droit litigieux est définitivement établi.'], ['Deux demandes', 'Un même dossier peut comporter une mesure relevant du référé et une demande exigeant un examen au fond. Il faut raisonner demande par demande.']],
      piege: 'Urgence ne signifie pas compétence illimitée. Une ordonnance de référé ne règle pas automatiquement toutes les demandes d’argent.',
      question: ['Ne pas préjudicier au principal signifie ici…', ['ne pas trancher définitivement le fond à la place du juge compétent', 'ne jamais rendre de décision', 'interdire toute mesure provisoire'], 0, 'Le référé peut produire une décision utile, mais sa fonction demeure limitée. La mesure provisoire et la décision définitive sur le fond ne se confondent pas.'],
      recap: ['Référé : pouvoirs définis par les textes.', 'Mesure provisoire et fond sont distincts.', 'Examiner chaque demande séparément.'],
    }),
    cours('INFJ-MAG-PROCCIV', 8, 'PC-RECOURS', 'Choisir une voie de recours', {
      objectif: 'Nous allons construire une méthode de choix du recours sans mémoriser un délai unique inexistant.',
      regle: 'Un **jugement** est une décision juridictionnelle ; un **arrêt** est notamment rendu par une cour. L’**opposition**, dans les cas où elle est ouverte, permet de faire réexaminer une décision par défaut par la juridiction qui l’a rendue. L’**appel** réexamine en fait et en droit dans ses limites. Le **pourvoi** contrôle le droit d’une décision en dernier ressort. La nature de la décision, sa notification, les textes et les délais déterminent le recours ouvert.',
      exemples: [['Décision par défaut', 'L’absence d’une partie ne suffit pas à ouvrir automatiquement une opposition : il faut vérifier la qualification de la décision et les textes.'], ['Après l’appel', 'Une erreur juridique reprochée à un arrêt conduit à examiner le pourvoi. En droit OHADA, on vérifie la compétence particulière de la CCJA rappelée dans DROIT-ORGJUD.']],
      piege: 'Ne pas appliquer un délai d’appel unique à toute matière ni supposer que tout recours suspend l’exécution. Ces effets dépendent du régime applicable.',
      question: ['Avant de choisir un recours, il faut notamment vérifier…', ['la nature de la décision, la notification et le texte de délai', 'seulement la colère de la partie', 'uniquement le nombre de témoins'], 0, 'Le recours dépend de conditions procédurales précises. La qualification de la décision et le point de départ du délai précèdent l’examen de la critique qu’on souhaite former.'],
      recap: ['Opposition, appel et pourvoi : objets différents.', 'Vérifier ouverture, point de départ et délai.', 'Pas d’effet suspensif supposé sans texte.'],
    }),
  ],
  exercices: [
    exercice('INFJ-MAG-PROCCIV', 1, 'qcm', 1, ['PC-ACTION'], ['Recevabilité', 'La recevabilité ouvre l’examen juridictionnel. Le bien-fondé dépend ensuite de la règle et des faits établis.', 'Pouvoir être examiné ne garantit pas de gagner.'], {
      consigne: 'Une demande recevable peut-elle être rejetée au fond ?', options: ['Oui, si le droit invoqué n’est pas établi', 'Non, recevable signifie gagnante', 'Non, le juge ne peut plus lire les preuves'], bonne: 0,
      explication: 'Le premier examen porte sur l’accès à l’examen de la demande. Le second porte sur son bien-fondé : sans preuve suffisante du droit, elle peut être rejetée malgré sa recevabilité.',
    }),
    exercice('INFJ-MAG-PROCCIV', 2, 'relier', 1, ['PC-ACTION'], ['Conditions pour agir', 'L’intérêt, la qualité et la capacité sont des contrôles distincts. La représentation suppose une habilitation.', 'Ne pas remplacer une condition par une autre.'], {
      consigne: 'Associe le terme à sa définition.', paires: [['Intérêt', 'Utilité juridiquement protégée recherchée'], ['Qualité', 'Titre requis pour présenter une demande'], ['Capacité d’exercice', 'Aptitude à agir soi-même']],
      explication: 'L’intérêt concerne l’utilité recherchée. La qualité concerne le titre permettant d’agir. La capacité concerne l’exercice personnel : un intérêt réel ne dispense pas de représentation si elle est requise.',
    }),
    exercice('INFJ-MAG-PROCCIV', 3, 'classer', 1, ['PC-COMPETENCE'], ['Compétence', 'La matière détermine le type de juge ; le territoire, le ressort. Les textes spéciaux peuvent écarter un repère de droit commun.', 'Faire deux vérifications.'], {
      consigne: 'Classe chaque question.', categories: ['Compétence matérielle', 'Compétence territoriale'], cartes: [['Affaire civile ou commerciale ?', 0], ['Quel ressort géographique ?', 1], ['Litige attribué à une juridiction spécialisée ?', 0]],
      explication: 'La nature et la spécialisation de l’affaire relèvent de la matière. Le ressort est géographique : il relève du territoire. Les deux peuvent poser problème dans un même dossier.',
    }),
    exercice('INFJ-MAG-PROCCIV', 4, 'glisser', 1, ['PC-INSTANCE'], ['Entrée dans l’instance', 'L’assignation appelle l’adversaire à comparaître. Le contradictoire garantit la discussion des éléments du procès.', 'Vérifier la forme exigée pour la demande.'], {
      consigne: 'Complète le vocabulaire.', texte: 'Une {{assignation}} appelle l’adversaire à comparaître. Le {{contradictoire}} permet de discuter les pièces.', distracteurs: ['divorce', 'régime matrimonial'],
      explication: 'L’assignation est un acte procédural d’appel à comparaître. Le contradictoire organise la connaissance et la discussion du dossier ; aucun de ces termes ne désigne une dissolution du mariage.',
    }),
    exercice('INFJ-MAG-PROCCIV', 5, 'relier', 1, ['PC-PREUVE'], ['Trois éléments du dossier', 'La prétention est le résultat demandé, le moyen l’argument et la preuve le support d’un fait pertinent.', 'Ne pas confondre affirmer et démontrer.'], {
      consigne: 'Associe ces éléments à leur rôle.', paires: [['Demander la condamnation au remboursement', 'Prétention'], ['Soutenir qu’un prêt est arrivé à échéance', 'Moyen'], ['Produire une pièce recevable établissant le prêt', 'Preuve']],
      explication: 'Le remboursement est le résultat voulu. L’existence d’un prêt exigible justifie cette demande : c’est l’argument. La pièce établissant le fait soutient cet argument à titre de preuve.',
    }),
    exercice('INFJ-MAG-PROCCIV', 6, 'classer', 2, ['PC-DEFENSE'], ['Objections distinctes', 'Une objection peut porter sur le droit au fond, la procédure ou la recevabilité. Sa qualification détermine les règles pour la soulever.', 'Identifier l’objet précis de l’objection.'], {
      consigne: 'Classe l’objection principale.', categories: ['Défense au fond', 'Exception de procédure', 'Fin de non-recevoir'], cartes: [['La dette a été payée', 0], ['Le tribunal saisi est incompétent', 1], ['Le demandeur n’a pas la qualité légalement requise', 2]],
      explication: 'Le paiement conteste ce qui reste dû : fond. L’incompétence concerne le pouvoir du juge : procédure. Le défaut de qualité vise l’accès à l’examen de la demande : recevabilité.',
    }),
    exercice('INFJ-MAG-PROCCIV', 7, 'qcm', 2, ['PC-PREUVE'], ['Charge de la preuve', 'Le créancier établit l’obligation qu’il invoque. Celui qui allègue sa libération doit justifier le fait libératoire, sous réserve des règles spéciales.', 'Identifier ce que chacun affirme.'], {
      consigne: 'Le prêt est établi. Le débiteur affirme l’avoir remboursé. Que doit-il notamment justifier ?', options: ['Le paiement allégué', 'Uniquement l’existence d’autres tribunaux', 'La personnalité du juge'], bonne: 0,
      explication: 'La dette est établie par hypothèse. Le fait nouveau invoqué est sa disparition par paiement : le débiteur doit le justifier selon les règles de preuve applicables.',
    }),
    exercice('INFJ-MAG-PROCCIV', 8, 'vf', 2, ['PC-RECOURS'], ['Urgence et fond', 'Le référé permet certaines mesures définies par le droit applicable. Il ne remplace pas un examen définitif de toutes les questions de fond.', 'La rapidité ne crée pas un pouvoir illimité.'], {
      consigne: 'Vrai ou faux ?', affirmations: [['L’urgence permet au juge des référés de trancher automatiquement tout le fond du litige.', false], ['Il faut examiner les pouvoirs du juge pour chaque mesure demandée.', true]],
      explication: 'L’urgence ne supprime pas les limites du référé : la première phrase est fausse. La seconde est vraie, car la nature de chaque demande détermine si la mesure entre dans ses pouvoirs.',
    }),
    exercice('INFJ-MAG-PROCCIV', 9, 'ordre', 2, ['PC-INSTANCE', 'PC-PREUVE'], ['Discussion du dossier', 'Pour qu’un élément soit discuté, il faut le produire selon la procédure et permettre à l’autre partie de répondre avant la décision qui s’en sert.', 'Préserver l’échange contradictoire.'], {
      consigne: 'Ordonne ce schéma de discussion d’une pièce nouvelle.', mode: 'exact', elements: ['Produire et communiquer régulièrement la pièce', 'Permettre à l’adversaire d’en prendre connaissance', 'Recueillir sa discussion dans les conditions procédurales', 'Statuer en tenant compte des éléments contradictoirement débattus'],
      explication: 'La pièce entre régulièrement au dossier et est communiquée. L’adversaire peut alors la connaître puis la discuter. La décision intervient après cette possibilité d’échange, selon la procédure applicable.',
    }),
    exercice('INFJ-MAG-PROCCIV', 10, 'qcm', 2, ['PC-RECOURS'], ['Voies de recours', 'L’appel permet un réexamen en fait et en droit dans ses limites. Le pourvoi contrôle la régularité juridique de la décision en dernier ressort.', 'Vérifier le recours ouvert.'], {
      consigne: 'Quel recours permet en principe un second examen en fait et en droit lorsqu’il est ouvert ?', options: ['L’appel', 'La grâce', 'L’avis du CESEC'], bonne: 0,
      explication: 'L’appel porte l’affaire devant le juge du second degré. La grâce concerne une peine pénale et l’avis consultatif ne constitue pas une voie de recours judiciaire.',
    }),
    exercice('INFJ-MAG-PROCCIV', 11, 'qcm', 3, ['PC-DEFENSE', 'PC-ACTION'], ['Analyser le rejet', 'Un rejet peut venir de l’irrecevabilité ou du fond. Il faut lire le motif avant d’en déduire ce qui a été jugé.', 'Dispositif et motifs doivent être rapprochés.'], {
      consigne: 'Une décision déclare une demande irrecevable pour défaut de qualité, sans examiner la dette. Peut-on dire qu’elle a constaté l’inexistence de la dette ?', options: ['Non, le fond n’a pas été tranché par ce motif', 'Oui, toute irrecevabilité prouve l’absence de dette', 'Oui, toute demande rejetée est frauduleuse'], bonne: 0,
      explication: 'Le défaut de qualité empêche l’examen au fond dans cette hypothèse. La décision ne répond donc pas à la question de l’existence de la dette ; on ne doit pas lui attribuer une conclusion qu’elle n’a pas prise.',
    }),
    exercice('INFJ-MAG-PROCCIV', 12, 'entourer', 3, ['PC-RECOURS'], ['Vérifier le recours', 'La voie ouverte dépend de la décision, de son régime et de la notification. Son effet sur l’exécution doit être vérifié séparément.', 'Pas de délai ou de suspension universels.'], {
      consigne: 'Sélectionne les informations à vérifier avant de former un recours.', elements: [['Nature et qualification de la décision', true], ['Texte et point de départ du délai', true], ['Juridiction compétente pour le recours', true], ['Supposition que tout recours suspend toujours l’exécution', false]],
      explication: 'Les trois premières informations déterminent la voie, sa recevabilité et sa destination. La dernière est une supposition erronée : l’effet suspensif dépend des textes et ne se présume pas universellement.',
    }),
    exercice('INFJ-MAG-PROCCIV', 13, 'qcm', 3, ['PC-RECOURS', 'PC-COMPETENCE'], ['Contrôle de cassation', 'Pour un litige relevant des normes OHADA, la compétence de cassation doit être examinée au regard du Traité. La CCJA ne devient pas pour autant le juge initial.', 'Distinguer matière et degré.'], {
      consigne: 'Une affaire jugée en dernier ressort soulève l’application d’un Acte uniforme. Quelle démarche est correcte avant un pourvoi ?', options: ['Vérifier la compétence de la CCJA selon le Traité et ses exclusions', 'Saisir automatiquement le Conseil constitutionnel', 'Recommencer toujours en première instance'], bonne: 0,
      explication: 'La norme OHADA est un élément déterminant pour la compétence de cassation. On vérifie le champ du Traité, notamment ses exclusions, au lieu de choisir automatiquement la Cour nationale ou le Conseil constitutionnel.',
    }),
    exercice('INFJ-MAG-PROCCIV', 14, 'ordre', 3, ['PC-ACTION', 'PC-COMPETENCE', 'PC-PREUVE'], ['Préparer une demande', 'Un dossier solide articule qualité pour agir, juge compétent, forme de saisine et preuve du droit. Une conviction personnelle ne remplace aucun de ces contrôles.', 'Construire la demande avant de conclure.'], {
      consigne: 'Ordonne cette méthode pédagogique de préparation d’une demande de paiement.', mode: 'exact', elements: ['Identifier la prétention et la personne habilitée à agir', 'Vérifier la juridiction compétente', 'Déterminer les formes, délais et pièces nécessaires', 'Présenter les moyens et preuves dans le respect du contradictoire'],
      explication: 'On précise d’abord ce qui est demandé et par qui. On choisit le juge compétent, puis on vérifie le mode de saisine et le dossier. Les arguments et pièces doivent ensuite être discutés selon la procédure.',
    }),
  ],
};


const procedurePenale = {
  code: 'INFJ-MAG-PROCPEN', matiere: 'Droit pénal', titre: 'Procédure pénale',
  resume: 'Garanties, actions, enquête, instruction, liberté, jugement et recours dans le procès pénal ivoirien.',
  notions: [
    { code: 'PP-GARANTIES', libelle: 'Présomption d’innocence et droits de la défense' },
    { code: 'PP-ACTIONS', libelle: 'Action publique, action civile et plainte' },
    { code: 'PP-ENQUETE', libelle: 'Enquêtes et garde à vue' },
    { code: 'PP-INSTRUCTION', libelle: 'Information à charge et à décharge' },
    { code: 'PP-LIBERTE', libelle: 'Liberté, contrôle judiciaire et détention' },
    { code: 'PP-JUGEMENT', libelle: 'Juridictions et décisions pénales' },
    { code: 'PP-RECOURS', libelle: 'Voies de recours et extinction de l’action' },
  ],
  lecons: [
    cours('INFJ-MAG-PROCPEN', 1, 'PP-GARANTIES', 'Poursuivre sans présumer la culpabilité', {
      objectif: 'Nous allons passer de l’infraction étudiée dans DROIT-PENAL aux garanties de la personne mise en cause.',
      regle: 'Le droit pénal définit infractions et peines ; la **procédure pénale** organise leur recherche, les poursuites et le jugement. Le Code ivoirien est issu de la loi du **27 décembre 2018**, modifiée depuis. La **présomption d’innocence** interdit de traiter la culpabilité comme établie avant qu’elle le soit judiciairement. Les **droits de la défense** comprennent notamment information sur les charges et assistance d’un conseil. Les fonctions de poursuite, d’instruction et de jugement sont en principe séparées.',
      exemples: [['Un soupçon', 'Une personne est entendue parce qu’un indice la concerne. Le soupçon justifie l’examen dans les conditions légales ; il ne prouve pas une culpabilité.'], ['Un procès contradictoire', 'La personne poursuivie doit pouvoir discuter les charges et être assistée selon les textes. Les garanties participent à la recherche d’une décision juste.']],
      piege: 'La présomption d’innocence n’interdit pas toute enquête ou contrainte légale. Elle impose de ne pas transformer ces mesures en condamnation anticipée.',
      question: ['Une mise en cause suffit-elle à établir la culpabilité ?', ['Non, elle doit être judiciairement établie', 'Oui, sans aucun autre examen', 'Oui, si le dossier est médiatisé'], 0, 'La mise en cause ouvre ou accompagne une recherche. La culpabilité exige une décision judiciaire dans le respect de la preuve et des garanties de procédure.'],
      recap: ['Procédure : recherche, poursuite, jugement.', 'Soupçon et culpabilité ne se confondent pas.', 'Défense et séparation des fonctions sont des garanties.'],
    }),
    cours('INFJ-MAG-PROCPEN', 2, 'PP-ACTIONS', 'Deux actions pour deux objectifs', {
      objectif: 'Nous allons distinguer punir une infraction et réparer le dommage qu’elle a causé.',
      regle: 'L’**action publique** vise l’application de la loi pénale ; elle est exercée par les autorités auxquelles la loi la confie, notamment le ministère public. L’**action civile** vise la réparation du dommage personnel directement causé par l’infraction. La **partie civile** est la personne qui demande cette réparation dans la procédure pénale selon ses conditions. La victime peut, dans les cas prévus, mettre en mouvement l’action publique, sans devenir pour autant le magistrat qui l’exerce.',
      exemples: [['Un bien endommagé', 'Le parquet poursuit l’infraction ; la victime demande l’indemnisation du dommage. Deux objectifs apparaissent dans le même dossier.'], ['Une plainte', 'Signaler une infraction peut déclencher une vérification. Réclamer des dommages-intérêts demande en plus de préciser et établir le dommage réparable.']],
      piege: 'Une réparation versée à la victime n’éteint pas automatiquement l’action publique. Il faut un mécanisme légal d’extinction applicable.',
      question: ['La demande de réparation du dommage personnel directement causé relève…', ['de l’action civile', 'du seul vote de la loi', 'de la grâce présidentielle'], 0, 'L’action civile a pour objet la réparation. L’action publique vise l’application de la loi pénale ; les deux peuvent être liées mais restent distinctes.'],
      recap: ['Action publique : application de la loi pénale.', 'Action civile : réparation du dommage.', 'Victime et ministère public ont des rôles distincts.'],
    }),
    cours('INFJ-MAG-PROCPEN', 3, 'PP-ACTIONS', 'Que devient une plainte ?', {
      objectif: 'Nous allons éviter de confondre dépôt de plainte, poursuite et condamnation.',
      regle: 'Une **plainte** signale à l’autorité des faits dont une personne se dit victime. Le **procureur de la République**, magistrat du parquet, apprécie la suite à donner dans le cadre légal : enquête, poursuites ou classement notamment. Le **classement sans suite** n’est pas un jugement d’acquittement. Une **constitution de partie civile** demande réparation dans les formes prévues ; ses effets sur la mise en mouvement des poursuites dépendent de la voie utilisée et de ses conditions.',
      exemples: [['Vérifier avant de poursuivre', 'Le récit d’une plainte peut conduire à rechercher des pièces et témoins. Il ne devient pas une preuve incontestable parce qu’il est déposé.'], ['Une suite distincte', 'Une décision du parquet de ne pas poursuivre à ce stade n’est pas la décision d’un tribunal sur la culpabilité. On vérifie les voies encore ouvertes par la loi.']],
      piege: 'Ni la plainte ni son retrait ne commandent automatiquement l’issue de toutes les poursuites. Certaines infractions obéissent à des règles particulières.',
      question: ['Un classement sans suite est-il en lui-même un acquittement prononcé par un tribunal ?', ['Non', 'Oui, toujours', 'Oui, s’il est écrit'], 0, 'Le classement est une orientation du parquet. L’acquittement est une décision juridictionnelle sur l’accusation ; leur auteur et leur portée diffèrent.'],
      recap: ['Plainte : signaler des faits.', 'Parquet : apprécier la suite selon le droit.', 'Classement et acquittement sont distincts.'],
    }),
    cours('INFJ-MAG-PROCPEN', 4, 'PP-ENQUETE', 'L’enquête et la garde à vue', {
      objectif: 'Nous allons définir la recherche initiale des faits et une mesure de contrainte qui peut l’accompagner.',
      regle: 'L’**enquête** recherche des éléments sur les faits et leurs auteurs. Elle peut relever notamment du cadre préliminaire ou de la **flagrance**, situation définie par la loi autour d’une infraction en cours ou très récente et de certains indices. Les officiers de police judiciaire agissent dans leurs pouvoirs, sous le contrôle prévu. La **garde à vue** retient temporairement une personne pour les nécessités légales de l’enquête. Elle exige un fondement, des droits, des durées et un contrôle ; ce n’est pas une peine.',
      exemples: [['Infraction en cours', 'Une infraction vient d’être commise et des indices immédiats sont constatés. On vérifie les critères de flagrance plutôt que d’utiliser le mot pour toute affaire grave.'], ['Une privation provisoire', 'Une garde à vue n’autorise pas une rétention sans limite. Il faut examiner son régime exact, les heures, les éventuelles prolongations et les droits attachés.']],
      piege: 'La gravité alléguée ne crée pas à elle seule la flagrance. Ne pas appliquer un délai unique de garde à vue à toutes les infractions et régimes spéciaux.',
      question: ['La garde à vue est…', ['une mesure de contrainte encadrée, pas une peine', 'une condamnation définitive', 'un pouvoir de détention sans limite'], 0, 'Elle répond à des nécessités d’enquête sous les conditions de la loi. La personne reste présumée innocente et bénéficie des garanties applicables.'],
      recap: ['Enquête : rechercher les faits et indices.', 'Flagrance : critères légaux précis.', 'Garde à vue : fondement, droits, durée et contrôle.'],
    }),
    cours('INFJ-MAG-PROCPEN', 5, 'PP-INSTRUCTION', 'Le juge d’instruction cherche dans les deux sens', {
      objectif: 'Nous allons distinguer l’information judiciaire d’une recherche destinée seulement à accuser.',
      regle: 'L’**information judiciaire**, ou instruction préparatoire, est une phase conduite par le juge d’instruction lorsqu’elle est ouverte selon la loi. Ce magistrat du siège agit dans les limites de sa **saisine**, faits dont il est juridiquement chargé. Il instruit **à charge**, éléments soutenant l’accusation, et **à décharge**, éléments qui la contredisent ou la relativisent. Il peut notamment interroger, entendre des témoins et ordonner des expertises selon ses pouvoirs.',
      exemples: [['Une preuve favorable', 'Un témoin établit un alibi. Le juge doit examiner cet élément à décharge, pas seulement les indices incriminants.'], ['Faits nouveaux', 'Des faits distincts apparaissent. Le juge vérifie les règles qui permettent d’étendre sa saisine ; il ne suppose pas un pouvoir illimité sur toute affaire nouvelle.']],
      piege: 'Le juge d’instruction n’est pas le procureur et ne doit pas uniquement rechercher une condamnation. Toute affaire ne suit pas nécessairement une instruction.',
      question: ['Un alibi pertinent est un élément…', ['à décharge', 'automatiquement irrecevable', 'de peine prononcée'], 0, 'L’alibi peut contredire la participation alléguée. Il doit être vérifié comme élément à décharge dans la recherche de la vérité.'],
      recap: ['Instruction : phase juridictionnelle selon la loi.', 'À charge et à décharge.', 'Pouvoirs limités par la saisine et les textes.'],
    }),
    cours('INFJ-MAG-PROCPEN', 6, 'PP-LIBERTE', 'La liberté reste le principe', {
      objectif: 'Nous allons distinguer jugement de culpabilité et mesure prise avant ce jugement.',
      regle: 'Le Code pose la liberté comme principe et le **contrôle judiciaire** et la **détention préventive** comme mesures exceptionnelles. Le contrôle judiciaire impose des obligations sous décision judiciaire sans être nécessairement une incarcération. La détention préventive prive de liberté avant la décision définitive dans les conditions légales. La nécessité, la motivation, les durées et les recours doivent être vérifiés. Une mesure préventive n’est pas une peine déjà infligée.',
      exemples: [['Une obligation encadrée', 'Une obligation de ne pas quitter un périmètre peut relever du contrôle judiciaire si elle est légalement ordonnée. Elle se distingue de l’enfermement.'], ['Une décision à justifier', 'Pour maintenir une détention, on doit vérifier le fondement et les conditions actuelles. La seule formule « le dossier est grave » ne remplace pas tous les contrôles requis.']],
      piege: 'Garde à vue et détention préventive appartiennent à des cadres distincts. Le temps écoulé doit être vérifié dans le régime précis, sans addition intuitive de délais.',
      question: ['Une personne en détention préventive est-elle déjà définitivement déclarée coupable du seul fait de cette mesure ?', ['Non', 'Oui, toujours', 'Oui, après une seule nuit'], 0, 'La mesure intervient avant une décision définitive et obéit à des conditions propres. Elle ne remplace pas la preuve et le jugement de culpabilité.'],
      recap: ['Liberté : principe.', 'Contrôle judiciaire et détention : exceptions encadrées.', 'Une mesure préventive n’est pas une condamnation.'],
    }),
    cours('INFJ-MAG-PROCPEN', 7, 'PP-JUGEMENT', 'Qui juge et quelle décision peut suivre ?', {
      objectif: 'Nous allons relier la catégorie d’infraction au jugement, puis distinguer les issues du procès.',
      regle: 'Le **jugement** examine l’accusation et les défenses dans le cadre légal. Les délits relèvent en principe du tribunal correctionnel ; les crimes du tribunal criminel au premier ressort, sous réserve des compétences spéciales. Le **prévenu** est poursuivi en matière correctionnelle ou contraventionnelle ; l’**accusé** en matière criminelle. La **relaxe** écarte la culpabilité en matière correctionnelle ou contraventionnelle ; l’**acquittement** en matière criminelle. Une condamnation suppose les éléments juridiquement établis.',
      exemples: [['Un délit', 'Si le tribunal correctionnel ne retient pas la culpabilité, il prononce la relaxe dans le cadre applicable, pas une grâce présidentielle.'], ['Un crime', 'Le Code de 2018 prévoit le tribunal criminel et un appel devant la chambre criminelle de la cour d’appel. Le vocabulaire d’une ancienne cour d’assises ne doit pas être repris sans vérifier.']],
      piege: 'Les réquisitions du procureur ne sont pas le jugement. Une juridiction pénale spécialisée peut modifier le parcours de droit commun.',
      question: ['La décision écartant la culpabilité en matière criminelle se nomme…', ['acquittement', 'grâce', 'avis consultatif'], 0, 'L’acquittement est une issue juridictionnelle de l’accusation criminelle. La grâce agit sur une peine et ne remplace pas ce jugement.'],
      recap: ['Catégorie d’infraction et compétence à vérifier.', 'Relaxe : correctionnel ou contraventionnel.', 'Acquittement : criminel ; réquisitions distinctes du jugement.'],
    }),
    cours('INFJ-MAG-PROCPEN', 8, 'PP-RECOURS', 'Contester une décision pénale', {
      objectif: 'Nous allons choisir la question à poser avant de former un recours : quelle décision, quel auteur, quel grief ?',
      regle: 'L’**appel** permet un réexamen selon les droits de l’appelant et les limites légales. L’**opposition** peut être ouverte contre certaines décisions par défaut. Le **pourvoi en cassation** contrôle le droit d’une décision en dernier ressort. Un **grief** est la critique formulée contre la décision. Les personnes autorisées à agir, les délais, le point de départ et les effets sur l’exécution dépendent du texte et de la décision.',
      exemples: [['Une erreur juridique', 'Un arrêt en dernier ressort est critiqué pour violation de la loi. On examine la possibilité du pourvoi, pas un nouvel appel automatique.'], ['La demande de la victime', 'Les droits de recours de la partie civile ne se confondent pas avec ceux du ministère public sur l’action publique. On vérifie ce qu’elle peut contester.']],
      piege: 'Ne pas supposer que chaque partie peut contester toute partie du jugement, ni que tous les recours suspendent automatiquement la détention ou l’exécution.',
      question: ['Avant un recours, il faut notamment identifier…', ['les droits de la personne qui agit et la décision attaquée', 'uniquement l’écho médiatique', 'le désir de recommencer sans délai'], 0, 'La recevabilité et l’étendue du recours dépendent de l’auteur et de la décision. Le grief doit ensuite correspondre à la voie ouverte.'],
      recap: ['Identifier décision, auteur et grief.', 'Vérifier ouverture, délai et effets.', 'Partie civile et parquet n’ont pas des droits identiques.'],
    }),
    cours('INFJ-MAG-PROCPEN', 9, 'PP-RECOURS', 'Quand l’action publique s’éteint-elle ?', {
      objectif: 'Nous allons distinguer l’extinction des poursuites d’une simple préférence de la victime.',
      regle: 'L’**extinction de l’action publique** met fin au pouvoir de poursuivre dans la situation visée. Le Code prévoit notamment décès de la personne poursuivie, prescription, amnistie, abrogation de la loi pénale et chose jugée, selon leurs conditions. La **prescription** repose sur l’écoulement du temps avec des règles de point de départ, interruption et suspension. Le retrait de plainte ou une **transaction**, accord produisant les effets autorisés, n’éteignent l’action publique que dans les cas prévus par la loi.',
      exemples: [['Accord privé', 'Une victime reçoit réparation. Il faut encore vérifier si un mécanisme légal donne à cet accord un effet sur les poursuites ; ce n’est pas automatique.'], ['Temps écoulé', 'Compter des années depuis les faits ne suffit pas si un acte interruptif ou une règle spéciale modifie le calcul. On recherche le régime exact.']],
      piege: 'Prescription de l’action publique et prescription d’une peine déjà prononcée sont distinctes. La grâce, étudiée dans DROIT-PENAL, n’efface pas l’action comme une amnistie.',
      question: ['Un retrait de plainte éteint-il toutes les poursuites dans tous les cas ?', ['Non, seulement lorsque la loi lui donne cet effet', 'Oui, sans exception', 'Oui, si le retrait est oral'], 0, 'L’action publique ne dépend pas universellement du souhait de la victime. Il faut une règle qui subordonne les poursuites à la plainte ou qui donne au retrait l’effet invoqué.'],
      recap: ['Chercher la cause légale d’extinction.', 'Prescription : calcul et événements à vérifier.', 'Accord ou retrait de plainte : pas d’effet général automatique.'],
    }),
  ],
  exercices: [
    exercice('INFJ-MAG-PROCPEN', 1, 'qcm', 1, ['PP-GARANTIES'], ['Présomption d’innocence', 'Une mesure d’enquête ne remplace pas l’établissement judiciaire de la culpabilité. Les contraintes légales restent soumises à leurs conditions et garanties.', 'Séparer soupçon et condamnation.'], {
      consigne: 'Une personne fait l’objet d’une enquête. Quelle affirmation est correcte ?', options: ['Elle demeure présumée innocente tant que sa culpabilité n’est pas judiciairement établie', 'Elle est déjà condamnée', 'Elle ne peut bénéficier d’aucune défense'], bonne: 0,
      explication: 'L’enquête recherche des éléments ; elle n’est pas une condamnation. La personne conserve la présomption d’innocence et les droits de défense attachés à sa situation.',
    }),
    exercice('INFJ-MAG-PROCPEN', 2, 'classer', 1, ['PP-ACTIONS'], ['Deux objectifs', 'L’action publique vise l’application de la loi pénale ; l’action civile vise la réparation du dommage personnel directement causé.', 'Qualifier l’objet de la demande.'], {
      consigne: 'Classe selon l’objet principal.', categories: ['Action publique', 'Action civile'], cartes: [['Rechercher l’application d’une peine pour l’infraction', 0], ['Demander réparation du dommage de la victime', 1]],
      explication: 'La peine relève de la répression au titre de l’action publique. La réparation indemnise la victime au titre de l’action civile. Leur présence dans un même dossier ne les confond pas.',
    }),
    exercice('INFJ-MAG-PROCPEN', 3, 'qcm', 1, ['PP-ACTIONS'], ['Plainte et suite', 'Le dépôt d’une plainte signale des faits. Le parquet apprécie la suite légale ; la juridiction décide de la culpabilité lorsqu’elle est saisie.', 'La plainte n’est pas un jugement.'], {
      consigne: 'Le dépôt d’une plainte produit-il à lui seul une condamnation ?', options: ['Non, des vérifications et décisions restent nécessaires', 'Oui, immédiatement', 'Oui, si la victime demande une peine'], bonne: 0,
      explication: 'La plainte expose une allégation. L’autorité doit examiner les faits et les suites ; une condamnation exige la procédure et les éléments légalement requis.',
    }),
    exercice('INFJ-MAG-PROCPEN', 4, 'qcm', 1, ['PP-ENQUETE'], ['Contrainte et peine', 'Une mesure de garde à vue répond à un cadre d’enquête. Sa nécessité, ses durées, les droits et le contrôle sont déterminés par les textes.', 'Une mesure provisoire ne constate pas la culpabilité.'], {
      consigne: 'La garde à vue est-elle une peine définitive ?', options: ['Non, c’est une mesure d’enquête encadrée', 'Oui, prononcée par toute personne', 'Oui, sans durée maximale possible'], bonne: 0,
      explication: 'La garde à vue intervient dans l’enquête et obéit aux garanties légales. Elle n’est pas la peine prononcée à l’issue d’un jugement de culpabilité.',
    }),
    exercice('INFJ-MAG-PROCPEN', 5, 'relier', 1, ['PP-INSTRUCTION'], ['Charge et décharge', 'L’information judiciaire recherche la vérité en examinant les éléments soutenant l’accusation comme ceux qui la contredisent.', 'Examiner les deux sens.'], {
      consigne: 'Associe ces éléments à leur rôle possible.', paires: [['Indice soutenant la participation', 'Élément à charge'], ['Alibi pertinent à vérifier', 'Élément à décharge'], ['Pouvoir de traiter les faits juridiquement confiés au juge', 'Saisine']],
      explication: 'L’indice incriminant soutient la charge. L’alibi peut la contredire et doit être vérifié à décharge. La saisine délimite, elle, les faits confiés au juge et ses pouvoirs.',
    }),
    exercice('INFJ-MAG-PROCPEN', 6, 'vf', 2, ['PP-LIBERTE'], ['Liberté et détention', 'Les mesures préventives sont encadrées et distinctes de la peine. Elles ne font pas disparaître la présomption d’innocence.', 'Vérifier la mesure et son fondement.'], {
      consigne: 'Vrai ou faux ?', affirmations: [['La détention préventive suffit à prouver la culpabilité.', false], ['Le contrôle judiciaire peut imposer des obligations sans être une incarcération.', true]],
      explication: 'La détention préventive est une mesure avant la décision définitive, pas une preuve de culpabilité. Le contrôle judiciaire organise des obligations définies par la décision et n’est pas nécessairement une détention.',
    }),
    exercice('INFJ-MAG-PROCPEN', 7, 'relier', 2, ['PP-JUGEMENT'], ['Vocabulaire du jugement', 'La catégorie de l’affaire détermine le vocabulaire de la personne poursuivie et de la décision écartant sa culpabilité.', 'Relaxe et acquittement ne désignent pas la grâce.'], {
      consigne: 'Relie les termes à leur cadre.', paires: [['Relaxe', 'Culpabilité écartée en matière correctionnelle ou contraventionnelle'], ['Acquittement', 'Culpabilité écartée en matière criminelle'], ['Réquisition', 'Demande du ministère public à la juridiction']],
      explication: 'La relaxe et l’acquittement sont des décisions sur la culpabilité dans leurs cadres respectifs. La réquisition est une demande du parquet : elle ne décide pas l’issue du procès.',
    }),
    exercice('INFJ-MAG-PROCPEN', 8, 'qcm', 2, ['PP-ENQUETE'], ['Flagrance', 'La flagrance est une situation définie par le Code autour de l’actualité ou de la proximité de l’infraction et des indices prévus. La gravité ne suffit pas.', 'Chercher les critères légaux.'], {
      consigne: 'Un fait ancien est très grave. Cette seule gravité suffit-elle à le qualifier de flagrant ?', options: ['Non, il faut vérifier les critères légaux de flagrance', 'Oui, tout crime grave est toujours flagrant', 'Oui, selon le seul titre du journal'], bonne: 0,
      explication: 'Le mot flagrance renvoie à une situation procédurale définie. L’ancienneté et les circonstances doivent être examinées ; la gravité seule ne remplace pas les critères du Code.',
    }),
    exercice('INFJ-MAG-PROCPEN', 9, 'qcm', 2, ['PP-RECOURS'], ['Retrait de plainte', 'Le droit de poursuivre ne dépend pas universellement du maintien de la plainte. L’effet du retrait doit être prévu par une règle applicable.', 'Chercher le texte d’extinction.'], {
      consigne: 'La victime retire sa plainte. Quelle analyse est correcte ?', options: ['Vérifier si la loi donne au retrait un effet sur l’action publique', 'Déclarer automatiquement toute poursuite impossible', 'Confondre ce retrait avec une grâce'], bonne: 0,
      explication: 'Le retrait ne suffit pas en règle générale. Il faut vérifier si la plainte était une condition nécessaire ou si un texte attribue l’effet invoqué ; une grâce relève d’un autre mécanisme et d’une autre autorité.',
    }),
    exercice('INFJ-MAG-PROCPEN', 10, 'ordre', 2, ['PP-INSTRUCTION', 'PP-JUGEMENT'], ['Phases distinctes', 'Dans un dossier soumis à instruction, l’ouverture de l’information précède les actes d’instruction puis la décision de règlement. Le jugement suppose ensuite un renvoi si les conditions sont réunies.', 'Ce schéma ne s’impose pas à toutes les affaires.'], {
      consigne: 'Ordonne ce schéma d’un dossier avec instruction et renvoi devant une juridiction de jugement.', mode: 'exact', elements: ['Ouverture régulière de l’information', 'Actes d’instruction à charge et à décharge', 'Décision de règlement conduisant au renvoi', 'Examen de l’accusation par la juridiction de jugement'],
      explication: 'Le juge est d’abord saisi selon la loi. Les investigations précèdent la décision clôturant l’instruction. Dans l’hypothèse du renvoi indiqué, la juridiction de jugement examine ensuite l’accusation.',
    }),
    exercice('INFJ-MAG-PROCPEN', 11, 'qcm', 3, ['PP-ACTIONS', 'PP-RECOURS'], ['Action civile et publique', 'Réparer et poursuivre sont deux objectifs distincts. Un accord sur les intérêts civils n’a d’effet sur les poursuites que dans les conditions légales.', 'Ne pas déduire l’extinction d’un simple paiement.'], {
      consigne: 'La victime est indemnisée. Aucun mécanisme légal d’extinction n’est établi. Peut-on conclure à la disparition de l’action publique ?', options: ['Non, l’indemnisation ne suffit pas à cette conclusion', 'Oui, sans aucun autre contrôle', 'Oui, le greffier doit effacer la procédure'], bonne: 0,
      explication: 'Le paiement concerne la réparation. Pour arrêter l’action publique, il faut identifier une cause légale d’extinction ou un mécanisme applicable. L’énoncé ne l’établit pas ; l’arrêt automatique des poursuites ne peut être déduit.',
    }),
    exercice('INFJ-MAG-PROCPEN', 12, 'qcm', 3, ['PP-GARANTIES', 'PP-INSTRUCTION'], ['Recherche de la vérité', 'Le juge d’instruction recherche à charge et à décharge. La garantie ne dépend pas de la faveur que suscite la personne mise en cause.', 'Examiner tout élément pertinent.'], {
      consigne: 'Un élément à décharge sérieux apparaît dans une affaire très médiatisée. Que doit faire le juge d’instruction ?', options: ['L’examiner selon la loi avec les autres éléments', 'L’écarter pour préserver l’accusation', 'Le cacher aux seules fins d’obtenir une condamnation'], bonne: 0,
      explication: 'La mission d’instruction vise la vérité dans les deux sens. La médiatisation ne modifie ni cette mission ni la présomption d’innocence ; l’élément pertinent doit être vérifié.',
    }),
    exercice('INFJ-MAG-PROCPEN', 13, 'entourer', 3, ['PP-LIBERTE', 'PP-RECOURS'], ['Contrôler une mesure', 'Une privation de liberté doit avoir un fondement, respecter ses conditions, ses durées et les garanties de contrôle. Il faut distinguer mesure et jugement.', 'Ne rien déduire du seul nom de la mesure.'], {
      consigne: 'Sélectionne les vérifications nécessaires pour analyser une détention préventive.', elements: [['Autorité compétente et fondement légal', true], ['Motivation et nécessité selon le texte', true], ['Durées et voies de contrôle applicables', true], ['Culpabilité supposée automatiquement acquise', false]],
      explication: 'La légalité demande l’autorité habilitée, le fondement et les conditions, dont la motivation et les durées. La culpabilité automatique est précisément exclue : la mesure préventive ne remplace pas le jugement.',
    }),
    exercice('INFJ-MAG-PROCPEN', 14, 'qcm', 3, ['PP-RECOURS'], ['Prescription', 'La prescription demande un régime, un point de départ et l’examen des actes interruptifs ou événements suspensifs. Action et peine ne se calculent pas indifféremment.', 'Identifier ce qui se prescrit.'], {
      consigne: 'Pour vérifier une prescription, un candidat compte seulement les années depuis les faits. Quelle correction méthodologique faut-il apporter ?', options: ['Identifier le régime, le point de départ et les causes d’interruption ou de suspension', 'Conserver ce calcul sans lire le texte', 'Prendre toujours le délai de la peine pour toute action'], bonne: 0,
      explication: 'Le temps brut ne suffit pas. Une règle spéciale ou un acte procédural peut modifier le calcul ; la prescription d’une action et celle d’une peine répondent à des objets différents. Il faut reconstruire la chronologie juridique.',
    }),
  ],
};


const commercial = {
  code: 'INFJ-MAG-COMMERCIAL', matiere: 'Droit commercial', titre: 'Droit commercial général (OHADA)',
  resume: 'Sources OHADA, actes de commerce, commerçant, RCCM, fonds, bail professionnel, vente, sociétés et intermédiaires.',
  notions: [
    { code: 'COM-SOURCES', libelle: 'Traité et Actes uniformes applicables' },
    { code: 'COM-ACTES', libelle: 'Actes de commerce par nature et par forme' },
    { code: 'COM-STATUT', libelle: 'Commerçant, entreprenant et RCCM' },
    { code: 'COM-FONDS', libelle: 'Fonds de commerce et clientèle' },
    { code: 'COM-BAIL', libelle: 'Bail à usage professionnel' },
    { code: 'COM-VENTE', libelle: 'Vente commerciale et obligations' },
    { code: 'COM-SOCIETES', libelle: 'Personnalité et formes sociales' },
    { code: 'COM-INTERMEDIAIRES', libelle: 'Courtier, commissionnaire et agent commercial' },
  ],
  lecons: [
    cours('INFJ-MAG-COMMERCIAL', 1, 'COM-SOURCES', 'Pourquoi des règles OHADA ?', {
      objectif: 'Nous allons découvrir les sources du droit des affaires avant d’apprendre les statuts et opérations commerciales.',
      regle: 'Le **droit** organise les activités par des règles obligatoires. Le droit des affaires comporte des règles sur les professionnels et leurs opérations. L’**OHADA** est l’Organisation pour l’harmonisation en Afrique du droit des affaires. Les États parties appliquent les **Actes uniformes** dans leurs domaines : ils sont directement applicables et obligatoires malgré une disposition interne contraire. L’**AUDCG** régit le droit commercial général ; l’**AUSCGIE**, les sociétés commerciales et le groupement d’intérêt économique. Il faut identifier le domaine et la version du texte.',
      exemples: [['Un statut', 'Pour le commerçant, on consulte l’AUDCG révisé en 2010, entré en vigueur en 2011. Pour une société, on consulte notamment l’AUSCGIE révisé en 2014.'], ['Une réforme distincte', 'Le recouvrement et les voies d’exécution relèvent d’un autre Acte uniforme, révisé en 2023 et entré en vigueur le 16 février 2024.']],
      piege: 'OHADA ne signifie pas que tous les domaines du droit civil, fiscal et pénal ont été remplacés par un seul code commercial.',
      question: ['Pour choisir le bon Acte uniforme, il faut d’abord identifier…', ['la question juridique et la version applicable', 'seulement le pays d’impression du manuel', 'uniquement le nom du commerçant'], 0, 'Les textes ont des domaines distincts et peuvent être révisés. Qualifier le problème et vérifier la version évitent d’appliquer un texte ancien ou hors sujet.'],
      recap: ['OHADA : harmoniser le droit des affaires.', 'Actes uniformes : application directe dans leur domaine.', 'AUDCG, AUSCGIE et recouvrement sont distincts.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 2, 'COM-ACTES', 'Qu’est-ce qu’un acte de commerce ?', {
      objectif: 'Nous allons distinguer le caractère commercial d’une opération du statut de la personne qui l’accomplit.',
      regle: 'Un **acte de commerce** est qualifié commercial selon les critères du texte. L’acte par **nature** dépend de l’opération : acheter un bien dans l’intention de le revendre en est un exemple. L’acte par **forme** dépend de son instrument juridique : l’AUDCG vise notamment la lettre de change, le billet à ordre et le warrant. La **lettre de change** est un titre par lequel une personne donne à une autre l’ordre de payer une somme à un bénéficiaire selon ses mentions légales.',
      exemples: [['Acheter pour revendre', 'Une personne achète des marchandises avec l’intention de les revendre. Cette intention distingue l’opération de l’achat destiné à sa seule consommation.'], ['Un titre commercial', 'Une lettre de change conserve son caractère d’acte de commerce par la forme même si un signataire n’est pas commerçant. Le statut personnel et la nature de l’acte restent distincts.']],
      piege: 'Un achat isolé pour son usage personnel n’est pas un achat pour revendre. Un acte commercial isolé ne donne pas automatiquement le statut de commerçant.',
      question: ['Acheter une marchandise dans l’intention de la revendre renvoie principalement à un acte commercial…', ['par nature', 'par simple voisinage', 'toujours par décision du CESEC'], 0, 'La qualification vient ici de l’opération économique décrite par le texte, et non d’un instrument comme une lettre de change.'],
      recap: ['Nature : opération ; forme : instrument visé.', 'Revente : intention présente lors de l’achat.', 'Acte commercial et statut de commerçant sont distincts.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 3, 'COM-STATUT', 'Quand devient-on commerçant ?', {
      objectif: 'Nous allons construire une qualification professionnelle à partir de l’activité réellement exercée.',
      regle: 'Selon l’AUDCG, le **commerçant** fait de l’accomplissement d’actes de commerce par nature sa profession. On examine l’exercice professionnel, la capacité et les incompatibilités applicables. Une **incompatibilité** interdit de cumuler certaines fonctions avec le commerce. La **capacité** est l’aptitude légale à agir ; la minorité et les protections exigent leurs règles spécifiques. Une activité exercée pour le compte de l’employeur n’attribue pas automatiquement au salarié son statut commercial.',
      exemples: [['Une activité répétée', 'Acheter habituellement des marchandises pour les revendre dans une activité professionnelle oriente vers le statut de commerçant.'], ['Un acte isolé', 'Signer un titre commercial une seule fois ne démontre pas, à lui seul, que les actes de commerce par nature sont devenus une profession.']],
      piege: 'L’immatriculation ne remplace pas toute analyse de l’activité. Une irrégularité de statut ne permet pas automatiquement d’échapper à toutes les obligations.',
      question: ['Un acte commercial isolé suffit-il toujours à établir la profession de commerçant ?', ['Non, il faut examiner l’activité professionnelle et les conditions légales', 'Oui, sans autre élément', 'Oui, si une facture est imprimée'], 0, 'Le statut s’apprécie selon le critère professionnel et les conditions du texte. La qualification d’un seul acte ne prouve pas toute l’activité.'],
      recap: ['Commerçant : actes par nature à titre professionnel.', 'Vérifier capacité et incompatibilités.', 'Distinguer activité personnelle et activité pour l’employeur.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 4, 'COM-STATUT', 'À quoi sert le RCCM ?', {
      objectif: 'Nous allons comprendre la publicité de l’activité commerciale sans confondre immatriculation et simple déclaration.',
      regle: 'Le **Registre du commerce et du crédit mobilier (RCCM)** reçoit notamment les immatriculations des commerçants et sociétés ainsi que certaines inscriptions de garanties. Une **publicité légale** rend une information accessible avec les effets prévus. L’**entreprenant** est un entrepreneur individuel relevant du statut simplifié de l’AUDCG, sur déclaration d’activité, pour une activité professionnelle civile, commerciale, artisanale ou agricole dans ses conditions. Déclaration d’entreprenant et immatriculation commerciale sont deux mécanismes distincts.',
      exemples: [['Identifier une entreprise', 'Une recherche au registre peut informer sur l’identité et la situation juridique d’une société. Elle ne prouve pas que toutes ses dettes sont payées.'], ['Choisir le statut exact', 'Une activité peut relever du régime de l’entreprenant si ses conditions sont réunies. Il faut examiner le statut et les seuils applicables, sans inventer un seuil unique pour tous les États et activités.']],
      piege: 'Une inscription au RCCM n’est pas un certificat général de solvabilité. « Entreprenant » n’est pas simplement un synonyme de toute société commerciale.',
      question: ['Le RCCM sert notamment à…', ['assurer des inscriptions et une publicité légale', 'garantir le paiement de toute dette', 'célébrer les mariages'], 0, 'Le registre organise des informations et leurs effets légaux. Il ne garantit pas à lui seul que chaque débiteur inscrit est solvable.'],
      recap: ['RCCM : registre et publicité légale.', 'Immatriculation et déclaration se distinguent.', 'Vérifier les conditions du statut d’entreprenant.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 5, 'COM-FONDS', 'Le fonds de commerce n’est pas le bâtiment', {
      objectif: 'Nous allons identifier ce qui permet d’attirer et conserver une clientèle.',
      regle: 'Le **fonds de commerce** est l’ensemble des moyens permettant au commerçant d’attirer et conserver une **clientèle**, personnes qui recourent à son activité. L’AUDCG exige notamment la clientèle et l’enseigne ou le nom commercial ; d’autres éléments peuvent s’y ajouter selon l’activité. L’**enseigne** identifie le lieu d’exploitation ; le **nom commercial** identifie l’activité. Un **immeuble**, bâtiment ou terrain, se distingue du fonds qui y est exploité.',
      exemples: [['Même local, autre activité', 'Un local vide ne constitue pas à lui seul un fonds de commerce. Il manque l’ensemble d’éléments permettant l’exploitation avec une clientèle.'], ['Vendre le fonds', 'Céder un fonds ne signifie pas nécessairement vendre les murs du magasin. Il faut lire ce qui est transmis et les formalités applicables.']],
      piege: 'Ne pas réduire le fonds au stock ni assimiler la clientèle à la simple liste de meubles. La cession doit être analysée avec ses éléments et publicités.',
      question: ['La vente d’un fonds entraîne-t-elle nécessairement la vente du bâtiment ?', ['Non, fonds et immeuble sont distincts', 'Oui, toujours', 'Oui, même si le vendeur est locataire'], 0, 'Le fonds organise l’exploitation et la clientèle. L’immeuble est un bien distinct, qui peut appartenir à un bailleur différent ; son transfert ne se déduit pas de la seule cession du fonds.'],
      recap: ['Fonds : moyens d’attirer et conserver la clientèle.', 'Clientèle et identification commerciale sont centrales.', 'Fonds et murs ne se confondent pas.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 6, 'COM-BAIL', 'Le bail à usage professionnel', {
      objectif: 'Nous allons distinguer le droit d’occuper un local de la propriété de ce local.',
      regle: 'Le **bail** permet au **preneur**, locataire, d’utiliser un bien contre un loyer versé au **bailleur**. Le bail à usage professionnel de l’AUDCG dépasse les seuls commerçants. Son article 123 accorde le droit au renouvellement après au moins **deux ans d’exploitation conforme au bail**. Pour un bail à durée déterminée, l’article 124 exige une demande au plus tard **trois mois avant l’expiration**, par signification ou notification permettant de prouver la réception effective. À défaut, le preneur perd ce droit. Une **indemnité d’éviction** peut être due en cas de refus du bailleur, selon les conditions et exceptions du texte.',
      exemples: [['Occuper sans posséder', 'Un commerçant peut exploiter son fonds dans un local loué. Il peut être titulaire du fonds sans être propriétaire des murs.'], ['Deux contrôles distincts', 'Aya exploite conformément au bail depuis trois ans. Pour son bail à durée déterminée, elle doit aussi demander le renouvellement dans la forme requise et au moins trois mois avant le terme : l’ancienneté ne remplace pas cette démarche.']],
      piege: 'Ne pas appliquer les règles d’un bail d’habitation à toute location professionnelle. Le régime et son champ doivent être identifiés.',
      question: ['Le preneur d’un bail est…', ['le locataire', 'nécessairement le propriétaire des murs', 'le juge du bail'], 0, 'Le preneur reçoit l’usage du local selon le bail. Le propriétaire ou bailleur occupe une autre position ; le bail ne transfère pas automatiquement la propriété.'],
      recap: ['Bailleur et preneur : deux positions.', 'Usage du local distinct de sa propriété.', 'Renouvellement et éviction : conditions à vérifier.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 7, 'COM-VENTE', 'Livrer, payer, recevoir les marchandises', {
      objectif: 'Nous allons appliquer les obligations du contrat à la vente commerciale dans le champ de l’AUDCG.',
      regle: 'Un **contrat** est un accord créant des obligations. La vente commerciale de l’AUDCG vise notamment la vente de marchandises entre commerçants dans son champ. Le vendeur doit livrer et fournir des marchandises **conformes**, correspondant aux exigences convenues et légales. L’acheteur doit payer le prix et prendre livraison. L’**inexécution** est le manquement à une obligation. Ses sanctions demandent de vérifier le contrat, le texte, les notifications et les délais pertinents.',
      exemples: [['Conformité', 'Le contrat porte sur cent unités d’un modèle précis. Livrer un autre modèle pose une question de conformité, même si le nombre est exact.'], ['Deux obligations de l’acheteur', 'L’acheteur doit aussi prendre livraison dans les conditions convenues. Le paiement ne dispense pas automatiquement de cette obligation.']],
      piege: 'Toute vente réalisée dans un magasin ne relève pas automatiquement du régime OHADA de la vente commerciale entre commerçants. Il faut vérifier les qualités et exclusions.',
      question: ['Livrer le bon nombre d’articles mais le mauvais modèle satisfait-il nécessairement la conformité ?', ['Non, le contenu convenu doit aussi être respecté', 'Oui, seul le nombre compte', 'Oui, le vendeur choisit toujours librement'], 0, 'La conformité ne se réduit pas à la quantité. Le modèle et les caractéristiques convenus comptent ; il faut comparer les marchandises promises et livrées.'],
      recap: ['Vendeur : livraison et conformité.', 'Acheteur : paiement et prise de livraison.', 'Champ du régime et sanctions à vérifier.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 8, 'COM-SOCIETES', 'La société et les risques des associés', {
      objectif: 'Nous allons distinguer l’organisation sociale et les personnes qui y participent.',
      regle: 'Une **société** organise une activité avec des **apports**, biens, argent ou industrie selon la forme, et des associés qui partagent les résultats et contribuent aux pertes selon les textes. La personnalité morale s’acquiert en principe à l’immatriculation au RCCM, sous réserve des formes sans personnalité. L’AUSCGIE reconnaît des sociétés commerciales par la forme, dont SNC, SCS, SARL, SA et SAS. Les règles de responsabilité varient : en SNC, les associés répondent indéfiniment et solidairement des dettes sociales ; en SARL, le risque est en principe limité aux apports.',
      exemples: [['Deux patrimoines', 'Le bien détenu par une société dotée de personnalité n’est pas automatiquement le bien personnel de chaque associé.'], ['Comparer les formes', 'Un associé de SNC n’a pas la même exposition aux dettes sociales qu’un associé de SARL. Une garantie personnelle ou une faute propre peut toutefois appeler un examen distinct.']],
      piege: 'Responsabilité limitée ne signifie pas absence de tout risque personnel, ni capital minimal identique dans tous les États. On vérifie forme et engagements personnels.',
      question: ['Lequel de ces éléments doit être vérifié pour apprécier le risque d’un associé ?', ['La forme sociale et ses engagements personnels', 'Seulement la couleur du logo', 'Uniquement le nombre de clients'], 0, 'La forme donne le régime des dettes sociales. Les engagements personnels, comme une garantie, peuvent créer une obligation distincte à vérifier.'],
      recap: ['Personnalité en principe liée à l’immatriculation.', 'La forme sociale détermine une partie du risque.', 'Patrimoine social et patrimoine personnel se distinguent.'],
    }),
    cours('INFJ-MAG-COMMERCIAL', 9, 'COM-INTERMEDIAIRES', 'Qui rapproche et qui conclut le contrat ?', {
      objectif: 'Nous allons distinguer trois intermédiaires qui interviennent entre des professionnels.',
      regle: 'Un **intermédiaire de commerce** intervient professionnellement pour une autre personne dans les conditions de l’AUDCG. Le **courtier** rapproche les personnes en vue de faciliter leur contrat. Le **commissionnaire** agit en son propre nom mais pour le compte d’un **commettant**, personne dont il sert les intérêts. L’**agent commercial** est un mandataire indépendant chargé durablement de négocier et éventuellement conclure des contrats au nom et pour le compte du mandant. Un **mandat** donne pouvoir d’agir pour une autre personne.',
      exemples: [['Rapprocher', 'Un courtier met en relation vendeur et acheteur. Sa mission de rapprochement ne fait pas de lui automatiquement le vendeur signataire.'], ['Signer en son nom', 'Le commissionnaire contracte sous son nom tout en agissant pour le compte du commettant. Il faut donc séparer « au nom de » et « pour le compte de ».']],
      piege: 'Tous les intermédiaires ne signent pas au nom du client. Le statut, les pouvoirs et le contrat conclu doivent être examinés.',
      question: ['Le commissionnaire agit…', ['en son nom pour le compte du commettant', 'nécessairement comme simple voisin', 'toujours au nom du juge'], 0, 'La commission distingue le nom sous lequel on contracte et l’intérêt économique servi : le commissionnaire emploie son nom pour le compte du commettant.'],
      recap: ['Courtier : rapprocher.', 'Commissionnaire : son nom, compte du commettant.', 'Agent commercial : mandat indépendant et durable.'],
    }),
  ],
  exercices: [
    exercice('INFJ-MAG-COMMERCIAL', 1, 'relier', 1, ['COM-SOURCES'], ['Choisir le texte', 'Les Actes uniformes ont des domaines propres et des versions successives. Le nom OHADA ne remplace pas la recherche du texte pertinent.', 'Identifier la matière avant la règle.'], {
      consigne: 'Relie le texte au domaine étudié.', paires: [['AUDCG', 'Droit commercial général'], ['AUSCGIE', 'Sociétés commerciales et GIE'], ['Acte uniforme révisé en 2023 sur le recouvrement', 'Procédures simplifiées de recouvrement et voies d’exécution']],
      explication: 'L’AUDCG vise notamment commerçant, fonds et vente commerciale. L’AUSCGIE organise les sociétés et GIE. Le recouvrement relève d’un autre Acte uniforme, révisé en 2023 et entré en vigueur en 2024.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 2, 'classer', 1, ['COM-ACTES'], ['Actes de commerce', 'La nature vise l’opération ; la forme vise certains instruments désignés par l’AUDCG. Le statut de la personne doit être analysé séparément.', 'Ne pas confondre acte et profession.'], {
      consigne: 'Classe le fondement de commercialité.', categories: ['Par nature', 'Par forme'], cartes: [['Achat de marchandises avec intention de revendre', 0], ['Lettre de change', 1], ['Billet à ordre', 1]],
      explication: 'L’achat pour revente se qualifie par l’opération elle-même. La lettre de change et le billet à ordre sont visés pour leur forme par l’AUDCG : il faut ensuite vérifier les règles de ces instruments.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 3, 'qcm', 1, ['COM-STATUT'], ['Profession commerciale', 'Le commerçant fait des actes de commerce par nature sa profession. Une opération isolée ne prouve pas à elle seule cette activité professionnelle.', 'Observer l’activité et les conditions personnelles.'], {
      consigne: 'Quelle situation oriente vers le critère professionnel du commerçant, sous réserve des autres conditions ?', options: ['Acheter habituellement des marchandises pour les revendre dans son activité', 'Acheter un repas pour sa consommation', 'Assister à une audience'], bonne: 0,
      explication: 'L’achat habituel pour revente décrit une activité d’actes commerciaux par nature. La consommation personnelle et la présence à une audience ne démontrent pas cette profession.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 4, 'vf', 1, ['COM-STATUT'], ['Registre et solvabilité', 'La publicité légale rend des informations accessibles avec les effets prévus. Elle ne garantit pas que toute obligation sera exécutée.', 'Un registre n’est pas une assurance de paiement.'], {
      consigne: 'Vrai ou faux ?', affirmations: [['L’inscription au RCCM garantit automatiquement le paiement de toutes les dettes.', false], ['L’entreprenant relève d’un régime simplifié sur déclaration dans ses conditions.', true]],
      explication: 'L’inscription renseigne sur une situation juridique, pas sur un paiement certain : première phrase fausse. Le statut simplifié d’entreprenant existe sur déclaration sous les conditions de l’AUDCG : seconde vraie.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 5, 'qcm', 1, ['COM-FONDS'], ['Fonds de commerce', 'Le fonds organise les moyens d’attirer et conserver la clientèle. L’immeuble qui accueille l’activité constitue un bien distinct.', 'Identifier ce qui est cédé.'], {
      consigne: 'Un commerçant vend son fonds exploité dans un local loué. Vend-il nécessairement les murs ?', options: ['Non, fonds et immeuble sont distincts', 'Oui, il devient automatiquement propriétaire des murs', 'Oui, tout bail est une vente'], bonne: 0,
      explication: 'Le fonds peut appartenir au commerçant alors que les murs appartiennent au bailleur. Le transfert du fonds n’emporte donc pas nécessairement la vente de l’immeuble.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 6, 'relier', 2, ['COM-BAIL', 'COM-FONDS'], ['Exploiter dans un local', 'L’exploitation, le droit d’occuper et la propriété des murs sont trois questions distinctes. Le bail en règle l’usage selon son régime.', 'Ne pas confondre fonds et local.'], {
      consigne: 'Relie chaque terme à la définition.', paires: [['Preneur', 'Locataire dans le bail'], ['Bailleur', 'Personne qui met le bien à disposition selon le bail'], ['Clientèle', 'Personnes recourant à l’activité du fonds']],
      explication: 'Le preneur utilise le bien et doit notamment le loyer selon le bail. Le bailleur le met à disposition. La clientèle se rattache à l’activité du fonds, et non à la seule relation de location.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 7, 'qcm', 2, ['COM-VENTE'], ['Conformité', 'Une marchandise conforme doit répondre aux exigences convenues et légales pertinentes. Quantité et caractéristiques sont des contrôles distincts.', 'Comparer contrat et livraison.'], {
      consigne: 'Deux commerçants conviennent de 100 pièces du modèle A. Le vendeur livre 100 pièces du modèle B, sans accord de modification. Quelle analyse est correcte ?', options: ['La quantité est respectée mais la conformité du modèle pose problème', 'Tout est conforme puisque le nombre est bon', 'L’acheteur devient propriétaire de la société venderesse'], bonne: 0,
      explication: 'Le nombre de pièces correspond à la commande. Le modèle, lui, ne correspond pas : la conformité demande donc examen et les sanctions doivent être recherchées dans le régime applicable.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 8, 'classer', 2, ['COM-SOCIETES'], ['Risques sociaux', 'La forme sociale détermine le régime des dettes sociales. Il faut séparer ce régime des garanties personnelles éventuellement souscrites.', 'Responsabilité limitée ne signifie pas risque nul.'], {
      consigne: 'Classe ces descriptions de principe.', categories: ['SNC', 'SARL'], cartes: [['Associés indéfiniment et solidairement tenus des dettes sociales', 0], ['Responsabilité des associés en principe limitée aux apports', 1]],
      explication: 'La SNC expose les associés indéfiniment et solidairement. La SARL limite en principe leur responsabilité aux apports ; un engagement personnel distinct peut néanmoins créer un risque supplémentaire.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 9, 'relier', 2, ['COM-INTERMEDIAIRES'], ['Rôle de l’intermédiaire', 'Il faut identifier qui signe, en quel nom et pour quel compte. Le rapprochement des parties n’est pas la même mission que la conclusion du contrat en son propre nom.', 'Nom et compte sont deux critères.'], {
      consigne: 'Relie chaque intermédiaire à son rôle caractéristique.', paires: [['Courtier', 'Rapprocher des parties pour faciliter leur contrat'], ['Commissionnaire', 'Agir en son nom pour le compte du commettant'], ['Agent commercial', 'Négocier durablement comme mandataire indépendant']],
      explication: 'Le courtier rapproche. Le commissionnaire s’engage sous son propre nom pour le compte d’autrui. L’agent commercial intervient dans une mission durable de mandat indépendant, avec les pouvoirs définis.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 10, 'qcm', 2, ['COM-SOURCES'], ['Versions successives', 'Le droit OHADA comporte des textes révisés. L’identification du domaine ne dispense pas de vérifier la version et son entrée en vigueur.', 'Vérifier la date du texte utile.'], {
      consigne: 'Pour une procédure de recouvrement engagée sous le nouveau régime depuis 2024, quel texte faut-il examiner en tenant compte de ses dispositions transitoires ?', options: ['L’Acte uniforme révisé du 17 octobre 2023', 'Uniquement un résumé de l’Acte de 1998 sans vérifier les changements', 'La loi ivoirienne sur le mariage'], bonne: 0,
      explication: 'Le nouvel Acte est entré en vigueur le 16 février 2024. On doit l’examiner avec ses règles transitoires pour la procédure considérée ; une fiche ancienne non actualisée ne permet pas cette vérification.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 11, 'vf', 3, ['COM-ACTES', 'COM-SOCIETES'], ['Acte et forme sociale', 'L’AUDCG qualifie certains titres par leur forme. L’AUSCGIE reconnaît aussi la commercialité de certaines formes sociales indépendamment de leur objet.', 'Ne pas déduire la nature de l’acte du seul statut d’un signataire.'], {
      source: preselection, consigne: 'Vrai ou faux ? Affirmations 6 et 50 adaptées.', affirmations: [['Une lettre de change perd son caractère commercial dès qu’un signataire n’est pas commerçant.', false], ['Les sociétés par actions sont commerciales par la forme selon l’AUSCGIE.', true]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmations 6 et 50 adaptées) La lettre de change est commerciale par sa forme : la première affirmation est fausse. Les formes de sociétés par actions visées par l’AUSCGIE sont commerciales par la forme : la seconde est vraie. On distingue donc commercialité de l’acte, de la société et profession d’une personne physique.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 12, 'qcm', 3, ['COM-SOCIETES', 'COM-STATUT'], ['Personnalité sociale', 'La personnalité d’une société crée un sujet de droit distinct selon le régime applicable. La qualité d’associé ne rend pas automatiquement propriétaire de chaque bien social.', 'Séparer patrimoine social et patrimoine personnel.'], {
      consigne: 'Une SARL immatriculée achète un véhicule. Un associé soutient qu’il en est personnellement propriétaire parce qu’il détient des parts. Quelle analyse est correcte ?', options: ['Le véhicule appartient à la société ; les parts sont un droit distinct de l’associé', 'Chaque associé devient automatiquement propriétaire de tout le véhicule', 'La société n’a aucun patrimoine possible'], bonne: 0,
      explication: 'La société dotée de personnalité est l’acquéreur du véhicule. L’associé détient des parts, pas automatiquement la propriété personnelle de chaque actif. Confondre ces patrimoines empêche d’identifier le véritable titulaire.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 13, 'qcm', 3, ['COM-BAIL'], ['Renouveler un bail déterminé', 'L’AUDCG distingue la durée minimale d’exploitation conforme et la demande de renouvellement. Pour un bail à durée déterminée, cette demande doit parvenir dans les formes requises au plus tard trois mois avant son expiration ; le défaut de demande dans ce délai entraîne la déchéance du droit au renouvellement.', 'Vérifier séparément exploitation, forme et délai.'], {
      consigne: 'Aya exploite conformément à son bail professionnel depuis trois ans. Son bail à durée déterminée expire dans deux mois. Elle n’a encore formé aucune demande et notifie maintenant sa demande, reçue ce jour par le bailleur. Selon l’article 124 de l’AUDCG, quelle analyse est exacte ?', options: ['La demande est tardive ; elle est déchue du droit au renouvellement prévu par cet article', 'Trois ans d’exploitation dispensent de demander le renouvellement dans le délai', 'Toute demande faite avant le dernier jour du bail préserve ce droit'], bonne: 0,
      explication: 'On vérifie d’abord l’exploitation : trois ans dépassent les deux ans exigés par l’article 123. On contrôle ensuite le délai propre au bail à durée déterminée : la demande doit être faite au plus tard trois mois avant l’expiration. À deux mois du terme, cette limite est dépassée. L’article 124 prévoit alors la déchéance du droit au renouvellement ; l’ancienneté ne corrige pas le retard.',
    }),
    exercice('INFJ-MAG-COMMERCIAL', 14, 'qcm', 3, ['COM-INTERMEDIAIRES', 'COM-VENTE'], ['Identifier le cocontractant', 'La commission distingue la personne qui contracte sous son nom et celle pour le compte de laquelle l’opération est menée. La simple mise en relation est différente.', 'Lire les pouvoirs et le nom utilisé.'], {
      consigne: 'Koffi conclut une opération sous son propre nom pour le compte d’Aya dans le cadre d’une commission. Quelle analyse est exacte ?', options: ['Koffi agit comme commissionnaire ; Aya est le commettant', 'Koffi est nécessairement un simple courtier ne concluant rien', 'Aya doit être le juge de l’opération'], bonne: 0,
      explication: 'L’énoncé donne les deux critères : le nom de Koffi et le compte d’Aya. Ils correspondent à la commission. Le courtage caractéristique se limite au rapprochement des parties et ne décrit pas cette signature en son propre nom.',
    }),
  ],
};

// Parcours commun magistrature / greffes CMS : un seul module, deux références.
const administratif = {
  code: 'INFJ-MAG-ADMIN', matiere: 'Droit administratif', titre: 'Droit administratif',
  resume: 'Comprendre l’administration, son organisation, ses décisions, ses contrats et les recours qui encadrent son action en Côte d’Ivoire.',
  notions: [
    { code: 'ADM-SOURCES', libelle: 'Administration, intérêt général et légalité' },
    { code: 'ADM-ORGANISATION', libelle: 'Déconcentration, décentralisation et contrôles' },
    { code: 'ADM-SERVICE', libelle: 'Service public et principes de fonctionnement' },
    { code: 'ADM-POLICE', libelle: 'Police administrative et libertés' },
    { code: 'ADM-ACTE', libelle: 'Acte unilatéral, légalité et pouvoir discrétionnaire' },
    { code: 'ADM-CONTRAT', libelle: 'Contrat administratif et exécution' },
    { code: 'ADM-RESPONSABILITE', libelle: 'Dommage, faute et réparation' },
    { code: 'ADM-RECOURS', libelle: 'Recours administratif, annulation et urgence' },
  ],
  lecons: [
    cours('INFJ-MAG-ADMIN', 1, 'ADM-SOURCES', 'Pourquoi l’administration est-elle soumise au droit ?', {
      objectif: 'Nous partons de zéro : identifier l’administration et comprendre pourquoi une décision publique doit avoir un fondement juridique.',
      regle: 'Le **droit** organise la vie sociale par des règles obligatoires. L’**administration** réunit des autorités et services chargés de missions publiques. L’**intérêt général** vise les besoins collectifs ; il ne se confond pas avec l’intérêt personnel d’un agent. Le droit administratif encadre cette action, avec des pouvoirs et des obligations particuliers. La **légalité** exige le respect des règles applicables : Constitution, engagements internationaux, lois, règlements et principes reconnus par les juges. Un **administré** est une personne en relation avec l’administration.',
      exemples: [['Un document officiel', 'Un service délivre un document selon des conditions légales. L’agent vérifie ces conditions ; il ne peut exiger un cadeau personnel pour accomplir sa mission.'], ['Un texte inférieur', 'Un arrêté est une décision prise par une autorité administrative. Il doit respecter les normes qui lui sont supérieures ; son caractère officiel ne le met pas au-dessus de la loi.']],
      piege: 'Toute relation avec une personne publique ne relève pas automatiquement du même régime administratif. L’objet de l’activité et les textes comptent aussi.',
      question: ['L’intérêt général autorise-t-il une autorité à ignorer toute règle ?', ['Non, son action reste soumise au droit', 'Oui, dès qu’elle invoque une mission publique', 'Oui, si elle refuse de motiver son choix'], 0, 'Une mission collective donne une finalité à l’action ; elle ne supprime ni les limites de compétence ni les autres règles de légalité.'],
      recap: ['Administration : autorités et services de missions publiques.', 'Intérêt général distinct de l’intérêt personnel.', 'Les pouvoirs administratifs restent encadrés.'],
    }),
    cours('INFJ-MAG-ADMIN', 2, 'ADM-ORGANISATION', 'La déconcentration rapproche l’État des habitants', {
      objectif: 'Nous allons reconnaître une autorité locale qui agit au nom de l’État, thème fréquent de la présélection INFJ.',
      regle: 'Une **personne morale** est une organisation reconnue comme titulaire de droits et d’obligations ; l’État en est une. La **centralisation** concentre la décision dans l’État. La **déconcentration** confie des pouvoirs de décision à ses représentants territoriaux : ils restent dans la même personne morale. En Côte d’Ivoire, préfets et sous-préfets interviennent dans les circonscriptions administratives selon leurs attributions. Le **contrôle hiérarchique** s’exerce entre autorités d’une même organisation, suivant les compétences légales.',
      exemples: [['Une décision locale de l’État', 'Le sous-préfet agit dans sa circonscription au titre de ses fonctions étatiques. La proximité des habitants ne transforme pas son service en collectivité autonome.'], ['Une chaîne administrative', 'Une instruction hiérarchique circule au sein de l’administration de l’État. Elle ne constitue pas un accord entre deux personnes morales distinctes.']],
      piege: 'Un service déconcentré ne transmet pas seulement du courrier : il peut disposer de pouvoirs de décision. Déconcentrer ne signifie pas créer une nouvelle personne morale.',
      question: ['Dans la déconcentration, le représentant territorial agit principalement…', ['au nom de l’État', 'au nom d’un nouvel État indépendant', 'nécessairement comme élu municipal'], 0, 'Le pouvoir est réparti à l’intérieur de l’État. La personne morale demeure la même, même lorsque la décision est prise localement.'],
      recap: ['Déconcentration : pouvoirs au sein de l’État.', 'Préfets et sous-préfets : représentants territoriaux.', 'Hiérarchie : relation interne à l’organisation.'],
    }),
    cours('INFJ-MAG-ADMIN', 3, 'ADM-ORGANISATION', 'La décentralisation donne une autonomie encadrée', {
      objectif: 'Nous allons distinguer une commune d’un service de l’État pour choisir le bon vocabulaire de contrôle.',
      regle: 'La **décentralisation** confie des compétences à des personnes publiques distinctes de l’État. Les **collectivités territoriales**, notamment régions et communes, disposent d’organes propres et d’une autonomie dans le cadre légal. La région peut aussi désigner une circonscription de l’État : on précise toujours en quelle qualité l’autorité agit. La **tutelle** est le contrôle de l’État sur une collectivité selon les textes ; elle se distingue du pouvoir hiérarchique interne et ne permet pas n’importe quelle intervention.',
      exemples: [['La commune', 'Un conseil municipal délibère sur une affaire relevant des compétences communales. Il agit pour la commune, personne morale distincte de l’État.'], ['Deux fonctions à distinguer', 'Le préfet de région représente l’État ; le conseil régional est un organe de la collectivité régionale. Le même mot « région » ne rend pas leurs fonctions identiques.']],
      piege: 'Autonomie ne signifie pas souveraineté. La commune reste soumise à la loi et aux contrôles prévus, sans devenir un service sous hiérarchie générale du préfet.',
      question: ['Quel critère distingue surtout la décentralisation de la déconcentration ?', ['L’existence d’une personne publique distincte de l’État', 'La seule distance avec Abidjan', 'Le nombre de bureaux'], 0, 'La déconcentration reste à l’intérieur de l’État ; la décentralisation attribue des compétences à une autre personne publique, dotée d’une autonomie légale.'],
      recap: ['Collectivité : personne publique distincte.', 'Autonomie dans les compétences attribuées.', 'Tutelle légale distincte de la hiérarchie.'],
    }),
    cours('INFJ-MAG-ADMIN', 4, 'ADM-SERVICE', 'Comment doit fonctionner un service public ?', {
      objectif: 'Nous allons comprendre les principes qui organisent une activité destinée aux besoins collectifs.',
      regle: 'Un **service public** est une activité d’intérêt général assumée ou encadrée par une personne publique selon le régime applicable. L’**usager** bénéficie du service. La **continuité** vise son fonctionnement régulier ; elle ne signifie pas ouverture permanente de tout guichet. L’**égalité** impose un traitement conforme aux règles, sans favoritisme ; des situations différentes ou un intérêt général pertinent peuvent justifier des différences légales. L’**adaptation**, ou mutabilité, permet de faire évoluer l’organisation pour répondre aux besoins.',
      exemples: [['Une file d’attente', 'Servir un ami avant les autres pour ce seul motif pose une question d’égalité. Une priorité légalement prévue doit au contraire être examinée selon ses conditions.'], ['Un service qui évolue', 'Changer une organisation devenue inadaptée peut répondre à la mutabilité. Cela ne dispense pas de respecter les compétences, procédures et droits applicables.']],
      piege: 'Service public ne signifie pas nécessairement gratuité. Égalité ne veut pas dire identité de traitement quelles que soient les situations.',
      question: ['L’évolution du service pour répondre à de nouveaux besoins correspond…', ['à l’adaptation', 'à l’immunité de toute administration', 'à une condamnation pénale automatique'], 0, 'La mutabilité permet l’évolution du service. Le changement reste soumis au droit ; les autres principes ne disparaissent pas.'],
      recap: ['Continuité : fonctionnement régulier.', 'Égalité : pas de favoritisme.', 'Adaptation : évolution encadrée des modalités.'],
    }),
    cours('INFJ-MAG-ADMIN', 5, 'ADM-POLICE', 'Prévenir un trouble en respectant les libertés', {
      objectif: 'Nous allons distinguer une mesure de prévention d’une recherche des auteurs d’infraction.',
      regle: 'La **police administrative** vise à prévenir les troubles à l’ordre public, notamment sécurité, tranquillité et salubrité publiques. La **police judiciaire** recherche et constate des infractions et leurs auteurs. La distinction dépend de la finalité de l’opération, pas seulement de l’uniforme de l’agent. Une restriction de liberté demande une autorité compétente, un fondement et une mesure nécessaire et proportionnée au risque. Les polices spéciales obéissent à leurs textes propres.',
      exemples: [['Prévenir un danger', 'Restreindre temporairement un accès dangereux peut avoir une finalité préventive. On vérifie le risque, la compétence et l’étendue nécessaire de la mesure.'], ['Rechercher un auteur', 'Rechercher l’auteur d’un vol déjà constaté relève d’une opération de police judiciaire. Le même agent peut accomplir des missions différentes dans des cadres distincts.']],
      piege: 'L’ordre public ne justifie pas automatiquement une interdiction générale et permanente. On doit expliquer pourquoi une mesure moins restrictive ne répondrait pas au danger.',
      question: ['Rechercher l’auteur d’un vol constaté relève principalement…', ['de la police judiciaire', 'de la seule médiation', 'du vote de la loi'], 0, 'L’objectif décrit est de rechercher un auteur d’infraction. Une mesure prévenant un trouble futur répond à une autre finalité.'],
      recap: ['Administrative : prévention.', 'Judiciaire : infraction et recherche des auteurs.', 'Restriction : compétence, nécessité, proportion.'],
    }),
    cours('INFJ-MAG-ADMIN', 6, 'ADM-ACTE', 'Une décision unilatérale peut-elle être arbitraire ?', {
      objectif: 'Nous allons analyser une décision imposée par l’administration, puis les limites de sa liberté de choix.',
      regle: 'Un **acte administratif unilatéral** modifie une situation juridique sans exiger l’accord de son destinataire. Il peut être **réglementaire**, règle générale, ou **individuel**, visant une situation déterminée. Sa légalité demande notamment compétence, formes et procédure régulières, faits exacts et fondement juridique. Le **pouvoir discrétionnaire** laisse un choix entre plusieurs décisions légales ; la **compétence liée** impose une décision lorsque les conditions sont réunies. Un **détournement de pouvoir** utilise un pouvoir pour une fin étrangère à celle pour laquelle il a été confié.',
      exemples: [['Une nomination', 'Nommer une personne à un poste concerne une situation individuelle. Le décideur doit être habilité et respecter les conditions du poste.'], ['Un choix encadré', 'Une autorité dispose d’une marge d’appréciation. Choisir dans le seul but de favoriser un proche ne devient pas légal au motif que le pouvoir est discrétionnaire.']],
      piege: 'Une décision unilatérale n’est pas un contrat. Discrétionnaire ne signifie ni sans règle ni sans contrôle du juge.',
      question: ['Une liberté de choix entre plusieurs décisions légales est…', ['un pouvoir discrétionnaire encadré', 'un droit de violer la loi', 'nécessairement un contrat privé'], 0, 'La marge concerne le choix dans le cadre légal. Compétence, procédure, motifs et but de l’action restent contrôlables selon les règles applicables.'],
      recap: ['Unilatéral : accord du destinataire non nécessaire.', 'Réglementaire et individuel : portées différentes.', 'Choix discrétionnaire toujours soumis à la légalité.'],
    }),
    cours('INFJ-MAG-ADMIN', 7, 'ADM-CONTRAT', 'L’administration peut aussi agir par contrat', {
      objectif: 'Nous allons distinguer décision imposée et accord, puis reconnaître les contraintes d’un marché public.',
      regle: 'Un **contrat** est un accord créant des obligations ; un **cocontractant** en est une partie. Tous les contrats d’une administration ne relèvent pas automatiquement du même régime. Le **marché public** est un contrat à titre onéreux portant notamment sur travaux, fournitures ou services dans le champ du Code ivoirien de 2019. Ce Code encadre la mise en concurrence, la passation et l’exécution. Les pouvoirs de modification ou de résiliation sont soumis à des conditions et garanties : ce ne sont pas des libertés sans limite.',
      exemples: [['Acheter une prestation', 'Une personne publique commande des fournitures contre paiement dans le champ du Code. On identifie le marché, la procédure requise et les obligations convenues.'], ['Un bouleversement économique', 'L’**imprévision** désigne, dans le régime applicable, un événement imprévisible et extérieur qui bouleverse l’économie du contrat sans en rendre l’exécution impossible. Elle ne se confond pas avec un simple surcoût ni avec une autorisation automatique d’abandonner la prestation.']],
      piege: 'Ne pas transposer automatiquement une jurisprudence étrangère. La qualification du contrat, les clauses et le texte ivoirien déterminent les pouvoirs et l’éventuelle indemnisation.',
      question: ['Un surcoût donne-t-il automatiquement le droit d’abandonner un marché ?', ['Non, le régime d’exécution et les conditions de l’événement doivent être examinés', 'Oui, quel que soit son montant', 'Oui, sans informer personne'], 0, 'Le surcoût ne prouve ni impossibilité ni imprévision juridiquement caractérisée. Les obligations continuent à s’apprécier dans le cadre du contrat et du Code applicable.'],
      recap: ['Contrat : accord ; décision unilatérale : autre mécanisme.', 'Marché public : passation et exécution encadrées.', 'Difficulté économique et impossibilité sont distinctes.'],
    }),
    cours('INFJ-MAG-ADMIN', 8, 'ADM-RESPONSABILITE', 'Un dommage appelle-t-il une réparation ?', {
      objectif: 'Nous allons construire un raisonnement de responsabilité sans confondre annuler et indemniser.',
      regle: 'La **responsabilité** peut obliger une personne à réparer un dommage qui lui est juridiquement imputable. Dans un raisonnement pour faute, on établit une **faute**, manquement à une obligation, un **préjudice** réparable et un **lien de causalité** entre les deux. Une **faute de service** se rattache au fonctionnement du service ; une **faute personnelle** demande l’examen du comportement propre de l’agent et de ses liens avec le service. Il existe aussi des régimes sans faute dans des conditions particulières. Le juge compétent et le fondement doivent être identifiés.',
      exemples: [['Un dossier mal traité', 'Un demandeur invoque un retard fautif et une perte financière. Il doit préciser la règle méconnue, la perte établie et la manière dont le retard l’a causée.'], ['Une décision annulée', 'Faire annuler un acte illégal ne chiffre pas à lui seul une indemnité. La demande de réparation exige une analyse complémentaire du préjudice et du lien causal.']],
      piege: 'Un dommage survenu dans un bâtiment public ne prouve pas à lui seul la faute du service. Inversement, ne pas affirmer que toute réparation impose toujours une faute.',
      question: ['Dans un raisonnement de responsabilité pour faute, il faut relier…', ['faute, préjudice réparable et causalité', 'uniquement le nom de l’agent à son âge', 'le dommage à une peine automatique'], 0, 'Le manquement doit être établi, puis le dommage et son lien avec ce manquement. L’indemnisation ne résulte pas du seul emploi du mot faute.'],
      recap: ['Identifier le fondement et la personne responsable.', 'Pour faute : manquement, préjudice, causalité.', 'Annulation et indemnisation sont distinctes.'],
    }),
    cours('INFJ-MAG-ADMIN', 9, 'ADM-RECOURS', 'Contester un acte par la voie prévue', {
      objectif: 'Nous allons distinguer la demande adressée à l’administration de la demande d’annulation adressée au juge.',
      regle: 'Le **recours pour excès de pouvoir** demande l’annulation d’une décision administrative illégale. Le Conseil d’État est la juridiction suprême administrative ; on vérifie ses attributions et celles des autres juridictions. Pour le recours régi par les articles 71 à 74 de sa loi organique de 2020, un **recours administratif préalable** est exigé : **gracieux** devant l’auteur de l’acte ou **hiérarchique** devant son supérieur. Il doit être écrit et formé dans les deux mois de la publication, notification ou connaissance acquise. Le rejet ouvre une nouvelle étape juridictionnelle selon les délais légaux.',
      exemples: [['Choisir le destinataire', 'Demander au ministre de revenir sur sa propre décision est un recours gracieux. Demander au supérieur compétent de revoir celle d’un subordonné est un recours hiérarchique.'], ['Reconstituer le calendrier', 'La notification, le dépôt du recours et son rejet exprès ou implicite sont des événements distincts. Les articles 73 et 74 prévoient en principe deux mois pour le rejet implicite, puis deux mois pour saisir le Conseil d’État ; un corps délibérant appelle la règle spéciale de l’article 73.']],
      piege: 'L’article 70 prévoit l’irrecevabilité si un recours ordinaire de pleine juridiction permet de faire valoir le droit. Ce n’est pas une obligation d’épuiser tous les procès possibles.',
      question: ['Un recours gracieux est adressé…', ['à l’auteur de la décision', 'nécessairement au Conseil constitutionnel', 'au greffier pour qu’il annule lui-même l’acte'], 0, 'L’auteur peut être invité à reconsidérer son acte. Cette démarche administrative précède, dans le régime étudié, la saisine juridictionnelle sous ses conditions propres.'],
      recap: ['Identifier acte, grief et juge compétent.', 'Recours préalable écrit : gracieux ou hiérarchique.', 'Reconstituer les délais et vérifier les règles spéciales.'],
    }),
    cours('INFJ-MAG-ADMIN', 10, 'ADM-RECOURS', 'Urgence : suspendre ou obtenir une mesure utile ?', {
      objectif: 'Nous allons distinguer deux voies urgentes qui ne produisent pas le même effet sur une décision.',
      regle: 'Le **sursis à exécution** vise la suspension des effets d’une décision. Les articles 87 et 88 de la loi organique du Conseil d’État l’encadrent : recours administratif préalable, champ autorisé, urgence et moyen créant un doute sérieux sur la légalité. Le **référé administratif** de l’article 91 permet notamment un constat d’expert ou une mesure utile, sans trancher le fond ni faire obstacle à l’exécution d’une décision administrative. Un **moyen** est un argument juridique. L’urgence ne donne pas au juge tous les pouvoirs.',
      exemples: [['Garder une preuve', 'Une situation matérielle risque de disparaître. Un constat urgent peut conserver la preuve sans annuler la décision à l’origine du litige.'], ['Suspendre un effet', 'La personne veut empêcher provisoirement l’exécution d’un acte. Elle doit examiner le sursis et ses conditions, dont les exclusions de l’article 87 relatives à l’ordre, à la sécurité et à la tranquillité publics.']],
      piege: 'Ne pas importer les noms et pouvoirs des référés français. Une simple requête en annulation ne permet pas de supposer que l’acte est suspendu.',
      question: ['Pour suspendre les effets d’une décision administrative, quelle voie spécifique étudier ?', ['Le sursis à exécution et ses conditions', 'Une modification personnelle de la décision au stylo', 'Le référé de l’article 91 supposé permettre tout obstacle à l’exécution'], 0, 'Le sursis vise cet effet suspensif. Le référé de l’article 91 a d’autres pouvoirs et ne permet pas de contourner les conditions propres à la suspension.'],
      recap: ['Sursis : suspension sous conditions.', 'Référé : constat ou mesure utile dans ses limites.', 'Urgence, compétence et objet de la demande à distinguer.'],
    }),
  ],
  exercices: [
    exercice('INFJ-MAG-ADMIN', 1, 'relier', 1, ['ADM-SOURCES'], ['Action administrative', 'Les autorités publiques poursuivent des finalités collectives dans les limites de leurs compétences. Leurs décisions restent soumises aux normes applicables.', 'Identifier le besoin collectif et le fondement du pouvoir.'], {
      consigne: 'Relie chaque terme à sa définition.', paires: [['Administré', 'Personne en relation avec l’administration'], ['Intérêt général', 'Finalité répondant aux besoins collectifs'], ['Légalité', 'Respect des règles de droit applicables']],
      explication: 'L’administré désigne la personne dans sa relation avec l’administration. L’intérêt général concerne la finalité collective ; la légalité concerne les limites juridiques de l’action. Une finalité utile ne supprime pas ces limites.',
    }),
    exercice('INFJ-MAG-ADMIN', 2, 'vf', 1, ['ADM-ORGANISATION'], ['Répartir les compétences', 'La déconcentration attribue des pouvoirs à des représentants de l’État dans la même personne morale. La décentralisation concerne des personnes publiques distinctes.', 'Chercher pour quelle personne l’autorité agit.'], {
      source: preselection, consigne: 'Vrai ou faux ? Adaptation des affirmations 2 et 4.', affirmations: [['La déconcentration confie des pouvoirs à des représentants territoriaux de l’État.', true], ['Le contrôle hiérarchique s’exerce nécessairement entre deux personnes morales distinctes.', false]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmations 2 et 4 adaptées) La première affirmation est vraie : les pouvoirs sont répartis dans l’État. La seconde est fausse : la hiérarchie s’exerce dans une même organisation ; le contrôle sur une collectivité distincte doit être qualifié selon les textes de tutelle.',
    }),
    exercice('INFJ-MAG-ADMIN', 3, 'classer', 1, ['ADM-ORGANISATION'], ['État et collectivités', 'La localisation ne suffit pas à qualifier l’autorité. Il faut distinguer représentation territoriale de l’État et organes propres d’une collectivité.', 'Le mot région a deux emplois.'], {
      consigne: 'Classe l’organisation illustrée.', categories: ['Déconcentration', 'Décentralisation'], cartes: [['Sous-préfet agissant au nom de l’État', 0], ['Conseil municipal agissant pour la commune', 1], ['Préfet de région représentant l’État', 0], ['Conseil régional agissant pour la collectivité', 1]],
      explication: 'Sous-préfet et préfet agissent ici pour l’État : déconcentration. Conseil municipal et conseil régional agissent pour des collectivités distinctes : décentralisation. Le territoire peut se recouper sans confondre les personnes publiques.',
    }),
    exercice('INFJ-MAG-ADMIN', 4, 'relier', 1, ['ADM-SERVICE'], ['Principes du service', 'Un service public doit répondre aux besoins collectifs de manière régulière et selon les règles applicables aux usagers. Son organisation peut évoluer.', 'Rattacher chaque situation au principe précis.'], {
      consigne: 'Associe chaque principe à l’illustration correspondante.', paires: [['Continuité', 'Organiser le fonctionnement régulier du service'], ['Égalité', 'Éviter un passe-droit accordé au seul ami de l’agent'], ['Adaptation', 'Faire évoluer légalement un fonctionnement devenu inadapté']],
      explication: 'La continuité concerne la régularité, l’égalité l’absence de favoritisme et l’adaptation l’évolution du service. Aucun de ces principes ne signifie que toute prestation doit être gratuite ou disponible sans horaire.',
    }),
    exercice('INFJ-MAG-ADMIN', 5, 'classer', 1, ['ADM-POLICE'], ['Finalité de l’opération', 'La police administrative prévient un trouble. La police judiciaire intervient pour constater une infraction et rechercher son auteur. La finalité prime sur le seul statut de l’agent.', 'Quel est l’objectif décrit ?'], {
      consigne: 'Classe la finalité principale de ces opérations.', categories: ['Police administrative', 'Police judiciaire'], cartes: [['Organiser préventivement la sécurité d’un rassemblement', 0], ['Rechercher l’auteur d’un vol constaté', 1], ['Prévenir un danger sanitaire par une mesure légalement prévue', 0]],
      explication: 'Le rassemblement et le danger sanitaire appellent ici une prévention des troubles : police administrative. La recherche du voleur vise l’auteur d’une infraction constatée : police judiciaire. L’uniforme ne tranche pas seul la question.',
    }),
    exercice('INFJ-MAG-ADMIN', 6, 'vf', 2, ['ADM-ACTE'], ['Légalité d’une décision', 'Un acte unilatéral n’exige pas l’accord du destinataire. Ses pouvoirs restent limités par la compétence, la procédure et le fondement légal ; une marge de choix ne supprime pas ces exigences.', 'Distinguer accord et légalité.'], {
      source: admin2025, consigne: 'Vrai ou faux ? Entraînement adapté du thème « L’acte administratif unilatéral ».', affirmations: [['Toute décision unilatérale exige l’accord de son destinataire pour être unilatérale.', false], ['Un pouvoir discrétionnaire autorise à poursuivre n’importe quel intérêt personnel.', false]],
      explication: '(INFJ, greffes cycle supérieur, droit administratif juin 2025, thème adapté) Les deux phrases sont fausses. L’unilatéralité se distingue de l’accord contractuel. La marge d’appréciation reste soumise à la légalité et au but du pouvoir ; elle ne rend pas licite un favoritisme personnel.',
    }),
    exercice('INFJ-MAG-ADMIN', 7, 'qcm', 2, ['ADM-ACTE', 'ADM-SOURCES'], ['Contrôler le but', 'Le but du pouvoir doit correspondre à sa finalité légale. Une compétence régulière ne couvre pas une utilisation destinée à une fin étrangère.', 'Distinguer pouvoir de décider et motif personnel.'], {
      consigne: 'Une autorité utilise un pouvoir légal pour régler une vengeance personnelle. Quelle illégalité faut-il examiner en priorité ?', options: ['Un détournement de pouvoir', 'Une déconcentration nécessairement régulière', 'Une annulation de toute loi par la commune'], bonne: 0,
      explication: 'L’autorité peut être compétente, mais l’énoncé détourne la finalité du pouvoir : vengeance au lieu du but légal. On examine donc le détournement de pouvoir et sa preuve, sans confondre compétence et but.',
    }),
    exercice('INFJ-MAG-ADMIN', 8, 'qcm', 2, ['ADM-CONTRAT'], ['Exécution d’un marché', 'L’événement invoqué doit être qualifié selon le texte et le contrat. Un bouleversement économique ne se confond pas avec une impossibilité d’exécuter ni avec un droit automatique à toute indemnité.', 'Distinguer difficulté, bouleversement et impossibilité.'], {
      consigne: 'Un fournisseur invoque un événement extérieur imprévisible qui bouleverse l’économie du marché, tout en laissant la livraison possible. Quelle distinction doit-il examiner ?', options: ['L’imprévision plutôt qu’une impossibilité d’exécution supposée', 'La nullité du mariage du comptable', 'Une disparition automatique de toute obligation'], bonne: 0,
      explication: 'Les faits décrivent une difficulté économique majeure, pas une impossibilité. Ils orientent vers l’examen de l’imprévision dans le régime du marché. Ils ne prouvent pas à eux seuls un droit d’abandon ni le montant d’une indemnité.',
    }),
    exercice('INFJ-MAG-ADMIN', 9, 'entourer', 2, ['ADM-RESPONSABILITE'], ['Responsabilité pour faute', 'Une demande indemnitaire doit identifier le fondement de responsabilité et établir les faits qui le justifient. Une irrégularité et un préjudice sont des questions distinctes.', 'Relier les éléments au lieu de seulement les nommer.'], {
      consigne: 'Dans une demande fondée sur une faute de service, sélectionne les éléments à établir.', elements: [['Manquement imputable au service', true], ['Préjudice réparable du demandeur', true], ['Lien causal entre le manquement et le préjudice', true], ['Simple désaccord sans aucun dommage établi, suffisant dans tous les cas', false]],
      explication: 'On caractérise le manquement, puis le préjudice et la causalité. La seule insatisfaction ne remplace aucun de ces éléments. D’autres fondements de responsabilité peuvent exister, mais ils demandent leurs conditions propres.',
    }),
    exercice('INFJ-MAG-ADMIN', 10, 'ordre', 2, ['ADM-RECOURS'], ['Chronologie du recours', 'Dans le régime étudié devant le Conseil d’État, l’annulation demande un recours administratif préalable et le respect de délais successifs. La démarche administrative et la requête au juge sont distinctes.', 'Conserver les dates et preuves de dépôt.'], {
      consigne: 'Ordonne ce parcours simplifié, en supposant la compétence du Conseil d’État et toutes les conditions remplies.', mode: 'exact', elements: ['Identifier la décision et la date de sa notification', 'Former dans le délai le recours administratif préalable écrit', 'Identifier son rejet exprès ou implicite', 'Saisir le Conseil d’État dans le délai juridictionnel applicable'],
      explication: 'La notification sert à reconstruire le calendrier. Le recours préalable précède le recours au juge. Son rejet exprès ou implicite permet ensuite de déterminer le délai de la requête juridictionnelle ; ces dates ne sont pas interchangeables.',
    }),
    exercice('INFJ-MAG-ADMIN', 11, 'relier', 2, ['ADM-RECOURS'], ['Objet de la demande', 'Le recours administratif invite l’administration à reconsidérer un acte. Les procédures juridictionnelles d’annulation, de suspension ou de constat ont des conditions et effets distincts.', 'Partir du résultat recherché.'], {
      consigne: 'Relie chaque voie à son objet caractéristique.', paires: [['Recours gracieux', 'Demander à l’auteur de reconsidérer sa décision'], ['Recours pour excès de pouvoir', 'Demander au juge l’annulation d’un acte illégal'], ['Sursis à exécution', 'Demander la suspension des effets dans les conditions légales'], ['Référé de l’article 91', 'Obtenir notamment un constat urgent sans trancher le fond']],
      explication: 'Le gracieux reste une démarche administrative. L’annulation vise la légalité de l’acte. Le sursis peut en suspendre les effets ; le constat en référé conserve des faits. Choisir une voie exige ensuite de vérifier ses conditions, pas seulement son nom.',
    }),
    exercice('INFJ-MAG-ADMIN', 12, 'qcm', 3, ['ADM-ORGANISATION', 'ADM-ACTE'], ['Deux contrôles distincts', 'Une collectivité dispose d’une autonomie encadrée. L’État exerce les contrôles attribués par les textes ; le vocabulaire de hiérarchie ne s’étend pas automatiquement à toutes les relations publiques.', 'Identifier les personnes puis le texte de contrôle.'], {
      consigne: 'Un préfet veut annuler une délibération communale au seul motif qu’il préfère une autre politique, sans invoquer de pouvoir prévu par un texte. Quel raisonnement convient ?', options: ['Exiger le fondement et les conditions du contrôle sur la commune', 'Reconnaître une hiérarchie générale sur toute délibération', 'Considérer que la commune échappe à toute règle de droit'], bonne: 0,
      explication: 'La commune est distincte de l’État. Le préfet ne tire pas de cette seule qualité un pouvoir hiérarchique général sur ses actes. Il faut établir le mécanisme légal de contrôle ; l’autonomie communale ne supprime pas non plus les contrôles existants.',
    }),
    exercice('INFJ-MAG-ADMIN', 13, 'qcm', 3, ['ADM-POLICE', 'ADM-ACTE'], ['Restriction proportionnée', 'Une mesure de police doit être justifiée par les circonstances et proportionnée au risque. La finalité de sécurité ne dispense pas de vérifier l’étendue nécessaire de la restriction.', 'Comparer risque constaté, durée et périmètre.'], {
      consigne: 'Un danger concerne un seul accès pendant deux heures. L’autorité interdit sans autre justification tous les accès pendant un mois. Quel point critique examiner ?', options: ['La nécessité et la proportion de la durée et du périmètre', 'La commercialité par la forme du danger', 'L’impossibilité absolue de toute prévention'], bonne: 0,
      explication: 'Le risque est localisé et temporaire, tandis que la mesure est générale et longue. Cet écart appelle un contrôle de nécessité et de proportion : l’autorité doit justifier pourquoi une restriction plus ciblée ne répondrait pas au danger. La conclusion ne repose pas sur le seul mot sécurité.',
    }),
    exercice('INFJ-MAG-ADMIN', 14, 'qcm', 3, ['ADM-RECOURS'], ['Recours disponible', 'L’article 70 de la loi organique du Conseil d’État traite la disponibilité d’un recours ordinaire de pleine juridiction. Il faut distinguer cette condition de l’existence d’un recours administratif préalable.', 'Une voie disponible n’est pas une liste de voies à épuiser.'], {
      source: preselection, consigne: 'Vrai ou faux sous forme de choix ? Adaptation de l’affirmation 49 : le recours pour excès de pouvoir suppose-t-il d’épuiser tous les recours ordinaires de pleine juridiction ?', options: ['Non : l’article 70 pose au contraire une irrecevabilité lorsqu’un tel recours permet de faire valoir le droit', 'Oui : il faut engager tous les procès possibles avant l’annulation', 'Oui : une médiation remplace nécessairement ces procès'], bonne: 0,
      explication: '(INFJ, magistrature, présélection avril 2025, affirmation 49 adaptée) L’énoncé confond deux mécanismes. L’article 70 rend le recours en annulation irrecevable lorsqu’un recours ordinaire de pleine juridiction permet de faire valoir le droit ; il n’impose pas de l’épuiser. Le recours administratif préalable des articles 71 et suivants reste une autre condition.',
    }),
    exercice('INFJ-MAG-ADMIN', 15, 'qcm', 3, ['ADM-RECOURS', 'ADM-RESPONSABILITE'], ['Deux objets contentieux', 'L’annulation et la réparation répondent à des questions distinctes, même si des conclusions indemnitaires peuvent accompagner une demande d’annulation selon la loi organique. Chaque objet garde ses conditions.', 'Lire le résultat demandé et les faits établis.'], {
      consigne: 'Un acte est annulé. Le demandeur réclame aussi 2 000 000 F sans démontrer sa perte ni son lien avec l’acte. Que reste-t-il à examiner ?', options: ['Le préjudice réparable, son lien causal et les autres conditions de l’indemnisation', 'Rien : toute annulation donne automatiquement ce montant', 'L’effacement pénal de toute condamnation'], bonne: 0,
      explication: 'L’annulation répond à la légalité de l’acte. Elle ne démontre pas automatiquement une perte de 2 000 000 F. La réparation requiert son fondement, un préjudice établi et sa causalité ; le chiffre réclamé doit être justifié.',
    }),
    exercice('INFJ-MAG-ADMIN', 16, 'qcm', 3, ['ADM-RECOURS'], ['Pouvoir du juge urgent', 'Le référé de l’article 91 ne fait pas obstacle à l’exécution d’une décision administrative. La suspension répond au régime spécifique des articles 87 et 88.', 'Identifier l’effet réellement recherché.'], {
      consigne: 'Une personne demande une mesure appelée « constat », mais veut en réalité empêcher l’exécution d’une décision administrative. Quelle analyse faut-il mener ?', options: ['Examiner l’effet réel demandé et les conditions du sursis, sans contourner ses limites par le nom choisi', 'Accorder toute suspension dès que le mot constat figure', 'Considérer le dépôt de la demande comme une annulation définitive'], bonne: 0,
      explication: 'Le nom donné ne change pas l’effet recherché : bloquer une décision. L’article 91 limite le référé ; il faut donc examiner le régime du sursis et ses conditions propres. Ni le constat ni le dépôt d’une requête ne réalisent une annulation définitive.',
    }),
  ],
};

module.exports = [personnes, procedureCivile, procedurePenale, commercial, administratif];
