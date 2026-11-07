const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, numerique, b, lecon } = require('../dsl');

// ═════════════════════════════════════════════════════════════════════════
// Électricité : dipôles et circuits (Sciences physiques, Terminale C/D)
// Épreuve présente dans les anciens sujets ESATIC et INPHB (Sciences physiques / Culture scientifique).
// ═════════════════════════════════════════════════════════════════════════
const electricite = {
  code: 'PC-ELEC',
  matiere: 'Sciences physiques',
  titre: 'Électricité : dipôles et circuits',
  resume: 'Loi d’Ohm, associations, puissance, condensateur et dipôle RC.',
  notions: [
    { code: 'OHM', libelle: 'Loi d’Ohm et unités' },
    { code: 'ASSOC', libelle: 'Associations série et parallèle' },
    { code: 'PUISSANCE', libelle: 'Puissance et énergie électriques' },
    { code: 'RC', libelle: 'Condensateur et dipôle RC' },
  ],
  lecons: [
    lecon('PC-ELEC-L1', 'Loi d’Ohm, associations et puissance', 8, [
      b.texte('Un **conducteur ohmique** de résistance R parcouru par un courant I présente à ses bornes une tension U proportionnelle à I.'),
      b.formule('U = R × I', 'U en volts (V), R en ohms (Ω), I en ampères (A).'),
      b.tableau(['Association', 'Résistance équivalente', 'Ce qui est commun'], [
        ['Série', 'R = R₁ + R₂', 'L’intensité'],
        ['Parallèle (dérivation)', '1/R = 1/R₁ + 1/R₂', 'La tension'],
      ]),
      b.exemple('Exemple', 'R₁ = 30 Ω et R₂ = 60 Ω en parallèle : 1/R = 1/30 + 1/60 = 3/60, donc R = 20 Ω — plus petite que chacune des deux.'),
      b.titre('Puissance et énergie'),
      b.liste(['P = U × I (watts, W)', 'Pour un conducteur ohmique : P = R I² = U²/R', 'Énergie : E = P × t (joules si t en secondes)']),
      b.retenir('**Loi des nœuds** : la somme des intensités qui arrivent à un nœud égale la somme de celles qui en partent. **Loi des mailles** : la somme algébrique des tensions le long d’une maille est nulle.'),
      b.question(qcm({
        code: 'PC-ELEC-L1-Q1', niveau: 1,
        consigne: 'Dans un circuit en série, quelle grandeur est la même pour tous les dipôles ?',
        options: ['L’intensité', 'La tension', 'La puissance'], bonne: 0,
        explication: 'En série, le même courant traverse tous les dipôles.',
      })),
      b.recap(['U = RI.', 'Série : résistances qui s’ajoutent, même courant.', 'Parallèle : inverses qui s’ajoutent, même tension.', 'P = UI = RI².']),
    ]),
    lecon('PC-ELEC-L2', 'Le condensateur et le dipôle RC', 9, [
      b.texte('Un **condensateur** de capacité C stocke une charge q proportionnelle à la tension u_C à ses bornes.'),
      b.formule('q = C × u_C      i = C × du_C/dt', 'C en farads (F) ; on utilise souvent le µF = 10⁻⁶ F.'),
      b.titre('Charge à travers une résistance'),
      b.texte('Sous une tension constante E, la tension aux bornes du condensateur croît selon :'),
      b.formule('u_C(t) = E (1 − e^(−t/τ))   avec   τ = R × C', 'τ (tau) est la constante de temps, en secondes.'),
      b.liste(['À t = τ, u_C ≈ 63 % de E.', 'Au bout d’environ 5τ, le condensateur est pratiquement chargé (régime permanent).', 'Énergie stockée : E_C = ½ C u_C².']),
      b.piege('Pense aux **préfixes** : 10 kΩ = 10⁴ Ω et 100 µF = 10⁻⁴ F. Une erreur de puissance de 10 est l’erreur la plus fréquente.'),
      b.recap(['q = C u_C.', 'τ = RC.', '63 % à τ, ≈ 100 % à 5τ.', 'E = ½ C u².']),
    ]),
  ],
  exercices: [
    numerique({
      code: 'PC-ELEC-E01', niveau: 1, notions: ['OHM'],
      consigne: 'Un conducteur ohmique de 100 Ω est traversé par un courant de 0,2 A. Quelle est la tension à ses bornes ?',
      valeur: 20, unite: 'V', calcul: ['U = R × I', '= 100 × 0,2 = 20 V'],
      explication: 'U = RI = 100 × 0,2 = 20 V.',
      miniCours: mc('Loi d’Ohm', 'Aux bornes d’un conducteur ohmique, la tension est proportionnelle à l’intensité : U = R × I. Vérifie les unités : ohms et ampères donnent des volts.', 'U (V) = R (Ω) × I (A).'),
    }),
    qcm({
      code: 'PC-ELEC-E02', niveau: 1, notions: ['ASSOC'],
      consigne: 'Deux résistances de 30 Ω et 60 Ω sont montées en parallèle. Résistance équivalente ?',
      options: ['20 Ω', '90 Ω', '45 Ω', '30 Ω'], bonne: 0,
      explication: '1/R = 1/30 + 1/60 = 1/20, donc R = 20 Ω.',
      miniCours: mc('Résistances en parallèle', 'En dérivation, ce sont les inverses des résistances qui s’ajoutent : 1/R = 1/R₁ + 1/R₂. La résistance équivalente est toujours plus petite que la plus petite des résistances. Pour deux résistances : R = R₁R₂/(R₁ + R₂).', 'Parallèle : R équivalente < chaque R.'),
    }),
    glisser({
      code: 'PC-ELEC-E03', niveau: 1, notions: ['OHM', 'RC'],
      consigne: 'Associe chaque grandeur à son unité.',
      texte: 'Tension : {{volt (V)}}\nIntensité : {{ampère (A)}}\nRésistance : {{ohm (Ω)}}\nCapacité : {{farad (F)}}',
      distracteurs: ['watt (W)', 'coulomb (C)'],
      explication: 'Le watt mesure une puissance, le coulomb une charge électrique.',
      miniCours: mc('Les unités de l’électricité', 'Tension en volts, intensité en ampères, résistance en ohms, capacité en farads, puissance en watts, charge en coulombs et énergie en joules.', 'q (C) = C (F) × u (V).'),
    }),
    numerique({
      code: 'PC-ELEC-E04', niveau: 2, notions: ['PUISSANCE'],
      consigne: 'Un résistor de 50 Ω est parcouru par 0,4 A. Quelle puissance dissipe-t-il ?',
      valeur: 8, unite: 'W', calcul: ['P = R × I²', '= 50 × 0,16 = 8 W'],
      explication: 'P = RI² = 50 × 0,4² = 8 W.',
      miniCours: mc('Effet Joule', 'Un conducteur ohmique transforme l’énergie électrique en chaleur. Sa puissance vaut P = U × I ; comme U = RI, on obtient P = RI². Attention : c’est l’intensité qui est au carré.', 'P = R I² = U²/R.'),
      indice: 'Élève l’intensité au carré.',
    }),
    vf({
      code: 'PC-ELEC-E05', niveau: 2, notions: ['ASSOC'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['En série, tous les dipôles sont traversés par la même intensité.', true],
        ['En parallèle, toutes les branches ont la même tension.', true],
        ['La résistance équivalente d’une association série est plus petite que chaque résistance.', false, 'En série, les résistances s’ajoutent : R est plus grande que chacune.'],
      ],
      explication: 'Série : même courant, résistances qui s’additionnent. Parallèle : même tension.',
      miniCours: mc('Série ou parallèle', 'En série, les dipôles sont à la suite : un seul chemin, donc un seul courant, et les résistances s’ajoutent. En parallèle, les dipôles sont branchés entre les deux mêmes points : ils partagent la même tension.', 'Série = même I ; parallèle = même U.'),
    }),
    classer({
      code: 'PC-ELEC-E06', niveau: 2, notions: ['ASSOC'],
      consigne: 'Classe chaque propriété : association série ou parallèle ?',
      categories: ['Série', 'Parallèle'],
      cartes: [
        ['Même intensité dans tous les dipôles', 0],
        ['Même tension aux bornes de chaque branche', 1],
        ['R = R₁ + R₂', 0],
        ['1/R = 1/R₁ + 1/R₂', 1],
        ['La loi des nœuds répartit le courant entre les branches', 1],
      ],
      explication: 'En série, un seul chemin pour le courant ; en parallèle, le courant se partage aux nœuds.',
      miniCours: mc('Le chemin du courant', 'Imagine le courant comme de l’eau : en série, un seul tuyau, le débit est le même partout. En parallèle, le tuyau se divise : le débit se partage entre les branches, mais chaque branche relie les deux mêmes points et a donc la même tension.', 'Nœud = partage du courant.'),
    }),
    numerique({
      code: 'PC-ELEC-E07', niveau: 3, notions: ['RC'],
      consigne: 'R = 10 kΩ et C = 100 µF. Calcule la constante de temps τ en secondes.',
      valeur: 1, unite: 's', calcul: ['R = 10⁴ Ω ; C = 10⁻⁴ F', 'τ = RC = 10⁴ × 10⁻⁴ = 1 s'],
      explication: 'τ = RC = 10 000 × 0,000 1 = 1 s.',
      miniCours: mc('Constante de temps', 'Dans un dipôle RC, τ = R × C mesure la rapidité de la charge. Il faut convertir en unités du Système international : ohms et farads donnent des secondes. Rappelle-toi : k = 10³ et µ = 10⁻⁶.', 'τ = RC, en unités SI.'),
      indice: 'Convertis kΩ et µF avant de multiplier.',
    }),
    numerique({
      code: 'PC-ELEC-E08', niveau: 3, notions: ['RC'],
      consigne: 'Un condensateur se charge sous E = 12 V. Quelle est la tension u_C à t = τ ? (au centième, en V)',
      valeur: 7.585, tolerance: { type: 'abs', valeur: 0.02 }, unite: 'V', decimales: 2,
      calcul: ['u_C(τ) = E(1 − e⁻¹)', '= 12 × (1 − 0,368)', '≈ 7,59 V'],
      explication: 'u_C(τ) = 12 × (1 − e⁻¹) ≈ 12 × 0,632 ≈ 7,59 V (63 % de E).',
      miniCours: mc('La charge en fonction du temps', 'Pendant la charge, u_C(t) = E(1 − e^(−t/τ)). En remplaçant t par τ, l’exposant vaut −1 : u_C = E(1 − e⁻¹), soit environ 63 % de E.', 'À t = τ : 63 % de la tension finale.'),
      raisonnement: {
        reference: 'J’utilise u_C(t) = E(1 − e^(−t/τ)). À t = τ, u_C = 12(1 − e⁻¹). Comme e⁻¹ ≈ 0,368, u_C ≈ 12 × 0,632 ≈ 7,59 V.',
        etapes: ['Écrire la loi de charge u_C(t) = E(1 − e^(−t/τ))', 'Remplacer t par τ', 'Calculer e⁻¹ ≈ 0,368', 'Conclure : ≈ 7,59 V'],
      },
    }),
    qcm({
      code: 'PC-ELEC-E09', niveau: 3, notions: ['RC', 'PUISSANCE'],
      consigne: 'Énergie stockée par un condensateur de 100 µF chargé sous 10 V ?',
      options: ['5 mJ', '10 mJ', '0,5 mJ', '1 mJ'], bonne: 0,
      explication: 'E = ½ C U² = ½ × 10⁻⁴ × 100 = 5 × 10⁻³ J = 5 mJ.',
      miniCours: mc('Énergie d’un condensateur', 'Un condensateur chargé stocke une énergie E = ½ C u². Exprime C en farads et u en volts pour obtenir des joules, puis convertis si besoin (1 mJ = 10⁻³ J).', 'E = ½ C u².'),
      raisonnement: {
        reference: 'E = ½ C U². Avec C = 100 µF = 10⁻⁴ F et U = 10 V : E = 0,5 × 10⁻⁴ × 100 = 5 × 10⁻³ J = 5 mJ.',
        etapes: ['Utiliser E = ½ C U²', 'Convertir 100 µF en 10⁻⁴ F', 'Calculer 0,5 × 10⁻⁴ × 100', 'Conclure : 5 mJ'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// INFAS — Biologie humaine : cœur, circulation et sang
// Les anciens sujets INFAS publiés sont des QCM « toutes matières » ; la biologie humaine y figure.
// ═════════════════════════════════════════════════════════════════════════
const coeurSang = {
  code: 'BIO-COEUR',
  matiere: 'Biologie',
  titre: 'Le cœur, la circulation et le sang',
  resume: 'Anatomie du cœur, double circulation, composition du sang et groupes sanguins.',
  notions: [
    { code: 'COEUR', libelle: 'Anatomie du cœur' },
    { code: 'CIRCULATION', libelle: 'Petite et grande circulation' },
    { code: 'SANG', libelle: 'Composition du sang' },
    { code: 'GROUPES', libelle: 'Groupes sanguins et transfusion' },
  ],
  lecons: [
    lecon('BIO-COEUR-L1', 'Le cœur et la double circulation', 8, [
      b.texte('Le cœur est un muscle creux (le **myocarde**) divisé en deux moitiés qui ne communiquent pas : le **cœur droit** et le **cœur gauche**. Chaque moitié comprend une **oreillette** en haut et un **ventricule** en bas.'),
      b.tableau(['Valve', 'Position'], [
        ['Tricuspide', 'Entre oreillette droite et ventricule droit'],
        ['Mitrale', 'Entre oreillette gauche et ventricule gauche'],
        ['Sigmoïdes (pulmonaire, aortique)', 'À la sortie des ventricules'],
      ]),
      b.titre('Deux circuits en série'),
      b.liste([
        '**Petite circulation (pulmonaire)** : ventricule droit → artère pulmonaire → poumons → veines pulmonaires → oreillette gauche. Le sang s’y charge en dioxygène.',
        '**Grande circulation (systémique)** : ventricule gauche → aorte → organes → veines caves → oreillette droite.',
      ]),
      b.piege('Une **artère** part du cœur, une **veine** y revient — quelle que soit la teneur en dioxygène. L’artère pulmonaire transporte du sang **pauvre** en dioxygène.'),
      b.question(qcm({
        code: 'BIO-COEUR-L1-Q1', niveau: 1,
        consigne: 'Quel vaisseau quitte le ventricule gauche ?',
        options: ['L’aorte', 'L’artère pulmonaire', 'La veine cave'], bonne: 0,
        explication: 'Le ventricule gauche éjecte le sang dans l’aorte (grande circulation).',
      })),
      b.retenir('Chez l’adulte au repos, la fréquence cardiaque normale se situe entre **60 et 100 battements par minute**.'),
      b.recap(['4 cavités : 2 oreillettes, 2 ventricules.', 'Cœur droit → poumons ; cœur gauche → organes.', 'Artère = part du cœur ; veine = revient au cœur.']),
    ]),
    lecon('BIO-COEUR-L2', 'Le sang et les groupes sanguins', 7, [
      b.texte('Le sang est formé de **plasma** (liquide jaunâtre, environ 55 % du volume) et d’**éléments figurés** (environ 45 %).'),
      b.tableau(['Élément', 'Rôle principal'], [
        ['Hématies (globules rouges)', 'Transport du dioxygène grâce à l’hémoglobine'],
        ['Leucocytes (globules blancs)', 'Défense de l’organisme'],
        ['Plaquettes (thrombocytes)', 'Coagulation du sang'],
      ]),
      b.titre('Groupes sanguins'),
      b.texte('Le système **ABO** dépend des antigènes portés par les hématies (A, B, les deux ou aucun). Le facteur **Rhésus** (Rh+ ou Rh−) s’y ajoute.'),
      b.liste(['**O−** : donneur universel de globules rouges.', '**AB+** : receveur universel de globules rouges.']),
      b.retenir('Un receveur ne doit pas recevoir de globules rouges portant un antigène qu’il ne possède pas : ses anticorps les détruiraient.'),
      b.recap(['Plasma ≈ 55 %.', 'Hématies : O₂ ; leucocytes : défense ; plaquettes : coagulation.', 'O− donneur universel, AB+ receveur universel.']),
    ]),
  ],
  exercices: [
    qcm({
      code: 'BIO-COEUR-E01', niveau: 1, notions: ['COEUR'],
      consigne: 'Combien de cavités compte le cœur humain ?',
      options: ['4', '2', '3', '6'], bonne: 0,
      explication: 'Deux oreillettes et deux ventricules.',
      miniCours: mc('Les cavités du cœur', 'Le cœur comprend un cœur droit et un cœur gauche séparés par une cloison. Chacun possède une oreillette (qui reçoit le sang) et un ventricule (qui l’éjecte).', 'Oreillette = reçoit ; ventricule = éjecte.'),
    }),
    vf({
      code: 'BIO-COEUR-E02', niveau: 1, notions: ['SANG', 'CIRCULATION'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Les plaquettes interviennent dans la coagulation.', true],
        ['Les veines conduisent le sang du cœur vers les organes.', false, 'Ce sont les artères ; les veines ramènent le sang au cœur.'],
        ['L’hémoglobine transporte le dioxygène.', true],
      ],
      explication: 'Plaquettes : coagulation ; hémoglobine : dioxygène ; artères : départ du cœur.',
      miniCours: mc('Artères et veines', 'Le sens de circulation définit le vaisseau : une artère emmène le sang loin du cœur, une veine le ramène. Ce n’est pas la couleur ni la richesse en oxygène qui compte.', 'Artère = aller ; veine = retour.'),
    }),
    glisser({
      code: 'BIO-COEUR-E03', niveau: 1, notions: ['SANG'],
      consigne: 'Complète le rôle de chaque élément du sang.',
      texte: 'Les {{hématies}} transportent le dioxygène.\nLes {{leucocytes}} défendent l’organisme.\nLes {{plaquettes}} permettent la coagulation.',
      distracteurs: ['neurones', 'hormones'],
      explication: 'Hématies = globules rouges ; leucocytes = globules blancs ; plaquettes = thrombocytes.',
      miniCours: mc('Les éléments figurés', 'Le sang contient trois types d’éléments figurés : les globules rouges (hématies), riches en hémoglobine ; les globules blancs (leucocytes), acteurs de l’immunité ; et les plaquettes, qui forment le clou plaquettaire lors d’un saignement.', 'Rouge = O₂ ; blanc = défense ; plaquette = caillot.'),
    }),
    ordre({
      code: 'BIO-COEUR-E04', niveau: 2, notions: ['CIRCULATION'],
      consigne: 'Remets dans l’ordre le trajet du sang de la petite circulation.',
      elements: ['Ventricule droit', 'Artère pulmonaire', 'Poumons', 'Veines pulmonaires', 'Oreillette gauche'],
      explication: 'Le ventricule droit envoie le sang aux poumons par l’artère pulmonaire ; il revient oxygéné à l’oreillette gauche par les veines pulmonaires.',
      miniCours: mc('La petite circulation', 'La petite circulation relie le cœur aux poumons. Elle part du cœur droit, va s’oxygéner dans les poumons et revient au cœur gauche, qui l’enverra ensuite dans tout le corps.', 'Cœur droit → poumons → cœur gauche.'),
    }),
    relier({
      code: 'BIO-COEUR-E05', niveau: 2, notions: ['COEUR'],
      consigne: 'Relie chaque structure à sa description.',
      paires: [
        ['Valve mitrale', 'Entre oreillette et ventricule gauches'],
        ['Valve tricuspide', 'Entre oreillette et ventricule droits'],
        ['Aorte', 'Artère qui part du ventricule gauche'],
        ['Veines caves', 'Ramènent le sang à l’oreillette droite'],
      ],
      intrus: ['Ramènent le sang à l’oreillette gauche'],
      explication: 'Les veines pulmonaires (et non les veines caves) arrivent à l’oreillette gauche.',
      miniCours: mc('Repères anatomiques', 'Les valves auriculo-ventriculaires empêchent le reflux : tricuspide à droite, mitrale à gauche. L’aorte sort du ventricule gauche ; les veines caves arrivent à l’oreillette droite.', 'Mitrale à gauche, tricuspide à droite.'),
    }),
    classer({
      code: 'BIO-COEUR-E06', niveau: 2, notions: ['CIRCULATION'],
      consigne: 'Classe chaque vaisseau selon la circulation à laquelle il appartient.',
      categories: ['Petite circulation', 'Grande circulation'],
      cartes: [['Artère pulmonaire', 0], ['Veines pulmonaires', 0], ['Aorte', 1], ['Veine cave inférieure', 1], ['Artère rénale', 1]],
      explication: 'La petite circulation se limite au trajet cœur–poumons ; tout le reste appartient à la grande circulation.',
      miniCours: mc('Deux circuits', 'La petite circulation (pulmonaire) va du ventricule droit à l’oreillette gauche en passant par les poumons. La grande circulation (systémique) va du ventricule gauche à l’oreillette droite en passant par tous les autres organes.', 'Pulmonaire = petite.'),
    }),
    qcm({
      code: 'BIO-COEUR-E07', niveau: 3, notions: ['GROUPES'],
      consigne: 'Un patient est du groupe A+. Quels globules rouges peut-il recevoir ?',
      options: ['A+, A−, O+, O−', 'A+ seulement', 'A+, AB+', 'Tous les groupes'], bonne: 0,
      explication: 'Il possède l’antigène A et le facteur Rh : il peut recevoir des hématies sans B (A ou O), Rh+ ou Rh−.',
      miniCours: mc('Compatibilité', 'Un receveur tolère les globules rouges qui ne portent aucun antigène absent de ses propres hématies. On vérifie séparément le système ABO puis le Rhésus. Un Rh+ peut recevoir du Rh+ ou du Rh− ; un Rh− seulement du Rh−.', 'Aucun antigène « étranger ».'),
      raisonnement: {
        reference: 'Le patient A+ porte l’antigène A et l’antigène Rh. Il possède des anticorps anti-B : il ne peut pas recevoir B ni AB. En ABO, il reçoit A ou O. Pour le Rhésus, étant Rh+, il accepte Rh+ et Rh−. D’où A+, A−, O+, O−.',
        etapes: ['Identifier ses antigènes (A et Rh)', 'Exclure les groupes portant B', 'Appliquer la règle du Rhésus', 'Conclure : A+, A−, O+, O−'],
      },
    }),
    entourer({
      code: 'BIO-COEUR-E08', niveau: 3, notions: ['CIRCULATION', 'COEUR'],
      consigne: 'Entoure les vaisseaux qui transportent du sang riche en dioxygène.',
      elements: [['Veines pulmonaires', true], ['Aorte', true], ['Artère pulmonaire', false], ['Veines caves', false], ['Artères coronaires', true]],
      explication: 'Le sang est oxygéné dans les poumons : il est riche en O₂ dans les veines pulmonaires, le cœur gauche, l’aorte et ses branches (dont les coronaires).',
      miniCours: mc('Où le sang est-il oxygéné ?', 'Le sang se charge en dioxygène dans les poumons. Il reste riche en O₂ depuis les veines pulmonaires jusqu’aux organes, en passant par le cœur gauche et l’aorte. Il revient pauvre en O₂ par les veines caves jusqu’au cœur droit puis l’artère pulmonaire.', 'Cœur gauche = sang oxygéné.'),
    }),
    vf({
      code: 'BIO-COEUR-E09', niveau: 3, notions: ['GROUPES', 'SANG'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['Une personne O− peut donner ses globules rouges à tous les groupes.', true],
        ['Le plasma représente environ 55 % du volume sanguin.', true],
        ['Une personne Rh− peut recevoir sans risque du sang Rh+.', false, 'Elle risque de développer des anticorps anti-Rh.'],
        ['Une personne AB+ possède des anticorps anti-A et anti-B.', false, 'AB+ porte les antigènes A et B : elle n’a pas ces anticorps.'],
      ],
      explication: 'O− ne porte ni A, ni B, ni Rh ; AB+ ne possède ni anti-A ni anti-B.',
      miniCours: mc('Antigènes et anticorps', 'Les hématies portent des antigènes (A, B, Rh). Le plasma contient des anticorps dirigés contre les antigènes que l’on ne possède pas. O− n’a aucun antigène : ses hématies sont tolérées par tous.', 'Antigène sur l’hématie, anticorps dans le plasma.'),
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// INFAS — Calculs professionnels (proportions, conversions, doses, débits)
// Contenu d’entraînement au raisonnement chiffré. Les valeurs des exercices sont pédagogiques.
// ═════════════════════════════════════════════════════════════════════════
const calculs = {
  code: 'CALC-SANTE',
  matiere: 'Mathématiques',
  titre: 'Calculs de base pour la santé',
  resume: 'Conversions, règle de trois, pourcentages, concentrations et débits de perfusion.',
  notions: [
    { code: 'CONVERSIONS', libelle: 'Conversions d’unités (masse, volume, temps)' },
    { code: 'REGLE-3', libelle: 'Proportionnalité et règle de trois' },
    { code: 'POURCENT', libelle: 'Pourcentages et concentrations' },
    { code: 'DEBIT', libelle: 'Débits de perfusion' },
  ],
  lecons: [
    lecon('CALC-SANTE-L1', 'Conversions et proportionnalité', 7, [
      b.tableau(['Grandeur', 'Conversions utiles'], [
        ['Masse', '1 g = 1 000 mg ; 1 mg = 1 000 µg'],
        ['Volume', '1 L = 1 000 mL ; 1 mL = 1 cm³'],
        ['Temps', '1 h = 60 min ; 24 h = 1 440 min'],
      ]),
      b.titre('La règle de trois'),
      b.texte('Quand deux grandeurs sont proportionnelles, on passe par l’unité. Si 5 comprimés contiennent 2 500 mg, alors 1 comprimé contient 500 mg et 3 comprimés 1 500 mg.'),
      b.question(numerique({
        code: 'CALC-SANTE-L1-Q1', niveau: 1,
        consigne: 'Combien de mg dans 0,25 g ?',
        valeur: 250, unite: 'mg',
        explication: '0,25 × 1 000 = 250 mg.',
      })),
      b.piege('Avant de calculer, mets toutes les données **dans la même unité**. Mélanger g et mg multiplie l’erreur par 1 000.'),
      b.recap(['g → mg : × 1 000.', 'L → mL : × 1 000.', 'Règle de trois : passer par l’unité.']),
    ]),
    lecon('CALC-SANTE-L2', 'Pourcentages, concentrations et débits', 8, [
      b.texte('Une solution **à x %** (masse/volume) contient **x grammes de soluté pour 100 mL** de solution.'),
      b.exemple('Exemple', 'Un soluté glucosé à 5 % contient 5 g de glucose pour 100 mL. Une poche de 500 mL en contient donc 25 g.'),
      b.titre('Débit d’une perfusion'),
      b.texte('Avec un perfuseur standard, **1 mL correspond à 20 gouttes**. Le débit en gouttes par minute se calcule ainsi :'),
      b.formule('débit (gouttes/min) = volume (mL) × 20 / durée (min)'),
      b.exemple('Exemple', '500 mL en 4 h : 500 × 20 / 240 ≈ 41,7, soit environ 42 gouttes par minute.'),
      b.retenir('Dose selon le poids : dose totale = dose par kg × poids. 15 mg/kg pour un enfant de 20 kg → 300 mg.'),
      b.recap(['x % = x g pour 100 mL.', '1 mL = 20 gouttes (perfuseur standard).', 'Convertir la durée en minutes.']),
    ]),
  ],
  exercices: [
    numerique({
      code: 'CALC-SANTE-E01', niveau: 1, notions: ['CONVERSIONS'],
      consigne: 'Convertis 1,5 L en millilitres.',
      valeur: 1500, unite: 'mL', calcul: ['1 L = 1 000 mL', '1,5 × 1 000 = 1 500 mL'],
      explication: '1,5 × 1 000 = 1 500 mL.',
      miniCours: mc('Litres et millilitres', 'Le préfixe milli signifie un millième. Il y a donc 1 000 mL dans 1 L : pour passer des litres aux millilitres, on multiplie par 1 000.', 'L → mL : × 1 000.'),
    }),
    qcm({
      code: 'CALC-SANTE-E02', niveau: 1, notions: ['CONVERSIONS'],
      consigne: '500 µg correspondent à…',
      options: ['0,5 mg', '5 mg', '50 mg', '0,05 mg'], bonne: 0,
      explication: '1 mg = 1 000 µg, donc 500 µg = 0,5 mg.',
      miniCours: mc('Microgrammes', 'Le microgramme (µg) est mille fois plus petit que le milligramme. Pour passer des µg aux mg, on divise par 1 000.', 'µg → mg : ÷ 1 000.'),
    }),
    numerique({
      code: 'CALC-SANTE-E03', niveau: 1, notions: ['REGLE-3'],
      consigne: '4 comprimés contiennent au total 2 g de principe actif. Combien de mg dans un comprimé ?',
      valeur: 500, unite: 'mg', calcul: ['2 g = 2 000 mg', '2 000 / 4 = 500 mg'],
      explication: '2 000 mg ÷ 4 = 500 mg par comprimé.',
      miniCours: mc('Passer par l’unité', 'Dans une situation de proportionnalité, on calcule d’abord la valeur pour une unité (un comprimé), puis on multiplie si besoin. Convertis d’abord dans l’unité demandée.', 'Total ÷ nombre = valeur unitaire.'),
    }),
    numerique({
      code: 'CALC-SANTE-E04', niveau: 2, notions: ['POURCENT'],
      consigne: 'Quelle masse de glucose contient une poche de 500 mL de glucosé à 10 % ?',
      valeur: 50, unite: 'g', calcul: ['10 % = 10 g pour 100 mL', '500 mL = 5 × 100 mL', '5 × 10 = 50 g'],
      explication: '10 g pour 100 mL, donc 50 g pour 500 mL.',
      miniCours: mc('Concentration en %', 'Une solution à x % contient x grammes de soluté pour 100 mL. On trouve la masse dans un volume donné par proportionnalité.', 'x % = x g / 100 mL.'),
    }),
    numerique({
      code: 'CALC-SANTE-E05', niveau: 2, notions: ['REGLE-3'],
      consigne: 'Prescription : 15 mg/kg. L’enfant pèse 18 kg. Quelle dose totale en mg ?',
      valeur: 270, unite: 'mg', calcul: ['15 × 18 = 270 mg'],
      explication: '15 mg × 18 kg = 270 mg.',
      miniCours: mc('Dose selon le poids', 'Une prescription « par kilogramme » se multiplie par le poids du patient. Vérifie l’unité de la dose (mg, µg) et le poids en kilogrammes.', 'Dose = dose/kg × poids.'),
    }),
    ordre({
      code: 'CALC-SANTE-E06', niveau: 2, notions: ['DEBIT'],
      consigne: 'Remets dans l’ordre le calcul d’un débit en gouttes/min.',
      elements: ['Relever le volume à perfuser (mL)', 'Convertir la durée en minutes', 'Multiplier le volume par 20 gouttes/mL', 'Diviser par la durée en minutes', 'Arrondir au nombre entier de gouttes'],
      explication: 'On a besoin du volume en mL et de la durée en minutes avant d’appliquer volume × 20 / durée.',
      miniCours: mc('Méthode du débit', 'Le débit en gouttes/min se calcule par volume (mL) × 20 / durée (min) pour un perfuseur standard. La durée est souvent donnée en heures : convertis-la d’abord.', 'Toujours des minutes au dénominateur.'),
    }),
    numerique({
      code: 'CALC-SANTE-E07', niveau: 3, notions: ['DEBIT'],
      consigne: 'On doit passer 1 L en 8 heures avec un perfuseur standard (20 gouttes/mL). Débit en gouttes/min ? (arrondi à l’unité)',
      valeur: 42, tolerance: { type: 'abs', valeur: 0.5 }, unite: 'gouttes/min',
      calcul: ['1 L = 1 000 mL ; 8 h = 480 min', '1 000 × 20 / 480 ≈ 41,7', '≈ 42 gouttes/min'],
      explication: '1 000 × 20 / 480 ≈ 41,7, soit 42 gouttes par minute.',
      miniCours: mc('Débit de perfusion', 'Convertis le volume en mL et la durée en minutes, puis applique volume × 20 / durée. Arrondis au nombre entier de gouttes le plus proche.', 'débit = V(mL) × 20 / t(min).'),
      raisonnement: {
        reference: 'Je convertis : 1 L = 1 000 mL et 8 h = 480 min. Débit = 1 000 × 20 / 480 = 20 000 / 480 ≈ 41,7, donc 42 gouttes par minute.',
        etapes: ['Convertir 1 L en 1 000 mL', 'Convertir 8 h en 480 min', 'Appliquer volume × 20 / durée', 'Arrondir à 42'],
      },
    }),
    qcm({
      code: 'CALC-SANTE-E08', niveau: 3, notions: ['POURCENT', 'REGLE-3'],
      consigne: 'Un flacon contient 250 mg de produit dans 5 mL. Quel volume prélever pour 100 mg ?',
      options: ['2 mL', '2,5 mL', '0,5 mL', '20 mL'], bonne: 0,
      explication: '250 mg dans 5 mL → 50 mg/mL. Pour 100 mg : 100 / 50 = 2 mL.',
      miniCours: mc('Concentration par mL', 'Calcule d’abord la quantité de produit contenue dans 1 mL (concentration), puis divise la dose voulue par cette concentration pour obtenir le volume.', 'Volume = dose ÷ concentration.'),
      raisonnement: {
        reference: 'La concentration est 250 mg / 5 mL = 50 mg/mL. Le volume à prélever est 100 mg ÷ 50 mg/mL = 2 mL.',
        etapes: ['Calculer la concentration 50 mg/mL', 'Diviser la dose par la concentration', 'Conclure : 2 mL'],
      },
    }),
    numerique({
      code: 'CALC-SANTE-E09', niveau: 3, notions: ['POURCENT'],
      consigne: 'Le prix d’une boîte passe de 2 000 F à 2 300 F. Quel est le pourcentage d’augmentation ?',
      valeur: 15, unite: '%', calcul: ['Hausse : 300 F', '300 / 2 000 = 0,15', '= 15 %'],
      explication: '(2 300 − 2 000) / 2 000 = 0,15, soit 15 %.',
      miniCours: mc('Taux d’évolution', 'Le taux d’évolution se calcule par (valeur finale − valeur initiale) / valeur initiale, puis on multiplie par 100 pour obtenir un pourcentage. On divise toujours par la valeur de départ.', 't = (V_f − V_i) / V_i.'),
    }),
  ],
};

module.exports = [electricite, coeurSang, calculs];
