export const LEGAL_VERSION = '1.0';
export const LEGAL_DATE = '2026-11-23';
export const LEGAL_DATE_TEXTE = '23 novembre 2026';
export const DOCUMENTS = [
  {
    slug: 'conditions-utilisation',
    titre: 'Conditions générales d’utilisation',
    resume: 'Découvre les règles d’utilisation de Fatafalta, la gestion de ton compte et les recours en cas de difficulté.',
    essentiel: [
      'Fatafalta t’aide à réviser et à préparer des examens et concours.',
      'Fatafalta est indépendante des organismes qui les organisent.',
      'Garde ton mot de passe et tes codes de connexion pour toi.',
      'Tu peux retirer ton pseudonyme du classement public.',
      'Tu peux contester une restriction de ton compte par e-mail.',
    ],
    sections: [
      {
        id: 'service',
        titre: 'Le service Fatafalta',
        blocs: [
          { p: 'Fatafalta est un projet étudiant d’entraide, créé pour aider les candidats aux examens et concours en Côte d’Ivoire. Il propose des anciens sujets et corrigés, des leçons, des exercices, des concours blancs, des révisions et des vidéos. Ces conditions s’appliquent au site et à sa version installable, à l’application Android et à l’API qui les fait fonctionner. L’éditeur est identifié dans les [mentions légales](/mentions-legales).' },
          { p: 'Fatafalta est indépendante des organismes d’examens et de concours. Les contenus servent à réviser. Pour les dates, les programmes et les conditions d’inscription, consulte les annonces de l’organisme concerné. Fatafalta ne garantit aucune réussite à un examen ou à un concours.' },
          { p: 'Une partie des contenus est gratuite. Fatafalta ne vend pas les sujets : l’abonnement sert à couvrir l’hébergement et les autres frais de fonctionnement du service. Les droits payants, l’essai et les limites de téléchargement sont décrits dans les [conditions d’abonnement](/conditions-vente).' },
        ],
      },
      {
        id: 'compte',
        titre: 'Créer et protéger ton compte',
        blocs: [
          { p: 'Donne des informations exactes et tiens-les à jour. Vérifie ton adresse e-mail avec le code qui t’est envoyé. Si tu oublies ton mot de passe, utilise la procédure de réinitialisation par e-mail.' },
          { p: 'À l’inscription sur le site et dans les versions récentes de l’application, tu coches toi-même une case pour accepter les conditions d’utilisation et d’abonnement et confirmer que tu as lu la politique de confidentialité. La case est vide au départ. Fatafalta enregistre la version des conditions et la date de ton acceptation.' },
          { p: 'Garde tes identifiants et tes codes secrets. Ton compte et ton abonnement sont personnels. Tu peux utiliser plusieurs appareils dans les conditions de la section [Abonnement personnel](/conditions-vente#abonnement-personnel). Sur un appareil partagé, déconnecte-toi après usage. En cas d’accès suspect, ferme les connexions concernées et contacte Fatafalta.' },
          { p: 'Si tu es mineur, demande l’aide de ton représentant légal avant de t’abonner, de parrainer ou de demander un retrait. Il intervient lorsque les règles relatives à ta capacité l’exigent.' },
        ],
      },
      {
        id: 'classement-et-signalements',
        titre: 'Classement et signalements',
        blocs: [
          { p: 'Si ton profil est visible dans le classement, ton pseudonyme et ton résultat peuvent être vus par d’autres personnes. Choisis un pseudonyme qui ne permet pas de te reconnaître. Évite ton nom, ton numéro de téléphone et le nom de ton établissement. Tu peux te retirer avec le réglage de visibilité du profil dans le classement.' },
          { p: 'Si tu repères une erreur dans la préparation, utilise le signalement prévu dans le service. Indique le contenu concerné et l’erreur. Évite d’y inclure des informations personnelles sur toi ou sur quelqu’un d’autre.' },
        ],
      },
      {
        id: 'regles-d-usage',
        titre: 'Règles d’usage',
        blocs: [
          { p: 'Utilise les ressources pour ton travail personnel. Respecte les droits sur les contenus, les quotas et les protections du service. Consulte les règles de [propriété intellectuelle](/propriete-intellectuelle) et la [politique de sécurité](/politique-securite).' },
          { p: 'Les manquements peuvent entraîner une mesure proportionnée. La politique de sécurité explique les étapes, la notification et la contestation. Tu peux [supprimer ton compte](/suppression-compte) ou exercer les droits décrits dans la [politique de confidentialité](/politique-confidentialite).' },
        ],
      },
      {
        id: 'incidents-et-reclamations',
        titre: 'Incidents et réclamations',
        blocs: [
          { p: 'Une maintenance ou un incident peut interrompre le service. Si un accès payé est affecté, contacte Fatafalta pour demander sa remise en service ou la solution adaptée à ta situation. Fatafalta répond de ses obligations dans les conditions prévues par le droit applicable.' },
          { p: 'Pour une difficulté ou une contestation, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com). Le droit ivoirien s’applique, notamment les lois n° 2013-546 et n° 2016-412 lorsqu’elles régissent la situation. Tu peux saisir les autorités ou juridictions compétentes. Tes droits impératifs de consommateur sont préservés.' },
        ],
      },
      {
        id: 'version-et-modifications',
        titre: 'Version et modifications',
        blocs: [
          { p: 'La version 1.0 entre en vigueur le 23 novembre 2026. Fatafalta peut modifier ces conditions. Elle t’informe avant l’entrée en vigueur d’un changement substantiel et te demande de l’accepter expressément lorsqu’il doit s’appliquer à ton contrat. Si tu refuses, les conditions convenues continuent de régir ta période déjà payée, sous réserve des règles impératives.' },
        ],
      },
    ],
  },
  {
    slug: 'conditions-vente',
    titre: 'Conditions générales d’abonnement',
    resume: 'Consulte les tarifs, les droits d’accès, les quotas et les règles de paiement, de remboursement et de parrainage de Fatafalta.',
    essentiel: [
      'Le premier paiement coûte 2 000 FCFA pour quatre mois, ou 1 500 FCFA avec un code valide.',
      'L’essai de la préparation couvre sept jours distincts d’utilisation.',
      'Tu déclenches chaque paiement depuis le site.',
      'Ton abonnement est personnel et tu peux utiliser plusieurs appareils.',
      'Vérifie les dates d’accès et le montant à payer avant de confirmer.',
      'Si ton paiement pose problème, tu peux faire une réclamation auprès de Fatafalta.',
    ],
    sections: [
      {
        id: 'offre-et-vendeur',
        titre: 'L’abonnement et ce qu’il couvre',
        blocs: [
          { p: 'L’abonnement est proposé par Fatafalta, dont l’éditeur est présenté dans les [mentions légales](/mentions-legales). Fatafalta ne vend pas les sujets : l’abonnement finance l’hébergement et les autres frais de fonctionnement du service. Il donne accès aux fonctions payantes de préparation et aux téléchargements réservés, dans les limites ci-dessous.' },
          { p: 'La souscription se fait uniquement sur le site fatafalta.com. L’application Android ne propose aucun achat : tu y utilises les droits attachés à ton compte. Sur iPhone, tu peux utiliser la version web installable du site.' },
        ],
      },
      {
        id: 'tarifs-et-periodes',
        titre: 'Tarifs et périodes',
        blocs: [
          { p: 'Les prix sont exprimés en francs CFA (XOF).' },
          { tableau: {
            entetes: ['Paiement', 'Prix (XOF)', 'Période d’accès'],
            lignes: [
              ['Premier paiement', '2 000 FCFA', '4 mois'],
              ['Premier paiement avec un code promotionnel valide', '1 500 FCFA', '4 mois'],
              ['Mensualité après la période initiale', '500 FCFA', '1 mois'],
              ['Paiement initial du nouveau cycle annuel', '2 000 FCFA', '4 mois'],
            ],
          } },
          { p: 'Après la période initiale, tu peux prolonger ton accès par mensualités jusqu’au nouveau cycle annuel, ancré au 1er janvier. Avant de confirmer chaque paiement, tu dois pouvoir vérifier le montant total et les dates exactes de début et de fin d’accès. Vérifie ces dates en particulier si tu t’abonnes pour la première fois à partir d’août. Le montant affiché avant la confirmation est celui qui t’est demandé.' },
        ],
      },
      {
        id: 'essai-de-preparation',
        titre: 'Essayer la préparation',
        blocs: [
          { p: 'Tu peux essayer la préparation gratuitement pendant sept jours distincts d’utilisation. Un jour où tu ne l’utilises pas ne compte pas. À la fin de l’essai, il faut un abonnement actif pour accéder aux fonctions de préparation réservées. L’essai se termine sans débit automatique.' },
        ],
      },
      {
        id: 'quotas-de-telechargement',
        titre: 'Quotas de téléchargement',
        blocs: [
          { tableau: {
            entetes: ['Année du sujet', 'Sans abonnement actif', 'Avec abonnement actif'],
            lignes: [
              ['2009 ou avant', 'Gratuit sans compte, hors quota', 'Gratuit, hors quota'],
              ['De 2010 à 2020', '3 téléchargements gratuits au total', 'Inclus dans le quota de 20 téléchargements par période glissante de 24 heures'],
              ['À partir de 2021', 'Abonnement nécessaire', 'Inclus dans le même quota de 20 téléchargements par période glissante de 24 heures'],
            ],
          } },
          { p: 'Pour les visiteurs sans compte, un plafond supplémentaire de 12 téléchargements de sujets soumis à quota s’applique par adresse IP sur 24 heures. Ce plafond s’ajoute à la limite gratuite de 3 téléchargements au total. Il peut concerner plusieurs personnes sur un même réseau.' },
          { p: 'Un téléchargement groupé peut réunir jusqu’à 60 documents auxquels tu as accès, dans la limite de ton quota. Le lien de téléchargement est valable 15 minutes. Quand ton quota glissant est atteint, attends qu’une place se libère dans la fenêtre de 24 heures.' },
        ],
      },
      {
        id: 'abonnement-personnel',
        titre: 'Abonnement personnel',
        blocs: [
          { p: 'Ton abonnement donne accès à un seul bénéficiaire. Tu peux utiliser tes propres connexions sur plusieurs appareils compatibles. Il est interdit de donner tes identifiants pour qu’une autre personne utilise ton accès, ou de partager, prêter, vendre, louer ou céder cet accès. Ton représentant légal peut gérer l’accès pour toi lorsque les règles relatives à ta capacité le permettent.' },
          { p: 'Dans Compte > Profil > « Mes appareils », tu peux voir tes connexions actives, le type d’appareil, le navigateur et les dates, puis déconnecter une session. Les adresses IP ne sont pas affichées dans cette liste.' },
          { p: 'Si tu dépasses cinq connexions actives, la connexion utilisée le moins récemment est fermée automatiquement. Ton compte reste accessible. Cette fermeture est enregistrée pour aider Fatafalta à repérer un éventuel partage. Elle peut aussi correspondre à un changement normal d’appareil. La [politique de sécurité](/politique-securite) explique les vérifications et ton droit de contester.' },
        ],
      },
      {
        id: 'commande-et-paiement',
        titre: 'Commander et payer',
        blocs: [
          { p: 'La commande se fait en français. Connecte-toi sur le site, choisis le moyen de paiement, puis saisis le numéro demandé et ton code promotionnel si tu en as un. Vérifie le prix total et les informations de ta commande. Utilise l’option de modification si tu repères une erreur, puis confirme et valide le paiement auprès de l’opérateur.' },
          { p: 'GeniusPay traite le paiement. Wave est le moyen actuellement disponible. Orange Money, MTN Mobile Money et Moov Money peuvent être proposés via PawaPay si ces moyens sont réactivés. Seuls les moyens affichés au moment de commander sont utilisables.' },
          { p: 'Ton accès s’active ou se prolonge lorsque le paiement est confirmé. Suis son état sur le site, qui affiche la confirmation électronique lorsque le paiement est validé. Garde ta référence de transaction. Si le statut tarde ou si tu as été débité malgré un refus, vérifie le statut ou contacte Fatafalta avant de payer de nouveau.' },
          { p: 'Tu peux conserver une copie de ces conditions et de la confirmation de paiement. Fatafalta conserve les éléments de preuve de la souscription selon les règles applicables. L’historique de tes paiements reste consultable dans ton compte, sur le site. Ces conditions restent publiées sur cette page, avec leur version et leur date.' },
        ],
      },
      {
        id: 'echeance-et-changements',
        titre: 'Échéance et renouvellement',
        blocs: [
          { p: 'Tu déclenches chaque paiement. Aucun prélèvement automatique n’est effectué. À la date de fin indiquée, les droits payants cessent si tu n’as pas prolongé l’accès. Ton compte reste disponible avec les fonctions gratuites et les droits de téléchargement gratuits qu’il te reste.' },
          { p: 'Si le prix ou les conditions changent, Fatafalta te présente la nouvelle offre avant ton prochain achat. Le prix et la durée déjà convenus pour une période payée s’appliquent à cette période. La [suppression du compte](/suppression-compte) met fin à ton accès, y compris à la période payée en cours, sous réserve de tes droits légaux.' },
        ],
      },
      {
        id: 'remboursements',
        titre: 'Paiement contesté et remboursement',
        blocs: [
          { p: 'Après activation de l’accès, Fatafalta n’accorde pas de remboursement commercial pour un simple changement d’avis. Tes droits légaux restent applicables, y compris le droit de retour prévu par l’article 11 de la loi n° 2016-412 lorsque ses conditions sont réunies. L’application de ce droit à un abonnement numérique activé immédiatement dépend de la situation. La seule activation ou un téléchargement ne vaut pas renonciation à tes droits légaux. [Loi n° 2016-412](https://www.economie-ivoirienne.ci/sites/default/files/sites/default/files/inline-files/loi-n-2016-412-du-15-juin-2016-relative-a-la-consommation.pdf).' },
          { p: 'Signale tout double paiement, débit sans activation, erreur de facturation ou impossibilité durable d’accès imputable à Fatafalta. Fatafalta vérifie le paiement et l’accès. Selon la situation, elle régularise le débit ou l’accès et rembourse les sommes dues. Tu peux demander la fin du contrat ou une autre réparation lorsque le droit applicable le permet.' },
        ],
      },
      {
        id: 'parrainage-et-commission',
        titre: 'Parrainage et commission',
        blocs: [
          { p: 'Un code promotionnel valide commençant par « FATA » ramène le premier paiement du filleul à 1 500 FCFA. Le code s’applique une seule fois, au premier paiement. Le parrain reçoit 500 FCFA de commission par filleul dont le premier paiement avec le code est validé.' },
          { p: 'La commission devient retirable après 7 jours. Pour demander un versement par mobile money, indique ton prénom, ton nom, ton numéro et ton opérateur. Le montant minimum d’un retrait est de 1 000 FCFA. Les frais de l’opérateur mobile money sont à la charge du bénéficiaire. Les retraits sont traités à la main, dans les meilleurs délais.' },
          { p: 'Si le paiement qui a généré une commission est annulé ou si une fraude est établie, Fatafalta peut corriger la commission concernée. Elle te communique le motif et la façon de contester. Un doute peut donner lieu à une vérification ciblée du versement concerné. Les commissions déjà dues sont traitées selon leur situation et les règles applicables.' },
        ],
      },
      {
        id: 'reclamations-et-recours',
        titre: 'Réclamations et recours',
        blocs: [
          { p: 'Pour une question sur ton abonnement, un paiement, une commission ou un remboursement, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com). Indique l’adresse e-mail du compte, la date, le montant, la référence et le problème rencontré. Garde ton mot de passe, ton code secret mobile money et tes codes de validation pour toi. Fatafalta te répond dans les meilleurs délais.' },
          { p: 'Fatafalta répond de la bonne exécution de ses obligations, y compris celles confiées à un prestataire, dans les conditions de la loi n° 2013-546. Les droits prévus par la loi n° 2016-412 restent applicables. Tu peux saisir les autorités ou juridictions compétentes. [Loi n° 2013-546](https://decfinex.tresor.gouv.ci/decfinex/textes/s-d_lutte-crim-finance/lois-reglements/2013-546-Transactions-electroniques.pdf).' },
        ],
      },
    ],
  },
  {
    slug: 'politique-confidentialite',
    titre: 'Politique de confidentialité',
    resume: 'Découvre quelles données Fatafalta utilise sur son site et son application, comment elles sont traitées et comment exercer tes droits.',
    essentiel: [
      'Fatafalta utilise des données pour gérer ton compte, la préparation, les téléchargements et les paiements.',
      'Des données techniques sont aussi utilisées quand tu visites le site sans compte.',
      'Tu peux retirer ton pseudonyme du classement et désactiver les notifications.',
      'Tu peux demander l’accès à tes données, leur correction ou leur effacement selon la loi.',
      'Tu peux saisir l’ARTCI pour une question ou une plainte concernant tes données.',
    ],
    sections: [
      {
        id: 'responsable-et-collecte',
        titre: 'Qui utilise tes données et comment elles sont collectées',
        blocs: [
          { p: 'Fatafalta, projet étudiant présenté dans les [mentions légales](/mentions-legales), est responsable des traitements décrits ici. Pour toute demande sur tes données, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com).' },
          { p: 'Tu fournis certaines données en t’inscrivant, en faisant un exercice, en écrivant à Fatafalta ou en demandant un retrait. Le site et l’application enregistrent aussi des informations techniques lors de leur utilisation. Le prestataire de paiement transmet le résultat du paiement à Fatafalta.' },
          { p: 'Le nom, l’adresse e-mail et le mot de passe servent à créer et à protéger le compte. Les champs requis sont indiqués dans les formulaires. Sans les données nécessaires, le compte ou l’opération demandée ne peuvent pas être traités. Ton numéro est demandé pour le paiement ou le retrait lorsque le parcours l’exige.' },
        ],
      },
      {
        id: 'finalites-et-durees',
        titre: 'Les données, leurs usages et leur durée',
        blocs: [
          { p: 'La loi n° 2013-450 prévoit en principe un consentement exprès préalable. Elle permet certaines dérogations si le traitement est nécessaire et si le responsable est dûment autorisé. Les bases indiquées s’entendent dans les conditions prévues par cette loi. Un choix facultatif, comme l’activation de rappels, se fait séparément de l’acceptation des conditions d’utilisation. [Loi n° 2013-450](https://www.autoritedeprotection.ci/docs/Loi-2013-450.pdf).' },
          { tableau: {
            entetes: ['Finalité', 'Données', 'Base', 'Durée'],
            lignes: [
              ['Créer et gérer ton compte, vérifier ton e-mail et rétablir l’accès', 'Nom, prénom, e-mail, téléphone si renseigné, mot de passe haché, rôle, statut, vérification, dates et codes e-mail hachés avec leur expiration', 'Exécution du service demandé', 'Tant que ton compte existe. À sa suppression, ces données sont effacées ou anonymisées'],
              ['Garder ta connexion et gérer tes appareils', 'Identifiant de session, plateforme, type d’appareil, navigateur, dates, empreinte hachée du jeton de renouvellement et échéance', 'Exécution du service demandé', 'Session fermée après 30 jours sans visite, et au plus tard 180 jours après la connexion'],
              ['Sécuriser les accès et examiner les abus', 'Journaux techniques, adresse IP et navigateur lorsqu’ils sont journalisés, échecs de connexion avec e-mail haché et événements liés aux sessions', 'Protection des comptes et des droits des utilisateurs dans les conditions de la loi n° 2013-450', 'Le temps nécessaire à la sécurité du service, puis effacement'],
              ['Fournir les téléchargements et gérer les quotas', 'Identifiant de compte ou de visiteur, document, jour, adresse IP et informations sur le navigateur', 'Fourniture de l’accès demandé et application des quotas', 'Tant que ton compte existe. À sa suppression, le journal est anonymisé'],
              ['Mesurer la fréquentation et la provenance des inscriptions', 'Domaine de provenance, indication de source, rubrique visitée et mode d’ouverture du site avant agrégation', 'Fonctionnement et amélioration du service (statistiques internes)', 'Provenance utilisée pendant 30 jours dans le navigateur, puis seuls des compteurs anonymes par jour sont conservés'],
              ['Permettre l’essai et le suivi de la préparation', 'Identifiants d’appareil ou d’installation, données techniques de secours, progression, actions, réponses, scores et durée des tentatives', 'Exécution du service de préparation que tu utilises (essai, reprise de ta progression)', 'Tant que tu utilises la préparation. Supprimées avec ton compte'],
              ['Afficher ta participation au classement public', 'Pseudonyme et résultats affichés', 'Participation affichée par défaut, que tu peux désactiver à tout moment avec le réglage de visibilité du classement', 'Tant que ton profil est visible dans le classement'],
              ['Traiter tes signalements, tes demandes et tes réclamations', 'Coordonnées, contenu des échanges, signalements d’erreurs et justificatifs utiles', 'Exécution du service demandé ou obligation légale, selon la demande', 'Le temps de traiter la demande et d’en garder la trace'],
              ['Traiter les abonnements, les paiements et leur confirmation', 'Montant, statut, référence GeniusPay, moyen de paiement, numéro utilisé lorsque nécessaire et confirmations techniques du prestataire', 'Exécution de la commande', 'Le temps exigé par les obligations comptables et la preuve des opérations'],
              ['Gérer le parrainage, les commissions et les retraits', 'Lien de parrainage, commission, prénom, nom, téléphone, opérateur, montant et statut du retrait', 'Exécution du parrainage ou du retrait demandé', 'Le temps exigé par les obligations comptables et la preuve des opérations'],
              ['Conserver les preuves et les pièces nécessaires', 'Version et date d’acceptation des conditions, éléments de souscription, de facturation et de comptabilité', 'Exécution du contrat et obligations légales applicables', 'Tant que ton compte existe, puis le temps exigé pour la preuve des opérations'],
              ['Envoyer les rappels web que tu actives', 'Adresse technique de l’abonnement aux notifications et clés associées', 'Ton consentement lorsque tu actives les notifications', 'Jusqu’à ce que tu désactives les notifications ou que ton navigateur retire l’abonnement'],
            ],
          } },
          { p: 'Les mots de passe, certains codes et certaines traces sont hachés. Cela veut dire qu’ils sont transformés en empreinte. Une empreinte ou un pseudonyme peut rester une donnée personnelle. Les statistiques de fréquentation conservées sous forme de compteurs anonymes sont regroupées par jour, source et rubrique.' },
          { p: 'Quand tu actives les rappels web, ton navigateur transmet une adresse technique et les clés nécessaires à l’envoi. Tu peux retirer ton accord dans les réglages de notifications de ton navigateur. Les e-mails de vérification et de récupération d’accès servent au fonctionnement du service.' },
        ],
      },
      {
        id: 'identifiants-de-preparation',
        titre: 'Identifiants d’appareil et préparation',
        blocs: [
          { p: 'La préparation peut créer une identité technique dès l’utilisation de l’application, y compris pendant un essai sans compte. Elle sert à reconnaître l’installation, à gérer l’essai et à retrouver la progression.' },
          { p: 'L’application génère un identifiant aléatoire et le garde dans le stockage sécurisé de l’appareil. Selon la plateforme et la version, elle peut aussi utiliser l’identifiant Android « ANDROID_ID » ou, dans une version native iOS si elle est déployée, « identifierForVendor ». En secours, une combinaison d’informations techniques peut servir d’empreinte, par exemple le modèle, le système, la langue et les caractéristiques de l’écran.' },
          { p: 'Le site peut aussi garder un identifiant de préparation dans le navigateur. L’identité de préparation peut être reliée à ton compte. Le rattachement se fait quand tu te connectes : ta progression te suit alors d’un appareil à l’autre.' },
        ],
      },
      {
        id: 'destinataires-et-prestataires',
        titre: 'Qui peut recevoir des données',
        blocs: [
          { liste: [
            'Les personnes habilitées chez Fatafalta, selon leurs missions, pour le support, les opérations, la sécurité ou la comptabilité.',
            'Cloudflare Pages pour le site, Render pour l’API, MongoDB Atlas pour la base de données et Cloudflare R2 pour le stockage de fichiers.',
            'Brevo, Mailjet ou Resend pour les e-mails de service, selon le prestataire utilisé.',
            'GeniusPay et Wave pour les paiements. Si d’autres moyens de paiement sont activés, PawaPay et l’opérateur concerné peuvent intervenir.',
            'L’opérateur mobile money choisi pour un retrait de commission.',
            'Le service de notifications de ton navigateur, qui peut être opéré par Google si ton navigateur utilise son service.',
            'YouTube et Google pour les requêtes liées à la miniature et au lecteur vidéo, selon le support et ce que tu actives. La [politique des cookies](/politique-cookies) explique ces usages.',
            'Les personnes qui consultent le classement lorsque ton profil y est visible, pour ton pseudonyme et les résultats affichés.',
            'Les autorités habilitées lorsque la loi le prévoit.',
          ] },
        ],
      },
      {
        id: 'transferts-internationaux',
        titre: 'Données hors de Côte d’Ivoire',
        blocs: [
          { p: 'Fatafalta utilise des prestataires internationaux (voir ci-dessus). Tes données peuvent donc être hébergées ou sauvegardées hors de Côte d’Ivoire, sur leurs serveurs.' },
          { p: 'Fatafalta choisit des prestataires reconnus qui protègent les données qu’ils hébergent (accès restreint, connexions chiffrées).' },
        ],
      },
      {
        id: 'mineurs-et-classement',
        titre: 'Si tu es mineur',
        blocs: [
          { p: 'Demande de l’aide à ton parent ou à ton représentant légal si tu as une question sur tes données. Ton représentant légal peut intervenir selon les règles applicables. Tu peux masquer ton profil dans le classement. Si tu choisis un pseudonyme, évite tout renseignement qui permet de te reconnaître.' },
          { p: 'Tu peux demander le retrait de données qui ont été rendues publiques lorsque tu étais mineur, dans les conditions de la loi n° 2013-450.' },
        ],
      },
      {
        id: 'droits-et-artci',
        titre: 'Tes droits et l’ARTCI',
        blocs: [
          { p: 'La loi n° 2013-450 te permet de demander des informations sur l’usage de tes données, une copie, leur mise à jour, leur rectification, leur effacement ou la limitation de leur usage, selon le cas. Tu peux t’opposer à certains traitements dans les conditions de la loi. Tu peux retirer ton consentement quand il sert de base au traitement. Tu peux aussi demander une copie dans un format électronique réutilisable ou exercer ton droit à la portabilité lorsque les conditions sont réunies.' },
          { p: 'Pour exercer tes droits, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com). Précise ta demande. Si une vérification d’identité est nécessaire, Fatafalta te demande les informations utiles à cette vérification. Si ton profil a été rendu public, Fatafalta prend les mesures raisonnables prévues par la loi pour informer les tiers concernés de ta demande d’effacement des liens ou copies.' },
          { p: 'Tu peux consulter tes droits ou adresser une plainte à l’ARTCI, l’autorité de protection des données personnelles en Côte d’Ivoire. [Contacter l’ARTCI](https://www.autoritedeprotection.ci/contact/).' },
        ],
      },
      {
        id: 'effacement-et-conservation',
        titre: 'Effacement et conservation',
        blocs: [
          { p: 'La page [Supprimer ton compte et tes données](/suppression-compte) explique la démarche et ce qui est supprimé, anonymisé ou conservé. Certaines pièces de transaction restent nécessaires pour les obligations comptables et la preuve des opérations. Tu peux demander l’effacement de certaines données sans fermer ton compte, dans les conditions de la loi n° 2013-450.' },
        ],
      },
    ],
  },
  {
    slug: 'politique-cookies',
    titre: 'Politique des cookies',
    resume: 'Consulte les cookies et les données enregistrées dans ton navigateur par Fatafalta, leurs durées et les réglages que tu peux utiliser.',
    essentiel: [
      'Des cookies permettent de te connecter et de garder ta session.',
      'Ton navigateur peut garder des jetons, des préférences et la provenance de ta visite.',
      'Sur le site, le lecteur YouTube se charge quand tu cliques sur la vidéo.',
      'Fatafalta n’utilise actuellement aucun outil tiers de mesure d’audience.',
      'Tu peux gérer les cookies et le stockage dans ton navigateur.',
    ],
    sections: [
      {
        id: 'cookies',
        titre: 'Cookies envoyés par Fatafalta',
        blocs: [
          { p: 'Un cookie est une petite donnée que ton navigateur peut renvoyer au site ou à son API. Les cookies « token » et « refreshToken » servent à l’authentification. Ils sont protégés par le réglage « HttpOnly », qui empêche les scripts de la page de les lire.' },
          { tableau: {
            entetes: ['Cookie', 'Rôle', 'Durée'],
            lignes: [
              ['token', 'Présenter le jeton d’accès lors des requêtes authentifiées', '30 jours au plus'],
              ['refreshToken', 'Renouveler la connexion sans te redemander ton mot de passe', 'Suit la durée de la session, qui expire après 30 jours sans visite ou au bout de 180 jours au maximum'],
              ['ff_vid', 'Reconnaître le visiteur sans compte pour appliquer son quota de téléchargements, si le navigateur accepte ce cookie', '365 jours'],
            ],
          } },
        ],
      },
      {
        id: 'youtube',
        titre: 'Miniature et lecteur YouTube',
        blocs: [
          { p: 'Sur le site, la vidéo s’affiche d’abord sous forme de miniature. La miniature peut être chargée depuis un serveur de YouTube. Le lecteur lui-même se charge quand tu cliques, en mode de confidentialité avancée sur « youtube-nocookie.com ». Le chargement du lecteur et la lecture peuvent entraîner des échanges de données avec YouTube. YouTube peut utiliser ses propres cookies ou stockages lors de la lecture.' },
          { p: 'Dans l’application Android, les vidéos passent par le lecteur YouTube intégré officiel. Tu peux décider de lancer la vidéo. Pour en savoir plus, consulte les [règles de confidentialité de Google](https://policies.google.com/privacy?hl=fr) et l’[aide sur le lecteur YouTube](https://support.google.com/youtube/answer/171780?hl=fr).' },
        ],
      },
      {
        id: 'analyse-et-reglages',
        titre: 'Mesure d’audience et réglages',
        blocs: [
          { p: 'Aucun outil tiers de mesure d’audience, dont Google Analytics, n’est actif. Si Fatafalta active un tel outil, elle te demandera ton consentement avant de l’utiliser.' },
          { p: 'Tu peux effacer ou bloquer des cookies et des données du site dans ton navigateur. Effacer les jetons peut te déconnecter. Effacer les préférences rétablit l’affichage par défaut. Effacer les données locales de préparation peut faire perdre des actions en attente d’envoi. Les réglages du navigateur permettent aussi de retirer l’autorisation des notifications web. Pour les traitements liés, consulte la [politique de confidentialité](/politique-confidentialite).' },
        ],
      },
    ],
  },
  {
    slug: 'politique-securite',
    titre: 'Sécurité et utilisation acceptable',
    resume: 'Lis les règles de sécurité de Fatafalta, les usages permis, les mesures possibles et la marche à suivre pour signaler un problème.',
    essentiel: [
      'Utilise seulement tes propres accès et respecte les quotas.',
      'Les moteurs de recherche peuvent indexer les pages publiques prévues à cet effet.',
      'Tout test de sécurité exige une autorisation écrite préalable.',
      'Si tu découvres un problème en utilisant le service, arrête l’action en cause et écris à Fatafalta.',
      'Tu peux contester une mesure qui touche ton accès.',
    ],
    sections: [
      {
        id: 'acces-et-protection',
        titre: 'Utiliser et protéger tes accès',
        blocs: [
          { p: 'Utilise ton compte et les fonctions qui te sont ouvertes. Garde tes codes, ton mot de passe et tes jetons secrets. Si tu soupçonnes un accès à ton compte, ferme les connexions concernées dans « Mes appareils » (Compte > Profil, sur le site) et change ton mot de passe : le changement ferme toutes tes sessions. En cas de besoin, contacte Fatafalta.' },
          { p: 'Fatafalta limite le nombre de certaines requêtes, protège la connexion contre des échecs répétés et utilise des droits d’accès par rôle, des quotas et des liens temporaires de téléchargement. Les traitements nécessaires à la protection du service sont décrits dans la [politique de confidentialité](/politique-confidentialite).' },
        ],
      },
      {
        id: 'usages-interdits',
        titre: 'Usages interdits',
        blocs: [
          { p: 'Sur le site, l’application et l’API, les comportements suivants sont interdits.' },
          { liste: [
            'Tenter une intrusion, accéder sans droit à un compte, à une donnée ou à une fonction, ou s’y maintenir.',
            'Essayer des mots de passe ou des codes en série par force brute, ou rechercher systématiquement des comptes, identifiants ou ressources par énumération.',
            'Saturer le service, notamment par un déni de service distribué (DDoS), ou perturber son fonctionnement.',
            'Tenter des injections, des attaques par script (XSS), des actions forcées à l’insu d’un utilisateur (CSRF) ou une élévation de privilèges.',
            'Voler ou utiliser les jetons d’autrui, ou copier, extraire ou transférer des données sans autorisation (exfiltration).',
            'Frauder au paiement, aux commissions ou aux retraits, ou introduire ou diffuser des logiciels malveillants.',
            'Créer des comptes automatiquement, extraire massivement des contenus par automatisation (scraping), créer un site miroir ou collecter automatiquement des données d’utilisateurs.',
            'Utiliser l’API en dehors des usages autorisés ou contourner les quotas, l’authentification, les liens temporaires ou les autres protections.',
          ] },
          { p: 'Certains comportements peuvent relever de la loi n° 2013-451 relative à la lutte contre la cybercriminalité, telle que modifiée par la loi n° 2023-593, si les conditions de l’infraction sont réunies. [Textes sur la cybercriminalité](https://www.anssi.gouv.ci/reglementations/textes-nationaux/lois/).' },
        ],
      },
      {
        id: 'robots-d-indexation',
        titre: 'Robots d’indexation',
        blocs: [
          { p: 'Les moteurs de recherche peuvent explorer les pages publiques ouvertes à l’indexation pour les référencer. Ils doivent respecter les directives d’indexation publiées et les limites de débit. Cette permission exclut les comptes, les classements contenant des données personnelles, les espaces payants et les liens de téléchargement signés. Les usages permis par la loi restent réservés.' },
        ],
      },
      {
        id: 'autorisation-de-tests',
        titre: 'Autorisation écrite avant tout test',
        blocs: [
          { p: 'Un test d’intrusion, un scan de sécurité ou un test de charge exige une autorisation écrite préalable de l’éditeur. L’autorisation fixe les services visés, les dates, les activités permises et le contact à prévenir en cas de problème. Pour les services d’un tiers, il faut aussi l’autorisation de la personne habilitée à l’accorder.' },
        ],
      },
      {
        id: 'signalement-responsable',
        titre: 'Signaler un problème de sécurité',
        blocs: [
          { p: 'Si tu découvres un problème en utilisant normalement le service, cesse l’action en cause. Écris en privé à [contact@fatafalta.com](mailto:contact@fatafalta.com), avec « Sécurité » dans l’objet.' },
          { p: 'Indique le service et l’adresse concernés, la date, ce que tu as observé et l’impact possible. Limite les pièces jointes aux éléments déjà obtenus et nécessaires au signalement. Masque les données personnelles, les mots de passe, les jetons et les autres secrets.' },
          { p: 'Arrête immédiatement l’action si tu vois des données d’autrui ou si le service risque d’être perturbé. Respecte les limites de ton accès. La collecte de preuves supplémentaires dans les comptes d’autrui, la copie de données et les demandes sous menace sont interdites. Garde les secrets et les données personnelles hors de toute publication. Si tu envisages de publier le problème, coordonne la date avec Fatafalta. Tu gardes le droit de t’adresser aux autorités compétentes.' },
          { p: 'Fatafalta accuse réception et examine le rapport. Elle peut te demander une précision et te tenir au courant du traitement. Elle traite en priorité les problèmes qui exposent des données.' },
          { p: 'Dans la mesure permise par la loi, Fatafalta s’engage à ne pas agir contre toi du seul fait d’un signalement de bonne foi ou d’une activité conforme à son autorisation écrite. Cet engagement couvre les décisions que Fatafalta peut prendre elle-même. Les autorités et les tiers conservent leurs droits.' },
        ],
      },
      {
        id: 'mesures-et-contestation',
        titre: 'Mesures graduées et contestation',
        blocs: [
          { p: 'Atteindre un quota entraîne la limite prévue pour la fonction concernée. Un nouvel appareil, une adresse IP, le dépassement d’un quota ou la fermeture automatique d’une session ne suffit pas à établir un partage. Une connexion inhabituelle ou un changement d’appareil peut mener à une vérification.' },
          { p: 'Selon les faits, Fatafalta peut t’avertir, te demander de sécuriser ton compte, limiter temporairement la fonction concernée ou suspendre l’accès pour une durée proportionnée. La résiliation est réservée à un manquement grave établi ou à une récidive établie après avertissement. Une personne habilitée examine les faits avant toute sanction définitive.' },
          { p: 'En cas de menace immédiate, Fatafalta peut prendre d’abord une mesure temporaire pour protéger le compte, les données ou le service. Elle la réexamine rapidement et la lève quand le risque cesse. Elle communique les motifs utiles, la durée ou les conditions de levée, et la façon de contester, dans la mesure compatible avec la sécurité et les droits d’autrui.' },
          { p: 'Tu peux contester, même si ton compte est suspendu, à [contact@fatafalta.com](mailto:contact@fatafalta.com). Une personne habilitée réexamine la mesure et t’explique la décision. La réponse est donnée dans les meilleurs délais. Si la mesure se révèle injustifiée, Fatafalta rétablit ton accès et régularise la période payée affectée. Tes autres recours restent ouverts.' },
        ],
      },
    ],
  },
  {
    slug: 'propriete-intellectuelle',
    titre: 'Propriété intellectuelle',
    resume: 'Identifie les droits sur les contenus de Fatafalta, ce que tu peux utiliser à titre personnel et comment demander le retrait d’un contenu.',
    essentiel: [
      'Utilise les ressources accessibles pour ton travail personnel.',
      'Les sujets, les corrigés et les vidéos peuvent appartenir à des tiers.',
      'Regarde les vidéos YouTube dans le lecteur prévu.',
      'Tu peux signaler un contenu qui porte atteinte à tes droits.',
    ],
    sections: [
      {
        id: 'origine-et-droits',
        titre: 'Origine des contenus et droits',
        blocs: [
          { p: 'Les cours, leçons et exercices originaux sont écrits pour Fatafalta. Les droits sur ces contenus sont ceux de leurs auteurs et des autres titulaires, selon la loi n° 2016-555 relative au droit d’auteur et aux droits voisins et les autorisations accordées. [Loi n° 2016-555](https://www.wipo.int/wipolex/en/legislation/details/16840).' },
          { p: 'Les anciens sujets sont des sujets publics d’examens et de concours, publiés par les organismes qui les organisent. Les corrigés peuvent venir d’organismes, de sites tiers ou d’autres auteurs. La provenance et le crédit sont indiqués lorsqu’ils sont établis. La mise en ligne ou l’origine publique d’un document ne donne, à elle seule, aucun droit de le reproduire ou de le rediffuser.' },
          { p: 'Les vidéos de chaînes YouTube sont créditées et intégrées avec le lecteur officiel. Les droits restent à leurs titulaires. Les noms et marques des organismes cités restent ceux de leurs titulaires. Ils servent à identifier les examens, les concours ou les sources.' },
        ],
      },
      {
        id: 'licence-personnelle',
        titre: 'Utilisation à titre personnel',
        blocs: [
          { p: 'Dans la limite des droits dont Fatafalta dispose, tu peux consulter les contenus auxquels tu as accès et télécharger les PDF pour lesquels le téléchargement est proposé. Cette autorisation est personnelle, non exclusive et non transférable. Elle couvre tes révisions, dans les limites d’accès et de quota prévues. Les usages et exceptions permis par la loi n° 2016-555 restent applicables.' },
          { p: 'En dehors des usages permis par la loi ou autorisés par le titulaire des droits, il est interdit de republier, rediffuser, vendre ou partager les fichiers, de les intégrer à un autre service ou de les extraire en masse. Respecte les crédits et les mentions de source. Tu peux partager le lien vers une page publique, dans le respect des droits applicables.' },
          { p: 'Utilise le lecteur prévu pour regarder une vidéo YouTube. Tout téléchargement, enregistrement ou republication d’une vidéo relève des droits de ses titulaires et des règles applicables.' },
        ],
      },
      {
        id: 'signalement-et-retrait',
        titre: 'Signaler un contenu et demander son retrait',
        blocs: [
          { p: 'Si tu es titulaire de droits ou si tu représentes un titulaire, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com). Indique le titre ou décris le contenu, donne l’adresse de la page et précise le droit invoqué et la raison de ta demande. Joins un justificatif utile de tes droits ou de ton mandat et indique comment te répondre.' },
          { p: 'Fatafalta examine la demande et peut demander des précisions. Elle peut limiter temporairement l’accès au contenu pendant la vérification. Si cela est utile et compatible avec les droits de chacun, elle invite les personnes concernées à présenter leurs observations. Elle peut corriger le crédit, retirer le contenu ou rétablir l’accès, selon le résultat de l’examen.' },
          { p: 'Fatafalta t’informe de la suite donnée. Tu peux demander un réexamen par e-mail ou saisir l’autorité ou la juridiction compétente. Fatafalta traite ces demandes dans les meilleurs délais.' },
        ],
      },
    ],
  },
  {
    slug: 'mentions-legales',
    titre: 'Mentions légales',
    resume: 'Retrouve l’éditeur de Fatafalta, son contact et la direction de la publication.',
    essentiel: [
      'Fatafalta est un projet étudiant d’entraide, sans but de vente de sujets.',
      'Tu peux contacter Fatafalta à [contact@fatafalta.com](mailto:contact@fatafalta.com).',
      'Fatafalta est indépendante des organismes d’examens et de concours.',
    ],
    sections: [
      {
        id: 'editeur',
        titre: 'Éditeur',
        blocs: [
          { p: 'Fatafalta est un projet personnel, créé et édité par un étudiant en informatique pour aider les candidats aux examens et concours en Côte d’Ivoire.' },
          { liste: [
            'Nom du service : Fatafalta.',
            'Site : [fatafalta.com](https://fatafalta.com).',
            'Contact et direction de la publication : [contact@fatafalta.com](mailto:contact@fatafalta.com).',
          ] },
          { p: 'Fatafalta ne vend pas les sujets. Les sujets proposés sont des sujets publics d’examens et de concours. L’abonnement sert uniquement à couvrir l’hébergement et les autres frais de fonctionnement du service.' },
        ],
      },
      {
        id: 'contacts-et-documents',
        titre: 'Contact et documents',
        blocs: [
          { p: 'Tu peux écrire à [contact@fatafalta.com](mailto:contact@fatafalta.com) pour une réclamation, une question sur les données, un signalement de sécurité ou une demande liée aux droits sur un contenu.' },
          { p: 'Consulte les [conditions d’utilisation](/conditions-utilisation), les [conditions d’abonnement](/conditions-vente) et la [politique de confidentialité](/politique-confidentialite).' },
        ],
      },
    ],
  },
  {
    slug: 'suppression-compte',
    titre: 'Supprimer ton compte et tes données',
    resume: 'Demande la suppression de ton compte Fatafalta et découvre les effets sur ton abonnement, tes données et tes opérations de paiement.',
    essentiel: [
      'Tu peux demander la suppression sur le site, dans l’application ou par e-mail.',
      'La suppression ferme tes sessions et efface la préparation liée à ton compte.',
      'Tu perds l’accès à ton abonnement en cours lorsque ton compte est supprimé.',
      'Un retrait en cours bloque la suppression automatique du compte.',
      'Certaines pièces de transaction sont conservées pour la comptabilité et la preuve des opérations.',
    ],
    sections: [
      {
        id: 'faire-la-demande',
        titre: 'Comment demander la suppression',
        blocs: [
          { liste: [
            'Sur le site, connecte-toi et ouvre Compte > Profil > « Supprimer mon compte ». Saisis ton mot de passe pour confirmer.',
            'Dans l’application, ouvre l’onglet Compte > « Supprimer mon compte », puis confirme avec ton mot de passe.',
            'Sans accès au compte ou à l’application, écris à [contact@fatafalta.com](mailto:contact@fatafalta.com) avec « Suppression du compte » dans l’objet. Indique l’adresse e-mail liée au compte et explique ce que tu veux supprimer. Garde ton mot de passe et tes codes pour toi.',
          ] },
          { p: 'Pour une demande envoyée par e-mail, Fatafalta peut vérifier que tu es titulaire du compte ou que tu es autorisé à agir. Si ta demande concerne une préparation utilisée sans compte, précise le support que tu as utilisé et la période concernée afin d’aider Fatafalta à retrouver les données.' },
          { p: 'Tu peux aussi demander l’effacement de certaines données sans supprimer ton compte, dans les conditions de la loi n° 2013-450. Consulte tes droits dans la [politique de confidentialité](/politique-confidentialite).' },
        ],
      },
      {
        id: 'retrait-en-cours',
        titre: 'Si un retrait de commission est en cours',
        blocs: [
          { p: 'La suppression depuis ton compte est bloquée tant qu’un retrait est en cours. Attends la fin du traitement ou annule le retrait si cette option est disponible. Si la situation est bloquée ou si des commissions te sont dues, écris à Fatafalta pour obtenir le traitement de ta demande et de l’opération. Tu peux toujours exercer séparément tes droits sur tes données.' },
        ],
      },
      {
        id: 'donnees-et-traces',
        titre: 'Ce qui est supprimé, anonymisé ou conservé',
        blocs: [
          { tableau: {
            entetes: ['Données', 'Ce qui se passe'],
            lignes: [
              ['Préparation liée au compte', 'Les identités de préparation, la progression, les tentatives, les actions et les signalements sont supprimés. La participation liée au compte est retirée du classement.'],
              ['Notifications, codes e-mail et sessions', 'Les abonnements aux notifications, les codes de vérification ou de récupération et les liens de connexion temporaires sont supprimés. Les sessions sont révoquées.'],
              ['Compte', 'La fiche de compte est anonymisée. Les coordonnées d’origine et l’ancien mot de passe sont retirés ou remplacés. Le compte est fermé. Un identifiant technique relie encore la fiche aux opérations conservées.'],
              ['Journal des téléchargements liés au compte', 'Les champs qui indiquent le compte, l’adresse IP et le navigateur sont retirés du journal.'],
              ['Paiements, abonnements, commissions et retraits', 'Les enregistrements restent rattachés à la fiche de compte anonymisée pour les obligations comptables et la preuve des opérations. Certaines pièces peuvent encore contenir des données nécessaires à ces fins, notamment des coordonnées de retrait. Elles sont gardées le temps exigé par ces obligations.'],
            ],
          } },
          { p: 'Les données gardées pour répondre à une obligation légale ou conserver la preuve d’une opération sont réservées aux besoins correspondants. Les copies de sauvegarde tenues par les prestataires d’hébergement disparaissent au fil de leur renouvellement.' },
          { p: 'Les fichiers déjà téléchargés et les données conservées localement sont sur ton appareil. Tu peux effacer les fichiers et les données du site ou de l’application dans ses réglages. Consulte la [politique des cookies](/politique-cookies) pour le navigateur.' },
        ],
      },
      {
        id: 'delais-et-suivi',
        titre: 'Délais et suivi',
        blocs: [
          { p: 'Le traitement démarre quand tu confirmes la suppression. Lorsque la demande aboutit, le site affiche une confirmation et l’application te déconnecte.' },
          { p: 'Si tu demandes la suppression par e-mail, Fatafalta te répond à cette adresse et traite la demande dans les meilleurs délais. Depuis le site ou l’application, la suppression est immédiate.' },
          { p: 'Quand les conditions légales de l’effacement sont réunies, il intervient sans délai, sous réserve des exceptions prévues par la loi n° 2013-450. Tu peux contacter l’ARTCI si tu veux faire valoir tes droits. [Contacter l’ARTCI](https://www.autoritedeprotection.ci/contact/).' },
        ],
      },
      {
        id: 'abonnement-apres-suppression',
        titre: 'Effet sur ton abonnement',
        blocs: [
          { p: 'La suppression met fin à ton accès au compte et à la période d’abonnement en cours, même s’il te restait du temps payé. L’abonnement fonctionne par paiements manuels. Pour une demande liée à un paiement ou au remboursement d’une somme due, contacte Fatafalta. Tes droits légaux restent applicables. Consulte les [conditions d’abonnement](/conditions-vente).' },
        ],
      },
    ],
  },
];

export const documentBySlug = (slug) => DOCUMENTS.find((d) => d.slug === slug) || null;
export const legalSeo = (doc) => ({ title: `${doc.titre} — Fatafalta`, description: doc.resume, path: `/${doc.slug}` });
