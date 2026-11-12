const { mc, qcm, vf, glisser, entourer, ordre, relier, classer, b, lecon } = require('../dsl');

// Textes officiels, annales lues et migration des codes : docs/prep-contenus/07-droit.md.
// Les dates de session priment sur l'année d'entrée annoncée par les sujets.
const original = { type: 'original', inspireDe: 'INFJ, présélection magistrature avril 2025 et greffes CMS juillet 2025' };
const preselection = { type: 'annale', organisme: 'INFJ', annee: 2025, epreuve: 'Magistrature, présélection, session avril 2025 (entrée 2026)', documentId: '6ad4436cdd410f0b0256bc34' };
const civil2025 = { type: 'annale', organisme: 'INFJ', annee: 2025, epreuve: 'Magistrature, droit civil, commentaire, juillet 2025 (entrée 2026)', documentId: '6ad44330dd410f0b0256bc26' };
const penal2026 = { type: 'annale', organisme: 'INFJ', annee: 2026, epreuve: 'Administrateurs des services pénitentiaires, droit pénal, juillet 2026 (entrée 2027)', documentId: '6ad44455dd410f0b0256bcf1' };
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

const institutions = {
  code: 'CG-INSTIT', matiere: 'Culture générale', titre: 'Les institutions de la Côte d’Ivoire',
  resume: 'De la règle de droit aux institutions : Constitution de 2016 révisée en 2020 et 2023, pouvoirs et contrôles.',
  notions: [
    { code: 'REGLE-SOURCES', libelle: 'Règle de droit, sources et vocabulaire' },
    { code: 'CONSTITUTION', libelle: 'Constitution, droits et souveraineté' },
    { code: 'EXECUTIF', libelle: 'Président, vice-Président et Gouvernement' },
    { code: 'LEGISLATIF', libelle: 'Assemblée nationale, Sénat et loi' },
    { code: 'JURIDICTIONS', libelle: 'Justice et contrôle constitutionnel' },
    { code: 'SYMBOLES', libelle: 'Symboles et institutions de conseil' },
  ],
  lecons: [
    cours('CG-INSTIT', 1, 'REGLE-SOURCES', 'À quoi sert le droit ?', {
      objectif: 'Nous allons distinguer une règle juridique d’un conseil. Cela aide à comprendre pourquoi l’État peut imposer certaines obligations.',
      regle: 'Le **droit** est un ensemble de règles qui organise la vie en société. Une règle juridique reconnaît des droits ou impose des obligations ; les autorités publiques peuvent en assurer le respect. Un **droit** est aussi une prérogative reconnue à une personne. Une **obligation** est ce qu’elle doit faire ou ne pas faire.',
      exemples: [['Dans la rue', 'Dire bonjour relève de la courtoisie. Respecter les règles de circulation relève du droit : leur violation peut entraîner une sanction prévue par un texte.'], ['Entre deux personnes', 'Un acheteur doit payer le prix convenu. Le vendeur peut demander au juge le paiement : le droit organise leur relation et son règlement.']],
      piege: 'Une sanction juridique n’est pas toujours une peine de prison : payer une dette ou réparer un dommage sont aussi des conséquences juridiques.',
      question: ['Quelle phrase décrit une obligation juridique ?', ['L’acheteur doit payer le prix dû', 'Un ami devrait sourire davantage', 'Je préfère le thé'], 0, 'La vente crée une dette de prix. Son paiement peut être réclamé selon les voies légales, alors qu’une préférence personnelle ne crée pas cette obligation.'],
      recap: ['Le droit organise la vie collective.', 'Droit reconnu et obligation imposée se répondent.', 'Une sanction n’est pas nécessairement pénale.'],
    }),
    cours('CG-INSTIT', 2, 'REGLE-SOURCES', 'D’où viennent les règles de droit ?', {
      objectif: 'Nous allons repérer l’auteur et la place d’une règle. C’est utile lorsqu’un énoncé oppose une loi à un décret.',
      regle: 'Une **source du droit** est une manière de produire ou de reconnaître une règle. La **Constitution** organise l’État et garantit les droits. La **loi** est votée par le Parlement, sous réserve du référendum. Un **règlement**, comme un décret ou un arrêté, est pris par une autorité exécutive ou administrative. Les traités sont des engagements internationaux. La **jurisprudence** rassemble les décisions des juges qui interprètent et appliquent les textes.',
      exemples: [['Reconnaître un texte', 'Un arrêté ministériel émane d’un ministre ; il ne devient pas une loi parce qu’il impose une règle.'], ['Résoudre une contradiction', 'Un décret doit respecter la loi et la Constitution. On recherche la norme supérieure applicable et le juge compétent pour contrôler le texte contesté.']],
      piege: 'Un traité n’est pas un décret. Son autorité et son application répondent aux conditions constitutionnelles ; on ne classe pas tous les documents par leur seule date.',
      question: ['Quel texte un ministre peut-il prendre dans ses compétences ?', ['Un arrêté', 'Une révision constitutionnelle à lui seul', 'Un jugement'], 0, 'Un ministre exerce des compétences administratives par arrêté. La révision constitutionnelle et le jugement suivent d’autres procédures et relèvent d’autres autorités.'],
      recap: ['Identifier l’auteur, la nature et la date du texte.', 'Le règlement doit respecter les normes supérieures.', 'La jurisprudence aide à interpréter les règles.'],
    }),
    cours('CG-INSTIT', 3, 'CONSTITUTION', 'La Constitution protège et organise', {
      objectif: 'Nous allons comprendre le rôle de la Constitution, avant de mémoriser les noms des pouvoirs.',
      regle: 'Un **État** organise une population sur un territoire avec un pouvoir public. Dans un **État de droit**, les autorités sont elles-mêmes soumises au droit. La Constitution ivoirienne du **8 novembre 2016**, révisée en **2020** puis en **2023**, fixe les institutions et garantit des droits. La **souveraineté**, pouvoir de décider au sein de l’État, appartient au peuple : il l’exerce notamment par ses élus et par le référendum, vote direct sur une question.',
      exemples: [['Des pouvoirs limités', 'Une autorité publique ne peut priver quelqu’un d’une liberté par simple préférence : son action doit avoir un fondement juridique et respecter les garanties applicables.'], ['Deux modes de participation', 'Élire un représentant et répondre à un référendum participent tous deux à l’exercice de la souveraineté, par des mécanismes différents.']],
      piege: 'La version initiale de 2016 ne suffit pas pour les dispositions modifiées. Il faut lire le texte avec ses révisions, dont celle du 25 juillet 2023.',
      question: ['Dans un État de droit, les autorités publiques…', ['sont soumises au droit', 'sont au-dessus de toute règle', 'peuvent supprimer les juges à leur gré'], 0, 'Les pouvoirs sont juridiquement encadrés. Les garanties constitutionnelles et les contrôles limitent l’action des autorités.'],
      recap: ['Constitution : droits et organisation de l’État.', 'Souveraineté : peuple, élus et référendum.', 'Lire 2016 avec les révisions de 2020 et 2023.'],
    }),
    cours('CG-INSTIT', 4, 'EXECUTIF', 'Qui exerce le pouvoir exécutif ?', {
      objectif: 'Nous allons distinguer trois fonctions de l’exécutif pour éviter de les attribuer toutes au Premier ministre.',
      regle: 'Le **pouvoir exécutif** conduit la politique nationale et assure l’exécution des lois. Le Président est chef de l’État, détenteur exclusif du pouvoir exécutif et chef de l’Administration. Il est élu pour **cinq ans** et n’est rééligible qu’une fois. Depuis 2020, il nomme le vice-Président avec l’accord du Parlement. Il nomme le Premier ministre, chef du Gouvernement, qui anime et coordonne l’action gouvernementale. Le Président préside le Conseil des ministres.',
      exemples: [['Deux chefs, deux fonctions', '« Chef de l’État » désigne le Président ; « chef du Gouvernement » désigne le Premier ministre. Le second ne devient pas le chef de l’Administration.'], ['Nommer le vice-Président', 'Il faut distinguer l’acte de nomination par le Président et l’accord du Parlement : les deux interviennent dans le mécanisme prévu depuis 2020.']],
      piege: 'Ne pas reprendre le système initial de 2016 dans lequel Président et vice-Président étaient élus ensemble.',
      question: ['Qui est constitutionnellement chef de l’Administration ?', ['Le Président de la République', 'Le Premier ministre', 'Le président du Sénat'], 0, 'L’article 67 de la Constitution attribue cette fonction au Président. Le Premier ministre anime et coordonne l’action gouvernementale.'],
      recap: ['Président : chef de l’État et de l’Administration.', 'Premier ministre : chef du Gouvernement.', 'Vice-Président : nomination avec accord du Parlement.'],
    }),
    cours('CG-INSTIT', 5, 'LEGISLATIF', 'Pourquoi deux chambres au Parlement ?', {
      objectif: 'Nous allons lire la composition du Parlement et ses missions. Cela permet de répondre à une question d’attributions institutionnelles.',
      regle: 'Le **Parlement** est l’institution qui vote la loi, consent l’impôt et contrôle l’action du Gouvernement. Il est **bicaméral**, donc composé de deux chambres : Assemblée nationale et Sénat. Les députés sont élus au suffrage universel direct : les électeurs votent pour eux. Les sénateurs sont élus pour deux tiers au suffrage indirect, par des élus ; un tiers est désigné par le Président. Le Sénat représente les collectivités territoriales et les Ivoiriens établis hors du pays.',
      exemples: [['Direct et indirect', 'Voter pour un député est un vote direct. Lorsque des représentants élus choisissent à leur tour des sénateurs, le suffrage est indirect.'], ['Contrôler sans juger', 'Une question parlementaire au Gouvernement relève du contrôle politique. Elle ne constitue pas un jugement rendu par une juridiction.']],
      piege: 'Le Parlement n’est pas seulement l’Assemblée nationale. Une question portant sur les sénateurs ne se résout pas avec le mode d’élection des députés.',
      question: ['« Bicaméral » signifie que le Parlement comporte…', ['deux chambres', 'deux présidents de la République', 'deux juridictions pénales'], 0, 'Le terme désigne l’organisation du pouvoir législatif en Assemblée nationale et Sénat. Il ne concerne ni l’exécutif ni les tribunaux.'],
      recap: ['Parlement = Assemblée nationale et Sénat.', 'Voter la loi, consentir l’impôt, contrôler le Gouvernement.', 'Sénat : deux tiers élus indirectement, un tiers désigné.'],
    }),
    cours('CG-INSTIT', 6, 'JURIDICTIONS', 'Juger les litiges et contrôler la Constitution', {
      objectif: 'Nous allons associer chaque contrôle à son institution. Cela évite de saisir le Conseil constitutionnel pour une simple dette.',
      regle: 'Une **juridiction** est un organe chargé de rendre la justice. Un **litige** est un désaccord soumis au droit. La Cour de cassation est la juridiction suprême de l’ordre judiciaire ; le Conseil d’État, celle de l’ordre administratif. La Cour des comptes contrôle les finances publiques et exerce des fonctions juridictionnelles financières. Le Conseil constitutionnel contrôle notamment la conformité des lois à la Constitution et la régularité des élections présidentielle et parlementaires. Ces institutions n’exercent pas la même mission.',
      exemples: [['Une loi contestée', 'La question « cette loi respecte-t-elle la Constitution ? » relève du contrôle constitutionnel, selon les procédures de saisine prévues.'], ['Une dette privée', 'Un conflit de paiement entre particuliers relève des juridictions compétentes de l’ordre judiciaire, pas d’un jugement du Conseil constitutionnel.']],
      piege: 'Le Conseil d’État et le Conseil constitutionnel ne sont pas deux noms de la même institution. La cassation n’est pas un nouveau vote de la loi.',
      question: ['Quelle institution contrôle la constitutionnalité des lois ?', ['Le Conseil constitutionnel', 'Le CESEC', 'Le Médiateur de la République'], 0, 'La constitutionnalité compare la loi à la Constitution. Cette mission relève du Conseil constitutionnel, alors que le CESEC conseille et que le Médiateur recherche un règlement amiable.'],
      recap: ['Distinguer contrôle constitutionnel et jugement d’un litige.', 'Cassation : ordre judiciaire ; Conseil d’État : ordre administratif.', 'Cour des comptes : finances publiques.'],
    }),
    cours('CG-INSTIT', 7, 'SYMBOLES', 'Conseiller et rechercher un accord', {
      objectif: 'Nous allons distinguer avis, médiation et jugement. Ces mots ne donnent pas la même portée à l’intervention d’une institution.',
      regle: 'Un **avis** éclaire une décision sans être lui-même cette décision. Le **Conseil économique, social, environnemental et culturel (CESEC)** donne des avis dans ces domaines. Une **médiation** recherche une solution amiable : le Médiateur de la République intervient notamment dans les difficultés entre administrés et administration. La Chambre nationale des Rois et Chefs traditionnels valorise les us et coutumes et contribue au règlement non juridictionnel des conflits. « Non juridictionnel » signifie sans jugement d’un tribunal.',
      exemples: [['Éclairer un choix', 'Une consultation du CESEC sur une question économique aide les pouvoirs publics à décider ; elle ne remplace pas le vote d’une loi.'], ['Chercher un accord', 'Un administré peut rechercher une médiation dans un différend avec un service public. Cela ne transforme pas le Médiateur en cour d’appel.']],
      piege: 'Ne pas supposer qu’une médiation suspend automatiquement les délais pour saisir un juge : cela dépend des textes applicables.',
      question: ['Un avis consultatif est principalement…', ['un éclairage apporté à une décision', 'une condamnation pénale', 'un arrêt de cassation'], 0, '« Consultatif » renvoie au conseil. Il faut distinguer cette fonction de celle d’une juridiction, qui tranche une question de droit dans une décision.'],
      recap: ['Avis : éclairer ; médiation : rechercher un accord.', 'CESEC : rôle consultatif.', 'Les chefs traditionnels ne remplacent pas les tribunaux.'],
    }),
    cours('CG-INSTIT', 8, 'SYMBOLES', 'Reconnaître les symboles de la République', {
      objectif: 'Nous allons relier chaque symbole à son sens pour répondre sans confondre devise, hymne et emblème.',
      regle: 'Un **symbole national** représente la République. L’emblème est le drapeau à trois bandes verticales égales **orange, blanc, vert**. L’hymne est **L’Abidjanaise**, chant national. La devise est **Union – Discipline – Travail**, expression des valeurs affichées par la République. Le français est la langue officielle. La République est une et indivisible, laïque, démocratique et sociale : la laïcité signifie notamment que l’État ne se confond pas avec une religion.',
      exemples: [['Lire une question', '« Quel est l’hymne ? » appelle le nom du chant, L’Abidjanaise. « Quelle est la devise ? » appelle Union – Discipline – Travail.'], ['Situer la République', 'L’indépendance est célébrée le 7 août, en référence à 1960. Le premier Président est Félix Houphouët-Boigny. Yamoussoukro est la capitale politique et administrative depuis 1983 ; cette fonction se distingue du rôle économique d’Abidjan.']],
      piege: 'La disposition des bandes est verticale. Une bonne liste de couleurs dans un mauvais ordre ne décrit pas exactement l’emblème.',
      question: ['Quelle proposition est la devise ivoirienne ?', ['Union – Discipline – Travail', 'L’Abidjanaise', 'Orange – Blanc – Vert'], 0, 'La devise énonce des valeurs. L’Abidjanaise est l’hymne ; orange, blanc et vert sont les couleurs du drapeau.'],
      recap: ['Devise : Union – Discipline – Travail.', 'Hymne : L’Abidjanaise.', 'Drapeau : orange, blanc, vert en bandes verticales.'],
    }),
  ],
  exercices: [
    exercice('CG-INSTIT', 1, 'classer', 1, ['REGLE-SOURCES'], ['Droit et usages', 'Une règle juridique peut être imposée par les autorités selon les procédures légales. Une habitude sociale ou une préférence ne suffit pas à créer une obligation de droit.', 'Repérer la possibilité d’une contrainte juridique.'], {
      consigne: 'Classe ces énoncés selon leur nature.', categories: ['Règle juridique', 'Usage de courtoisie'], cartes: [['Payer le prix d’une vente valable', 0], ['Céder sa place par politesse, sans obligation particulière', 1], ['Respecter une limitation de vitesse applicable', 0]],
      explication: 'Le prix résulte d’une obligation contractuelle et la limitation de vitesse d’une règle de circulation : leur respect peut être imposé légalement. Dans l’énoncé, céder sa place n’est qu’un usage de politesse.',
    }),
    exercice('CG-INSTIT', 2, 'relier', 1, ['REGLE-SOURCES'], ['Identifier une source', 'La nature d’un texte dépend notamment de son auteur et de sa procédure d’adoption. Les décisions judiciaires appliquent et interprètent les règles.', 'Chercher qui agit.'], {
      consigne: 'Relie le terme à sa définition.', paires: [['Constitution', 'Norme organisant les pouvoirs et garantissant des droits'], ['Arrêté ministériel', 'Acte pris par un ministre dans ses compétences'], ['Jurisprudence', 'Ensemble de décisions des juridictions']],
      explication: 'La Constitution organise l’État. Le ministre prend un arrêté dans son champ de compétence. Les juges rendent des décisions dont l’ensemble constitue la jurisprudence : ce n’est pas un arrêté.',
    }),
    exercice('CG-INSTIT', 3, 'qcm', 1, ['CONSTITUTION'], ['Souveraineté', 'La souveraineté appartient au peuple. La Constitution organise les formes de son exercice, notamment le vote de représentants et le référendum.', 'Distinguer titulaire du pouvoir et modalités d’exercice.'], {
      consigne: 'À qui appartient la souveraineté selon la Constitution ivoirienne ?', options: ['Au peuple', 'Au seul Gouvernement', 'Aux seuls magistrats'], bonne: 0,
      explication: 'Le titulaire de la souveraineté est le peuple. Le Gouvernement exerce des compétences constitutionnelles, et les magistrats rendent la justice ; aucun de ces organes ne s’approprie la souveraineté.',
    }),
    exercice('CG-INSTIT', 4, 'qcm', 1, ['EXECUTIF'], ['Mandat et fonctions', 'La Constitution fixe la durée et les conditions du mandat présidentiel. Distingue la durée d’un mandat du nombre de réélections autorisées.', 'Lire séparément durée et renouvellement.'], {
      consigne: 'Quelle est la durée constitutionnelle d’un mandat présidentiel ?', options: ['Cinq ans', 'Sept ans', 'Dix ans'], bonne: 0,
      explication: 'L’article 55 prévoit une élection pour cinq ans. La possibilité d’une réélection ne transforme pas un mandat en mandat de dix ans.',
    }),
    exercice('CG-INSTIT', 5, 'glisser', 1, ['LEGISLATIF'], ['Deux chambres', 'Le bicaméralisme organise le Parlement en deux chambres. Le suffrage direct doit être distingué du vote par des représentants élus.', 'Une chambre n’est pas tout le Parlement.'], {
      consigne: 'Complète la composition du Parlement.', texte: 'Le Parlement comprend l’{{Assemblée nationale}} et le {{Sénat}}.', distracteurs: ['Conseil d’État', 'Gouvernement'],
      explication: 'L’Assemblée nationale et le Sénat sont les deux chambres du pouvoir législatif. Le Conseil d’État rend la justice administrative et le Gouvernement appartient à l’exécutif.',
    }),
    exercice('CG-INSTIT', 6, 'relier', 2, ['JURIDICTIONS'], ['Nature des contrôles', 'Pour identifier une institution, cherche l’objet du contrôle : Constitution, droit judiciaire, administration ou finances publiques.', 'Partir de la mission plutôt que du nom.'], {
      consigne: 'Associe chaque institution à la mission proposée.', paires: [['Conseil constitutionnel', 'Contrôler la constitutionnalité des lois'], ['Cour de cassation', 'Être la juridiction suprême de l’ordre judiciaire'], ['Conseil d’État', 'Être la juridiction suprême de l’ordre administratif'], ['Cour des comptes', 'Exercer le contrôle juridictionnel financier']],
      explication: 'Une loi comparée à la Constitution appelle le contrôle constitutionnel. L’ordre judiciaire a pour sommet la Cour de cassation et l’ordre administratif le Conseil d’État. Les finances publiques relèvent du contrôle de la Cour des comptes.',
    }),
    exercice('CG-INSTIT', 7, 'classer', 2, ['EXECUTIF', 'LEGISLATIF', 'SYMBOLES'], ['Trois missions', 'Exécuter les lois, voter les lois et conseiller les pouvoirs publics sont des fonctions différentes. Un avis n’a pas la même portée qu’une loi.', 'Qualifier l’action exercée.'], {
      consigne: 'Classe les institutions selon la fonction indiquée.', categories: ['Exécutif', 'Législatif', 'Consultatif'], cartes: [['Gouvernement', 0], ['Assemblée nationale', 1], ['Sénat', 1], ['CESEC', 2]],
      explication: 'Le Gouvernement appartient à l’exécutif. Assemblée nationale et Sénat composent le Parlement, qui vote la loi. Le CESEC donne des avis : sa fonction est consultative.',
    }),
    exercice('CG-INSTIT', 8, 'vf', 2, ['EXECUTIF'], ['Lire les compétences', 'La Constitution distingue chef de l’État et chef du Gouvernement. La coordination gouvernementale ne confère pas toutes les compétences du Président.', 'Vérifier le titulaire de chaque attribution.'], {
      source: preselection, consigne: 'Vrai ou faux ? Adaptation des affirmations 44 et 45 de la présélection.', affirmations: [['Le Premier ministre est le titulaire constitutionnel de la présidence du Conseil des ministres.', false], ['Le Premier ministre est le chef de l’Administration.', false]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmations 44–45 adaptées) Les deux réponses sont fausses. La Constitution attribue au Président la présidence du Conseil des ministres (article 71) et la fonction de chef de l’Administration (article 67). Le Premier ministre dirige et coordonne le Gouvernement.',
    }),
    exercice('CG-INSTIT', 9, 'relier', 2, ['SYMBOLES'], ['Symboles', 'Une devise exprime des valeurs, un hymne est un chant et un emblème représente visuellement un État.', 'Identifier la catégorie du symbole.'], {
      consigne: 'Relie chaque catégorie à son symbole.', paires: [['Devise', 'Union – Discipline – Travail'], ['Hymne', 'L’Abidjanaise'], ['Drapeau', 'Orange, blanc, vert en bandes verticales']],
      explication: 'Les trois mots de valeurs forment la devise. Le chant national porte le nom L’Abidjanaise. La description visuelle correspond au drapeau : les bandes sont verticales et égales.',
    }),
    exercice('CG-INSTIT', 10, 'qcm', 2, ['SYMBOLES', 'JURIDICTIONS'], ['Médiation', 'Une médiation vise un règlement amiable. Le contrôle juridictionnel obéit à des procédures distinctes ; les délais légaux doivent être examinés séparément.', 'Médiation et jugement n’ont pas la même fonction.'], {
      consigne: 'Un administré cherche un règlement amiable d’une difficulté avec un service public. Quelle institution correspond à cette mission ?', options: ['Le Médiateur de la République', 'Le Sénat statuant comme tribunal', 'La Cour de cassation comme service de médiation général'], bonne: 0,
      explication: 'La demande porte sur une solution amiable entre administration et administré : elle correspond à la mission du Médiateur. Le Sénat vote la loi ; la Cour de cassation exerce un contrôle juridictionnel du droit.',
    }),
    exercice('CG-INSTIT', 11, 'qcm', 3, ['LEGISLATIF'], ['Suffrage', 'Le suffrage indirect passe par un collège de représentants élus. Il faut distinguer cette élection de la désignation par une autorité.', 'Un même Sénat peut réunir deux modes de recrutement.'], {
      consigne: 'Un candidat écrit : « Tous les sénateurs sont élus directement par les citoyens ». Quelle correction est exacte ?', options: ['Deux tiers sont élus indirectement et un tiers est désigné par le Président', 'Tous sont nommés par le Premier ministre', 'Tous sont des députés de l’Assemblée nationale'], bonne: 0,
      explication: 'Il faut corriger deux erreurs : tous les sénateurs ne sont pas élus et l’élection sénatoriale n’est pas directe. L’article 87 retient deux tiers d’élus au suffrage indirect et un tiers désigné par le Président.',
    }),
    exercice('CG-INSTIT', 12, 'entourer', 3, ['REGLE-SOURCES', 'CONSTITUTION'], ['Vérifier une règle', 'La vérification juridique suppose de reconnaître le texte, ses modifications et son domaine. Une source ancienne peut rester utile sans constituer la version actuelle.', 'Vérifier la version et la portée.'], {
      consigne: 'Sélectionne les démarches utiles pour vérifier une règle constitutionnelle actuelle.', elements: [['Identifier l’article et ses modifications', true], ['Consulter une publication officielle consolidée', true], ['S’arrêter à un résumé privé non daté', false], ['Distinguer règle générale et procédure particulière', true]],
      explication: 'On identifie d’abord la disposition, puis ses modifications dans une publication officielle. On vérifie ensuite sa portée et ses conditions. Un résumé non daté ne permet pas de savoir s’il intègre les révisions de 2020 et 2023.',
    }),
    exercice('CG-INSTIT', 13, 'qcm', 3, ['JURIDICTIONS', 'LEGISLATIF'], ['Attributions institutionnelles', 'Répondre sur une institution demande de nommer sa fonction, son objet et la limite de sa compétence. Conseil, contrôle politique et jugement doivent être distingués.', 'Une mission précise vaut mieux qu’une liste de noms.'], {
      consigne: 'Un candidat attribue au Sénat le jugement des dettes privées, et au Conseil constitutionnel le vote de la loi. Quelle correction rétablit les fonctions ?', options: ['Le Sénat participe au vote de la loi ; le Conseil constitutionnel contrôle sa constitutionnalité ; la dette relève du juge compétent', 'Le Sénat vote la loi et juge les dettes ; le Conseil constitutionnel est seulement consultatif', 'La Cour de cassation vote la loi ; le Conseil constitutionnel tranche toute dette en appel'], bonne: 0,
      explication: 'On qualifie trois opérations. Voter la loi relève du Parlement, dont le Sénat est une chambre. Comparer la loi à la Constitution relève du Conseil constitutionnel selon les procédures prévues. La dette privée est un litige à présenter à la juridiction compétente : elle ne devient pas une affaire parlementaire.',
    }),
    exercice('CG-INSTIT', 14, 'qcm', 3, ['SYMBOLES'], ['Conseiller sans décider', 'Une institution consultative éclaire un choix dans ses domaines de compétence. Il faut ensuite identifier l’autorité qui prend la décision juridique.', 'Avis et décision se distinguent.'], {
      consigne: 'Le CESEC donne un avis sur un projet économique. Quelle conclusion peut-on tirer ?', options: ['Il éclaire les pouvoirs publics sans remplacer le vote de la loi', 'Son avis est automatiquement une loi promulguée', 'Il condamne pénalement les opposants au projet'], bonne: 0,
      explication: 'L’intervention décrite est consultative. L’avis peut guider les pouvoirs publics, mais n’est ni un vote parlementaire, ni une promulgation, ni une condamnation par une juridiction pénale.',
    }),
  ],
};

