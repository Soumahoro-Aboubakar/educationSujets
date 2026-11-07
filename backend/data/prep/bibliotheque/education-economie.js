const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, numerique, b, lecon } = require('../dsl');

// ═════════════════════════════════════════════════════════════════════════
// ENS Éducateur — Système éducatif ivoirien et psychopédagogie
// Anciens sujets ENS « Éducateur » : Psychopédagogie / Système éducatif ivoirien, Culture générale,
// ECM et Fonction publique (rapport ENS du 4 novembre 2026, docs/rapports).
// ═════════════════════════════════════════════════════════════════════════
const systemeEducatif = {
  code: 'EDU-SEI',
  matiere: 'Psychopédagogie et système éducatif',
  titre: 'Le système éducatif ivoirien et l’éducateur',
  resume: 'Organisation des cycles, scolarisation obligatoire, vie scolaire et repères de psychopédagogie.',
  notions: [
    { code: 'STRUCTURE', libelle: 'Structure du système éducatif (cycles et examens)' },
    { code: 'OBLIGATOIRE', libelle: 'Politique de scolarisation obligatoire' },
    { code: 'VIE-SCOLAIRE', libelle: 'Rôle de l’éducateur et vie scolaire' },
    { code: 'PSYCHO', libelle: 'Développement de l’enfant et de l’adolescent' },
  ],
  lecons: [
    lecon('EDU-SEI-L1', 'L’organisation du système éducatif', 8, [
      b.texte('L’enseignement général en Côte d’Ivoire est placé sous la tutelle du **Ministère de l’Éducation nationale et de l’Alphabétisation (MENA)**, représenté dans les régions par les directions régionales (DRENA).'),
      b.tableau(['Cycle', 'Classes', 'Durée', 'Examen de fin de cycle'], [
        ['Préscolaire', 'Petite, moyenne et grande sections', '3 ans', '—'],
        ['Primaire', 'CP1, CP2, CE1, CE2, CM1, CM2', '6 ans', 'CEPE'],
        ['Secondaire 1ᵉʳ cycle', '6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ', '4 ans', 'BEPC'],
        ['Secondaire 2ᵈ cycle', '2ⁿᵈᵉ, 1ʳᵉ, Terminale', '3 ans', 'Baccalauréat'],
      ]),
      b.retenir('La **loi n° 2015-635 du 17 septembre 2015** a rendu la **scolarisation obligatoire pour tous les enfants de 6 à 16 ans**.'),
      b.question(qcm({
        code: 'EDU-SEI-L1-Q1', niveau: 1,
        consigne: 'Quel examen sanctionne la fin du premier cycle du secondaire ?',
        options: ['Le BEPC', 'Le CEPE', 'Le baccalauréat'], bonne: 0,
        explication: 'Le BEPC est passé en classe de 3ᵉ.',
      })),
      b.texte('Dans chaque établissement, le **Comité de gestion des établissements scolaires (COGES)** associe les parents d’élèves et la communauté à la gestion de l’école.'),
      b.recap(['Préscolaire 3 ans, primaire 6 ans, 1ᵉʳ cycle 4 ans, 2ᵈ cycle 3 ans.', 'CEPE, BEPC, BAC.', 'École obligatoire de 6 à 16 ans (loi de 2015).']),
    ]),
    lecon('EDU-SEI-L2', 'L’éducateur, la vie scolaire et l’adolescent', 9, [
      b.texte('L’**éducateur** est le garant de la **vie scolaire** : il veille à la discipline, à l’assiduité et à la sécurité des élèves, assure leur suivi et fait le lien avec les familles et les enseignants.'),
      b.liste(['Contrôle des absences et des retards, information des parents.', 'Application du règlement intérieur et participation au conseil de discipline.', 'Écoute, prévention et médiation des conflits.', 'Encadrement des activités socio-éducatives.']),
      b.titre('Repères de psychologie du développement (Piaget)'),
      b.tableau(['Stade', 'Âge indicatif', 'Caractéristique'], [
        ['Sensori-moteur', '0 – 2 ans', 'Intelligence des actions et des perceptions'],
        ['Préopératoire', '2 – 7 ans', 'Langage, pensée symbolique, égocentrisme'],
        ['Opératoire concret', '7 – 11/12 ans', 'Raisonnement logique sur des objets concrets'],
        ['Opératoire formel', 'à partir de 11/12 ans', 'Raisonnement abstrait et hypothético-déductif'],
      ]),
      b.titre('Motivation et autorité'),
      b.texte('La **pyramide de Maslow** hiérarchise les besoins : physiologiques, sécurité, appartenance, estime, accomplissement. Un élève qui a faim ou se sent en danger apprend difficilement.'),
      b.texte('Les travaux de **Kurt Lewin** distinguent trois styles de conduite d’un groupe : **autoritaire**, **démocratique** et **laisser-faire**. Le style démocratique favorise en général l’engagement et l’autonomie.'),
      b.piege('Sanctionner n’est pas punir l’élève en tant que personne : la sanction vise un **acte**, doit être **expliquée**, **proportionnée** et **éducative**.'),
      b.recap(['Éducateur = vie scolaire, suivi, lien avec les familles.', 'Piaget : 4 stades, l’adolescent entre dans la pensée formelle.', 'Maslow : les besoins de base d’abord.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'EDU-SEI-E01', niveau: 1, notions: ['OBLIGATOIRE'],
      consigne: 'Pour quelle tranche d’âge la scolarisation est-elle obligatoire depuis la loi de 2015 ?',
      options: ['6 à 16 ans', '3 à 12 ans', '6 à 12 ans', '5 à 18 ans'], bonne: 0,
      explication: 'La loi n° 2015-635 du 17 septembre 2015 rend l’école obligatoire de 6 à 16 ans.',
      miniCours: mc('La scolarisation obligatoire', 'Depuis la rentrée 2015, la loi impose la scolarisation de tous les enfants âgés de 6 à 16 ans. L’État, les parents et les collectivités en partagent la responsabilité.', '6 – 16 ans, loi de 2015.'),
    }),
    ordre({
      code: 'EDU-SEI-E02', niveau: 1, notions: ['STRUCTURE'],
      consigne: 'Classe les cycles dans l’ordre du parcours scolaire.',
      elements: ['Préscolaire', 'Primaire', 'Secondaire 1ᵉʳ cycle', 'Secondaire 2ᵈ cycle'],
      mode: 'exact',
      explication: 'Préscolaire, primaire, collège (1ᵉʳ cycle), lycée (2ᵈ cycle).',
      miniCours: mc('Les cycles', 'L’enfant passe par le préscolaire (3 ans), le primaire (6 ans, du CP1 au CM2), puis le secondaire : premier cycle de la 6ᵉ à la 3ᵉ, second cycle de la seconde à la terminale.', 'Préscolaire → primaire → 1ᵉʳ cycle → 2ᵈ cycle.'),
    }),
    relier({
      code: 'EDU-SEI-E03', niveau: 1, notions: ['STRUCTURE'],
      consigne: 'Relie chaque classe à l’examen qui la conclut.',
      paires: [['CM2', 'CEPE'], ['3ᵉ', 'BEPC'], ['Terminale', 'Baccalauréat']],
      intrus: ['Licence'],
      explication: 'La licence est un diplôme de l’enseignement supérieur.',
      miniCours: mc('Les examens nationaux', 'Le CEPE clôt le primaire en CM2, le BEPC clôt le premier cycle du secondaire en 3ᵉ et le baccalauréat clôt le second cycle en terminale.', 'CM2 → CEPE ; 3ᵉ → BEPC ; Tle → BAC.'),
    }),
    vf({
      code: 'EDU-SEI-E04', niveau: 2, notions: ['VIE-SCOLAIRE', 'STRUCTURE'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['L’éducateur assure le suivi des absences et informe les familles.', true],
        ['Le COGES associe les parents à la gestion de l’établissement.', true],
        ['L’éducateur fixe seul les notes trimestrielles des élèves.', false, 'Les notes relèvent des enseignants et du conseil de classe.'],
      ],
      explication: 'L’éducateur gère la vie scolaire ; l’évaluation des apprentissages relève des enseignants.',
      miniCours: mc('Les missions de l’éducateur', 'L’éducateur encadre la vie scolaire : assiduité, discipline, sécurité, écoute et lien avec les familles. Il participe aux conseils mais n’évalue pas les apprentissages disciplinaires.', 'Vie scolaire, pas notation.'),
    }),
    classer({
      code: 'EDU-SEI-E05', niveau: 2, notions: ['PSYCHO'],
      consigne: 'Classe chaque comportement selon le stade de Piaget.',
      categories: ['Préopératoire', 'Opératoire concret', 'Opératoire formel'],
      cartes: [
        ['Croire que la lune le suit quand il marche', 0],
        ['Comprendre qu’une boule de pâte aplatie garde la même quantité', 1],
        ['Formuler des hypothèses et les tester mentalement', 2],
        ['Classer des objets selon plusieurs critères manipulés', 1],
        ['Débattre d’une notion abstraite comme la justice', 2],
      ],
      explication: 'Égocentrisme : préopératoire ; conservation et classification concrètes : opératoire concret ; abstraction : formel.',
      miniCours: mc('Les stades de Piaget', 'Le jeune enfant (2 – 7 ans) pense de façon égocentrique. Vers 7 ans apparaissent la conservation et la logique sur des objets concrets. À l’adolescence, la pensée devient abstraite et hypothético-déductive.', 'Concret avant abstrait.'),
    }),
    glisser({
      code: 'EDU-SEI-E06', niveau: 2, notions: ['PSYCHO'],
      consigne: 'Complète la pyramide de Maslow, de la base au sommet.',
      texte: 'Besoins {{physiologiques}} → besoins de {{sécurité}} → besoins d’{{appartenance}} → besoins d’{{estime}} → besoin d’{{accomplissement}}',
      distracteurs: ['richesse', 'compétition'],
      explication: 'Les besoins de base doivent être satisfaits avant que les besoins supérieurs ne motivent pleinement.',
      miniCours: mc('La pyramide de Maslow', 'Abraham Maslow classe les besoins humains en cinq niveaux : physiologiques, sécurité, appartenance, estime, accomplissement de soi. Pour l’école : un élève affamé ou insécurisé est peu disponible pour apprendre.', 'Du vital au personnel.'),
    }),
    qcm({
      code: 'EDU-SEI-E07', niveau: 3, notions: ['VIE-SCOLAIRE'],
      consigne: 'Un élève de 4ᵉ, habituellement calme, accumule des retards et s’endort en classe. Quelle est la première démarche de l’éducateur ?',
      options: [
        'S’entretenir avec l’élève et contacter la famille pour comprendre la situation',
        'Le convoquer directement en conseil de discipline',
        'L’exclure temporairement pour marquer les esprits',
        'Ignorer la situation tant que ses notes restent correctes',
      ], bonne: 0,
      explication: 'Un changement brutal de comportement est un signal : l’éducateur écoute, recherche les causes et associe la famille avant toute sanction.',
      miniCours: mc('Comprendre avant de sanctionner', 'Face à un changement de comportement, l’éducateur cherche d’abord les causes (fatigue, difficultés familiales, travail, santé) par l’écoute et le dialogue avec la famille. La sanction n’intervient qu’ensuite, si nécessaire, et doit rester éducative.', 'Écouter, comprendre, associer la famille.'),
      raisonnement: {
        reference: 'Le comportement est nouveau chez un élève habituellement calme : c’est un signal d’alerte, pas d’abord un problème de discipline. L’éducateur doit écouter l’élève et contacter la famille pour en comprendre la cause, puis proposer un accompagnement adapté. Sanctionner immédiatement ignorerait la cause.',
        etapes: ['Repérer le changement de comportement comme signal', 'Écouter l’élève', 'Associer la famille', 'Différer la sanction et l’adapter'],
      },
    }),
    entourer({
      code: 'EDU-SEI-E08', niveau: 3, notions: ['VIE-SCOLAIRE'],
      consigne: 'Entoure les caractéristiques d’une sanction éducative.',
      elements: [['Expliquée à l’élève', true], ['Proportionnée à la faute', true], ['Visant un acte, pas la personne', true], ['Prévue par le règlement intérieur', true], ['Humiliante pour servir d’exemple', false], ['Collective pour toute la classe', false]],
      explication: 'Une sanction humiliante ou collective est contraire au principe d’individualisation et à la dignité de l’élève.',
      miniCours: mc('La sanction éducative', 'Pour être juste et utile, une sanction est prévue par le règlement, individuelle, proportionnée, expliquée, et vise un comportement. Elle doit aider l’élève à comprendre et à réparer, jamais l’humilier.', 'Légale, individuelle, proportionnée, expliquée.'),
    }),
    qcm({
      code: 'EDU-SEI-E09', niveau: 3, notions: ['PSYCHO'],
      consigne: 'Un groupe d’élèves participe davantage quand on les associe aux décisions sur l’organisation d’une sortie. Quel style de conduite est illustré ?',
      options: ['Démocratique', 'Autoritaire', 'Laisser-faire', 'Paternaliste'], bonne: 0,
      explication: 'Associer le groupe aux décisions caractérise le style démocratique décrit par Kurt Lewin.',
      miniCours: mc('Les styles de Lewin', 'Le style autoritaire impose les décisions ; le laisser-faire n’encadre presque pas ; le style démocratique associe le groupe aux décisions tout en gardant un cadre. Ce dernier favorise généralement l’engagement.', 'Associer sans abandonner le cadre.'),
      raisonnement: {
        reference: 'Les élèves sont associés aux décisions : ce n’est pas un style autoritaire (décisions imposées) ni un laisser-faire (absence de cadre). Le responsable garde l’organisation mais fait participer le groupe : c’est le style démocratique.',
        etapes: ['Repérer la participation du groupe aux décisions', 'Écarter l’autoritaire et le laisser-faire', 'Conclure : style démocratique'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// ENSEA — ISE option économie : mécanismes monétaires (programme CAPESA 2026, partie B)
// ═════════════════════════════════════════════════════════════════════════
const monnaie = {
  code: 'ECO-MONNAIE',
  matiere: 'Économie',
  titre: 'Monnaie et politique monétaire dans l’UEMOA',
  resume: 'Fonctions et formes de la monnaie, création monétaire, masse monétaire, BCEAO.',
  notions: [
    { code: 'FONCTIONS', libelle: 'Définition, fonctions et formes de la monnaie' },
    { code: 'CREATION', libelle: 'Création monétaire et ses agents' },
    { code: 'MASSE', libelle: 'Masse monétaire : agrégats et contreparties' },
    { code: 'POLITIQUE', libelle: 'Politique monétaire de la BCEAO' },
  ],
  lecons: [
    lecon('ECO-MONNAIE-L1', 'La monnaie et sa création', 9, [
      b.titre('Trois fonctions'),
      b.liste(['**Unité de compte** : elle mesure la valeur des biens.', '**Intermédiaire des échanges** : elle évite le troc.', '**Réserve de valeur** : elle permet de reporter une dépense dans le temps.']),
      b.titre('Les formes'),
      b.liste(['**Fiduciaire** : billets de banque.', '**Divisionnaire** : pièces.', '**Scripturale** : dépôts à vue sur des comptes, mobilisables par virement, chèque ou carte.']),
      b.titre('Qui crée la monnaie ?'),
      b.texte('Les **banques commerciales** créent de la monnaie scripturale lorsqu’elles accordent des **crédits** : « les crédits font les dépôts ». Le remboursement d’un crédit détruit la monnaie correspondante. La **banque centrale** émet la monnaie fiduciaire et refinance les banques.'),
      b.piege('Une banque ne prête pas seulement l’argent déposé par ses clients : en accordant un crédit, elle **crée** un dépôt nouveau.'),
      b.question(qcm({
        code: 'ECO-MONNAIE-L1-Q1', niveau: 1,
        consigne: 'Un dépôt à vue sur un compte bancaire est de la monnaie…',
        options: ['scripturale', 'fiduciaire', 'divisionnaire'], bonne: 0,
        explication: 'C’est une écriture en compte : monnaie scripturale.',
      })),
      b.recap(['Unité de compte, intermédiaire des échanges, réserve de valeur.', 'Les crédits font les dépôts.', 'Rembourser un crédit détruit de la monnaie.']),
    ]),
    lecon('ECO-MONNAIE-L2', 'Masse monétaire et politique monétaire de la BCEAO', 9, [
      b.texte('La **masse monétaire** mesure la quantité de monnaie détenue par les agents non financiers. On la décrit par des **agrégats** emboîtés, du plus liquide au moins liquide (M1, M2…).'),
      b.titre('Les contreparties'),
      b.texte('La monnaie a pour contreparties les créances détenues par le système bancaire : **avoirs extérieurs nets**, **créances sur l’économie** (crédits aux entreprises et ménages) et **créances nettes sur l’administration centrale**.'),
      b.titre('La BCEAO et l’UEMOA'),
      b.liste([
        'La **Banque centrale des États de l’Afrique de l’Ouest (BCEAO)**, dont le siège est à **Dakar**, est la banque centrale commune des **8 pays de l’UEMOA** : Bénin, Burkina Faso, Côte d’Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo.',
        'Le franc CFA est arrimé à l’euro par une **parité fixe** : **1 € = 655,957 FCFA**.',
        'Objectif principal : la **stabilité des prix**.',
      ]),
      b.tableau(['Instrument', 'Effet d’une hausse'], [
        ['Taux directeurs (appels d’offres, guichet de prêt marginal)', 'Refinancement plus cher → moins de crédit → politique restrictive'],
        ['Coefficient de réserves obligatoires', 'Moins de liquidités disponibles pour prêter → politique restrictive'],
      ]),
      b.retenir('Pour **freiner l’inflation**, la banque centrale mène une politique **restrictive** (hausse des taux) ; pour **soutenir l’activité**, une politique **expansive** (baisse des taux).'),
      b.recap(['BCEAO : siège à Dakar, 8 pays.', '1 € = 655,957 FCFA.', 'Hausse des taux = politique restrictive.']),
    ]),
  ],
  exercices: [
    classer({
      code: 'ECO-MONNAIE-E01', niveau: 1, notions: ['FONCTIONS'],
      consigne: 'Classe chaque situation selon la fonction de la monnaie qu’elle illustre.',
      categories: ['Unité de compte', 'Intermédiaire des échanges', 'Réserve de valeur'],
      cartes: [['Afficher le prix d’un pagne en FCFA', 0], ['Payer un taxi avec un billet', 1], ['Mettre de l’argent de côté pour la rentrée', 2], ['Comparer le prix de deux téléphones', 0], ['Régler une facture par virement', 1]],
      explication: 'Mesurer ou comparer : unité de compte ; payer : intermédiaire ; épargner : réserve de valeur.',
      miniCours: mc('Les fonctions de la monnaie', 'La monnaie sert à exprimer des prix (unité de compte), à payer (intermédiaire des échanges) et à conserver un pouvoir d’achat dans le temps (réserve de valeur).', 'Mesurer, payer, épargner.'),
    }),
    vf({
      code: 'ECO-MONNAIE-E02', niveau: 1, notions: ['POLITIQUE'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Le siège de la BCEAO est à Dakar.', true],
        ['L’UEMOA compte 8 États membres.', true],
        ['La parité du franc CFA avec l’euro varie chaque jour.', false, 'La parité est fixe : 1 € = 655,957 FCFA.'],
      ],
      explication: 'BCEAO à Dakar, 8 pays, parité fixe avec l’euro.',
      miniCours: mc('Repères UEMOA', 'Les huit pays de l’UEMOA partagent une même monnaie, le franc CFA, émise par la BCEAO dont le siège est à Dakar. Le franc CFA est lié à l’euro par une parité fixe.', '1 € = 655,957 FCFA.'),
    }),
    glisser({
      code: 'ECO-MONNAIE-E03', niveau: 1, notions: ['FONCTIONS'],
      consigne: 'Complète les formes de la monnaie.',
      texte: 'Les billets sont de la monnaie {{fiduciaire}}, les pièces de la monnaie {{divisionnaire}} et les dépôts à vue de la monnaie {{scripturale}}.',
      distracteurs: ['marchandise', 'électorale'],
      explication: 'Fiduciaire (billets), divisionnaire (pièces), scripturale (écritures en compte).',
      miniCours: mc('Les formes de la monnaie', 'La monnaie fiduciaire repose sur la confiance (billets). La monnaie divisionnaire divise l’unité (pièces). La monnaie scripturale est une écriture dans les comptes bancaires ; c’est aujourd’hui la plus importante en valeur.', 'Billets, pièces, écritures.'),
    }),
    ordre({
      code: 'ECO-MONNAIE-E04', niveau: 2, notions: ['CREATION'],
      consigne: 'Ordonne le mécanisme de création puis de destruction monétaire.',
      elements: ['Une entreprise demande un crédit à sa banque', 'La banque crédite le compte de l’entreprise', 'Un dépôt nouveau s’ajoute à la masse monétaire', 'L’entreprise rembourse le crédit à l’échéance', 'La monnaie correspondante est détruite'],
      explication: 'Le crédit crée le dépôt ; son remboursement le détruit.',
      miniCours: mc('Les crédits font les dépôts', 'Quand une banque accorde un crédit, elle inscrit simplement la somme sur le compte de l’emprunteur : de la monnaie nouvelle apparaît. Quand le crédit est remboursé, cette monnaie disparaît.', 'Crédit = création ; remboursement = destruction.'),
    }),
    relier({
      code: 'ECO-MONNAIE-E05', niveau: 2, notions: ['MASSE'],
      consigne: 'Relie chaque contrepartie de la masse monétaire à son contenu.',
      paires: [
        ['Avoirs extérieurs nets', 'Devises et créances sur l’étranger, nettes des engagements'],
        ['Créances sur l’économie', 'Crédits accordés aux entreprises et aux ménages'],
        ['Créances nettes sur l’administration centrale', 'Financements nets accordés à l’État'],
      ],
      intrus: ['Billets détenus par le public'],
      explication: 'Les billets font partie de la masse monétaire elle-même, pas de ses contreparties.',
      miniCours: mc('Les contreparties', 'Toute monnaie créée correspond à une créance du système bancaire : sur l’extérieur (devises), sur l’économie (crédits au secteur privé) ou sur l’État. Ces trois postes sont les contreparties de la masse monétaire.', 'Extérieur, économie, État.'),
    }),
    classer({
      code: 'ECO-MONNAIE-E06', niveau: 2, notions: ['POLITIQUE'],
      consigne: 'Classe chaque mesure : politique monétaire restrictive ou expansive ?',
      categories: ['Restrictive', 'Expansive'],
      cartes: [['Hausse des taux directeurs', 0], ['Baisse du coefficient de réserves obligatoires', 1], ['Hausse du coefficient de réserves obligatoires', 0], ['Baisse des taux directeurs', 1]],
      explication: 'Rendre le crédit plus cher ou plus rare est restrictif ; le rendre moins cher ou plus abondant est expansif.',
      miniCours: mc('Restrictive ou expansive', 'Une politique restrictive renchérit ou raréfie la liquidité bancaire pour limiter le crédit et l’inflation. Une politique expansive fait l’inverse pour soutenir l’investissement et la consommation.', 'Taux ↑ = restrictive.'),
    }),
    numerique({
      code: 'ECO-MONNAIE-E07', niveau: 3, notions: ['POLITIQUE'],
      consigne: 'Combien de FCFA faut-il pour obtenir 200 € (parité fixe) ? (arrondi à l’unité)',
      valeur: 131191, tolerance: { type: 'abs', valeur: 1 }, unite: 'FCFA',
      calcul: ['1 € = 655,957 FCFA', '200 × 655,957 = 131 191,4', '≈ 131 191 FCFA'],
      explication: '200 × 655,957 = 131 191,4, soit environ 131 191 FCFA.',
      miniCours: mc('Convertir à parité fixe', 'Avec une parité fixe, la conversion est une simple multiplication : montant en euros × 655,957 donne le montant en FCFA. On divise pour faire la conversion inverse.', '€ × 655,957 = FCFA.'),
    }),
    qcm({
      code: 'ECO-MONNAIE-E08', niveau: 3, notions: ['POLITIQUE', 'CREATION'],
      consigne: 'L’inflation dépasse nettement l’objectif dans la zone UEMOA. Quelle décision de la BCEAO est cohérente ?',
      options: ['Relever ses taux directeurs', 'Baisser ses taux directeurs', 'Augmenter les dépenses publiques', 'Dévaluer le franc CFA chaque mois'], bonne: 0,
      explication: 'Relever les taux renchérit le crédit, freine la création monétaire et la demande, donc les prix.',
      miniCours: mc('Lutter contre l’inflation', 'Une inflation trop forte appelle une politique monétaire restrictive : la banque centrale augmente le coût du refinancement des banques, qui prêtent moins et plus cher. La demande ralentit, ce qui modère la hausse des prix. Les dépenses publiques relèvent de la politique budgétaire.', 'Inflation ↑ → taux ↑.'),
      raisonnement: {
        reference: 'L’objectif de la BCEAO est la stabilité des prix. Face à une inflation trop forte, elle mène une politique restrictive : en relevant ses taux directeurs, elle rend le refinancement des banques plus cher ; celles-ci accordent moins de crédits, la création monétaire et la demande ralentissent, ce qui freine les prix. Les dépenses publiques relèvent du budget, pas de la banque centrale.',
        etapes: ['Rappeler l’objectif de stabilité des prix', 'Choisir une politique restrictive', 'Expliquer la transmission : taux → crédit → demande → prix', 'Écarter la politique budgétaire'],
      },
    }),
    entourer({
      code: 'ECO-MONNAIE-E09', niveau: 3, notions: ['CREATION', 'MASSE'],
      consigne: 'Entoure les opérations qui augmentent la masse monétaire.',
      elements: [['Une banque accorde un crédit à un ménage', true], ['Un exportateur convertit ses devises en FCFA auprès de sa banque', true], ['La banque achète un titre à une entreprise', true], ['Un client rembourse son prêt', false], ['Un client retire des billets de son compte', false]],
      explication: 'Le retrait transforme de la monnaie scripturale en billets : la masse monétaire ne change pas. Le remboursement détruit de la monnaie.',
      miniCours: mc('Création, destruction, transformation', 'La masse monétaire augmente quand le système bancaire acquiert une créance en créant un dépôt (crédit, achat de devises ou de titres). Elle diminue quand une créance est remboursée. Un retrait d’espèces change seulement la forme de la monnaie.', 'Retrait = changement de forme, pas de quantité.'),
    }),
  ],
};

module.exports = [systemeEducatif, monnaie];
