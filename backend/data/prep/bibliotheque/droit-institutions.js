const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, b, lecon } = require('../dsl');

// ═════════════════════════════════════════════════════════════════════════
// Les institutions de la Côte d'Ivoire (Constitution du 8 novembre 2016, révisée en 2020)
// Utile : INFJ (droit constitutionnel, ordre général), ENS (ECM et fonction publique),
// INFAS et INPHB (culture générale).
// ═════════════════════════════════════════════════════════════════════════
const institutions = {
  code: 'CG-INSTIT',
  matiere: 'Culture générale',
  titre: 'Les institutions de la Côte d’Ivoire',
  resume: 'Constitution de 2016, pouvoirs exécutif, législatif et judiciaire, institutions consultatives.',
  notions: [
    { code: 'CONSTITUTION', libelle: 'La Constitution de la IIIᵉ République' },
    { code: 'EXECUTIF', libelle: 'Le pouvoir exécutif' },
    { code: 'LEGISLATIF', libelle: 'Le Parlement (Assemblée nationale et Sénat)' },
    { code: 'JURIDICTIONS', libelle: 'Le pouvoir judiciaire et le Conseil constitutionnel' },
    { code: 'SYMBOLES', libelle: 'Symboles et repères de la République' },
  ],
  lecons: [
    lecon('CG-INSTIT-L1', 'La Constitution et le pouvoir exécutif', 8, [
      b.texte('La Constitution de la **IIIᵉ République**, adoptée par référendum le 30 octobre 2016, a été **promulguée le 8 novembre 2016**. Elle a été révisée en mars 2020.'),
      b.titre('Les symboles de la République'),
      b.liste(['Devise : **Union – Discipline – Travail**.', 'Hymne national : **L’Abidjanaise**.', 'Drapeau : trois bandes verticales **orange, blanc, vert**.', 'Capitale politique et administrative : **Yamoussoukro** (depuis 1983).']),
      b.titre('Le pouvoir exécutif'),
      b.liste([
        'Le **Président de la République** est élu au suffrage universel direct pour **5 ans**, rééligible **une seule fois**. Il est le chef de l’État et détient le pouvoir exécutif.',
        'Le **Vice-Président** est, depuis la révision de 2020, nommé par le Président de la République avec l’accord du Parlement.',
        'Le **Premier ministre**, nommé par le Président, coordonne l’action du **Gouvernement**.',
      ]),
      b.question(qcm({
        code: 'CG-INSTIT-L1-Q1', niveau: 1,
        consigne: 'Quelle est la durée du mandat présidentiel ?',
        options: ['5 ans', '7 ans', '4 ans'], bonne: 0,
        explication: 'Le Président est élu pour 5 ans, renouvelable une fois.',
      })),
      b.retenir('Repères : indépendance le **7 août 1960** ; premier Président : **Félix Houphouët-Boigny**.'),
      b.recap(['Constitution promulguée le 8 novembre 2016.', 'Président : 5 ans, une réélection possible.', 'Devise : Union – Discipline – Travail.']),
    ]),
    lecon('CG-INSTIT-L2', 'Le Parlement, la justice et les institutions consultatives', 9, [
      b.texte('Le **Parlement** est **bicaméral** : il comprend l’**Assemblée nationale** (députés élus au suffrage universel direct) et le **Sénat**. Il vote la loi, consent l’impôt et contrôle l’action du Gouvernement.'),
      b.retenir('Le Sénat est composé pour **deux tiers** de sénateurs élus au suffrage universel indirect et pour **un tiers** de sénateurs désignés par le Président de la République. Le premier Sénat a été installé en **2018**.'),
      b.titre('Le pouvoir judiciaire'),
      b.texte('La Constitution de 2016 a remplacé l’ancienne Cour suprême par trois juridictions suprêmes : la **Cour de cassation** (ordre judiciaire), le **Conseil d’État** (ordre administratif) et la **Cour des comptes** (finances publiques).'),
      b.texte('Le **Conseil constitutionnel** contrôle la conformité des lois à la Constitution et juge le contentieux des élections présidentielle et législatives.'),
      b.titre('Autres institutions'),
      b.tableau(['Institution', 'Rôle'], [
        ['Conseil économique, social, environnemental et culturel (CESEC)', 'Donne des avis sur les questions économiques, sociales, environnementales et culturelles'],
        ['Médiateur de la République', 'Règle à l’amiable les différends entre l’administration et les citoyens'],
        ['Chambre nationale des Rois et Chefs traditionnels', 'Valorise les us et coutumes, contribue au règlement non juridictionnel des conflits'],
      ]),
      b.piege('Le Conseil constitutionnel n’est pas une juridiction de l’ordre judiciaire : il ne juge pas les litiges entre particuliers.'),
      b.recap(['Parlement bicaméral : Assemblée nationale + Sénat.', 'Sénat : 2/3 élus, 1/3 désignés.', 'Cour de cassation, Conseil d’État, Cour des comptes.', 'Conseil constitutionnel : constitutionnalité et élections nationales.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'CG-INSTIT-E01', niveau: 1, notions: ['EXECUTIF'],
      consigne: 'Pour combien d’années le Président de la République est-il élu ?',
      options: ['5 ans', '7 ans', '6 ans', '4 ans'], bonne: 0,
      explication: 'Mandat de 5 ans, renouvelable une seule fois (Constitution de 2016).',
      miniCours: mc('Le mandat présidentiel', 'La Constitution de 2016 fixe le mandat du Président de la République à cinq ans. Il est élu au suffrage universel direct et ne peut être réélu qu’une fois.', '5 ans, une seule réélection.'),
    }),
    vf({
      code: 'CG-INSTIT-E02', niveau: 1, notions: ['LEGISLATIF', 'CONSTITUTION', 'SYMBOLES'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Le Parlement ivoirien comprend deux chambres.', true],
        ['Yamoussoukro est la capitale politique et administrative.', true],
        ['La Constitution actuelle a été adoptée en 2000.', false, 'Celle de 2000 fondait la IIᵉ République ; l’actuelle date de 2016.'],
      ],
      explication: 'Parlement bicaméral, Yamoussoukro capitale politique depuis 1983, Constitution de la IIIᵉ République en 2016.',
      miniCours: mc('Repères institutionnels', 'La Côte d’Ivoire a connu la Constitution de 1960, puis celle de 2000 (IIᵉ République) et enfin celle de 2016 (IIIᵉ République), qui crée notamment le Sénat.', '2016 = IIIᵉ République et Sénat.'),
    }),
    glisser({
      code: 'CG-INSTIT-E03', niveau: 1, notions: ['SYMBOLES'],
      consigne: 'Complète la devise de la Côte d’Ivoire.',
      texte: '{{Union}} – {{Discipline}} – {{Travail}}',
      distracteurs: ['Paix', 'Justice', 'Progrès'],
      explication: 'La devise est « Union – Discipline – Travail ».',
      miniCours: mc('Les symboles nationaux', 'La République de Côte d’Ivoire a pour devise « Union – Discipline – Travail », pour hymne « L’Abidjanaise » et pour drapeau trois bandes verticales orange, blanc et vert.', 'Union – Discipline – Travail.'),
    }),
    classer({
      code: 'CG-INSTIT-E04', niveau: 2, notions: ['EXECUTIF', 'LEGISLATIF', 'JURIDICTIONS'],
      consigne: 'Classe chaque institution selon le pouvoir auquel elle appartient.',
      categories: ['Exécutif', 'Législatif', 'Judiciaire'],
      cartes: [
        ['Président de la République', 0],
        ['Gouvernement', 0],
        ['Assemblée nationale', 1],
        ['Sénat', 1],
        ['Cour de cassation', 2],
        ['Conseil d’État', 2],
      ],
      explication: 'Exécutif : Président et Gouvernement. Législatif : les deux chambres du Parlement. Judiciaire : les juridictions.',
      miniCours: mc('La séparation des pouvoirs', 'Le pouvoir exécutif applique les lois et conduit la politique de la nation ; le pouvoir législatif vote les lois et contrôle le Gouvernement ; le pouvoir judiciaire tranche les litiges.', 'Exécuter, légiférer, juger.'),
    }),
    relier({
      code: 'CG-INSTIT-E05', niveau: 2, notions: ['JURIDICTIONS'],
      consigne: 'Relie chaque institution à son rôle.',
      paires: [
        ['Conseil constitutionnel', 'Contrôle la constitutionnalité des lois'],
        ['Cour des comptes', 'Contrôle la gestion des finances publiques'],
        ['Médiateur de la République', 'Règle à l’amiable les litiges entre l’administration et les citoyens'],
        ['CESEC', 'Donne des avis sur les questions économiques et sociales'],
      ],
      intrus: ['Vote le budget de l’État'],
      explication: 'Le vote du budget appartient au Parlement.',
      miniCours: mc('Qui fait quoi ?', 'Le Conseil constitutionnel veille au respect de la Constitution. La Cour des comptes contrôle l’argent public. Le Médiateur de la République facilite les relations entre citoyens et administration. Le CESEC est une assemblée consultative.', 'Le budget est voté par le Parlement.'),
    }),
    ordre({
      code: 'CG-INSTIT-E06', niveau: 2, notions: ['CONSTITUTION'],
      consigne: 'Classe ces évènements du plus ancien au plus récent.',
      elements: ['Indépendance de la Côte d’Ivoire', 'Yamoussoukro devient capitale politique', 'Constitution de la IIᵉ République', 'Constitution de la IIIᵉ République', 'Installation du premier Sénat'],
      libelleHaut: 'Plus ancien', libelleBas: 'Plus récent',
      explication: '1960, 1983, 2000, 2016, 2018.',
      miniCours: mc('Chronologie', 'Repères : indépendance le 7 août 1960 ; Yamoussoukro capitale politique en 1983 ; Constitution de 2000 ; Constitution de la IIIᵉ République en 2016 ; installation du Sénat en 2018.', '1960 · 1983 · 2000 · 2016 · 2018.'),
    }),
    qcm({
      code: 'CG-INSTIT-E07', niveau: 3, notions: ['LEGISLATIF'],
      consigne: 'Comment les sénateurs sont-ils désignés ?',
      options: [
        'Deux tiers élus au suffrage universel indirect, un tiers désignés par le Président',
        'Tous élus au suffrage universel direct',
        'Tous nommés par le Président de la République',
        'Moitié élus par l’Assemblée nationale, moitié par les conseils régionaux',
      ], bonne: 0,
      explication: 'La Constitution prévoit deux tiers de sénateurs élus au suffrage indirect et un tiers désignés par le Président.',
      miniCours: mc('Le Sénat', 'Le Sénat représente les collectivités territoriales et les Ivoiriens établis hors de Côte d’Ivoire. Sa composition est mixte : une majorité élue au suffrage universel indirect et une part désignée par le Président de la République.', '2/3 élus, 1/3 désignés.'),
    }),
    entourer({
      code: 'CG-INSTIT-E08', niveau: 3, notions: ['JURIDICTIONS'],
      consigne: 'Entoure les juridictions suprêmes prévues par la Constitution de 2016.',
      elements: [['Cour de cassation', true], ['Conseil d’État', true], ['Cour des comptes', true], ['Cour suprême', false], ['Cour d’appel', false], ['Tribunal de première instance', false]],
      explication: 'La Cour suprême a été remplacée en 2016 ; cours d’appel et tribunaux sont des juridictions inférieures.',
      miniCours: mc('Les juridictions suprêmes', 'Avant 2016, une Cour suprême réunissait plusieurs chambres. La Constitution de 2016 les remplace par trois juridictions autonomes : Cour de cassation, Conseil d’État et Cour des comptes.', 'Trois juridictions suprêmes depuis 2016.'),
    }),
    qcm({
      code: 'CG-INSTIT-E09', niveau: 3, notions: ['JURIDICTIONS'],
      consigne: 'Des députés estiment qu’une loi votée est contraire à la Constitution. Quelle institution peut en juger ?',
      options: ['Le Conseil constitutionnel', 'La Cour de cassation', 'Le Conseil d’État', 'Le Médiateur de la République'], bonne: 0,
      explication: 'Le contrôle de la conformité des lois à la Constitution relève du Conseil constitutionnel.',
      miniCours: mc('Le contrôle de constitutionnalité', 'Une loi doit respecter la Constitution. Le Conseil constitutionnel est l’organe chargé de vérifier cette conformité ; il n’appartient ni à l’ordre judiciaire ni à l’ordre administratif.', 'Loi ↔ Constitution : Conseil constitutionnel.'),
      raisonnement: {
        reference: 'La question porte sur la conformité d’une loi à la Constitution. Ce contrôle ne relève pas des juridictions ordinaires (Cour de cassation, Conseil d’État) ni d’un organe de médiation, mais du Conseil constitutionnel.',
        etapes: ['Identifier l’objet : conformité d’une loi à la Constitution', 'Écarter les juridictions ordinaires', 'Désigner le Conseil constitutionnel'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Organisation judiciaire en Côte d'Ivoire
// INFJ : épreuve écrite « organisation judiciaire » (Greffes, cycle moyen supérieur, coef. 2)
// et épreuve orale (Magistrature, coef. 2) — arrêtés du 1er mars 2017.
// ═════════════════════════════════════════════════════════════════════════
const organisationJudiciaire = {
  code: 'DROIT-ORGJUD',
  matiere: 'Organisation judiciaire',
  titre: 'L’organisation judiciaire ivoirienne',
  resume: 'Principes, juridictions des deux ordres, magistrats du siège et du parquet, auxiliaires.',
  notions: [
    { code: 'PRINCIPES', libelle: 'Principes fondamentaux de la justice' },
    { code: 'JURID-JUDIC', libelle: 'Juridictions de l’ordre judiciaire' },
    { code: 'AUTRES-JURID', libelle: 'Ordre administratif, juridictions spécialisées et supranationales' },
    { code: 'ACTEURS', libelle: 'Magistrats, greffiers et auxiliaires de justice' },
  ],
  lecons: [
    lecon('DROIT-ORGJUD-L1', 'Principes et juridictions', 9, [
      b.titre('Les grands principes'),
      b.liste([
        '**Indépendance** des juges, qui ne sont soumis qu’à l’autorité de la loi.',
        '**Double degré de juridiction** : une affaire peut être rejugée en fait et en droit par une cour d’appel.',
        '**Publicité des audiences** (sauf exceptions prévues par la loi, par exemple pour les mineurs).',
        '**Égalité** des citoyens devant la justice et **droits de la défense**.',
        '**Motivation** des décisions.',
      ]),
      b.titre('L’ordre judiciaire'),
      b.tableau(['Niveau', 'Juridiction', 'Rôle'], [
        ['1ᵉʳ degré', 'Tribunal de première instance (et ses sections détachées)', 'Juridiction de droit commun : affaires civiles, commerciales, sociales et pénales'],
        ['2ᵉ degré', 'Cour d’appel', 'Rejuge l’affaire en fait et en droit'],
        ['Sommet', 'Cour de cassation', 'Contrôle l’application du droit, sans rejuger les faits'],
      ]),
      b.texte('Des juridictions **spécialisées** existent, comme le **tribunal de commerce d’Abidjan** pour les litiges entre commerçants et sociétés commerciales.'),
      b.titre('Les autres ordres'),
      b.liste([
        'Le **Conseil d’État** est la juridiction suprême de l’ordre **administratif**.',
        'La **Cour des comptes** juge les comptes publics.',
        'La **Cour commune de justice et d’arbitrage (CCJA)** de l’OHADA, dont le **siège est à Abidjan**, statue en cassation sur l’application des Actes uniformes du droit des affaires.',
      ]),
      b.piege('La Cour de cassation **ne rejuge pas les faits** : elle vérifie seulement que la loi a été correctement appliquée.'),
      b.recap(['TPI → Cour d’appel → Cour de cassation.', 'Le juge d’appel rejuge ; le juge de cassation contrôle le droit.', 'CCJA (OHADA) : siège à Abidjan.']),
    ]),
    lecon('DROIT-ORGJUD-L2', 'Les acteurs de la justice', 8, [
      b.tableau(['Magistrats du siège', 'Magistrats du parquet (ministère public)'], [
        ['Jugent et rendent les décisions', 'Défendent les intérêts de la société, exercent l’action publique'],
        ['Président de tribunal, juge, juge d’instruction, conseiller à la cour', 'Procureur de la République, substitut, procureur général, avocat général'],
        ['Inamovibles', 'Placés sous l’autorité hiérarchique'],
      ]),
      b.retenir('On dit « magistrature **assise** » pour le siège et « magistrature **debout** » pour le parquet, qui se lève pour prendre ses réquisitions.'),
      b.titre('Le greffier'),
      b.texte('Le **greffier** assiste le juge : il tient la plume à l’audience, rédige les procès-verbaux, conserve les minutes, **authentifie** les actes et délivre les copies des décisions. Il ne juge pas.'),
      b.titre('Les auxiliaires de justice'),
      b.liste(['**Avocat** : conseille, assiste et représente les parties, plaide.', '**Huissier de justice** : signifie les actes et exécute les décisions.', '**Notaire** : authentifie les actes et contrats.']),
      b.question(qcm({
        code: 'DROIT-ORGJUD-L2-Q1', niveau: 1,
        consigne: 'Le procureur de la République est un magistrat…',
        options: ['du parquet', 'du siège', 'administratif'], bonne: 0,
        explication: 'Il représente le ministère public : c’est un magistrat du parquet.',
      })),
      b.recap(['Siège = juge ; parquet = requiert.', 'Le greffier authentifie, il ne juge pas.', 'Avocat, huissier, notaire : auxiliaires de justice.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'DROIT-ORGJUD-E01', niveau: 1, notions: ['JURID-JUDIC'],
      consigne: 'Quelle est la juridiction de droit commun du premier degré ?',
      options: ['Le tribunal de première instance', 'La cour d’appel', 'La Cour de cassation', 'Le Conseil d’État'], bonne: 0,
      explication: 'Le TPI connaît en premier ressort de toutes les affaires qui ne sont pas attribuées à une autre juridiction.',
      miniCours: mc('Droit commun', 'La juridiction « de droit commun » est compétente pour toutes les affaires qu’aucun texte n’attribue spécialement à une autre juridiction. Au premier degré, c’est le tribunal de première instance.', 'TPI = 1ᵉʳ degré, droit commun.'),
    }),
    vf({
      code: 'DROIT-ORGJUD-E02', niveau: 1, notions: ['ACTEURS', 'AUTRES-JURID'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Le siège de la CCJA de l’OHADA est à Abidjan.', true],
        ['Le procureur de la République appartient au parquet.', true],
        ['Le greffier rend les jugements.', false, 'Le juge rend la décision ; le greffier l’authentifie et en conserve la minute.'],
      ],
      explication: 'CCJA à Abidjan ; procureur au parquet ; le greffier assiste le juge.',
      miniCours: mc('Rôles distincts', 'Le juge (magistrat du siège) tranche le litige. Le procureur (parquet) requiert au nom de la société. Le greffier garantit l’authenticité de la procédure et des décisions.', 'Juger, requérir, authentifier.'),
    }),
    glisser({
      code: 'DROIT-ORGJUD-E03', niveau: 1, notions: ['PRINCIPES', 'JURID-JUDIC'],
      consigne: 'Complète le texte.',
      texte: 'Le principe du {{double degré de juridiction}} permet de faire rejuger une affaire par une {{cour d’appel}}. La {{Cour de cassation}} vérifie ensuite la bonne application du droit.',
      distracteurs: ['Conseil constitutionnel', 'secret de l’instruction'],
      explication: 'Appel = second examen en fait et en droit ; cassation = contrôle du droit.',
      miniCours: mc('Appel et cassation', 'Le double degré de juridiction garantit qu’une partie mécontente puisse obtenir un nouvel examen complet de son affaire par la cour d’appel. La Cour de cassation, elle, ne constitue pas un troisième degré : elle juge le droit, pas les faits.', 'Appel = faits et droit ; cassation = droit.'),
    }),
    ordre({
      code: 'DROIT-ORGJUD-E04', niveau: 2, notions: ['JURID-JUDIC'],
      consigne: 'Ordonne le parcours d’une affaire civile, du premier jugement au contrôle final.',
      elements: ['Tribunal de première instance', 'Cour d’appel', 'Cour de cassation'],
      mode: 'exact',
      explication: 'TPI (premier degré), cour d’appel (second degré), Cour de cassation (contrôle du droit).',
      miniCours: mc('La hiérarchie judiciaire', 'Une affaire est d’abord jugée par le tribunal de première instance. L’appel la porte devant la cour d’appel. Un pourvoi peut ensuite être formé devant la Cour de cassation.', 'TPI → appel → cassation.'),
    }),
    classer({
      code: 'DROIT-ORGJUD-E05', niveau: 2, notions: ['ACTEURS'],
      consigne: 'Classe ces magistrats : siège ou parquet ?',
      categories: ['Siège', 'Parquet'],
      cartes: [['Juge d’instruction', 0], ['Procureur de la République', 1], ['Président du tribunal', 0], ['Substitut du procureur', 1], ['Conseiller à la cour d’appel', 0], ['Avocat général', 1]],
      explication: 'Le siège juge ; le parquet (procureurs, substituts, avocats généraux) représente la société.',
      miniCours: mc('Assis ou debout', 'Les magistrats du siège rendent les décisions et sont inamovibles. Les magistrats du parquet exercent l’action publique et sont soumis à une hiérarchie. Attention : l’« avocat général » n’est pas un avocat, c’est un magistrat du parquet.', 'Avocat général = parquet.'),
    }),
    relier({
      code: 'DROIT-ORGJUD-E06', niveau: 2, notions: ['ACTEURS'],
      consigne: 'Relie chaque acteur à sa mission principale.',
      paires: [
        ['Greffier', 'Authentifie les actes et conserve les minutes'],
        ['Avocat', 'Assiste, représente et défend les parties'],
        ['Huissier de justice', 'Signifie les actes et exécute les décisions'],
        ['Notaire', 'Confère l’authenticité aux actes et contrats'],
      ],
      intrus: ['Rend les jugements'],
      explication: 'Rendre le jugement est la mission du juge.',
      miniCours: mc('Les gens de justice', 'Autour du juge gravitent le greffier (mémoire et authenticité de la procédure) et les auxiliaires de justice : l’avocat défend, l’huissier signifie et exécute, le notaire authentifie les actes.', 'Seul le juge juge.'),
    }),
    qcm({
      code: 'DROIT-ORGJUD-E07', niveau: 3, notions: ['AUTRES-JURID'],
      consigne: 'Deux sociétés commerciales d’Abidjan s’opposent sur l’exécution d’un contrat de vente. Quelle juridiction saisir en premier ?',
      options: ['Le tribunal de commerce d’Abidjan', 'Le Conseil d’État', 'La cour d’appel d’Abidjan', 'La CCJA'], bonne: 0,
      explication: 'Litige commercial entre sociétés, au premier degré, dans le ressort d’Abidjan : tribunal de commerce.',
      miniCours: mc('Juridictions spécialisées', 'Certaines matières sont confiées à des juridictions spécialisées. Les litiges entre commerçants ou sociétés commerciales relèvent ainsi, à Abidjan, du tribunal de commerce. On ne saisit jamais directement une juridiction d’appel ou de cassation.', 'Toujours commencer par le premier degré.'),
      raisonnement: {
        reference: 'Le litige oppose deux sociétés commerciales sur un contrat commercial : la matière est commerciale. On commence par le premier degré. À Abidjan, il existe une juridiction spécialisée : le tribunal de commerce. Le Conseil d’État concerne l’administration, la cour d’appel et la CCJA interviennent après.',
        etapes: ['Qualifier la matière : commerciale', 'Choisir le premier degré', 'Retenir la juridiction spécialisée d’Abidjan'],
      },
    }),
    entourer({
      code: 'DROIT-ORGJUD-E08', niveau: 3, notions: ['PRINCIPES'],
      consigne: 'Entoure les principes fondamentaux de l’organisation judiciaire.',
      elements: [['Indépendance des juges', true], ['Double degré de juridiction', true], ['Publicité des audiences', true], ['Motivation des décisions', true], ['Élection des juges par le peuple', false], ['Huis clos obligatoire dans toutes les affaires', false]],
      explication: 'Les juges sont des magistrats de carrière ; la publicité est la règle, le huis clos l’exception.',
      miniCours: mc('Une justice de qualité', 'La justice doit être indépendante, accessible à un second examen (appel), publique pour être contrôlée par les citoyens, et motivée pour que chacun comprenne la décision.', 'Publicité = règle ; huis clos = exception.'),
    }),
    qcm({
      code: 'DROIT-ORGJUD-E09', niveau: 3, notions: ['JURID-JUDIC'],
      consigne: 'Une partie conteste un arrêt de cour d’appel uniquement parce que la cour aurait mal interprété la loi. Quel recours ?',
      options: ['Un pourvoi en cassation', 'Un nouvel appel', 'Une opposition', 'Une saisine du Médiateur'], bonne: 0,
      explication: 'La critique porte sur l’application du droit : c’est l’objet du pourvoi en cassation.',
      miniCours: mc('Le pourvoi en cassation', 'Le pourvoi permet de contester une décision rendue en dernier ressort pour une erreur de droit. La Cour de cassation casse la décision si la loi a été mal appliquée, sans rejuger les faits.', 'Erreur de droit → cassation.'),
      raisonnement: {
        reference: 'La décision attaquée est un arrêt de cour d’appel, donc rendu en dernier ressort ; l’appel est épuisé. Le grief porte sur l’interprétation de la loi, c’est-à-dire le droit : la voie adaptée est le pourvoi en cassation.',
        etapes: ['Constater que l’appel est épuisé', 'Qualifier le grief : erreur de droit', 'Retenir le pourvoi en cassation'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Droit pénal général (Code pénal ivoirien, loi n° 2019-574 du 26 juin 2019)
// INFJ Magistrature (droit pénal, coef. 3) et Greffes cycle moyen supérieur (coef. 2).
// ═════════════════════════════════════════════════════════════════════════
const droitPenal = {
  code: 'DROIT-PENAL',
  matiere: 'Droit pénal',
  titre: 'Droit pénal général : l’infraction',
  resume: 'Légalité, classification, éléments constitutifs, tentative, complicité et faits justificatifs.',
  notions: [
    { code: 'LEGALITE', libelle: 'Principe de légalité et application de la loi pénale dans le temps' },
    { code: 'CLASSIF', libelle: 'Classification des infractions' },
    { code: 'ELEMENTS', libelle: 'Éléments constitutifs de l’infraction' },
    { code: 'TENTATIVE', libelle: 'Tentative et complicité' },
    { code: 'JUSTIF', libelle: 'Faits justificatifs et causes d’irresponsabilité' },
  ],
  lecons: [
    lecon('DROIT-PENAL-L1', 'L’infraction et ses éléments', 9, [
      b.texte('Une **infraction** est un comportement interdit par la loi pénale et sanctionné d’une peine. Le droit pénal ivoirien repose sur le **Code pénal** issu de la loi n° 2019-574 du 26 juin 2019.'),
      b.titre('Le principe de légalité'),
      b.texte('« **Nul crime, nulle peine sans loi** » : on ne peut être puni que pour un fait défini et réprimé par un texte en vigueur au moment où il a été commis.'),
      b.liste(['La loi pénale **plus sévère** ne rétroagit pas.', 'La loi pénale **plus douce** s’applique aux faits non encore définitivement jugés (rétroactivité in mitius).', 'La loi pénale est d’**interprétation stricte**.']),
      b.titre('Classification tripartite'),
      b.texte('Selon leur gravité et la peine encourue, les infractions sont des **crimes**, des **délits** ou des **contraventions**.'),
      b.titre('Trois éléments constitutifs'),
      b.tableau(['Élément', 'Contenu'], [
        ['Légal', 'Un texte incrimine le comportement et prévoit la peine'],
        ['Matériel', 'Un acte (ou une abstention) extérieur, réalisé ou tenté'],
        ['Moral', 'L’intention ou la faute de l’auteur'],
      ]),
      b.recap(['Pas d’infraction sans texte.', 'Crime > délit > contravention.', 'Éléments légal, matériel et moral.']),
    ]),
    lecon('DROIT-PENAL-L2', 'Tentative, complicité et faits justificatifs', 9, [
      b.titre('La tentative'),
      b.texte('La tentative est punissable lorsqu’il y a un **commencement d’exécution** et qu’elle n’a été suspendue ou n’a manqué son effet qu’en raison de **circonstances indépendantes de la volonté** de son auteur.'),
      b.retenir('Le **désistement volontaire** (l’auteur renonce de lui-même avant la consommation) fait disparaître la tentative punissable. Les simples actes préparatoires ne suffisent pas.'),
      b.titre('La complicité'),
      b.texte('Est complice celui qui, sciemment, a **aidé ou assisté** l’auteur dans la préparation ou la consommation de l’infraction, ou l’a **provoquée** ou a donné des **instructions** pour la commettre.'),
      b.titre('Les faits justificatifs'),
      b.liste([
        '**Ordre de la loi** ou **commandement de l’autorité légitime**.',
        '**Légitime défense** : riposte à une agression **actuelle** et **injuste**, **nécessaire** et **proportionnée**.',
        '**État de nécessité** : acte nécessaire pour sauvegarder une personne ou un bien d’un danger actuel, sans disproportion.',
      ]),
      b.piege('La **vengeance** n’est jamais de la légitime défense : la riposte doit être concomitante à l’agression.'),
      b.question(vf({
        code: 'DROIT-PENAL-L2-Q1', niveau: 1,
        consigne: 'Vrai ou faux ?',
        affirmations: [['Acheter une arme dans l’intention de tuer constitue déjà une tentative de meurtre.', false, 'C’est un acte préparatoire, pas un commencement d’exécution.']],
        explication: 'La tentative suppose un commencement d’exécution.',
      })),
      b.recap(['Tentative = commencement d’exécution + interruption involontaire.', 'Complicité : aide, assistance, provocation, instructions.', 'Légitime défense : actuelle, injuste, nécessaire, proportionnée.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'DROIT-PENAL-E01', niveau: 1, notions: ['LEGALITE'],
      consigne: 'Que signifie l’adage « Nul crime, nulle peine sans loi » ?',
      options: ['On ne peut être puni que pour un fait prévu et réprimé par un texte', 'Toute faute morale est punissable', 'Le juge peut créer des infractions', 'La loi pénale s’applique toujours au passé'], bonne: 0,
      explication: 'C’est le principe de légalité des délits et des peines.',
      miniCours: mc('La légalité', 'Le principe de légalité protège la liberté : seul un texte peut définir une infraction et fixer sa peine. Le juge applique ce texte strictement, sans l’étendre à des cas non prévus.', 'Pas de texte, pas d’infraction.'),
    }),
    glisser({
      code: 'DROIT-PENAL-E02', niveau: 1, notions: ['ELEMENTS'],
      consigne: 'Complète les éléments constitutifs de l’infraction.',
      texte: 'Élément {{légal}} · élément {{matériel}} · élément {{moral}}',
      distracteurs: ['social', 'financier', 'judiciaire'],
      explication: 'Un texte (légal), un acte (matériel), une intention ou une faute (moral).',
      miniCours: mc('Les trois éléments', 'Pour qu’il y ait infraction, il faut un texte qui l’incrimine (élément légal), un comportement extérieur (élément matériel) et un état d’esprit coupable, intention ou faute (élément moral).', 'Texte, acte, intention.'),
    }),
    vf({
      code: 'DROIT-PENAL-E03', niveau: 1, notions: ['LEGALITE', 'CLASSIF', 'JUSTIF'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['La légitime défense est un fait justificatif.', true],
        ['Une loi pénale plus sévère s’applique aux faits commis avant son entrée en vigueur.', false, 'La loi plus sévère ne rétroagit pas.'],
        ['Une contravention est moins grave qu’un délit.', true],
      ],
      explication: 'Non-rétroactivité de la loi plus sévère ; contravention < délit < crime.',
      miniCours: mc('Loi pénale dans le temps', 'Une loi pénale nouvelle plus sévère ne s’applique qu’aux faits commis après son entrée en vigueur. En revanche, une loi plus douce profite aux personnes non encore définitivement condamnées.', 'Sévère : pas de rétroactivité.'),
    }),
    ordre({
      code: 'DROIT-PENAL-E04', niveau: 2, notions: ['CLASSIF'],
      consigne: 'Classe les infractions de la moins grave à la plus grave.',
      elements: ['Contravention', 'Délit', 'Crime'],
      mode: 'exact', libelleHaut: 'Moins grave', libelleBas: 'Plus grave',
      explication: 'Contravention, délit, crime.',
      miniCours: mc('La classification tripartite', 'Les infractions sont classées en trois catégories selon leur gravité et la peine encourue : contraventions (les moins graves), délits, puis crimes (les plus graves).', 'Contravention < délit < crime.'),
    }),
    classer({
      code: 'DROIT-PENAL-E05', niveau: 2, notions: ['JUSTIF'],
      consigne: 'Classe chaque situation selon le fait justificatif qu’elle illustre.',
      categories: ['Légitime défense', 'État de nécessité', 'Commandement de l’autorité légitime'],
      cartes: [
        ['Repousser une agression en cours par une riposte proportionnée', 0],
        ['Briser une vitre pour sauver un enfant d’un incendie', 1],
        ['Un agent exécute un ordre légal de son supérieur', 2],
        ['Protéger un tiers attaqué au couteau en désarmant l’agresseur', 0],
      ],
      explication: 'Agression injuste → légitime défense ; danger à éviter → état de nécessité ; ordre légal → commandement.',
      miniCours: mc('Trois justifications', 'La légitime défense répond à une agression humaine injuste. L’état de nécessité répond à un danger (incendie, accident) sans agresseur. Le commandement de l’autorité légitime couvre l’exécution d’un ordre légal.', 'Agresseur ? Danger ? Ordre ?'),
    }),
    relier({
      code: 'DROIT-PENAL-E06', niveau: 2, notions: ['TENTATIVE', 'LEGALITE'],
      consigne: 'Relie chaque notion à sa définition.',
      paires: [
        ['Tentative', 'Commencement d’exécution interrompu indépendamment de la volonté de l’auteur'],
        ['Désistement volontaire', 'Renonciation spontanée de l’auteur avant la consommation'],
        ['Complicité', 'Aide ou assistance apportée sciemment à l’auteur'],
        ['Rétroactivité in mitius', 'Application immédiate de la loi pénale plus douce'],
      ],
      intrus: ['Simple projet criminel non manifesté'],
      explication: 'Un projet non manifesté n’est jamais punissable.',
      miniCours: mc('Le chemin du crime', 'Le projet et les actes préparatoires ne sont pas punissables en eux-mêmes. La tentative commence avec le commencement d’exécution ; elle disparaît si l’auteur renonce spontanément. Le complice aide sciemment l’auteur.', 'Projet < préparation < exécution.'),
    }),
    qcm({
      code: 'DROIT-PENAL-E07', niveau: 3, notions: ['TENTATIVE'],
      consigne: 'Paul force la porte d’un appartement pour voler. Surpris par un voisin, il s’enfuit sans rien emporter. Qualification ?',
      options: ['Tentative de vol punissable', 'Aucune infraction faute de vol consommé', 'Simple acte préparatoire', 'Désistement volontaire'], bonne: 0,
      explication: 'Forcer la porte est un commencement d’exécution ; la fuite est due au voisin, une circonstance indépendante de sa volonté.',
      miniCours: mc('Repérer la tentative', 'Deux questions : l’auteur a-t-il commencé à exécuter l’infraction (au-delà de la simple préparation) ? S’est-il arrêté de lui-même ou a-t-il été empêché ? Seule l’interruption involontaire rend la tentative punissable.', 'Empêché = tentative ; renonce = désistement.'),
      raisonnement: {
        reference: 'Forcer la porte dans le but de voler est un acte qui tend directement à la commission du vol : c’est un commencement d’exécution. Paul s’arrête parce qu’il est surpris par un voisin : l’interruption est indépendante de sa volonté. Il n’y a donc pas désistement volontaire : la tentative de vol est punissable.',
        etapes: ['Caractériser le commencement d’exécution', 'Rechercher la cause de l’interruption', 'Écarter le désistement volontaire', 'Conclure à la tentative punissable'],
      },
    }),
    entourer({
      code: 'DROIT-PENAL-E08', niveau: 3, notions: ['JUSTIF'],
      consigne: 'Entoure les conditions exigées pour la légitime défense.',
      elements: [['Agression actuelle', true], ['Agression injuste', true], ['Riposte nécessaire', true], ['Riposte proportionnée', true], ['Riposte postérieure à l’agression', false], ['Volonté de se venger', false]],
      explication: 'La riposte doit être concomitante à une agression injuste, nécessaire et proportionnée ; la vengeance est exclue.',
      miniCours: mc('Les conditions de la légitime défense', 'Côté agression : elle doit être actuelle (en cours ou imminente) et injuste. Côté riposte : elle doit être nécessaire (pas d’autre moyen) et proportionnée à l’attaque. Une riposte après coup est une vengeance.', 'Actuelle, injuste, nécessaire, proportionnée.'),
    }),
    qcm({
      code: 'DROIT-PENAL-E09', niveau: 3, notions: ['TENTATIVE'],
      consigne: 'Awa prête sciemment sa voiture à Koffi pour qu’il aille commettre un cambriolage, qui est réalisé. Quelle est sa situation ?',
      options: ['Complice du cambriolage', 'Coauteure du cambriolage', 'Aucune responsabilité pénale', 'Auteure d’une tentative'], bonne: 0,
      explication: 'Elle a fourni sciemment un moyen ayant servi à l’infraction : c’est une aide ou assistance, donc de la complicité.',
      miniCours: mc('Auteur ou complice ?', 'L’auteur réalise lui-même les éléments de l’infraction. Le complice n’accomplit pas l’infraction mais y participe sciemment : en aidant, en fournissant un moyen, en provoquant ou en donnant des instructions. Il faut un fait principal punissable.', 'Fournir un moyen en connaissance de cause = complicité.'),
      raisonnement: {
        reference: 'Awa n’a pas commis le cambriolage elle-même : elle n’est pas auteure. Elle a fourni un moyen (sa voiture) en sachant à quoi il servirait, et l’infraction principale a été commise. Ce sont les conditions de la complicité par aide ou assistance.',
        etapes: ['Écarter la qualité d’auteure', 'Identifier l’acte d’aide (fourniture d’un moyen)', 'Vérifier l’intention (« sciemment »)', 'Vérifier le fait principal punissable'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Droit civil : le contrat (Code civil applicable en Côte d'Ivoire, art. 1108 et suivants)
// INFJ Magistrature : « droit civil ou procédure civile » (4 h, coef. 4).
// ═════════════════════════════════════════════════════════════════════════
const contrat = {
  code: 'DROIT-CONTRAT',
  matiere: 'Droit civil',
  titre: 'Le contrat : formation et effets',
  resume: 'Conditions de validité, vices du consentement, nullités, force obligatoire et effet relatif.',
  notions: [
    { code: 'VALIDITE', libelle: 'Conditions de validité du contrat' },
    { code: 'VICES', libelle: 'Vices du consentement' },
    { code: 'NULLITE', libelle: 'Nullité absolue et nullité relative' },
    { code: 'EFFETS', libelle: 'Force obligatoire, effet relatif, inexécution' },
  ],
  lecons: [
    lecon('DROIT-CONTRAT-L1', 'La formation du contrat', 9, [
      b.texte('Le **contrat** est une convention par laquelle une ou plusieurs personnes s’obligent envers une ou plusieurs autres à donner, à faire ou à ne pas faire quelque chose.'),
      b.titre('Quatre conditions de validité'),
      b.texte('Selon l’**article 1108** du Code civil applicable en Côte d’Ivoire, quatre conditions sont essentielles :'),
      b.liste(['le **consentement** de la partie qui s’oblige ;', 'sa **capacité** de contracter ;', 'un **objet certain** qui forme la matière de l’engagement ;', 'une **cause licite** dans l’obligation.'], true),
      b.titre('Les vices du consentement'),
      b.tableau(['Vice', 'Définition'], [
        ['Erreur', 'Fausse représentation de la réalité portant sur la substance de la chose ou, parfois, sur la personne'],
        ['Dol', 'Manœuvres (ou mensonges, réticences) d’un cocontractant pour tromper l’autre et le pousser à contracter'],
        ['Violence', 'Contrainte physique ou morale qui inspire la crainte d’un mal considérable'],
      ]),
      b.piege('Le dol doit émaner du **cocontractant** et avoir été **déterminant** : sans lui, la victime n’aurait pas contracté.'),
      b.recap(['Consentement, capacité, objet, cause.', 'Erreur, dol, violence vicient le consentement.']),
    ]),
    lecon('DROIT-CONTRAT-L2', 'Nullités et effets du contrat', 8, [
      b.tableau(['', 'Nullité absolue', 'Nullité relative'], [
        ['Protège', 'L’intérêt général', 'Une partie (incapable, victime d’un vice)'],
        ['Exemples', 'Objet ou cause illicite', 'Vice du consentement, incapacité'],
        ['Qui peut agir ?', 'Toute personne intéressée, le ministère public', 'Seulement la personne protégée'],
        ['Confirmation', 'Impossible', 'Possible'],
      ]),
      b.titre('Les effets'),
      b.liste([
        '**Force obligatoire** (art. 1134) : les conventions légalement formées tiennent lieu de loi à ceux qui les ont faites.',
        '**Effet relatif** (art. 1165) : le contrat ne produit d’effets qu’entre les parties ; il ne nuit ni ne profite aux tiers, sauf exceptions.',
        'En cas d’**inexécution** : exception d’inexécution, exécution forcée, résolution (art. 1184), dommages-intérêts.',
      ]),
      b.question(qcm({
        code: 'DROIT-CONTRAT-L2-Q1', niveau: 1,
        consigne: 'Un contrat dont l’objet est illicite est frappé de…',
        options: ['nullité absolue', 'nullité relative', 'résolution'], bonne: 0,
        explication: 'L’illicéité touche l’intérêt général : nullité absolue.',
      })),
      b.recap(['Absolue : intérêt général ; relative : protection d’une partie.', 'Force obligatoire et effet relatif.']),
    ]),
  ],
  exercices: [
    glisser({
      code: 'DROIT-CONTRAT-E01', niveau: 1, notions: ['VALIDITE'],
      consigne: 'Complète les conditions de validité du contrat (art. 1108).',
      texte: 'Le {{consentement}} de la partie qui s’oblige ; sa {{capacité}} de contracter ; un {{objet certain}} ; une {{cause licite}}.',
      distracteurs: ['forme écrite', 'témoin', 'prix élevé'],
      explication: 'L’écrit n’est pas en principe une condition de validité : le contrat est consensuel.',
      miniCours: mc('Les conditions essentielles', 'Un contrat est valable si les parties ont consenti librement, si elles sont capables, si l’obligation porte sur un objet déterminé et si elle repose sur une cause licite. L’écrit sert surtout de preuve, sauf contrats solennels.', 'Consentement, capacité, objet, cause.'),
    }),
    vf({
      code: 'DROIT-CONTRAT-E02', niveau: 1, notions: ['VICES', 'EFFETS'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Le dol est un vice du consentement.', true],
        ['Un contrat engage en principe les tiers.', false, 'Effet relatif : seules les parties sont liées.'],
        ['Les conventions légalement formées tiennent lieu de loi à ceux qui les ont faites.', true],
      ],
      explication: 'Erreur, dol et violence vicient le consentement ; le contrat ne lie que les parties et s’impose à elles.',
      miniCours: mc('Force obligatoire et effet relatif', 'Le contrat s’impose aux parties comme une loi (art. 1134) : elles doivent l’exécuter. En revanche, il ne crée en principe ni droit ni obligation pour les tiers (art. 1165).', 'Loi des parties, pas des tiers.'),
    }),
    qcm({
      code: 'DROIT-CONTRAT-E03', niveau: 1, notions: ['VICES'],
      consigne: 'Un vendeur cache volontairement un défaut grave pour convaincre l’acheteur. Quel vice ?',
      options: ['Le dol', 'L’erreur spontanée', 'La violence', 'La lésion'], bonne: 0,
      explication: 'Une réticence ou une manœuvre intentionnelle du cocontractant destinée à tromper constitue un dol.',
      miniCours: mc('Le dol', 'Le dol est une tromperie : manœuvres, mensonges ou silence volontaire du cocontractant, destinés à provoquer l’engagement de l’autre. Il entraîne la nullité relative s’il a été déterminant.', 'Dol = tromperie intentionnelle.'),
    }),
    classer({
      code: 'DROIT-CONTRAT-E04', niveau: 2, notions: ['NULLITE'],
      consigne: 'Classe chaque cause selon la nullité qu’elle entraîne.',
      categories: ['Nullité absolue', 'Nullité relative'],
      cartes: [['Objet illicite', 0], ['Cause contraire à l’ordre public', 0], ['Erreur sur la substance', 1], ['Violence', 1], ['Incapacité d’un mineur', 1]],
      explication: 'L’intérêt général appelle la nullité absolue ; la protection d’une partie, la nullité relative.',
      miniCours: mc('Quelle nullité ?', 'Demande-toi qui la règle violée protège. Si c’est la société tout entière (ordre public, licéité), la nullité est absolue. Si c’est une partie (consentement, capacité), la nullité est relative.', 'Qui est protégé ?'),
    }),
    relier({
      code: 'DROIT-CONTRAT-E05', niveau: 2, notions: ['VICES'],
      consigne: 'Relie chaque situation au vice du consentement correspondant.',
      paires: [
        ['Acheter une copie en croyant acheter l’original, sans avoir été trompé', 'Erreur'],
        ['Signer sous la menace de représailles graves', 'Violence'],
        ['Contracter à cause de faux documents remis par le vendeur', 'Dol'],
      ],
      intrus: ['Capacité'],
      explication: 'La capacité est une condition de validité, pas un vice du consentement.',
      miniCours: mc('Distinguer les vices', 'L’erreur est une méprise spontanée ; le dol est une erreur provoquée par l’autre partie ; la violence est une contrainte. La capacité, elle, concerne l’aptitude juridique à contracter.', 'Spontanée, provoquée, contrainte.'),
    }),
    entourer({
      code: 'DROIT-CONTRAT-E06', niveau: 2, notions: ['EFFETS'],
      consigne: 'Entoure les sanctions possibles de l’inexécution d’un contrat.',
      elements: [['Exception d’inexécution', true], ['Exécution forcée', true], ['Résolution du contrat', true], ['Dommages-intérêts', true], ['Peine d’emprisonnement automatique', false], ['Annulation pour vice du consentement', false]],
      explication: 'La nullité sanctionne la formation du contrat, pas son exécution ; l’inexécution n’entraîne pas de peine pénale automatique.',
      miniCours: mc('Inexécution ou nullité ?', 'La nullité sanctionne un défaut au moment de la formation (vice, illicéité). L’inexécution concerne un contrat valable mal exécuté : on peut suspendre sa propre prestation, forcer l’exécution, demander la résolution ou des dommages-intérêts.', 'Formation → nullité ; exécution → inexécution.'),
    }),
    qcm({
      code: 'DROIT-CONTRAT-E07', niveau: 3, notions: ['NULLITE'],
      consigne: 'Un contrat est annulable pour dol. Le cocontractant de la victime peut-il demander lui-même la nullité ?',
      options: ['Non, seule la victime peut agir', 'Oui, toute personne intéressée peut agir', 'Oui, mais seulement avec le ministère public', 'Non, le dol n’entraîne jamais la nullité'], bonne: 0,
      explication: 'Le dol entraîne une nullité relative, que seule la partie protégée (la victime) peut invoquer.',
      miniCours: mc('Titulaire de l’action', 'En nullité relative, l’action appartient uniquement à la personne que la règle protège ; elle peut aussi confirmer l’acte. En nullité absolue, toute personne intéressée peut agir.', 'Relative = la victime seule.'),
      raisonnement: {
        reference: 'Le dol est un vice du consentement ; il protège la partie trompée. La nullité est donc relative et seule la victime peut l’invoquer. L’auteur du dol ne peut pas se prévaloir de sa propre tromperie.',
        etapes: ['Qualifier : vice du consentement', 'En déduire une nullité relative', 'Identifier le titulaire de l’action : la victime'],
      },
    }),
    ordre({
      code: 'DROIT-CONTRAT-E08', niveau: 3, notions: ['VALIDITE', 'NULLITE'],
      consigne: 'Ordonne le raisonnement pour analyser la validité d’un contrat litigieux.',
      elements: ['Qualifier le contrat et identifier les parties', 'Vérifier les quatre conditions de l’article 1108', 'Identifier la condition défaillante', 'Déterminer la nature de la nullité', 'Préciser qui peut agir et les effets de la nullité'],
      explication: 'On qualifie, on contrôle chaque condition, on identifie la sanction puis son régime.',
      miniCours: mc('Méthode du cas pratique', 'Un cas pratique se traite par étapes : qualifier les faits, rappeler la règle, l’appliquer, conclure. Pour la validité, passe en revue les conditions une à une avant de choisir la sanction et son régime.', 'Qualifier, règle, application, conclusion.'),
    }),
    qcm({
      code: 'DROIT-CONTRAT-E09', niveau: 3, notions: ['EFFETS'],
      consigne: 'Un locataire ne paie plus son loyer depuis plusieurs mois malgré les relances. Quelle demande permet au bailleur de mettre fin au contrat ?',
      options: ['La résolution judiciaire du bail', 'La nullité du bail', 'L’exception d’inexécution', 'La confirmation du bail'], bonne: 0,
      explication: 'L’inexécution grave d’un contrat synallagmatique permet d’en demander la résolution (art. 1184), avec d’éventuels dommages-intérêts.',
      miniCours: mc('La résolution', 'Dans un contrat où chaque partie s’oblige envers l’autre, l’inexécution grave par l’une permet à l’autre de demander en justice la fin du contrat : c’est la résolution (art. 1184). La nullité, elle, ne concerne que les défauts de formation.', 'Inexécution grave → résolution.'),
      raisonnement: {
        reference: 'Le bail a été valablement formé : la nullité est exclue. Le problème est l’inexécution grave et répétée de l’obligation de payer le loyer. Le bailleur veut mettre fin au contrat : il doit demander la résolution judiciaire sur le fondement de l’article 1184, et peut réclamer des dommages-intérêts.',
        etapes: ['Écarter la nullité (contrat valablement formé)', 'Caractériser l’inexécution grave', 'Retenir la résolution (art. 1184)'],
      },
    }),
  ],
};

module.exports = [institutions, organisationJudiciaire, droitPenal, contrat];