const organisationJudiciaire = {
  code: 'DROIT-ORGJUD', matiere: 'Organisation judiciaire', titre: 'L’organisation judiciaire ivoirienne',
  resume: 'Comprendre un litige, les garanties du procès, les juridictions, les recours et les métiers de la justice.',
  notions: [
    { code: 'VOC-JUSTICE', libelle: 'Droit, litige, parties et sources' },
    { code: 'PRINCIPES', libelle: 'Indépendance, contradiction et publicité' },
    { code: 'JURID-JUDIC', libelle: 'Premier degré, appel et cassation' },
    { code: 'AUTRES-JURID', libelle: 'Spécialisation, Conseil d’État et CCJA' },
    { code: 'ACTEURS', libelle: 'Siège, parquet, greffe et auxiliaires' },
  ],
  lecons: [
    cours('DROIT-ORGJUD', 1, 'VOC-JUSTICE', 'D’un désaccord à un litige', {
      objectif: 'Nous allons découvrir les mots du procès. Aucun vocabulaire juridique préalable n’est nécessaire.',
      regle: 'Le **droit** organise la vie sociale par des règles obligatoires. Ses textes comprennent la Constitution, les lois et les règlements ; les juges les appliquent et les interprètent. Un **litige** est un désaccord juridique. Une **juridiction** est un organe qui rend la justice. En matière civile, le **demandeur** formule une demande ; le **défendeur** y répond. Ce sont les **parties** au procès. Une **prétention** est ce qu’une partie demande au juge.',
      exemples: [['Une dette discutée', 'Aya demande à Bamba le remboursement d’un prêt. Aya est demanderesse, Bamba défendeur ; sa qualité de défendeur ne prouve pas qu’il doit la somme.'], ['Qualifier la demande', 'La prétention d’Aya est le remboursement. Le contrat et les preuves seront examinés pour décider si cette prétention est fondée.']],
      piege: '« Défendeur » désigne une partie au procès ; « défenseur » peut désigner la personne qui l’assiste. Une personne poursuivie n’est pas automatiquement coupable.',
      question: ['En matière civile, qui formule la demande initiale ?', ['Le demandeur', 'Le greffier en son nom', 'Le défendeur dans tous les cas'], 0, 'Le demandeur saisit la juridiction d’une prétention. Le défendeur répond ; le greffier assure ses missions de procédure sans devenir la partie demanderesse.'],
      recap: ['Juridiction : organe de justice.', 'Parties : demandeur et défendeur au civil.', 'Une demande doit encore être examinée au fond.'],
    }),
    cours('DROIT-ORGJUD', 2, 'PRINCIPES', 'Pourquoi le procès doit-il être équitable ?', {
      objectif: 'Nous allons expliquer trois garanties qui permettent à chacun de défendre sa position.',
      regle: 'Un juge **indépendant** décide selon le droit sans recevoir d’ordre sur l’issue du litige. Un juge **impartial** ne favorise aucune partie. Le **contradictoire** permet à chacun de connaître les demandes et pièces discutées et d’y répondre. La **publicité** ouvre en principe les débats au public ; le **huis clos** les ferme dans les cas prévus par la loi. La **motivation** expose les raisons juridiques et factuelles de la décision.',
      exemples: [['Une pièce nouvelle', 'Si une partie produit une preuve, l’autre doit pouvoir la discuter selon la procédure. Le juge ne doit pas choisir un vainqueur sur un dossier secrètement transmis.'], ['Une audience protégée', 'La loi peut imposer ou permettre le huis clos pour protéger certains intérêts. Cette exception ne supprime pas les droits de la défense.']],
      piege: 'Publicité ne signifie pas que chaque acte d’enquête est public. Égalité devant la justice ne signifie pas absence de toute règle spéciale.',
      question: ['Permettre à chacun de discuter une pièce met en œuvre…', ['le contradictoire', 'la grâce présidentielle', 'la désignation des sénateurs'], 0, 'La contradiction organise l’échange des arguments et preuves. Elle empêche qu’une pièce décisive soit soustraite à toute discussion.'],
      recap: ['Indépendance : pas d’ordre sur le jugement.', 'Impartialité : pas de parti pris.', 'Contradiction et motivation rendent le procès contrôlable.'],
    }),
    cours('DROIT-ORGJUD', 3, 'JURID-JUDIC', 'Trouver le juge du premier degré', {
      objectif: 'Nous allons comprendre où commence une affaire et ce que signifie la compétence.',
      regle: 'La **compétence** est le pouvoir légal d’une juridiction de traiter une affaire. Elle dépend notamment de la **matière** et du **territoire**. Le **premier degré** est le premier examen juridictionnel. Le tribunal de première instance est une juridiction de **droit commun** : il connaît des affaires que les textes ne confient pas spécialement à une autre juridiction. Une juridiction **spécialisée**, comme un tribunal de commerce, reçoit certaines affaires définies par la loi.',
      exemples: [['Commencer au bon niveau', 'Une première demande de remboursement civil ne se porte pas directement en cassation. On recherche la juridiction compétente au premier degré.'], ['Vérifier une spécialité', 'Un litige de travail peut relever d’une formation spécialisée. Le mot « tribunal » ne suffit donc pas : il faut examiner la matière et les règles applicables.']],
      piege: '« Droit commun » ne veut pas dire « toutes les affaires sans exception ». Les compétences spéciales restent à respecter.',
      question: ['Avant de saisir une juridiction, il faut vérifier…', ['sa compétence matérielle et territoriale', 'uniquement la proximité de son bâtiment', 'le nom de l’avocat adverse seulement'], 0, 'La nature de l’affaire indique la matière et les règles de territoire déterminent le ressort. Un tribunal proche peut être incompétent pour la demande.'],
      recap: ['Premier degré : premier examen.', 'Droit commun sous réserve des compétences spéciales.', 'Vérifier matière puis territoire.'],
    }),
    cours('DROIT-ORGJUD', 4, 'JURID-JUDIC', 'Distinguer appel et cassation', {
      objectif: 'Nous allons distinguer deux contrôles d’une décision pour choisir le bon recours.',
      regle: 'Un **recours** permet de contester une décision dans les conditions prévues. L’**appel**, lorsqu’il est ouvert, permet un réexamen en fait et en droit dans ses limites. La **cassation** contrôle la conformité juridique d’une décision rendue en dernier ressort : elle ne constitue pas un troisième degré de jugement des faits. Une décision en **dernier ressort** n’est pas susceptible d’appel ; elle n’est pas nécessairement à l’abri d’un pourvoi.',
      exemples: [['Discuter les faits', 'Une partie estime que le premier juge a mal apprécié les preuves. Si l’appel est ouvert et formé à temps, la cour d’appel peut réexaminer cette appréciation.'], ['Discuter le droit', 'Après l’appel, une partie reproche à l’arrêt une mauvaise application de la loi. Elle examine les conditions du pourvoi en cassation.']],
      piege: 'Un recours n’est pas toujours ouvert et un pourvoi n’est pas un nouvel appel. La CCJA présente une particularité étudiée en L8.',
      question: ['La cassation nationale est principalement un contrôle…', ['du droit appliqué à la décision', 'de tous les faits comme un troisième procès', 'de l’opportunité politique de la loi'], 0, 'Le pourvoi critique la régularité juridique de la décision. Il ne permet pas de recommencer librement l’examen des faits comme en appel.'],
      recap: ['Appel : réexamen en fait et en droit.', 'Cassation : contrôle juridique.', 'Toujours vérifier ouverture et délai du recours.'],
    }),
    cours('DROIT-ORGJUD', 5, 'ACTEURS', 'Siège et parquet : deux rôles distincts', {
      objectif: 'Nous allons identifier les magistrats qui décident et ceux qui requièrent, distinction fréquente à l’INFJ.',
      regle: 'Un **magistrat** exerce une fonction judiciaire définie par les textes. Les magistrats du **siège** rendent des décisions : juges, présidents ou conseillers. Le juge d’instruction appartient au siège, même s’il ne prononce pas la culpabilité au procès. Les magistrats du **parquet**, ou **ministère public**, exercent notamment l’action publique et prennent des **réquisitions**, demandes adressées à la juridiction. Procureur, substitut et avocat général appartiennent au parquet.',
      exemples: [['À l’audience pénale', 'Le procureur requiert une peine ; le tribunal décide. La réquisition n’est donc pas elle-même une condamnation.'], ['Un titre trompeur', 'L’avocat général est un magistrat du parquet. Il n’est pas l’avocat personnel du prévenu.']],
      piege: 'La hiérarchie du parquet ne permet pas de donner au juge du siège un ordre sur le sens de son jugement.',
      question: ['Le juge d’instruction est un magistrat…', ['du siège', 'du parquet', 'qui exerce comme notaire'], 0, 'Il prend des décisions juridictionnelles pendant l’instruction. Sa fonction le rattache au siège, alors que le procureur exerce les poursuites.'],
      recap: ['Siège : décisions juridictionnelles.', 'Parquet : action publique et réquisitions.', 'Avocat général : magistrat du parquet.'],
    }),
    cours('DROIT-ORGJUD', 6, 'ACTEURS', 'Le greffe garantit la trace du procès', {
      objectif: 'Nous allons distinguer le travail du greffier de celui du juge et des auxiliaires.',
      regle: 'Le **greffier** assiste la juridiction, tient les actes et procès-verbaux, conserve les **minutes**, originaux des décisions, et délivre les copies selon les textes. Il contribue à l’authenticité de la procédure sans trancher le litige. L’**avocat** conseille et défend une partie. Le **commissaire de justice** signifie les actes et participe à l’exécution des décisions ; cette profession réunit les fonctions issues notamment des huissiers de justice. Le **notaire** reçoit des actes authentiques.',
      exemples: [['Après le jugement', 'Une partie demande une copie au greffe. Le greffier la délivre selon les règles ; il ne réécrit pas la solution parce que la partie la conteste.'], ['Porter un acte à connaissance', 'La signification est une notification effectuée par le professionnel habilité. Elle peut faire courir un délai de recours selon les règles applicables.']],
      piege: 'Le greffier n’est ni le juge ni l’avocat d’une partie. Une copie et la minute ne sont pas le même support.',
      question: ['La minute d’une décision est…', ['son original conservé au greffe', 'sa durée de lecture', 'l’argument d’un avocat'], 0, 'Dans ce vocabulaire, « minute » signifie l’original. Les copies sont délivrées à partir de cet acte selon les conditions légales.'],
      recap: ['Greffe : assistance, authenticité et conservation.', 'Avocat : conseil et défense.', 'Commissaire de justice : signification et exécution.'],
    }),
    cours('DROIT-ORGJUD', 7, 'AUTRES-JURID', 'Plusieurs contentieux, plusieurs juges', {
      objectif: 'Nous allons reconnaître les grandes familles de litiges sans dresser une carte locale non vérifiée des tribunaux.',
      regle: 'Le **contentieux** désigne les litiges d’un domaine. L’ordre judiciaire traite notamment les affaires civiles et pénales. Le Conseil d’État est la juridiction suprême de l’ordre administratif et exerce les attributions définies par sa loi organique. La Cour des comptes exerce le contrôle juridictionnel financier. Le Conseil constitutionnel contrôle les lois et certaines opérations électorales. La compétence exacte dépend du texte, de l’objet de la demande et, parfois, de dispositions transitoires.',
      exemples: [['Une décision administrative', 'Pour contester un acte administratif, on vérifie la voie de recours et le juge désigné par les textes. On ne saisit pas automatiquement le tribunal civil le plus proche.'], ['Une question électorale', 'Le contrôle de l’élection présidentielle relève du Conseil constitutionnel. Ce contrôle ne se confond pas avec la cassation d’un arrêt civil.']],
      piege: 'L’existence d’une juridiction dans les textes ne prouve pas son installation effective. Ne pas inventer un tribunal administratif local ouvert.',
      question: ['Quelle institution est au sommet de l’ordre administratif ?', ['Le Conseil d’État', 'Le tribunal de commerce', 'Le Médiateur'], 0, 'La Constitution et la loi organique du Conseil d’État lui confient cette place. Le Médiateur exerce une mission de règlement amiable, pas cette fonction juridictionnelle.'],
      recap: ['Qualifier la nature du contentieux.', 'Vérifier le texte de compétence.', 'Distinguer institution prévue et implantation effective.'],
    }),
    cours('DROIT-ORGJUD', 8, 'AUTRES-JURID', 'La CCJA et le droit OHADA', {
      objectif: 'Nous allons repérer la particularité d’un litige relevant du droit OHADA, sans apprendre encore le droit commercial.',
      regle: 'L’**OHADA**, Organisation pour l’harmonisation en Afrique du droit des affaires, adopte des **Actes uniformes**, règles communes aux États parties dans les domaines concernés. Sa **Cour commune de justice et d’arbitrage (CCJA)** siège à Abidjan. Les juridictions nationales jugent les litiges en première instance et en appel ; la CCJA assure la cassation dans son domaine OHADA, sauf les décisions appliquant des sanctions pénales. En cas de cassation, elle évoque l’affaire et statue au fond : elle tranche alors le litige, selon l’article 14 du Traité.',
      exemples: [['Un litige de société', 'Une affaire portant sur l’application d’un Acte uniforme commence devant le juge national compétent. La CCJA n’est pas un guichet de première instance pour tout contrat.'], ['Une particularité', 'La cassation avec évocation par la CCJA explique pourquoi on ne lui applique pas sans nuance la formule « jamais les faits ».']],
      piege: 'Le siège à Abidjan ne fait pas de la CCJA une juridiction uniquement ivoirienne. Tout litige commercial ne relève pas automatiquement d’un Acte uniforme.',
      question: ['La CCJA intervient notamment…', ['en cassation dans le domaine OHADA prévu par le Traité', 'comme tribunal initial de tout achat privé', 'pour élire les sénateurs'], 0, 'Les juges nationaux statuent aux premiers stades. Le Traité attribue ensuite à la CCJA un contrôle de cassation spécifique pour l’application des normes OHADA concernées.'],
      recap: ['OHADA : règles communes du droit des affaires.', 'Juges nationaux en première instance et en appel.', 'CCJA : en cas de cassation, évocation et jugement au fond.'],
    }),
  ],
  exercices: [
    exercice('DROIT-ORGJUD', 1, 'relier', 1, ['VOC-JUSTICE'], ['Vocabulaire du procès', 'Une demande en justice oppose des parties. La qualité procédurale ne préjuge pas de la solution au fond.', 'Identifier qui demande et qui répond.'], {
      consigne: 'Relie chaque mot à sa définition.', paires: [['Demandeur au civil', 'Celui qui formule la demande initiale'], ['Défendeur au civil', 'Celui contre qui la demande est dirigée'], ['Prétention', 'Ce qu’une partie demande au juge']],
      explication: 'Le demandeur prend l’initiative de la demande ; le défendeur y répond. Le résultat recherché, par exemple un remboursement, est une prétention. Ces mots ne prouvent pas que la demande est fondée.',
    }),
    exercice('DROIT-ORGJUD', 2, 'qcm', 1, ['PRINCIPES'], ['Contradictoire', 'Chaque partie doit pouvoir connaître et discuter les éléments débattus. Cette garantie se distingue de la publicité de l’audience.', 'L’échange concerne les parties.'], {
      consigne: 'Une partie doit pouvoir répondre à une pièce produite contre elle. Quel principe est en jeu ?', options: ['Le contradictoire', 'La grâce', 'Le bicaméralisme'], bonne: 0,
      explication: 'La pièce influence la discussion du litige. Donner à la partie adverse la possibilité de la discuter respecte le contradictoire ; ouvrir la salle au public répond à une autre garantie.',
    }),
    exercice('DROIT-ORGJUD', 3, 'qcm', 1, ['JURID-JUDIC'], ['Droit commun', 'Une juridiction de droit commun conserve la compétence pour les affaires non attribuées spécialement par les textes. La matière et le ressort restent à vérifier.', 'Droit commun admet des compétences spéciales.'], {
      consigne: 'Au premier degré, quelle juridiction est de droit commun ?', options: ['Le tribunal de première instance', 'La Cour de cassation', 'La CCJA'], bonne: 0,
      explication: 'Le tribunal de première instance intervient au premier degré sous réserve des compétences spéciales. La Cour de cassation et la CCJA exercent des fonctions de contrôle qui ne constituent pas ce premier examen.',
    }),
    exercice('DROIT-ORGJUD', 4, 'classer', 1, ['ACTEURS'], ['Siège et parquet', 'Les fonctions juridictionnelles du siège se distinguent des poursuites et réquisitions du ministère public. Certains titres comportant le mot avocat désignent pourtant un magistrat.', 'Se fonder sur la fonction.'], {
      consigne: 'Classe ces magistrats.', categories: ['Siège', 'Parquet'], cartes: [['Juge d’instruction', 0], ['Procureur de la République', 1], ['Président du tribunal', 0], ['Avocat général', 1]],
      explication: 'Le juge d’instruction et le président du tribunal prennent des décisions juridictionnelles : siège. Le procureur et l’avocat général appartiennent au ministère public : parquet.',
    }),
    exercice('DROIT-ORGJUD', 5, 'glisser', 1, ['ACTEURS'], ['Les actes du greffe', 'Le greffe conserve les originaux et délivre les copies selon les textes. Cette mission assure la trace et l’authenticité de la procédure.', 'Conserver une décision ne signifie pas la juger.'], {
      consigne: 'Complète avec les termes du procès.', texte: 'Le {{greffier}} conserve la {{minute}}, original de la décision.', distracteurs: ['défendeur', 'réquisition'],
      explication: 'Le greffier assure la conservation au greffe. La minute est l’original de la décision ; une réquisition est une demande du ministère public et non cet original.',
    }),
    exercice('DROIT-ORGJUD', 6, 'ordre', 2, ['JURID-JUDIC'], ['Parcours d’un recours', 'Pour une affaire où l’appel puis le pourvoi national sont ouverts, le premier jugement précède le réexamen en appel et le contrôle de cassation.', 'Vérifier à chaque étape les conditions du recours.'], {
      consigne: 'Ordonne ce parcours civil national, en supposant tous ces recours ouverts et exercés à temps.', mode: 'exact', elements: ['Jugement du tribunal de première instance', 'Arrêt de la cour d’appel', 'Contrôle par la Cour de cassation'],
      explication: 'Le TPI statue d’abord. La cour d’appel réexamine ensuite l’affaire dans les limites de l’appel. La Cour de cassation contrôle enfin la régularité juridique de l’arrêt : ce n’est pas un troisième examen libre des faits.',
    }),
    exercice('DROIT-ORGJUD', 7, 'relier', 2, ['ACTEURS'], ['Métiers distincts', 'Les auxiliaires accomplissent des missions précises autour du procès ou de la sécurité des actes. Le juge conserve le pouvoir de trancher le litige.', 'Associer chaque acte à son professionnel.'], {
      consigne: 'Relie le professionnel à la mission proposée.', paires: [['Avocat', 'Défendre les intérêts d’une partie'], ['Commissaire de justice', 'Signifier un acte selon les textes'], ['Notaire', 'Recevoir un acte authentique'], ['Greffier', 'Conserver les minutes de la juridiction']],
      explication: 'L’avocat assure la défense. La signification relève du commissaire de justice habilité. Le notaire reçoit des actes authentiques ; le greffier tient et conserve les actes de la juridiction. Aucun de ces intitulés ne transfère à lui seul le pouvoir de juger.',
    }),
    exercice('DROIT-ORGJUD', 8, 'vf', 2, ['PRINCIPES'], ['Publicité et garanties', 'Les débats sont en principe publics avec les exceptions légales. La publicité ne supprime ni les droits de la défense ni l’exigence d’impartialité.', 'Les garanties se complètent.'], {
      consigne: 'Vrai ou faux ?', affirmations: [['Une audience à huis clos est nécessairement illégale.', false], ['Le juge doit rester impartial même lorsque l’audience est publique.', true]],
      explication: 'La première affirmation ignore les cas de huis clos prévus par la loi : elle est fausse. La seconde est vraie, car l’ouverture au public ne dispense jamais le juge de l’impartialité.',
    }),
    exercice('DROIT-ORGJUD', 9, 'relier', 2, ['AUTRES-JURID'], ['Objet du contentieux', 'La nature du contrôle détermine l’institution concernée. Un litige commercial, un recours administratif et une question constitutionnelle ne suivent pas tous le même parcours.', 'Qualifier avant d’orienter.'], {
      consigne: 'Relie chaque institution au domaine proposé.', paires: [['Conseil d’État', 'Ordre administratif'], ['Conseil constitutionnel', 'Contrôle de constitutionnalité'], ['Cour des comptes', 'Contrôle juridictionnel financier'], ['CCJA', 'Cassation dans le domaine OHADA']],
      explication: 'Le Conseil d’État concerne l’ordre administratif, le Conseil constitutionnel la conformité à la Constitution. La Cour des comptes intervient sur les finances publiques et la CCJA sur les normes OHADA dans les conditions du Traité.',
    }),
    exercice('DROIT-ORGJUD', 10, 'qcm', 2, ['AUTRES-JURID'], ['Spécialisation', 'Une compétence spéciale est définie par un texte. On vérifie ensuite le ressort territorial et le degré de juridiction.', 'Matière, territoire, degré.'], {
      consigne: 'Deux sociétés d’Abidjan ont un litige commercial relevant du ressort du tribunal de commerce d’Abidjan. Où présenter la demande initiale ?', options: ['Au tribunal de commerce d’Abidjan', 'Directement à la CCJA', 'Au Conseil constitutionnel'], bonne: 0,
      explication: 'L’énoncé précise la matière commerciale et le ressort. La juridiction spécialisée du premier degré est donc le tribunal de commerce. La CCJA ne remplace pas ce premier examen ; le Conseil constitutionnel n’est pas juge de la dette commerciale.',
    }),
    exercice('DROIT-ORGJUD', 11, 'vf', 3, ['JURID-JUDIC'], ['Compétence résiduelle', 'Le droit commun conserve les affaires qui ne sont pas attribuées spécialement. Être saisi ne crée pas à lui seul une compétence.', 'Distinguer saisine et compétence.'], {
      source: preselection, consigne: 'Vrai ou faux ? Affirmation 43 adaptée.', affirmations: [['Une juridiction de droit commun est compétente pour toute affaire dont elle est saisie, même attribuée exclusivement à une autre juridiction.', false]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmation 43 adaptée) Faux. « Droit commun » signifie compétence résiduelle, sous réserve des compétences spéciales. Le dépôt d’une demande ne neutralise pas ces limites légales.',
    }),
    exercice('DROIT-ORGJUD', 12, 'qcm', 3, ['JURID-JUDIC'], ['Grief de droit', 'Le pourvoi national vise une irrégularité juridique d’une décision en dernier ressort. L’appel permet un réexamen plus large lorsqu’il est ouvert.', 'Identifier décision attaquée et critique.'], {
      consigne: 'Un arrêt civil national en dernier ressort est critiqué pour mauvaise interprétation de la loi, hors domaine OHADA. Quel recours examiner ?', options: ['Le pourvoi devant la Cour de cassation', 'Un troisième appel automatique', 'Une demande au greffier de modifier le fond'], bonne: 0,
      explication: 'La décision est en dernier ressort et la critique porte sur le droit. Ces deux éléments orientent vers le pourvoi, sous réserve de ses conditions et délais. Le greffier ne peut remplacer la solution de l’arrêt par une autre.',
    }),
    exercice('DROIT-ORGJUD', 13, 'qcm', 3, ['AUTRES-JURID'], ['Particularité de la CCJA', 'Le Traité OHADA organise un contrôle de cassation supranational dans certains litiges. L’évocation permet à cette Cour de statuer au fond après cassation.', 'Ne pas généraliser les règles nationales sans vérifier le Traité.'], {
      consigne: 'Un litige relatif à un Acte uniforme est jugé en appel. La CCJA, compétente en cassation, casse l’arrêt. Quelle suite prévoit l’article 14 du Traité ?', options: ['Elle évoque et statue au fond', 'Elle renvoie toujours devant une cour nationale sans pouvoir trancher le fond', 'Elle devient automatiquement juge des sanctions pénales liées à toute affaire commerciale'], bonne: 0,
      explication: 'On vérifie d’abord que le litige entre dans le champ de la CCJA. Le Traité prévoit ensuite qu’en cas de cassation, cette Cour évoque et statue sur le fond. Cette particularité interdit de lui appliquer sans nuance la présentation de la cassation nationale. L’exclusion des décisions appliquant des sanctions pénales demeure.',
    }),
    exercice('DROIT-ORGJUD', 14, 'qcm', 3, ['ACTEURS', 'PRINCIPES'], ['Requérir et juger', 'Le ministère public présente des demandes ; la juridiction statue selon le droit. L’authentification et la conservation de la décision appartiennent au travail du greffe.', 'La réquisition n’est pas la décision.'], {
      consigne: 'Le procureur requiert une peine. Le tribunal retient une autre solution légalement motivée. Quelle analyse est correcte ?', options: ['Le tribunal exerce son pouvoir de décision distinct des réquisitions', 'Le procureur a déjà condamné donc le tribunal ne peut décider', 'Le greffier doit choisir entre les deux solutions'], bonne: 0,
      explication: 'On distingue la demande du parquet et la décision du siège. La juridiction décide dans le cadre du droit applicable, sans être liée par le seul résultat demandé par le procureur. Le greffier ne tranche pas ce désaccord.',
    }),
  ],
};

