const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, numerique, b, lecon } = require('../dsl');

// ═════════════════════════════════════════════════════════════════════════
// Logarithme népérien et exponentielle
// Programme : ISE cycle long / AS (brochure CAPESA 2026, « Exemples de fonctions usuelles »),
// INPHB et ESATIC bacheliers (niveau Terminale C/D).
// ═════════════════════════════════════════════════════════════════════════
const lnExp = {
  code: 'MATH-LNEXP',
  matiere: 'Mathématiques',
  titre: 'Logarithme et exponentielle',
  resume: 'Propriétés, dérivées, limites de référence et résolution d’équations.',
  notions: [
    { code: 'LN-PROP', libelle: 'Propriétés algébriques du logarithme népérien' },
    { code: 'LN-DERIV', libelle: 'Dérivée et variations de ln' },
    { code: 'LIM-REF', libelle: 'Limites de référence (croissances comparées)' },
    { code: 'EXP-PROP', libelle: 'Propriétés de la fonction exponentielle' },
    { code: 'EQ-LNEXP', libelle: 'Équations et inéquations avec ln et exp' },
  ],
  lecons: [
    lecon('MATH-LNEXP-L1', 'La fonction logarithme népérien', 8, [
      b.texte('La fonction **logarithme népérien**, notée **ln**, est définie sur **]0 ; +∞[**. C’est la primitive de x ↦ 1/x qui s’annule en 1.'),
      b.formule('ln 1 = 0      ln e = 1      (ln x)′ = 1/x', 'e ≈ 2,718 est l’unique réel tel que ln e = 1.'),
      b.titre('Les règles de calcul'),
      b.tableau(['Pour a > 0 et b > 0', 'Règle'], [
        ['Produit', 'ln(ab) = ln a + ln b'],
        ['Quotient', 'ln(a/b) = ln a − ln b'],
        ['Inverse', 'ln(1/a) = −ln a'],
        ['Puissance (n entier)', 'ln(aⁿ) = n ln a'],
        ['Racine', 'ln √a = ½ ln a'],
      ]),
      b.piege('ln(a + b) n’est **pas** égal à ln a + ln b. Le logarithme transforme les **produits** en sommes, pas les sommes.'),
      b.question(qcm({
        code: 'MATH-LNEXP-L1-Q1', niveau: 1,
        consigne: 'Simplifie ln 8 − ln 2.',
        options: ['ln 4', 'ln 6', '3', 'ln 16'], bonne: 0,
        explication: 'ln 8 − ln 2 = ln(8/2) = ln 4 (règle du quotient).',
      })),
      b.titre('Variations et limites'),
      b.texte('Comme (ln x)′ = 1/x > 0 sur ]0 ; +∞[, la fonction ln est **strictement croissante**. Elle est négative sur ]0 ; 1[ et positive sur ]1 ; +∞[.'),
      b.liste([
        'lim ln x = −∞ quand x → 0⁺',
        'lim ln x = +∞ quand x → +∞',
        'lim (ln x)/x = 0 quand x → +∞ (croissances comparées)',
        'lim x ln x = 0 quand x → 0⁺',
      ]),
      b.retenir('Pour étudier ln(u(x)), on impose d’abord **u(x) > 0** : c’est le domaine de définition. Dérivée : (ln u)′ = u′/u.'),
      b.exemple('Exemple — domaine de f(x) = ln(2x − 6)', 'On veut 2x − 6 > 0, soit x > 3. Le domaine est ]3 ; +∞[ et f′(x) = 2/(2x − 6) = 1/(x − 3).'),
      b.recap([
        'ln est définie et strictement croissante sur ]0 ; +∞[.',
        'ln(ab) = ln a + ln b ; ln(aⁿ) = n ln a.',
        '(ln u)′ = u′/u, avec u > 0.',
        'Le « x » l’emporte sur le ln : (ln x)/x → 0 en +∞.',
      ]),
    ]),
    lecon('MATH-LNEXP-L2', 'La fonction exponentielle', 8, [
      b.texte('La fonction **exponentielle**, notée exp ou x ↦ eˣ, est l’unique fonction dérivable sur ℝ égale à sa dérivée et qui vaut 1 en 0. C’est la **réciproque** de ln.'),
      b.formule('e⁰ = 1      (eˣ)′ = eˣ      (eᵘ)′ = u′eᵘ'),
      b.tableau(['Règle', 'Formule'], [
        ['Produit', 'eᵃ⁺ᵇ = eᵃ × eᵇ'],
        ['Inverse', 'e⁻ᵃ = 1/eᵃ'],
        ['Quotient', 'eᵃ⁻ᵇ = eᵃ / eᵇ'],
        ['Lien avec ln', 'ln(eˣ) = x pour tout x ; e^(ln x) = x pour x > 0'],
      ]),
      b.retenir('Pour tout réel x, **eˣ > 0**. Une équation eˣ = k n’a de solution que si k > 0 : x = ln k.'),
      b.question(vf({
        code: 'MATH-LNEXP-L2-Q1', niveau: 1,
        consigne: 'Vrai ou faux ?',
        affirmations: [['L’équation eˣ = −2 admet une solution.', false, 'eˣ est toujours strictement positif.']],
        explication: 'Une exponentielle ne prend jamais de valeur négative ou nulle.',
      })),
      b.titre('Limites de référence'),
      b.liste([
        'lim eˣ = 0 quand x → −∞ ; lim eˣ = +∞ quand x → +∞',
        'lim eˣ/x = +∞ quand x → +∞',
        'lim x eˣ = 0 quand x → −∞',
      ]),
      b.exemple('Exemple — résoudre e²ˣ⁻¹ = 5', 'On applique ln aux deux membres : 2x − 1 = ln 5, donc x = (1 + ln 5)/2 ≈ 1,30.'),
      b.piege('(eˣ)² = e²ˣ est juste, mais eˣ⁺² = e² × eˣ, et **non** eˣ + e². Une somme en exposant devient un produit.'),
      b.recap([
        'eˣ > 0 et (eᵘ)′ = u′eᵘ.',
        'eˣ = k ⇔ x = ln k, seulement si k > 0.',
        'L’exponentielle l’emporte sur x : eˣ/x → +∞.',
      ]),
    ]),
  ],
  exercices: [
    qcm({
      code: 'MATH-LNEXP-E01', niveau: 1, notions: ['LN-PROP'],
      consigne: 'Que vaut ln(e³) ?',
      options: ['3', 'e³', '1/3', '3e'], bonne: 0,
      explication: 'ln et exp sont réciproques : ln(eˣ) = x, donc ln(e³) = 3.',
      miniCours: mc('ln et exp se « détruisent »', 'Les fonctions ln et exp sont réciproques l’une de l’autre. Appliquer ln à une exponentielle redonne l’exposant ; appliquer exp à un logarithme redonne le nombre (s’il est positif).', 'ln(eˣ) = x pour tout réel x.'),
      indice: 'Pense à la règle ln(aⁿ) = n ln a, avec ln e = 1.',
    }),
    glisser({
      code: 'MATH-LNEXP-E02', niveau: 1, notions: ['LN-PROP'],
      consigne: 'Complète les règles de calcul (a > 0, b > 0, n entier).',
      texte: 'ln(a × b) = {{ln a + ln b}}\nln(aⁿ) = {{n ln a}}\nln(1) = {{0}}',
      distracteurs: ['ln a × ln b', '(ln a)ⁿ', '1'],
      explication: 'Le logarithme transforme un produit en somme et une puissance en produit ; ln 1 = 0.',
      miniCours: mc('Les trois règles de base', 'Le logarithme népérien transforme les multiplications en additions. Une puissance devient donc une multiplication par l’exposant. Enfin, ln vaut 0 en 1 car c’est la primitive de 1/x qui s’annule en 1.', 'Produit → somme ; puissance → facteur.'),
    }),
    vf({
      code: 'MATH-LNEXP-E03', niveau: 1, notions: ['EXP-PROP', 'LN-DERIV'],
      consigne: 'Balaie à droite si c’est vrai, à gauche si c’est faux.',
      affirmations: [
        ['Pour tout réel x, eˣ > 0.', true, 'L’exponentielle est strictement positive sur ℝ.'],
        ['ln x est défini pour x ≥ 0.', false, 'ln n’est défini que pour x > 0 : ln 0 n’existe pas.'],
        ['La dérivée de eˣ est eˣ.', true, 'C’est la propriété qui définit l’exponentielle.'],
        ['La fonction ln est décroissante sur ]0 ; 1[.', false, 'ln est croissante sur tout ]0 ; +∞[ ; elle est seulement négative sur ]0 ; 1[.'],
      ],
      explication: 'Retiens : exp > 0 partout, ln défini sur ]0 ; +∞[ et strictement croissant.',
      miniCours: mc('Signe et domaine', 'L’exponentielle est définie sur ℝ et toujours strictement positive. Le logarithme est défini seulement sur ]0 ; +∞[ ; il est négatif entre 0 et 1, positif au-delà, et toujours croissant.', 'Négatif ne veut pas dire décroissant.'),
    }),
    numerique({
      code: 'MATH-LNEXP-E04', niveau: 2, notions: ['EQ-LNEXP'],
      consigne: 'Résous e²ˣ = 9. Donne x arrondi au centième.',
      valeur: 1.0986, tolerance: { type: 'abs', valeur: 0.006 }, decimales: 2,
      calcul: ['On applique ln : 2x = ln 9', 'x = ln 9 / 2 = ln 3', 'x ≈ 1,10'],
      explication: '2x = ln 9 = 2 ln 3, donc x = ln 3 ≈ 1,10.',
      miniCours: mc('Résoudre eᵘ = k', 'Pour k > 0, l’équation eᵘ = k équivaut à u = ln k, car ln est la réciproque de exp. On isole ensuite x comme dans une équation du premier degré.', 'eᵘ = k ⇔ u = ln k (k > 0).'),
      indice: 'Applique ln aux deux membres.',
    }),
    relier({
      code: 'MATH-LNEXP-E05', niveau: 2, notions: ['LN-DERIV', 'EXP-PROP'],
      consigne: 'Relie chaque fonction à sa dérivée.',
      paires: [
        ['ln x', '1/x'],
        ['e²ˣ', '2e²ˣ'],
        ['x ln x', 'ln x + 1'],
        ['ln(x² + 1)', '2x/(x² + 1)'],
      ],
      intrus: ['e²ˣ / 2'],
      explication: '(eᵘ)′ = u′eᵘ ; (ln u)′ = u′/u ; (uv)′ = u′v + uv′.',
      miniCours: mc('Dérivées composées', 'Pour dériver eᵘ ou ln u, on multiplie par la dérivée de u : (eᵘ)′ = u′eᵘ et (ln u)′ = u′/u. Pour un produit, on utilise (uv)′ = u′v + uv′.', 'Toujours penser au u′.'),
    }),
    entourer({
      code: 'MATH-LNEXP-E06', niveau: 2, notions: ['LIM-REF'],
      consigne: 'Entoure les limites égales à 0.',
      elements: [
        ['(ln x)/x en +∞', true],
        ['eˣ en −∞', true],
        ['x ln x en 0⁺', true],
        ['eˣ/x en +∞', false],
        ['ln x en 0⁺', false],
        ['x eˣ en +∞', false],
      ],
      explication: 'Croissances comparées : x l’emporte sur ln x, eˣ l’emporte sur x. eˣ/x → +∞ et ln x → −∞ en 0⁺.',
      miniCours: mc('Qui l’emporte ?', 'En +∞, l’exponentielle croît plus vite que toute puissance de x, qui croît plus vite que ln x. Le « plus fort » impose la limite du quotient ou du produit.', 'ln x ≪ x ≪ eˣ en +∞.'),
    }),
    qcm({
      code: 'MATH-LNEXP-E07', niveau: 3, notions: ['LN-PROP', 'EQ-LNEXP'],
      consigne: 'Quel est l’ensemble de définition de f(x) = ln(x² − 4) ?',
      options: [']−∞ ; −2[ ∪ ]2 ; +∞[', ']2 ; +∞[', '[−2 ; 2]', 'ℝ \\ {−2 ; 2}'], bonne: 0,
      explication: 'Il faut x² − 4 > 0, soit (x − 2)(x + 2) > 0 : le produit est positif à l’extérieur des racines −2 et 2.',
      miniCours: mc('Domaine de ln(u)', 'ln(u(x)) existe uniquement quand u(x) est strictement positif. On résout donc l’inéquation u(x) > 0, souvent à l’aide d’un tableau de signes. Un trinôme est du signe de son coefficient dominant à l’extérieur de ses racines.', 'Condition : u(x) > 0, strictement.'),
      indice: 'Factorise x² − 4.',
      raisonnement: {
        reference: 'Je pose la condition x² − 4 > 0. Je factorise : (x − 2)(x + 2) > 0. Le trinôme est positif à l’extérieur de ses racines −2 et 2, donc x < −2 ou x > 2.',
        etapes: ['Poser la condition x² − 4 > 0', 'Factoriser en (x − 2)(x + 2)', 'Étudier le signe (tableau ou règle du trinôme)', 'Conclure : x < −2 ou x > 2'],
      },
    }),
    ordre({
      code: 'MATH-LNEXP-E08', niveau: 3, notions: ['EQ-LNEXP'],
      consigne: 'Remets dans l’ordre la résolution de ln x + ln(x − 1) = ln 2.',
      elements: [
        'Domaine : x > 0 et x − 1 > 0, donc x > 1',
        'ln(x(x − 1)) = ln 2',
        'x² − x − 2 = 0',
        'x = 2 ou x = −1',
        'Seul x = 2 appartient au domaine : S = {2}',
      ],
      explication: 'On commence toujours par le domaine, puis on regroupe les ln, on passe à l’égalité des arguments et on vérifie les solutions.',
      miniCours: mc('Méthode des équations avec ln', 'Avant tout calcul, détermine le domaine où chaque logarithme existe. Regroupe ensuite les logarithmes grâce aux règles de calcul pour obtenir ln A = ln B, ce qui équivaut à A = B sur le domaine. Termine en éliminant les solutions hors domaine.', 'Domaine d’abord, vérification à la fin.'),
    }),
    numerique({
      code: 'MATH-LNEXP-E09', niveau: 3, notions: ['LN-DERIV', 'LIM-REF'],
      consigne: 'f(x) = (ln x)/x sur ]0 ; +∞[. Donne la valeur de son maximum, arrondie au millième.',
      valeur: 0.3679, tolerance: { type: 'abs', valeur: 0.0011 }, decimales: 3,
      calcul: ['f′(x) = (1 − ln x)/x²', 'f′(x) = 0 ⇔ ln x = 1 ⇔ x = e', 'f′ > 0 avant e, < 0 après : maximum en e', 'f(e) = 1/e ≈ 0,368'],
      explication: 'f′(x) = (1 − ln x)/x² s’annule en x = e et change de signe (+ puis −). Le maximum vaut f(e) = 1/e ≈ 0,368.',
      miniCours: mc('Trouver un extremum', 'On calcule la dérivée, on cherche où elle s’annule et on vérifie qu’elle change de signe. La valeur de l’extremum s’obtient en remplaçant x dans f, pas dans f′. Pour un quotient : (u/v)′ = (u′v − uv′)/v².', 'Extremum = f′ s’annule ET change de signe.'),
      indice: 'Dérive avec la formule du quotient.',
      raisonnement: {
        reference: 'Je dérive : f′(x) = (1 − ln x)/x². Le signe est celui de 1 − ln x, positif pour x < e et négatif pour x > e. f admet donc un maximum en e, qui vaut ln(e)/e = 1/e ≈ 0,368.',
        etapes: ['Calculer f′(x) = (1 − ln x)/x²', 'Résoudre f′(x) = 0 : x = e', 'Justifier le changement de signe', 'Calculer f(e) = 1/e'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Dénombrement et probabilités
// Programme : ISE cycle long / AS et ISE option économie (CAPESA 2026).
// ═════════════════════════════════════════════════════════════════════════
const proba = {
  code: 'MATH-PROBA',
  matiere: 'Mathématiques',
  titre: 'Dénombrement et probabilités',
  resume: 'Combinaisons, arrangements, probabilités conditionnelles et loi binomiale.',
  notions: [
    { code: 'DENOMBR', libelle: 'Permutations, arrangements, combinaisons' },
    { code: 'PROBA-BASE', libelle: 'Probabilité d’un évènement, évènement contraire, union' },
    { code: 'PROBA-COND', libelle: 'Probabilités conditionnelles et probabilités totales' },
    { code: 'LOI-BINOM', libelle: 'Loi binomiale, espérance et variance' },
  ],
  lecons: [
    lecon('MATH-PROBA-L1', 'Dénombrer sans se tromper', 8, [
      b.texte('Dénombrer, c’est compter les issues possibles sans les écrire toutes. Deux questions décident de la formule : **l’ordre compte-t-il ?** **Peut-on répéter ?**'),
      b.tableau(['Situation', 'Ordre', 'Répétition', 'Nombre'], [
        ['p-uplet (code, mot)', 'oui', 'oui', 'nᵖ'],
        ['Arrangement (podium)', 'oui', 'non', 'Aₙᵖ = n!/(n − p)!'],
        ['Permutation (ranger n objets)', 'oui', 'non', 'n!'],
        ['Combinaison (comité, tirage simultané)', 'non', 'non', 'C(n, p) = n!/(p!(n − p)!)'],
      ]),
      b.exemple('Exemple', 'Choisir 2 délégués parmi 5 élèves : l’ordre ne compte pas, donc C(5, 2) = 10. Élire un président et un vice-président parmi 5 : l’ordre compte, donc A₅² = 20.'),
      b.question(qcm({
        code: 'MATH-PROBA-L1-Q1', niveau: 1,
        consigne: 'Un tirage « simultané » de cartes correspond à…',
        options: ['une combinaison', 'un arrangement', 'un p-uplet'], bonne: 0,
        explication: 'Tirer simultanément = sans ordre et sans remise : c’est une combinaison.',
      })),
      b.retenir('C(n, p) = C(n, n − p) et C(n, 0) = C(n, n) = 1. Formule de Pascal : C(n, p) + C(n, p + 1) = C(n + 1, p + 1).'),
      b.recap(['Ordre + répétition : nᵖ.', 'Ordre sans répétition : arrangements.', 'Sans ordre : combinaisons.']),
    ]),
    lecon('MATH-PROBA-L2', 'Probabilités et loi binomiale', 10, [
      b.texte('En situation d’**équiprobabilité**, P(A) = (nombre d’issues favorables) / (nombre d’issues possibles).'),
      b.liste([
        'P(Ā) = 1 − P(A)',
        'P(A ∪ B) = P(A) + P(B) − P(A ∩ B)',
        'Probabilité conditionnelle : P_B(A) = P(A ∩ B) / P(B), avec P(B) ≠ 0',
        'A et B indépendants ⇔ P(A ∩ B) = P(A) × P(B)',
      ]),
      b.piege('**Indépendants** ne veut pas dire **incompatibles**. Deux évènements incompatibles de probabilités non nulles ne sont jamais indépendants.'),
      b.titre('Probabilités totales'),
      b.texte('Si B₁, …, Bₙ forment une partition de l’univers : P(A) = P(B₁)P_B₁(A) + … + P(Bₙ)P_Bₙ(A). Un **arbre pondéré** rend ce calcul naturel : on multiplie le long d’une branche, on additionne les branches qui mènent à A.'),
      b.titre('La loi binomiale'),
      b.texte('On répète n fois, de façon indépendante, une épreuve à deux issues (succès de probabilité p). Le nombre X de succès suit la loi **B(n, p)**.'),
      b.formule('P(X = k) = C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ', 'E(X) = np   ·   V(X) = np(1 − p)'),
      b.question(numerique({
        code: 'MATH-PROBA-L2-Q1', niveau: 1,
        consigne: 'X suit B(10 ; 0,3). Calcule E(X).',
        valeur: 3, tolerance: { type: 'abs', valeur: 0 },
        explication: 'E(X) = np = 10 × 0,3 = 3.',
      })),
      b.recap(['P(Ā) = 1 − P(A).', 'P_B(A) = P(A ∩ B)/P(B).', 'Binomiale : n épreuves indépendantes, E = np.']),
    ]),
  ],
  exercices: [
    numerique({
      code: 'MATH-PROBA-E01', niveau: 1, notions: ['DENOMBR'],
      consigne: 'Calcule C(5, 2), le nombre de façons de choisir 2 éléments parmi 5.',
      valeur: 10, calcul: ['C(5, 2) = 5!/(2! × 3!)', '= (5 × 4)/2 = 10'],
      explication: 'C(5, 2) = (5 × 4)/(2 × 1) = 10.',
      miniCours: mc('Calculer une combinaison', 'C(n, p) = n!/(p!(n − p)!). En pratique, on écrit les p premiers facteurs de n! en décroissant et on divise par p! : C(7, 3) = (7 × 6 × 5)/(3 × 2 × 1) = 35.', 'C(n, p) = n(n − 1)…(n − p + 1) / p!'),
    }),
    qcm({
      code: 'MATH-PROBA-E02', niveau: 1, notions: ['DENOMBR'],
      consigne: 'De combien de façons peut-on ranger 4 livres différents sur une étagère ?',
      options: ['24', '16', '12', '4'], bonne: 0,
      explication: 'Ranger 4 objets distincts : 4! = 4 × 3 × 2 × 1 = 24 permutations.',
      miniCours: mc('Permutations', 'Ranger n objets distincts dans un ordre revient à choisir le premier (n choix), puis le deuxième (n − 1 choix), etc. On obtient n! = n × (n − 1) × … × 1.', 'Ranger n objets : n!'),
    }),
    classer({
      code: 'MATH-PROBA-E03', niveau: 1, notions: ['DENOMBR'],
      consigne: 'Classe chaque situation selon l’outil de dénombrement adapté.',
      categories: ['Combinaison', 'Arrangement', 'p-uplet'],
      cartes: [
        ['Choisir 3 délégués parmi 30 élèves', 0],
        ['Former le podium de 3 coureurs parmi 10', 1],
        ['Composer un code PIN de 4 chiffres', 2],
        ['Tirer 5 cartes simultanément', 0],
        ['Élire un président et un trésorier', 1],
      ],
      explication: 'Sans ordre → combinaison ; ordre sans répétition → arrangement ; ordre avec répétition → p-uplet.',
      miniCours: mc('Les deux questions', 'Pose-toi deux questions. L’ordre compte-t-il (un podium, des fonctions différentes) ? Peut-on répéter un même élément (un chiffre dans un code) ? Sans ordre : combinaison. Avec ordre et sans répétition : arrangement. Avec ordre et répétition : p-uplet.', 'Ordre ? Répétition ?'),
    }),
    numerique({
      code: 'MATH-PROBA-E04', niveau: 2, notions: ['PROBA-BASE', 'DENOMBR'],
      consigne: 'Une urne contient 3 boules rouges et 2 blanches. On tire 2 boules simultanément. Probabilité d’obtenir 2 rouges ? (décimal)',
      valeur: 0.3, tolerance: { type: 'abs', valeur: 0.001 }, decimales: 2,
      calcul: ['Issues possibles : C(5, 2) = 10', 'Issues favorables : C(3, 2) = 3', 'P = 3/10 = 0,3'],
      explication: 'P = C(3, 2)/C(5, 2) = 3/10 = 0,3.',
      miniCours: mc('Équiprobabilité', 'Quand toutes les issues ont la même chance, P(A) = favorables / possibles. Pour un tirage simultané, on compte les issues avec des combinaisons, au numérateur comme au dénominateur.', 'Même outil en haut et en bas de la fraction.'),
    }),
    vf({
      code: 'MATH-PROBA-E05', niveau: 2, notions: ['PROBA-BASE', 'PROBA-COND'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['P(Ā) = 1 − P(A).', true],
        ['Si A et B sont incompatibles, P(A ∩ B) = 0.', true],
        ['Deux évènements indépendants sont incompatibles.', false, 'Indépendants : P(A ∩ B) = P(A)P(B), qui n’est pas nul en général.'],
        ['P(A ∪ B) = P(A) + P(B) pour tous évènements A et B.', false, 'Il faut retirer P(A ∩ B), sauf si A et B sont incompatibles.'],
      ],
      explication: 'Incompatibles : intersection vide. Indépendants : la réalisation de l’un ne change pas la probabilité de l’autre.',
      miniCours: mc('Incompatibles ou indépendants ?', 'Incompatibles signifie qu’ils ne peuvent pas se produire ensemble : P(A ∩ B) = 0. Indépendants signifie que l’un n’influence pas l’autre : P(A ∩ B) = P(A) × P(B). Ce sont deux notions différentes.', 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B).'),
    }),
    glisser({
      code: 'MATH-PROBA-E06', niveau: 2, notions: ['LOI-BINOM'],
      consigne: 'Complète la loi binomiale B(n, p).',
      texte: 'P(X = k) = {{C(n, k)}} × {{pᵏ}} × {{(1 − p)ⁿ⁻ᵏ}}\nE(X) = {{np}}',
      distracteurs: ['n!', 'p(1 − p)', 'kᵖ'],
      explication: 'On choisit les k succès parmi n (C(n, k)), chacun de probabilité p, et les n − k échecs de probabilité 1 − p. L’espérance vaut np.',
      miniCours: mc('Lire la formule binomiale', 'Un résultat avec exactement k succès est une suite de k succès et n − k échecs : sa probabilité est pᵏ(1 − p)ⁿ⁻ᵏ. Il y a C(n, k) façons de placer les succès parmi les n épreuves.', 'Positions × succès × échecs.'),
    }),
    numerique({
      code: 'MATH-PROBA-E07', niveau: 3, notions: ['PROBA-COND'],
      consigne: 'P(A ∩ B) = 0,12 et P(B) = 0,4. Calcule P_B(A).',
      valeur: 0.3, tolerance: { type: 'abs', valeur: 0.001 }, decimales: 2,
      calcul: ['P_B(A) = P(A ∩ B)/P(B)', '= 0,12/0,4 = 0,3'],
      explication: 'P_B(A) = 0,12/0,4 = 0,3.',
      miniCours: mc('Probabilité conditionnelle', 'P_B(A) est la probabilité de A sachant que B est réalisé : on se restreint à B. On divise donc la probabilité de « A et B » par la probabilité de B.', 'P_B(A) = P(A ∩ B) / P(B).'),
    }),
    qcm({
      code: 'MATH-PROBA-E08', niveau: 3, notions: ['PROBA-COND'],
      consigne: 'Une usine a deux machines. M₁ fait 60 % de la production avec 2 % de pièces défectueuses ; M₂ fait 40 % avec 5 % de défectueuses. Probabilité qu’une pièce prise au hasard soit défectueuse ?',
      options: ['0,032', '0,035', '0,07', '0,0035'], bonne: 0,
      explication: 'Probabilités totales : 0,6 × 0,02 + 0,4 × 0,05 = 0,012 + 0,020 = 0,032.',
      miniCours: mc('Probabilités totales', 'Quand l’univers est partagé en cas (ici les machines), la probabilité d’un évènement est la somme, sur chaque cas, de « probabilité du cas × probabilité de l’évènement dans ce cas ». Un arbre pondéré permet de ne rien oublier.', 'On multiplie sur une branche, on additionne les branches.'),
      indice: 'Dessine un arbre à deux branches.',
      raisonnement: {
        reference: 'Je note D « pièce défectueuse ». M₁ et M₂ forment une partition. D’après la formule des probabilités totales, P(D) = P(M₁)P_M₁(D) + P(M₂)P_M₂(D) = 0,6 × 0,02 + 0,4 × 0,05 = 0,032.',
        etapes: ['Identifier la partition {M₁, M₂}', 'Écrire la formule des probabilités totales', 'Calculer chaque produit (0,012 et 0,020)', 'Additionner : 0,032'],
      },
    }),
    numerique({
      code: 'MATH-PROBA-E09', niveau: 3, notions: ['LOI-BINOM'],
      consigne: 'On lance 4 fois une pièce équilibrée. Probabilité d’obtenir exactement 2 « pile » ? (décimal)',
      valeur: 0.375, tolerance: { type: 'abs', valeur: 0.001 }, decimales: 3,
      calcul: ['X suit B(4 ; 0,5)', 'P(X = 2) = C(4, 2) × 0,5² × 0,5²', '= 6 × 1/16 = 0,375'],
      explication: 'X ~ B(4 ; 0,5) : P(X = 2) = 6 × 0,5⁴ = 6/16 = 0,375.',
      miniCours: mc('Reconnaître une loi binomiale', 'Trois conditions : l’épreuve est répétée un nombre fixé de fois, les répétitions sont indépendantes, et chaque épreuve n’a que deux issues (succès / échec) de probabilité constante. X compte alors les succès.', 'n, p, indépendance : c’est binomial.'),
      raisonnement: {
        reference: 'Les 4 lancers sont indépendants et ont deux issues, donc le nombre X de « pile » suit B(4 ; 0,5). P(X = 2) = C(4, 2) × 0,5² × 0,5² = 6 × 0,0625 = 0,375.',
        etapes: ['Justifier la loi B(4 ; 0,5)', 'Appliquer la formule avec k = 2', 'Calculer C(4, 2) = 6', 'Conclure : 0,375'],
      },
    }),
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// Suites numériques
// ═════════════════════════════════════════════════════════════════════════
const suites = {
  code: 'MATH-SUITES',
  matiere: 'Mathématiques',
  titre: 'Suites numériques',
  resume: 'Suites arithmétiques et géométriques, sommes, récurrence et convergence.',
  notions: [
    { code: 'SUITE-ARITH', libelle: 'Suites arithmétiques' },
    { code: 'SUITE-GEOM', libelle: 'Suites géométriques' },
    { code: 'RECURRENCE', libelle: 'Raisonnement par récurrence' },
    { code: 'CONVERGENCE', libelle: 'Convergence et limites de suites' },
  ],
  lecons: [
    lecon('MATH-SUITES-L1', 'Suites arithmétiques et géométriques', 8, [
      b.tableau(['', 'Arithmétique (raison r)', 'Géométrique (raison q)'], [
        ['Relation', 'uₙ₊₁ = uₙ + r', 'vₙ₊₁ = q × vₙ'],
        ['Terme général', 'uₙ = u₀ + n r', 'vₙ = v₀ × qⁿ'],
        ['Somme de termes', 'nb de termes × (1ᵉʳ + dernier)/2', '1ᵉʳ terme × (1 − q^(nb de termes))/(1 − q)'],
      ]),
      b.exemple('Exemple — somme des 100 premiers entiers', '1 + 2 + … + 100 = 100 × (1 + 100)/2 = 5 050.'),
      b.question(qcm({
        code: 'MATH-SUITES-L1-Q1', niveau: 1,
        consigne: 'uₙ₊₁ = 3uₙ. Quelle est la nature de (uₙ) ?',
        options: ['Géométrique de raison 3', 'Arithmétique de raison 3', 'Ni l’une ni l’autre'], bonne: 0,
        explication: 'On multiplie par 3 à chaque étape : suite géométrique de raison 3.',
      })),
      b.piege('Dans la formule de somme, compte bien le **nombre de termes** : de u₀ à uₙ, il y en a n + 1.'),
      b.recap(['Arithmétique : on ajoute r.', 'Géométrique : on multiplie par q.', 'Compter les termes avant de sommer.']),
    ]),
    lecon('MATH-SUITES-L2', 'Récurrence et convergence', 8, [
      b.texte('Le **raisonnement par récurrence** démontre qu’une propriété P(n) est vraie pour tout entier n ≥ n₀.'),
      b.liste(['**Initialisation** : P(n₀) est vraie.', '**Hérédité** : si P(n) est vraie pour un n ≥ n₀, alors P(n + 1) est vraie.', '**Conclusion** : P(n) est vraie pour tout n ≥ n₀.'], true),
      b.titre('Convergence'),
      b.liste([
        'Si −1 < q < 1, qⁿ → 0.',
        'Si q > 1, qⁿ → +∞.',
        'Si q ≤ −1, (qⁿ) n’a pas de limite.',
        'Toute suite croissante et majorée converge ; toute suite décroissante et minorée converge.',
      ]),
      b.retenir('Pour une suite uₙ₊₁ = f(uₙ) qui converge vers ℓ avec f continue, la limite vérifie **ℓ = f(ℓ)** (point fixe).'),
      b.recap(['Récurrence : initialiser, hériter, conclure.', '|q| < 1 ⇒ qⁿ → 0.', 'Monotone et bornée ⇒ convergente.']),
    ]),
  ],
  exercices: [
    numerique({
      code: 'MATH-SUITES-E01', niveau: 1, notions: ['SUITE-ARITH'],
      consigne: '(uₙ) est arithmétique, u₀ = 3 et r = 4. Calcule u₁₀.',
      valeur: 43, calcul: ['u₁₀ = u₀ + 10r', '= 3 + 40 = 43'],
      explication: 'u₁₀ = 3 + 10 × 4 = 43.',
      miniCours: mc('Terme général arithmétique', 'Dans une suite arithmétique, on ajoute r à chaque étape. Entre u₀ et uₙ, on a ajouté n fois la raison : uₙ = u₀ + n r.', 'uₙ = u₀ + n r.'),
    }),
    qcm({
      code: 'MATH-SUITES-E02', niveau: 1, notions: ['SUITE-GEOM'],
      consigne: '(vₙ) est géométrique, v₀ = 2 et q = 3. Que vaut v₃ ?',
      options: ['54', '18', '11', '162'], bonne: 0,
      explication: 'v₃ = 2 × 3³ = 2 × 27 = 54.',
      miniCours: mc('Terme général géométrique', 'On multiplie par q à chaque étape. Après n étapes depuis v₀, on a multiplié n fois par q : vₙ = v₀ × qⁿ.', 'vₙ = v₀ × qⁿ.'),
    }),
    vf({
      code: 'MATH-SUITES-E03', niveau: 1, notions: ['CONVERGENCE'],
      consigne: 'Vrai ou faux ?',
      affirmations: [
        ['La suite ((−0,5)ⁿ) converge vers 0.', true],
        ['La suite (2ⁿ) converge.', false, '2 > 1 donc 2ⁿ tend vers +∞.'],
        ['Une suite croissante et majorée converge.', true],
      ],
      explication: 'Pour qⁿ : |q| < 1 → 0 ; q > 1 → +∞. Monotone et bornée → convergente.',
      miniCours: mc('Limite de qⁿ', 'Le comportement de qⁿ dépend de q : si q est strictement entre −1 et 1, qⁿ tend vers 0 ; si q > 1, il tend vers +∞ ; si q ≤ −1, il oscille sans limite.', '|q| < 1 ⇒ qⁿ → 0.'),
    }),
    numerique({
      code: 'MATH-SUITES-E04', niveau: 2, notions: ['SUITE-ARITH'],
      consigne: 'Calcule 1 + 2 + 3 + … + 100.',
      valeur: 5050, calcul: ['100 termes', 'S = 100 × (1 + 100)/2 = 5 050'],
      explication: 'Somme arithmétique : 100 × (1 + 100)/2 = 5 050.',
      miniCours: mc('Somme arithmétique', 'La somme de termes consécutifs d’une suite arithmétique vaut le nombre de termes multiplié par la moyenne du premier et du dernier terme.', 'S = nb de termes × (premier + dernier)/2.'),
    }),
    ordre({
      code: 'MATH-SUITES-E05', niveau: 2, notions: ['RECURRENCE'],
      consigne: 'Remets dans l’ordre les étapes d’un raisonnement par récurrence.',
      elements: ['Initialisation : vérifier P(n₀)', 'Hypothèse : supposer P(n) vraie pour un n ≥ n₀', 'Hérédité : démontrer P(n + 1)', 'Conclusion : P(n) vraie pour tout n ≥ n₀'],
      mode: 'exact',
      explication: 'Initialisation, hypothèse de récurrence, hérédité, conclusion.',
      miniCours: mc('L’échelle', 'La récurrence ressemble à une échelle : il faut pouvoir monter sur la première marche (initialisation) et savoir passer de n’importe quelle marche à la suivante (hérédité). Alors on atteint toutes les marches.', 'Sans initialisation, l’hérédité ne prouve rien.'),
    }),
    relier({
      code: 'MATH-SUITES-E06', niveau: 2, notions: ['SUITE-ARITH', 'SUITE-GEOM'],
      consigne: 'Relie chaque suite à sa nature.',
      paires: [
        ['uₙ₊₁ = uₙ + 3', 'Arithmétique de raison 3'],
        ['uₙ₊₁ = 0,5 uₙ', 'Géométrique de raison 1/2'],
        ['uₙ = n² + 1', 'Ni arithmétique ni géométrique'],
        ['uₙ = 4 × (−1)ⁿ', 'Géométrique de raison −1'],
      ],
      intrus: ['Arithmétique de raison 1/2'],
      explication: 'On ajoute une constante : arithmétique ; on multiplie par une constante : géométrique ; n² + 1 n’a ni différence ni quotient constant.',
      miniCours: mc('Reconnaître la nature', 'Calcule uₙ₊₁ − uₙ : si c’est une constante, la suite est arithmétique. Sinon calcule uₙ₊₁/uₙ (si les termes sont non nuls) : si c’est une constante, elle est géométrique.', 'Différence constante ou quotient constant.'),
    }),
    numerique({
      code: 'MATH-SUITES-E07', niveau: 3, notions: ['SUITE-GEOM'],
      consigne: 'Calcule 1 + 2 + 4 + … + 2⁹.',
      valeur: 1023, calcul: ['Suite géométrique de raison 2, 10 termes', 'S = 1 × (1 − 2¹⁰)/(1 − 2)', '= 1 023'],
      explication: '10 termes de raison 2 : S = (2¹⁰ − 1)/(2 − 1) = 1 023.',
      miniCours: mc('Somme géométrique', 'Pour une suite géométrique de raison q ≠ 1, la somme de N termes consécutifs vaut premier terme × (1 − q^N)/(1 − q). Compte bien N : de 2⁰ à 2⁹, il y a 10 termes.', 'S = premier × (1 − q^N)/(1 − q).'),
      raisonnement: {
        reference: 'Les termes 2⁰, 2¹, …, 2⁹ forment une suite géométrique de premier terme 1 et de raison 2. Il y a 10 termes. S = (1 − 2¹⁰)/(1 − 2) = 1 023.',
        etapes: ['Reconnaître une suite géométrique de raison 2', 'Compter 10 termes', 'Appliquer la formule de somme', 'Calculer 2¹⁰ − 1 = 1 023'],
      },
    }),
    qcm({
      code: 'MATH-SUITES-E08', niveau: 3, notions: ['CONVERGENCE'],
      consigne: 'u₀ = 0 et uₙ₊₁ = 0,5 uₙ + 3. On admet que (uₙ) converge. Quelle est sa limite ?',
      options: ['6', '3', '0', '+∞'], bonne: 0,
      explication: 'La limite ℓ vérifie ℓ = 0,5ℓ + 3, d’où ℓ = 6.',
      miniCours: mc('Point fixe', 'Si une suite définie par uₙ₊₁ = f(uₙ) converge vers ℓ et que f est continue, on peut passer à la limite des deux côtés : ℓ = f(ℓ). On résout cette équation pour trouver ℓ.', 'Passer à la limite dans la relation.'),
      raisonnement: {
        reference: 'La fonction f(x) = 0,5x + 3 est continue. En passant à la limite dans uₙ₊₁ = f(uₙ), on obtient ℓ = 0,5ℓ + 3, donc 0,5ℓ = 3 et ℓ = 6.',
        etapes: ['Écrire ℓ = 0,5ℓ + 3', 'Justifier par la continuité', 'Résoudre : ℓ = 6'],
      },
    }),
    entourer({
      code: 'MATH-SUITES-E09', niveau: 3, notions: ['CONVERGENCE'],
      consigne: 'Entoure les suites convergentes.',
      elements: [['(1/2)ⁿ', true], ['1/n (n ≥ 1)', true], ['3 + 1/n² (n ≥ 1)', true], ['(−1)ⁿ', false], ['n²', false], ['(1,01)ⁿ', false]],
      explication: '(1/2)ⁿ → 0, 1/n → 0, 3 + 1/n² → 3. (−1)ⁿ oscille, n² et 1,01ⁿ tendent vers +∞.',
      miniCours: mc('Converger', 'Une suite converge si ses termes se rapprochent d’un réel fixe. Une suite qui oscille entre deux valeurs, ou qui grandit sans limite, ne converge pas — même lentement comme 1,01ⁿ.', 'q > 1, même proche de 1 : divergence.'),
    }),
  ],
};

module.exports = [lnExp, proba, suites];