const droitPenal = {
  code: 'DROIT-PENAL', matiere: 'Droit pénal', titre: 'Droit pénal général : l’infraction',
  resume: 'Du texte pénal à la responsabilité : éléments, tentative, participation, justification et effets sur la peine.',
  notions: [
    { code: 'LEGALITE', libelle: 'Droit pénal, légalité et loi dans le temps' },
    { code: 'CLASSIF', libelle: 'Crimes, délits, contraventions et peines' },
    { code: 'ELEMENTS', libelle: 'Éléments matériel et moral' },
    { code: 'TENTATIVE', libelle: 'Préparation et tentative' },
    { code: 'PARTICIPATION', libelle: 'Auteur, coauteur et complice en droit ivoirien' },
    { code: 'JUSTIF', libelle: 'Justification et responsabilité personnelle' },
    { code: 'PEINES', libelle: 'Peine, grâce et amnistie' },
  ],
  lecons: [
    cours('DROIT-PENAL', 1, 'LEGALITE', 'Pourquoi faut-il un texte pour punir ?', {
      objectif: 'Nous allons partir de zéro : comprendre ce qu’est une infraction et comment la distinguer d’un simple comportement désapprouvé.',
      regle: 'Le **droit** organise la vie sociale par des règles. Le **droit pénal** définit les **infractions**, comportements interdits, et les **peines**, sanctions qui leur sont attachées. Le Code pénal ivoirien est issu de la loi du **26 juin 2019**, modifiée depuis. Le principe de **légalité** interdit de punir un fait sans texte applicable qui le définit et le sanctionne. L’interprétation stricte interdit d’étendre une incrimination par simple ressemblance avec un autre comportement.',
      exemples: [['Désaccord moral', 'Une conduite impolie n’est pas automatiquement une infraction. Il faut identifier un texte pénal applicable avant de parler de condamnation.'], ['Une ressemblance insuffisante', 'Le juge ne peut inventer une infraction pour un comportement voisin de celui visé par la loi. Il examine les termes et les conditions du texte.']],
      piege: 'Un dommage peut entraîner réparation civile sans justifier une peine pénale. Les deux responsabilités ne se confondent pas.',
      question: ['Avant de punir un comportement, il faut d’abord…', ['identifier un texte pénal applicable', 'mesurer sa popularité', 'demander l’avis de la partie adverse seulement'], 0, 'La légalité exige une définition et une sanction prévues par un texte applicable. L’opinion sur le comportement ne remplace pas ce fondement.'],
      recap: ['Infraction : comportement défini et sanctionné.', 'Pas de peine inventée par le juge.', 'Code de 2019 à lire avec ses modifications.'],
    }),
    cours('DROIT-PENAL', 2, 'LEGALITE', 'Quelle loi appliquer si le texte change ?', {
      objectif: 'Nous allons construire une petite chronologie pour choisir entre loi ancienne et loi nouvelle.',
      regle: 'Une loi entre en vigueur à une date déterminée. La **rétroactivité** consiste à appliquer une règle à des faits antérieurs. Pour les règles pénales de fond étudiées ici, la loi plus sévère ne rétroagit pas ; la disposition plus douce s’applique aux faits non définitivement condamnés lors de son entrée en vigueur. Une condamnation **définitive** n’est plus susceptible des recours visés par la loi. Les règles de procédure ont un régime distinct.',
      exemples: [['Peine augmentée', 'Des faits sont commis avant une loi qui augmente la peine. On n’applique pas cette aggravation aux faits antérieurs.'], ['Peine diminuée', 'Une loi abaisse la peine alors que la condamnation n’est pas définitive. On vérifie son caractère plus doux pour appliquer la disposition nouvelle.']],
      piege: 'Comparer seulement les dates ne suffit pas : il faut aussi comparer la sévérité et vérifier le caractère définitif de la condamnation. La suppression de l’infraction a des effets spécifiques.',
      question: ['Une loi de fond plus sévère doit-elle aggraver la peine de faits commis avant son entrée en vigueur ?', ['Non, en application de la non-rétroactivité', 'Oui, toujours', 'Oui, si le juge préfère la loi nouvelle'], 0, 'On place d’abord les faits avant la loi nouvelle. Comme celle-ci aggrave la répression, elle ne s’applique pas rétroactivement à ces faits.'],
      recap: ['Date des faits, entrée en vigueur, décision définitive.', 'Loi de fond plus sévère : pas de rétroactivité.', 'Loi plus douce : bénéfice avant condamnation définitive.'],
    }),
    cours('DROIT-PENAL', 3, 'CLASSIF', 'Crime, délit ou contravention ?', {
      objectif: 'Nous allons classer juridiquement les infractions pour comprendre les règles qui varient selon leur catégorie.',
      regle: 'Les infractions se répartissent en **crimes**, **délits** et **contraventions**, d’après la classification légale et les peines prévues. Le crime relève de la catégorie criminelle, le délit de la catégorie correctionnelle, la contravention de sa catégorie propre. La **peine encourue** est celle prévue par le texte ; la **peine prononcée** est celle retenue pour la personne condamnée. Une peine réduite ne change pas automatiquement la qualification de l’infraction.',
      exemples: [['Le langage courant', 'Dire « c’est un crime » pour exprimer l’indignation ne classe pas juridiquement le comportement. Il faut lire la qualification et la peine du texte.'], ['Encourue et prononcée', 'Un texte peut prévoir un maximum que le juge n’atteint pas. Le montant effectivement retenu ne remplace pas la catégorie légale de l’infraction.']],
      piege: 'Ne pas importer sans vérification les seuils d’un code étranger. On ne classe pas à partir du seul dommage ni de la seule peine finalement prononcée.',
      question: ['Pour classer une infraction, on examine d’abord…', ['le texte applicable et la catégorie de peine prévue', 'uniquement l’émotion de la victime', 'uniquement la peine réduite prononcée'], 0, 'La qualification est légale. Les circonstances et la peine individualisée ne permettent pas, à elles seules, de remplacer cette classification.'],
      recap: ['Trois catégories légales d’infractions.', 'Encourue : prévue ; prononcée : retenue.', 'Éviter les seuils étrangers non vérifiés.'],
    }),
    cours('DROIT-PENAL', 4, 'ELEMENTS', 'Que s’est-il matériellement passé ?', {
      objectif: 'Nous allons isoler les faits avant de chercher l’intention de leur auteur.',
      regle: 'Pour une infraction, on vérifie un fondement **légal**, un élément **matériel** et un élément **moral**. L’élément matériel est le comportement extérieur décrit par le texte : un acte ou, si le texte le prévoit, une abstention. Certains textes exigent aussi un résultat et un **lien de causalité**, rapport entre le comportement et ce résultat. Une pensée seule ne réalise pas un acte matériel.',
      exemples: [['Distinguer pensée et acte', 'Imaginer prendre un bien ne constitue pas le fait de le soustraire. Il faut rechercher les actes accomplis et le texte qui les vise.'], ['Relier un dommage aux faits', 'Pour une blessure involontaire, on recherche le comportement reproché et son lien avec la blessure. La seule existence de la blessure ne décrit pas ce comportement.']],
      piege: 'L’absence d’action ne suffit pas à exclure toute infraction : certains textes répriment précisément une abstention.',
      question: ['Le lien de causalité permet de relier…', ['un comportement au résultat exigé', 'deux numéros d’articles sans les lire', 'la peine au nom du juge'], 0, 'Lorsque le texte exige un résultat, il faut établir qu’il résulte du comportement imputé. Cette relation s’appelle le lien de causalité.'],
      recap: ['Décrire les actes ou omissions visés par le texte.', 'Vérifier le résultat si le texte l’exige.', 'Établir le lien causal nécessaire.'],
    }),
    cours('DROIT-PENAL', 5, 'ELEMENTS', 'Intention et faute ne se confondent pas', {
      objectif: 'Nous allons examiner l’état d’esprit ou la faute requis par le texte, sans les déduire automatiquement du dommage.',
      regle: 'L’élément **moral** est l’intention ou la faute exigée. L’**intention** suppose la conscience et la volonté du comportement incriminé selon le texte. Une infraction **non intentionnelle** peut reposer sur une imprudence ou une négligence lorsque la loi le prévoit. Le **mobile** est la raison personnelle d’agir ; il se distingue de l’intention, même s’il peut parfois être pris en compte par un texte.',
      exemples: [['Erreur sur le bien', 'Une personne prend de bonne foi un sac identique au sien. Le déplacement du sac est matériel, mais l’intention de prendre le bien d’autrui doit être examinée séparément.'], ['Imprudence', 'Un dommage non voulu peut provenir d’une imprudence pénalement définie. « Je ne voulais pas blesser » ne dispense pas de vérifier le texte applicable.']],
      piege: 'Un mobile jugé généreux ne supprime pas automatiquement l’intention. À l’inverse, tout dommage accidentel n’est pas automatiquement pénal.',
      question: ['La raison personnelle qui pousse à agir s’appelle…', ['le mobile', 'la minute', 'le ressort territorial'], 0, 'Le mobile répond à « pourquoi cette personne a-t-elle agi ? ». L’intention répond à la conscience et à la volonté exigées pour le comportement incriminé.'],
      recap: ['Intention : conscience et volonté selon le texte.', 'Imprudence : seulement si elle est pénalement prévue.', 'Mobile et intention sont distincts.'],
    }),
    cours('DROIT-PENAL', 6, 'TENTATIVE', 'Préparer ou tenter une infraction ?', {
      objectif: 'Nous allons repérer le passage de la préparation à la tentative punissable.',
      regle: 'Selon l’article 27 du Code de 2019, les actes simplement préparatoires ne sont pas punissables à ce titre, sauf infraction autonome. L’article 28 vise la tentative de crime manifestée par un acte montrant sans équivoque l’intention irrévocable de commettre l’infraction, interrompue ou échouée pour une cause indépendante de l’auteur. La tentative de délit n’est punissable que si un texte le prévoit. Les tentatives de contravention ne sont pas punissables.',
      exemples: [['Préparer', 'Acheter un objet ordinaire en pensant l’utiliser plus tard ne réalise pas nécessairement une tentative. Il faut caractériser davantage que le projet.'], ['Interruption extérieure', 'Si un acte d’exécution non équivoque est interrompu par l’intervention d’un tiers, on vérifie la catégorie d’infraction et le texte qui rend sa tentative punissable.']],
      piege: 'Le désistement volontaire doit intervenir avant la consommation. Regretter après l’infraction ne l’efface pas. Un acte préparatoire peut constituer une autre infraction autonome.',
      question: ['Pour un délit, la tentative est punissable…', ['si un texte le prévoit et si ses conditions sont réunies', 'dans tous les cas sans texte', 'jamais'], 0, 'La catégorie délit impose de rechercher une disposition qui réprime la tentative. On vérifie ensuite les actes et les circonstances de l’échec.'],
      recap: ['Préparation seule : pas de tentative par principe.', 'Vérifier acte non équivoque et cause extérieure.', 'Délit : texte spécial ; contravention : pas de tentative punissable.'],
    }),
    cours('DROIT-PENAL', 7, 'PARTICIPATION', 'Auteur ou complice en droit ivoirien ?', {
      objectif: 'Nous allons qualifier la participation de chacun à partir du Code ivoirien, sans reprendre mécaniquement une définition étrangère.',
      regle: 'L’**auteur** commet matériellement l’infraction ou relève d’une autre hypothèse de l’article 29. Ce texte inclut notamment certaines incitations non équivoques par instructions ou moyens énumérés, même si l’infraction n’a pas été tentée ni commise. Le **coauteur** participe à la commission avec un autre auteur. Le **complice**, selon l’article 30, fournit sciemment des moyens ou une aide sans participation directe à la réalisation du crime ou délit. Il faut établir la connaissance et le rôle précis.',
      exemples: [['Fournir un moyen', 'Fournir sciemment l’instrument d’un délit commis peut relever de la complicité, si les conditions du texte sont réunies. Un prêt innocent n’a pas le même sens.'], ['Donner des instructions', 'On ne classe pas automatiquement l’instigateur parmi les complices : l’article 29 peut le qualifier d’auteur. Il faut lire les actes et conditions prévus.']],
      piege: 'La simple présence ou l’amitié avec l’auteur ne suffisent pas à établir une complicité. « Instructions = complicité » serait une simplification erronée ici.',
      question: ['Fournir un moyen sans connaître le projet délictueux suffit-il à établir la complicité étudiée ?', ['Non, il faut notamment la connaissance du projet', 'Oui, toute aide matérielle suffit', 'Oui, si les personnes sont amies'], 0, 'L’article 30 exige une participation en connaissance de cause. On ne déduit pas cette connaissance du seul prêt d’un objet ou d’une relation personnelle.'],
      recap: ['Décrire le rôle et la connaissance de chacun.', 'Certaines instigations relèvent de l’auteur : article 29.', 'Complicité : aide consciente dans les conditions de l’article 30.'],
    }),
    cours('DROIT-PENAL', 8, 'JUSTIF', 'Quand une défense est-elle légitime ?', {
      objectif: 'Nous allons examiner une justification à l’aide de conditions cumulatives, plutôt que du seul mot « agression ».',
      regle: 'Un **fait justificatif** retire au fait son caractère d’infraction dans les conditions légales. La **légitime défense** répond à une attaque injuste par une défense actuellement nécessaire. L’article 97 exige notamment une attaque qui ne puisse être écartée autrement, une défense concomitante et proportionnée aux circonstances. **Concomitante** signifie au moment de l’attaque ; **proportionnée**, adaptée au danger et au bien protégé.',
      exemples: [['Écarter une attaque', 'Se dégager d’une attaque en cours peut être nécessaire. Il faut vérifier les moyens disponibles et la proportion de la riposte, pas seulement affirmer qu’il y avait un conflit.'], ['Après le danger', 'Revenir frapper quelqu’un après la fin de l’attaque relève d’une vengeance : la condition d’actualité et de concomitance manque.']],
      piege: 'Un vol ou une dispute ne justifie pas toute violence en retour. Chaque condition doit être reliée à des faits précis.',
      question: ['Une riposte longtemps après la fin de l’attaque satisfait-elle la concomitance ?', ['Non', 'Oui, toujours', 'Oui, si la colère dure'], 0, 'La concomitance demande une défense face à l’attaque actuelle. Une réaction différée de vengeance ne répond plus à cette condition.'],
      recap: ['Attaque injuste et défense nécessaire.', 'Défense concomitante et proportionnée.', 'Relier chaque condition aux faits.'],
    }),
    cours('DROIT-PENAL', 9, 'JUSTIF', 'La responsabilité pénale s’examine pour chacun', {
      objectif: 'Nous allons séparer justification, responsabilité et minorité pour éviter les conclusions automatiques.',
      regle: 'La **responsabilité pénale** est l’obligation de répondre pénalement d’un comportement imputable. Elle s’examine personnellement : le seul lien familial avec un auteur ne rend pas coupable. La **minorité** dépend de l’âge ; elle ne se confond pas avec l’absence d’antécédent. Le discernement, aptitude à comprendre et vouloir, et les règles spéciales de responsabilité doivent être vérifiés. Une **personne morale**, organisation reconnue par le droit, peut aussi engager sa responsabilité dans les conditions du Code.',
      exemples: [['Un parent et un acte', 'Le parent d’un auteur n’est pas condamné au seul motif de sa parenté. Il faudrait caractériser son propre comportement punissable ou sa participation.'], ['Deux questions différentes', 'Un jeune peut avoir déjà commis des faits ; un adulte peut n’avoir aucun antécédent. Être mineur et être délinquant primaire répondent à deux critères différents.']],
      piege: 'Ne pas transformer un trouble mental quelconque en irresponsabilité automatique, ni importer des seuils d’âge d’un autre pays.',
      question: ['« Mineur » et « sans antécédent » désignent-ils le même critère ?', ['Non : âge et antécédents sont distincts', 'Oui, toujours', 'Oui, après un premier jugement'], 0, 'La minorité se détermine par l’âge pertinent. Les antécédents dépendent de l’histoire pénale ; les deux informations ne se déduisent pas l’une de l’autre.'],
      recap: ['Responsabilité examinée pour chaque personne.', 'Minorité et antécédents sont distincts.', 'Vérifier les conditions particulières du Code.'],
    }),
    cours('DROIT-PENAL', 10, 'PEINES', 'Grâce et amnistie : quels effets ?', {
      objectif: 'Nous allons distinguer deux mécanismes après avoir compris infraction et peine. Cette comparaison apparaît dans les sujets INFJ.',
      regle: 'Une **peine** sanctionne une infraction ; une **mesure de sûreté** poursuit une finalité préventive selon le Code. La **grâce**, relevant du Président, remet ou commue une peine dans les conditions du décret ; elle n’efface pas la condamnation. L’**amnistie**, relevant de la loi, éteint l’action publique et efface les condamnations visées dans les conditions légales. Elle n’établit pas l’innocence et ne supprime pas, par principe, les droits à réparation de la victime.',
      exemples: [['Remettre la peine', 'Un décret réduit une peine sans supprimer la condamnation : on raisonne sur la grâce et sa portée exacte.'], ['Effacer des effets pénaux', 'Une loi d’amnistie définit des faits et personnes concernés. On vérifie son champ ; on n’en déduit pas que toutes les réparations civiles disparaissent.']],
      piege: 'La grâce ne vaut pas acquittement. L’amnistie ne signifie pas remboursement automatique des amendes déjà payées.',
      question: ['Quel mécanisme n’efface pas, par lui-même, la condamnation ?', ['La grâce', 'Une annulation de la condamnation par le juge compétent', 'L’amnistie de la condamnation visée dans son champ légal'], 0, 'La grâce agit sur la peine selon le décret, sans transformer la condamnation en déclaration d’innocence ni l’effacer.'],
      recap: ['Grâce : effet sur la peine, par décision présidentielle.', 'Amnistie : effet pénal défini par la loi.', 'Ne pas confondre avec une décision d’innocence.'],
    }),
  ],
  exercices: [
    exercice('DROIT-PENAL', 1, 'qcm', 1, ['LEGALITE'], ['Légalité', 'Une condamnation exige un texte applicable définissant le comportement et la sanction. L’analogie ne peut créer une incrimination.', 'Texte puis qualification.'], {
      consigne: 'Un juge veut punir un fait non visé par un texte parce qu’il ressemble à une infraction. Quel obstacle rencontre-t-il ?', options: ['Le principe de légalité et l’interdiction de l’analogie créatrice', 'L’obligation de créer une nouvelle peine', 'La compétence du CESEC'], bonne: 0,
      explication: 'La ressemblance ne constitue pas un fondement légal. Le juge doit vérifier les conditions d’un texte existant et ne peut étendre la répression à un fait que celui-ci ne prévoit pas.',
    }),
    exercice('DROIT-PENAL', 2, 'qcm', 1, ['LEGALITE'], ['Temps pénal', 'Pour les dispositions pénales de fond, on compare les dates et la sévérité. Une aggravation ne s’applique pas rétroactivement aux faits antérieurs.', 'Repérer la date des faits.'], {
      consigne: 'Des faits précèdent une loi qui augmente leur peine. Quelle règle de fond retenir ?', options: ['Ne pas appliquer rétroactivement l’aggravation', 'Appliquer toujours le maximum nouveau', 'Laisser la victime choisir la loi'], bonne: 0,
      explication: 'Les faits ont été commis sous la loi ancienne. La loi nouvelle est plus sévère : elle ne peut aggraver rétroactivement leur répression.',
    }),
    exercice('DROIT-PENAL', 3, 'relier', 1, ['CLASSIF'], ['Catégories légales', 'Les catégories d’infractions correspondent à une qualification et à un régime de peine prévus par les textes. La peine finalement individualisée ne suffit pas à les redéfinir.', 'Lire la catégorie légale.'], {
      consigne: 'Relie chaque catégorie à l’adjectif juridique correspondant.', paires: [['Crime', 'Criminel'], ['Délit', 'Correctionnel'], ['Contravention', 'Contraventionnel']],
      explication: 'Le crime relève de la catégorie criminelle, le délit de la catégorie correctionnelle, et la contravention du régime contraventionnel. Cette terminologie aide à lire les textes de peine et de procédure.',
    }),
    exercice('DROIT-PENAL', 4, 'classer', 1, ['ELEMENTS'], ['Trois vérifications', 'La règle pénale, le comportement extérieur et l’état d’esprit requis sont des vérifications distinctes. Chaque élément doit être établi.', 'Ne pas déduire tous les éléments d’un seul fait.'], {
      consigne: 'Classe chaque élément selon son rôle.', categories: ['Légal', 'Matériel', 'Moral'], cartes: [['Texte définissant le comportement interdit', 0], ['Acte de soustraction décrit dans les faits', 1], ['Intention exigée par l’incrimination', 2]],
      explication: 'Le texte donne le fondement légal. L’acte est la manifestation matérielle. L’intention concerne l’élément moral : la preuve de l’un ne dispense pas de vérifier les autres.',
    }),
    exercice('DROIT-PENAL', 5, 'qcm', 1, ['ELEMENTS'], ['Mobile et intention', 'Le mobile explique la raison personnelle d’agir. L’intention porte sur la conscience et la volonté du comportement exigées par le texte.', 'Pourquoi agir et vouloir l’acte sont deux questions.'], {
      consigne: 'Une personne prend sciemment le bien d’autrui pour financer un projet généreux. Le mobile généreux supprime-t-il automatiquement l’intention ?', options: ['Non, il faut distinguer mobile et intention', 'Oui, tout objectif généreux exclut l’infraction', 'Oui, sans lire le texte'], bonne: 0,
      explication: 'La finalité personnelle est le mobile. Elle n’enlève pas automatiquement la conscience de prendre le bien d’autrui. Il reste à vérifier les éléments du texte et les éventuelles justifications.',
    }),
    exercice('DROIT-PENAL', 6, 'vf', 2, ['TENTATIVE'], ['Actes préparatoires', 'Les préparatifs ne suffisent pas en eux-mêmes à constituer une tentative. Un acte peut toutefois être incriminé de façon autonome.', 'Distinguer projet, tentative et autre infraction.'], {
      source: preselection, consigne: 'Vrai ou faux ? Affirmation 40 précisée.', affirmations: [['Un acte préparatoire peut être puni s’il constitue lui-même une infraction prévue par la loi.', true]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmation 40 adaptée) Vrai : l’article 27 ne punit pas la simple préparation à ce titre, mais réserve le cas où le fait constitue lui-même une infraction autonome. Cette précision évite de répondre « jamais ».',
    }),
    exercice('DROIT-PENAL', 7, 'qcm', 2, ['TENTATIVE'], ['Tentative punissable', 'La tentative exige des actes répondant au texte et un échec indépendant de la volonté. Pour un délit, une disposition doit rendre la tentative punissable.', 'Vérifier catégorie puis conditions.'], {
      consigne: 'Pour un délit donné, aucun texte ne réprime la tentative. Les faits s’arrêtent à une tentative, sans autre infraction autonome. Quelle conclusion ?', options: ['Ne pas punir cette tentative de délit', 'La punir automatiquement comme tout crime', 'Créer une contravention de remplacement'], bonne: 0,
      explication: 'Le premier contrôle concerne le texte : la tentative de délit doit être spécialement prévue. L’énoncé exclut cette disposition et une autre infraction autonome ; on ne peut donc inventer une sanction.',
    }),
    exercice('DROIT-PENAL', 8, 'qcm', 2, ['PARTICIPATION'], ['Participation consciente', 'La complicité exige un rôle matériel d’aide et la connaissance requise. Certaines instigations sont qualifiées d’auteur par le Code ivoirien.', 'Lire séparément les articles 29 et 30.'], {
      consigne: 'Une personne fournit sciemment l’instrument d’un délit commis, sans participer directement à sa réalisation. Quelle qualification examiner en priorité ?', options: ['La complicité de l’article 30', 'La seule qualité de témoin innocent', 'Une responsabilité automatique de tous ses parents'], bonne: 0,
      explication: 'L’instrument est un moyen fourni ; la personne connaît le projet et ne participe pas directement à la réalisation. Ces faits correspondent au mécanisme de complicité décrit par l’article 30, sous réserve de tous ses éléments.',
    }),
    exercice('DROIT-PENAL', 9, 'entourer', 2, ['JUSTIF'], ['Légitime défense', 'La justification exige plusieurs conditions cumulatives : attaque injuste, nécessité, concomitance et proportion. Un seul mot comme agression ne les établit pas toutes.', 'Vérifier chaque condition dans les faits.'], {
      consigne: 'Sélectionne les éléments à vérifier pour la légitime défense.', elements: [['Attaque injuste', true], ['Nécessité de la défense', true], ['Concomitance avec l’attaque', true], ['Proportion de la riposte', true], ['Volonté de se venger après la fin du danger', false]],
      explication: 'Il faut caractériser l’attaque injuste et une défense nécessaire, au même moment et proportionnée aux circonstances. La vengeance différée ne satisfait pas la concomitance et n’est pas une condition justificative.',
    }),
    exercice('DROIT-PENAL', 10, 'vf', 2, ['JUSTIF'], ['Âge et antécédents', 'L’âge pertinent détermine la minorité. Les antécédents renseignent une autre dimension de la situation pénale et ne se déduisent pas de l’âge.', 'Deux critères indépendants.'], {
      source: preselection, consigne: 'Vrai ou faux ? Adaptation de l’affirmation 42.', affirmations: [['Toute personne mineure est nécessairement sans antécédent pénal.', false]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmation 42 adaptée) Faux. La minorité est une donnée d’âge ; le caractère primaire concerne les antécédents. L’énoncé confond donc deux critères distincts.',
    }),
    exercice('DROIT-PENAL', 11, 'qcm', 3, ['PARTICIPATION'], ['Instigation en droit ivoirien', 'La qualification d’auteur ne se limite pas à l’exécutant matériel. Il faut examiner les hypothèses spécifiques de l’article 29 avant de retenir une complicité.', 'Éviter la transposition automatique d’un autre droit.'], {
      consigne: 'Quel raisonnement est correct pour une incitation correspondant à l’article 29 du Code ivoirien ?', options: ['Examiner la qualité d’auteur, même si l’infraction incitée n’a pas été tentée', 'Classer toujours l’instigateur comme simple complice', 'Exclure toute responsabilité parce qu’il n’a rien exécuté lui-même'], bonne: 0,
      explication: 'L’article 29 prévoit des hypothèses d’instigation qualifiées d’auteur, y compris sans tentative ni commission de l’infraction incitée. L’analyse doit vérifier leurs conditions précises ; les deux autres propositions les excluent à tort.',
    }),
    exercice('DROIT-PENAL', 12, 'qcm', 3, ['ELEMENTS', 'JUSTIF'], ['Raisonner par étapes', 'La qualification demande le texte, les éléments matériels et moraux, puis l’examen des justifications ou causes affectant la responsabilité. Un résultat dommageable ne suffit pas.', 'Séparer les contrôles.'], {
      consigne: 'Un dommage résulte d’une imprudence alléguée. Quelle démarche est rigoureuse ?', options: ['Chercher le texte, établir la faute et la causalité exigées, puis examiner les autres conditions', 'Condamner parce qu’un dommage existe', 'Écarter tout droit pénal parce que le dommage n’était pas voulu'], bonne: 0,
      explication: 'L’existence du dommage ne prouve pas tous les éléments. Mais l’absence d’intention n’exclut pas une infraction d’imprudence prévue. Il faut donc lire le texte et vérifier faute, causalité et conditions de responsabilité.',
    }),
    exercice('DROIT-PENAL', 13, 'classer', 3, ['PEINES'], ['Grâce et amnistie', 'La grâce agit sur la peine dans le cadre présidentiel. L’amnistie produit les effets pénaux définis par une loi, sans valoir déclaration d’innocence.', 'Ne pas confondre peine et condamnation.'], {
      source: penal2026, consigne: 'Classe ces caractères. Exercice adapté du thème « L’amnistie et la grâce ».', categories: ['Grâce', 'Amnistie'], cartes: [['Mécanisme présidentiel portant sur la peine', 0], ['Mécanisme législatif pouvant éteindre l’action publique', 1], ['N’efface pas par elle-même la condamnation', 0], ['Efface les condamnations visées selon la loi', 1]],
      explication: '(INFJ, administrateurs pénitentiaires, droit pénal juillet 2026, thème adapté) On compare d’abord l’autorité : Président pour la grâce, législateur pour l’amnistie. On compare ensuite l’objet : la grâce remet ou commue une peine sans effacer la condamnation ; l’amnistie produit l’effacement pénal prévu par la loi. Ni l’une ni l’autre ne prouve l’innocence.',
    }),
    exercice('DROIT-PENAL', 14, 'qcm', 3, ['LEGALITE', 'PEINES'], ['Loi plus douce', 'Pour une disposition de fond moins sévère, le caractère définitif de la condamnation est déterminant. Ce régime ne doit pas être confondu avec la grâce.', 'Règle temporelle et mesure de clémence sont distinctes.'], {
      consigne: 'Une loi réduit la peine applicable alors que la condamnation n’est pas définitive. Quel mécanisme examiner ?', options: ['L’application de la disposition pénale plus douce', 'Une grâce automatique par le greffier', 'Une aggravation rétroactive'], bonne: 0,
      explication: 'Les deux données utiles sont la réduction de sévérité et l’absence de condamnation définitive. Elles conduisent à la règle de l’article 24. Il ne s’agit pas d’un décret de grâce et le greffier ne décide pas une mesure de clémence.',
    }),
  ],
};

const contrat = {
  code: 'DROIT-CONTRAT', matiere: 'Droit civil', titre: 'Le contrat : formation et effets',
  resume: 'De l’obligation à la formation du contrat, aux nullités, à l’inexécution et au paiement de l’indu.',
  notions: [
    { code: 'OBLIGATION', libelle: 'Obligation, acte et fait juridiques' },
    { code: 'VALIDITE', libelle: 'Accord et conditions de validité' },
    { code: 'VICES', libelle: 'Erreur, dol et violence' },
    { code: 'NULLITE', libelle: 'Nullité absolue et relative' },
    { code: 'EFFETS', libelle: 'Force obligatoire, bonne foi et effet relatif' },
    { code: 'INEXECUTION', libelle: 'Inexécution et réparation' },
    { code: 'INDU', libelle: 'Restitution d’un paiement sans dette' },
  ],
  lecons: [
    cours('DROIT-CONTRAT', 1, 'OBLIGATION', 'Comprendre une obligation', {
      objectif: 'Nous allons commencer par les mots du droit civil pour comprendre qui peut réclamer quoi à qui.',
      regle: 'Le **droit civil** organise notamment les rapports entre personnes privées. Il repose sur des textes, dont les dispositions civiles applicables en Côte d’Ivoire, interprétées par les juges. Une **obligation** est un lien juridique : le **créancier** peut demander une prestation au **débiteur**. La prestation peut être un paiement, une livraison ou une autre conduite déterminée. Le **contrat** est un accord de volontés créant des obligations. Une obligation peut aussi naître sans contrat.',
      exemples: [['Un prix à payer', 'Pour le prix d’un bien vendu, le vendeur est créancier et l’acheteur débiteur. Pour la livraison, leurs positions s’inversent.'], ['Sans accord préalable', 'Une personne cause fautivement un dommage à une autre. Une obligation de réparation peut naître sans qu’elles aient conclu un contrat.']],
      piege: 'Créancier ne signifie pas toujours banque et débiteur ne signifie pas coupable. Ce sont les deux positions d’un rapport d’obligation.',
      question: ['Pour la livraison du bien vendu, l’acheteur est…', ['créancier de la livraison', 'juge de la livraison', 'toujours sans aucun droit'], 0, 'La prestation considérée est la livraison. L’acheteur peut la réclamer au vendeur : il en est donc créancier, même s’il est débiteur du prix.'],
      recap: ['Créancier : réclame une prestation.', 'Débiteur : doit la prestation.', 'Une obligation peut naître avec ou sans contrat.'],
    }),
    cours('DROIT-CONTRAT', 2, 'OBLIGATION', 'Acte juridique ou fait juridique ?', {
      objectif: 'Nous allons distinguer une volonté de produire des effets juridiques d’un événement auquel le droit attache ces effets.',
      regle: 'Un **acte juridique** est une manifestation de volonté destinée à produire des effets de droit ; le contrat est un acte fondé sur un accord. Un **fait juridique** est un événement ou comportement auquel le droit attache des effets qui ne sont pas recherchés comme tels. Un fait peut être volontaire matériellement sans être un acte juridique : vouloir un geste n’est pas nécessairement vouloir l’obligation qui en résulte.',
      exemples: [['Créer une dette par accord', 'Deux personnes conviennent d’une vente : elles veulent créer les droits et obligations de vendeur et d’acheteur. Il s’agit d’un acte juridique.'], ['Créer une dette par dommage', 'Casser par imprudence le téléphone d’autrui peut créer une dette de réparation. L’auteur n’a pas voulu conclure un accord de réparation : le dommage est un fait juridique.']],
      piege: 'Acte juridique ne signifie pas obligatoirement document écrit. L’acte et son moyen de preuve sont deux questions distinctes.',
      question: ['Une vente conclue pour créer des obligations est…', ['un acte juridique', 'une simple donnée météorologique', 'nécessairement une infraction'], 0, 'Les parties recherchent les effets de droit de la vente. Cet accord constitue donc un acte juridique, sous réserve de ses conditions de validité.'],
      recap: ['Acte : effets de droit voulus.', 'Fait : effets attachés par la règle.', 'Ne pas confondre acte et preuve écrite.'],
    }),
    cours('DROIT-CONTRAT', 3, 'VALIDITE', 'Quand les volontés se rencontrent-elles ?', {
      objectif: 'Nous allons reconnaître un accord sans confondre discussion et acceptation.',
      regle: 'Une **offre** propose la conclusion d’un contrat avec ses éléments nécessaires. L’**acceptation** exprime l’accord avec cette offre. Une réponse qui modifie le prix n’est pas l’acceptation pure de l’offre initiale : elle propose d’autres conditions. Un contrat **synallagmatique** crée des obligations réciproques ; un contrat **unilatéral** ne fait naître une obligation qu’à la charge d’une partie. Même un contrat unilatéral suppose un accord de volontés.',
      exemples: [['Même prix', 'Un vendeur propose un bien pour 20 000 F ; l’acheteur accepte ce bien à ce prix. Les volontés concordent sur les éléments indiqués.'], ['Prix différent', 'L’acheteur répond « je le prends pour 15 000 F ». Il propose un autre prix ; on ne conclut pas à l’acceptation de 20 000 F.']],
      piege: '« Unilatéral » qualifie les obligations du contrat, pas le nombre de volontés nécessaires à sa formation.',
      question: ['Dans une vente, livraison et paiement sont des obligations…', ['réciproques', 'inexistantes', 'd’une seule partie seulement'], 0, 'Le vendeur doit livrer et l’acheteur doit payer. Chacun est engagé envers l’autre : le contrat est synallagmatique.'],
      recap: ['Comparer offre et réponse.', 'Une modification essentielle appelle un nouvel accord.', 'Contrat unilatéral ne signifie pas volonté unique.'],
    }),
    cours('DROIT-CONTRAT', 4, 'VALIDITE', 'Vérifier la validité du contrat', {
      objectif: 'Nous allons distinguer l’existence d’un accord de sa validité juridique.',
      regle: 'Dans le droit civil ivoirien des obligations étudié ici, on vérifie le **consentement**, la **capacité** de contracter, un **objet** certain et une **cause** licite. Le consentement est l’accord réel ; la capacité est l’aptitude légale à s’engager soi-même. L’objet concerne ce qui est promis. La cause est la justification juridique de l’engagement, dont la licéité doit être examinée. Certaines conventions demandent aussi une forme particulière.',
      exemples: [['Une prestation identifiable', 'Promettre une livraison déterminée permet d’identifier la prestation. Une promesse dont on ne peut déterminer l’objet pose une autre difficulté que l’absence de signature.'], ['Une opération interdite', 'L’accord des parties ne rend pas licite une opération interdite par une règle impérative, règle à laquelle leur volonté ne peut déroger.']],
      piege: 'Ne pas appliquer automatiquement les articles du Code civil français réformé en 2016. La formulation et la numérotation ivoiriennes doivent être vérifiées dans les sources locales.',
      question: ['La capacité de contracter désigne…', ['l’aptitude légale à s’engager', 'la richesse personnelle', 'la taille du document'], 0, 'La capacité est une aptitude juridique. Avoir de l’argent ou signer un document long ne remplace pas la vérification de cette condition.'],
      recap: ['Consentement, capacité, objet, cause licite.', 'Vérifier les formes exigées pour l’opération.', 'Utiliser les textes applicables en Côte d’Ivoire.'],
    }),
    cours('DROIT-CONTRAT', 5, 'VICES', 'Un consentement libre et éclairé', {
      objectif: 'Nous allons distinguer trois défauts possibles de consentement pour ne pas les appeler tous « erreur ».',
      regle: 'Un **vice du consentement** affecte la liberté ou la compréhension de l’accord. L’**erreur** est une représentation inexacte, pertinente dans les conditions du droit applicable. Le **dol** est une tromperie intentionnelle déterminante du consentement. La **violence** est une contrainte qui conduit à contracter. Il faut relier le vice invoqué à la décision de s’engager ; toute déception ou négociation difficile ne suffit pas.',
      exemples: [['Tromper pour vendre', 'Un vendeur ment volontairement sur une qualité déterminante pour obtenir l’achat. On recherche un dol et ses conditions.'], ['Contraindre à signer', 'Une menace grave force une personne à signer. On examine la violence, plutôt que de dire que la signature prouve à elle seule un accord libre.']],
      piege: 'Une mauvaise affaire n’est pas automatiquement un vice. Le regret ne prouve ni erreur juridiquement pertinente, ni dol, ni violence.',
      question: ['Une tromperie intentionnelle déterminante renvoie principalement…', ['au dol', 'au seul retard de livraison', 'à la compétence territoriale'], 0, 'La tromperie voulue pour obtenir le consentement caractérise le mécanisme du dol. Il faut encore prouver ses conditions et son caractère déterminant.'],
      recap: ['Erreur : représentation inexacte.', 'Dol : tromperie intentionnelle déterminante.', 'Violence : contrainte affectant l’accord.'],
    }),
    cours('DROIT-CONTRAT', 6, 'NULLITE', 'Que sanctionne la nullité ?', {
      objectif: 'Nous allons distinguer un défaut de formation d’un problème d’exécution.',
      regle: 'La **nullité** sanctionne un défaut qui affecte la formation du contrat. Elle est dite **relative** lorsque la règle protège principalement un intérêt privé ; **absolue** lorsqu’elle protège l’intérêt général. Cette distinction influence notamment les personnes qui peuvent agir et la possibilité d’une confirmation. L’annulation peut imposer des **restitutions**, c’est-à-dire rendre ce qui a été reçu, sous réserve des règles et exceptions applicables.',
      exemples: [['Protéger une personne trompée', 'Un vice du consentement protège d’abord la personne dont l’accord est affecté. On examine une nullité relative.'], ['Une opération prohibée', 'Un contrat portant sur une opération contraire à une règle d’intérêt général pose une question de nullité absolue. L’accord mutuel ne suffit pas à le sauver.']],
      piege: 'La nullité n’est pas une peine pénale. L’absence de paiement après une formation valable relève d’abord de l’inexécution, pas d’une nullité automatique.',
      question: ['Une nullité pour vice du consentement protège principalement…', ['la personne dont le consentement est affecté', 'le greffe contre toute demande', 'le vendeur contre tout contrôle'], 0, 'Le défaut touche la liberté ou la compréhension d’un contractant. La protection de cet intérêt privé oriente vers la nullité relative.'],
      recap: ['Nullité : défaut de formation.', 'Relative ou absolue selon l’intérêt protégé.', 'Examiner les restitutions et les exceptions.'],
    }),
    cours('DROIT-CONTRAT', 7, 'EFFETS', 'Ce que le contrat oblige à faire', {
      objectif: 'Nous allons comprendre pourquoi un contrat valable engage les parties sans imposer automatiquement une dette à leurs voisins.',
      regle: 'La **force obligatoire** signifie que le contrat valablement formé lie ses parties. La **bonne foi** exige une conduite loyale dans son exécution. L’**effet relatif** signifie qu’en principe les obligations contractuelles lient ceux qui ont contracté, pas tous les tiers, personnes étrangères au contrat. Il existe des mécanismes particuliers prévus par le droit. La modification ou la rupture doit respecter l’accord et les causes autorisées par la loi.',
      exemples: [['Tenir la date', 'Si une livraison est promise à une date, le vendeur ne peut changer cette date par simple préférence, sans fondement contractuel ou légal.'], ['Un voisin non signataire', 'Le voisin d’un acheteur ne devient pas débiteur du prix seulement parce qu’il habite à côté. Il faudrait un engagement ou un fondement distinct.']],
      piege: 'L’effet relatif ne rend pas le contrat invisible pour les tiers. Il distingue l’obligation de contracter de la prise en compte d’une situation juridique.',
      question: ['La force obligatoire suppose d’abord…', ['un contrat valablement formé', 'une promesse illégale quelconque', 'l’accord de tous les voisins'], 0, 'La règle attache sa force au contrat valable. Elle ne dispense donc pas de vérifier le consentement et les autres conditions de formation.'],
      recap: ['Le contrat valable lie ses parties.', 'Exécution loyale : bonne foi.', 'Un tiers n’est pas automatiquement débiteur.'],
    }),
    cours('DROIT-CONTRAT', 8, 'INEXECUTION', 'Que faire face à une obligation inexécutée ?', {
      objectif: 'Nous allons analyser un manquement sans supposer qu’il annule ou pénalise automatiquement tout le contrat.',
      regle: 'L’**inexécution** est l’absence ou le défaut d’exécution d’une obligation due. Selon les conditions applicables, le créancier peut rechercher l’exécution, la résolution du contrat ou des **dommages-intérêts**, somme réparant un préjudice. La **mise en demeure** demande formellement l’exécution selon les règles requises. La **résolution** sanctionne une inexécution ; elle se distingue de la nullité liée à la formation. La force majeure peut exonérer dans les conditions du droit applicable.',
      exemples: [['Livraison manquante', 'On identifie la prestation due et son échéance, puis le manquement. On vérifie les démarches et la voie de sanction avant de conclure à une résolution.'], ['Préjudice à prouver', 'Demander de l’argent pour un retard suppose de préciser le préjudice et son lien avec le manquement, ainsi que les conditions de responsabilité.']],
      piege: 'Un obstacle simplement gênant n’est pas automatiquement une force majeure. Ne pas confondre nullité, résolution et peine pénale.',
      question: ['Un contrat valable mal exécuté pose d’abord une question…', ['d’inexécution', 'de nullité automatique pour vice initial', 'de condamnation pénale obligatoire'], 0, 'Le défaut apparaît au stade de l’exécution. Il faut examiner les sanctions de ce manquement, sans inventer un défaut initial ni une infraction pénale.'],
      recap: ['Identifier obligation, échéance et manquement.', 'Vérifier démarches et sanction adaptée.', 'Réparation : préjudice et lien causal à établir.'],
    }),
    cours('DROIT-CONTRAT', 9, 'INDU', 'Un paiement sans dette doit-il être rendu ?', {
      objectif: 'Nous allons découvrir une obligation sans contrat à travers le paiement de l’indu, thème du sujet civil INFJ de 2025.',
      regle: 'Un **paiement** exécute une obligation ; il ne se limite pas toujours à remettre de l’argent. L’**indu** est ce qui a été payé sans être dû dans la situation examinée. La **répétition de l’indu** est la demande de restitution. Le texte de l’article 1376 proposé au concours indique que celui qui reçoit ce qui ne lui est pas dû doit le restituer. Une réception de bonne foi n’autorise pas, à elle seule, à garder un paiement injustifié.',
      exemples: [['Double virement', 'Une dette de 30 000 F est payée deux fois par erreur au même créancier, sans autre dette. Le second versement excède ce qui était dû : la restitution de 30 000 F doit être examinée.'], ['Vérifier la dette', 'Recevoir un paiement surprenant ne prouve pas l’indu. On recherche d’abord s’il existait une dette ou un autre fondement justifiant le versement.']],
      piege: 'La restitution d’un paiement indu n’est pas nécessairement l’annulation d’un contrat. La bonne foi peut influencer d’autres effets, sans créer la dette absente.',
      question: ['Pour une dette de 10 000 F payée deux fois sans autre justification, quel montant est versé en trop ?', ['10 000 F', '20 000 F', '0 F'], 0, 'Les deux paiements totalisent 20 000 F pour 10 000 F dus. La différence de 10 000 F correspond au versement non dû dans l’hypothèse donnée.'],
      recap: ['Chercher d’abord si le paiement était dû.', 'Répétition : demande de restitution.', 'L’indu peut créer une obligation sans contrat.'],
    }),
  ],
  exercices: [
    exercice('DROIT-CONTRAT', 1, 'relier', 1, ['OBLIGATION'], ['Lire une obligation', 'Une prestation relie un débiteur à un créancier. Dans un contrat réciproque, une même personne peut occuper les deux positions pour des prestations différentes.', 'Préciser la prestation considérée.'], {
      consigne: 'Dans une vente, relie chaque position à sa description.', paires: [['Acheteur pour le prix', 'Débiteur du paiement'], ['Acheteur pour la livraison', 'Créancier de la livraison'], ['Vendeur pour la livraison', 'Débiteur de la remise du bien']],
      explication: 'On distingue les deux prestations. L’acheteur doit le prix mais peut réclamer la livraison. Le vendeur doit remettre le bien ; il peut réciproquement réclamer le prix.',
    }),
    exercice('DROIT-CONTRAT', 2, 'classer', 1, ['OBLIGATION'], ['Acte ou fait', 'L’acte juridique recherche des effets de droit. Le fait juridique entraîne les effets que la règle lui attache sans qu’ils soient recherchés comme tels.', 'Un geste volontaire n’est pas forcément un acte juridique.'], {
      consigne: 'Classe ces situations.', categories: ['Acte juridique', 'Fait juridique'], cartes: [['Vente conclue pour créer les obligations des parties', 0], ['Dommage causé par imprudence', 1], ['Accord destiné à remettre une dette', 0]],
      explication: 'La vente et la remise conventionnelle de dette cherchent leurs effets juridiques. L’imprudence dommageable entraîne une responsabilité éventuelle que son auteur n’a pas voulu créer par accord.',
    }),
    exercice('DROIT-CONTRAT', 3, 'qcm', 1, ['VALIDITE'], ['Accord des volontés', 'L’acceptation doit correspondre à l’offre sur les éléments nécessaires. Une modification essentielle exige un accord sur les nouvelles conditions.', 'Comparer les termes exacts.'], {
      consigne: 'Offre : 25 000 F. Réponse : « J’achète pour 20 000 F ». Quelle lecture est correcte ?', options: ['La réponse propose un autre prix', 'Le prix de 25 000 F est accepté sans réserve', 'Le vendeur doit accepter 20 000 F'], bonne: 0,
      explication: 'La réponse change un élément essentiel, le prix. Elle n’accepte donc pas l’offre initiale ; elle propose une autre condition à laquelle le vendeur doit encore consentir.',
    }),
    exercice('DROIT-CONTRAT', 4, 'entourer', 1, ['VALIDITE'], ['Validité', 'L’accord doit satisfaire les conditions civiles applicables et les éventuelles formes spéciales. L’autonomie de la volonté reste encadrée par les règles impératives.', 'Vérifier toutes les conditions.'], {
      consigne: 'Sélectionne les conditions du droit civil des contrats étudiées dans le cours.', elements: [['Consentement', true], ['Capacité', true], ['Objet certain', true], ['Cause licite', true], ['Richesse obligatoire des parties', false]],
      explication: 'Le cours vérifie consentement, capacité, objet et cause licite, ainsi que les formes propres à certaines opérations. Être riche n’est pas une condition générale de validité.',
    }),
    exercice('DROIT-CONTRAT', 5, 'relier', 1, ['VICES'], ['Consentement', 'Les vices affectent la liberté ou la compréhension de l’engagement. Ils doivent être caractérisés et déterminants selon les règles applicables.', 'Distinguer croyance fausse, tromperie et contrainte.'], {
      consigne: 'Relie chaque mécanisme à son idée centrale.', paires: [['Erreur', 'Représentation inexacte juridiquement pertinente'], ['Dol', 'Tromperie intentionnelle déterminante'], ['Violence', 'Contrainte affectant le consentement']],
      explication: 'L’erreur porte sur une croyance inexacte. Le dol ajoute une tromperie volontaire pour obtenir l’accord. La violence agit par contrainte : elle touche la liberté de consentir.',
    }),
    exercice('DROIT-CONTRAT', 6, 'qcm', 2, ['NULLITE', 'VICES'], ['Intérêt protégé', 'La distinction entre nullité relative et absolue dépend de l’intérêt que protège la règle violée. Un vice de formation ne se confond pas avec l’inexécution.', 'Identifier la protection recherchée.'], {
      consigne: 'Une tromperie déterminante vicie le consentement d’un acheteur. Quelle nullité examiner ?', options: ['La nullité relative protégeant l’acheteur trompé', 'Une peine de prison automatique', 'La résolution pour une livraison tardive non mentionnée'], bonne: 0,
      explication: 'Le défaut affecte la formation et protège principalement le contractant trompé : nullité relative. Aucun retard d’exécution n’est indiqué, et la nullité civile n’est pas une peine de prison.',
    }),
    exercice('DROIT-CONTRAT', 7, 'vf', 2, ['NULLITE'], ['Nature d’une sanction', 'La nullité répond à une irrégularité de formation d’un acte. La sanction pénale suppose une infraction et obéit à une logique distincte.', 'Ne pas confondre branches et sanctions.'], {
      source: preselection, consigne: 'Vrai ou faux ? Affirmation 37.', affirmations: [['La nullité est une sanction pénale.', false]],
      explication: '(INFJ, magistrature, présélection avril 2025, affirmation 37) Faux. La nullité sanctionne ici un défaut de formation du contrat. Elle ne constitue pas une peine attachée à une infraction pénale.',
    }),
    exercice('DROIT-CONTRAT', 8, 'qcm', 2, ['EFFETS'], ['Effet relatif', 'Les obligations du contrat lient en principe les parties. Une personne extérieure ne devient pas débitrice sans engagement ou autre fondement de droit.', 'Identifier les parties avant d’attribuer la dette.'], {
      consigne: 'Aya achète seule un bien. Son voisin n’a pris aucun engagement et aucun autre fondement ne lui impose le prix. Peut-on lui réclamer ce prix au seul titre de la vente ?', options: ['Non, il est tiers à cette vente', 'Oui, car il connaît Aya', 'Oui, car tous les contrats lient les voisins'], bonne: 0,
      explication: 'On identifie les parties : Aya et le vendeur. Le voisin est extérieur, sans engagement ni autre fondement dans l’énoncé. L’effet relatif empêche de lui attribuer automatiquement la dette contractuelle.',
    }),
    exercice('DROIT-CONTRAT', 9, 'classer', 2, ['NULLITE', 'INEXECUTION'], ['Formation ou exécution', 'La nullité se rattache à la formation. Les sanctions de l’inexécution supposent une obligation due non exécutée dans les conditions convenues.', 'Situer le défaut dans le temps.'], {
      consigne: 'Classe la difficulté principale, sans préjuger de sa sanction définitive.', categories: ['Formation', 'Exécution'], cartes: [['Consentement obtenu par dol', 0], ['Livraison promise mais absente à l’échéance', 1], ['Opération contraire à une règle impérative dès l’accord', 0]],
      explication: 'Le dol et l’illicéité initiale affectent la formation. La livraison non réalisée concerne une obligation née du contrat ; c’est un problème d’exécution. Les recours et leurs conditions restent à vérifier.',
    }),
    exercice('DROIT-CONTRAT', 10, 'qcm', 2, ['INDU'], ['Paiement et restitution', 'L’indu suppose l’absence de dette ou de fondement du versement dans la situation analysée. On compare ce qui était dû et ce qui a été payé.', 'Le surplus n’est pas nécessairement tout le paiement.'], {
      consigne: 'Une dette unique de 40 000 F est payée deux fois, sans autre justification. Quel versement total est en trop ?', options: ['40 000 F', '80 000 F', '0 F'], bonne: 0,
      explication: 'Les versements totalisent 80 000 F. La dette justifie 40 000 F seulement : 80 000 − 40 000 = 40 000 F sont versés en trop et appellent l’examen de la restitution.',
    }),
    exercice('DROIT-CONTRAT', 11, 'qcm', 3, ['VALIDITE'], ['Contrat unilatéral', 'Le contrat naît d’un accord. Son caractère unilatéral ou synallagmatique concerne la répartition des obligations, pas le nombre de volontés à sa formation.', 'Accord et réciprocité sont deux critères.'], {
      consigne: 'Un accord valable entre Aya et Koffi fait naître une obligation uniquement à la charge d’Aya. Comment qualifier cet accord selon la répartition des obligations ?', options: ['Un contrat unilatéral, malgré l’accord de deux volontés', 'Un acte juridique unilatéral, puisqu’une seule personne est obligée', 'Un contrat nécessairement synallagmatique, puisqu’il y a deux personnes'], bonne: 0,
      explication: 'On sépare deux questions. La formation repose sur un accord : c’est donc un contrat, et non un acte fondé sur une seule volonté. Ses effets n’obligent qu’Aya : il est unilatéral. Un contrat synallagmatique aurait créé des obligations réciproques, ce que l’énoncé exclut.',
    }),
    exercice('DROIT-CONTRAT', 12, 'qcm', 3, ['INEXECUTION'], ['Réparation contractuelle', 'Il faut identifier le manquement, le préjudice réparable et le lien causal, puis vérifier les conditions de mise en œuvre et les causes éventuelles d’exonération.', 'Un montant demandé doit être justifié.'], {
      consigne: 'Un vendeur livre en retard. L’acheteur réclame une somme sans établir aucun préjudice. Quelle démarche est rigoureuse ?', options: ['Rechercher le préjudice et son lien avec le retard, ainsi que les conditions de responsabilité', 'Accorder automatiquement toute somme demandée', 'Annuler automatiquement le contrat pour incapacité'], bonne: 0,
      explication: 'Le retard fournit un manquement allégué. Il ne justifie pas à lui seul toute indemnité : on doit établir le préjudice, la causalité et les conditions légales. L’énoncé ne donne aucun défaut de capacité.',
    }),
    exercice('DROIT-CONTRAT', 13, 'qcm', 3, ['INDU', 'OBLIGATION'], ['Répétition de l’indu', 'Une restitution peut naître en dehors d’un contrat. La réception de bonne foi ne crée pas à elle seule le fondement juridique qui manque au paiement.', 'Vérifier d’abord ce qui était dû.'], {
      source: civil2025, consigne: 'Adaptation du texte proposé au commentaire : un destinataire reçoit de bonne foi une somme qui ne lui était pas due. Quelle conclusion de principe retenir ?', options: ['La bonne foi ne suffit pas à exclure l’obligation de restituer', 'La bonne foi crée automatiquement une donation', 'Seul un contrat signé avant le versement permettrait toute restitution'], bonne: 0,
      explication: '(INFJ, magistrature, droit civil juillet 2025, article 1376 proposé au commentaire, adaptation) Le texte vise la réception de ce qui n’est pas dû. Il impose la restitution sans la subordonner à la mauvaise foi du destinataire. La bonne foi ne transforme donc pas le versement sans dette en donation ; il faut distinguer obligation de restituer et effets accessoires.',
    }),
    exercice('DROIT-CONTRAT', 14, 'ordre', 3, ['VALIDITE', 'EFFETS', 'INEXECUTION'], ['Méthode du cas pratique', 'Qualifier l’accord précède l’étude de sa validité et de ses effets. Une sanction doit ensuite correspondre au défaut réellement établi.', 'Règle, faits et conclusion doivent se répondre.'], {
      consigne: 'Ordonne une analyse pédagogique d’un contrat contesté.', mode: 'exact', elements: ['Identifier l’accord et les obligations alléguées', 'Vérifier les conditions de formation et la validité', 'Déterminer les obligations valablement dues', 'Examiner le manquement et la sanction adaptée'],
      explication: 'On commence par qualifier l’accord. On vérifie sa validité avant d’affirmer ses effets obligatoires. On identifie ensuite la prestation due et le défaut d’exécution pour choisir une sanction avec ses conditions.',
    }),
  ],
};

module.exports = [institutions, organisationJudiciaire, droitPenal, contrat];
