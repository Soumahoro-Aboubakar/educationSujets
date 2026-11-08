/** Textes maîtrisés pour l’interface. Ne jamais afficher une exception ou une réponse brute. */
const TITLES = {
  general: 'Action interrompue', telechargement: 'Téléchargement interrompu',
  paiement: 'Paiement non abouti', moyensPaiement: 'Moyens de paiement indisponibles', abonnement: 'Abonnement indisponible',
  classement: 'Classement momentanément indisponible', recherche: 'Recherche momentanément indisponible',
  profil: 'Profil indisponible', pdf: 'Préparation du PDF interrompue',
  ouverture: 'Ouverture du document interrompue', partage: 'Partage du document interrompu',
  envoi: 'Envoi du document interrompu', connexion: 'Connexion au compte interrompue',
  inscription: 'Création du compte interrompue', catalogue: 'Catalogue indisponible',
  portefeuille: 'Portefeuille indisponible', retrait: 'Demande de retrait interrompue',
  suppression: 'Suppression interrompue', restauration: 'Restauration interrompue',
  enregistrement: 'Enregistrement interrompu', image: 'Modification de l’image interrompue',
  selection: 'Sélection du fichier interrompue', corbeille: 'Corbeille indisponible',
  documents: 'Documents indisponibles', entrainement: 'Entraînement indisponible', codePromo: 'Code promotionnel indisponible',
  verification: 'Vérification momentanément indisponible', video: 'Vidéo momentanément indisponible',
};

// Liste fermée : un texte simplement « lisible » peut encore contenir un détail technique.
// Les valeurs sont rédigées ici ; aucune chaîne reçue n’est renvoyée telle quelle.
const VALIDATION_MESSAGES = {
  'Email invalide': ['Vérifie ton adresse e-mail, puis réessaie.', 'Vérifiez votre adresse e-mail, puis réessayez.'],
  'Adresse email invalide': ['Vérifie ton adresse e-mail, puis réessaie.', 'Vérifiez votre adresse e-mail, puis réessayez.'],
  'Cet email est déjà utilisé': ['Cette adresse e-mail est déjà utilisée. Connecte-toi ou utilise une autre adresse.', 'Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.'],
  'Identifiants incorrects': ['Vérifie ton adresse e-mail et ton mot de passe, puis réessaie.', 'Vérifiez votre adresse e-mail et votre mot de passe, puis réessayez.'],
};

// Seules les erreurs créées ici peuvent porter un message local spécifique.
const localErrors = new WeakMap();
const LOCAL_MESSAGES = {
  pdf_preparation: ['Préparation du PDF interrompue', 'Réessaie avec le même fichier ou choisis un autre document.', 'Réessayez avec le même fichier ou choisissez un autre document.'],
  pdf_taille: ['PDF trop volumineux', 'Choisis un PDF de moins de 25 Mo.', 'Choisissez un PDF de moins de 25 Mo.'],
  pdf_pages: ['PDF trop long', 'Choisis un PDF de 300 pages maximum.', 'Choisissez un PDF de 300 pages maximum.'],
  pdf_format: ['PDF illisible', 'Choisis un autre PDF ou une copie sans mot de passe.', 'Choisissez un autre PDF ou une copie sans mot de passe.'],
  pdf_lecture: ['PDF inaccessible', 'Sélectionne à nouveau le fichier depuis les documents de ton appareil.', 'Sélectionnez à nouveau le fichier depuis les documents de votre appareil.'],
  pdf_images: ['Images requises', 'Sélectionne des images pour créer ton PDF.', 'Sélectionnez des images pour créer votre PDF.'],
  attente: ['L’attente a été trop longue', 'Réessaie dans quelques instants.', 'Réessayez dans quelques instants.'],
};
export function createUserError(reason, cause) {
  if (cause && typeof cause === 'object' && localErrors.get(cause) === 'attente') return cause;
  const error = new Error(reason);
  localErrors.set(error, reason);
  return error;
}

export function getUserMessage(error, context = 'general', register = 'tu') {
  const vous = register === 'vous';
  const retry = vous ? 'Réessayez dans quelques instants.' : 'Réessaie dans quelques instants.';
  const connection = vous ? 'Vérifiez votre connexion internet, puis réessayez.' : 'Vérifie ta connexion internet, puis réessaie.';
  const status = Number(error?.response?.status || error?.status);
  const code = error?.response?.data?.code || error?.code;
  const title = Object.prototype.hasOwnProperty.call(TITLES, context) ? TITLES[context] : TITLES.general;
  const reason = error && typeof error === 'object' && localErrors.get(error);
  const local = Object.prototype.hasOwnProperty.call(LOCAL_MESSAGES, reason) && LOCAL_MESSAGES[reason];
  if (local) return { title: local[0], message: local[vous ? 2 : 1] };
  const result = (heading, message) => ({ title: heading, message });

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || (!status && /timeout|timed out|délai dépassé/i.test(error?.message || ''))) {
    return result('L’attente a été trop longue', retry);
  }
  if (!status && (error?.isConnected === false || error?.isInternetReachable === false || code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ENETUNREACH' || error?.request || /^(Network Error|Failed to fetch|Network request failed|offline)$/i.test(error?.message || ''))) {
    return result('Connexion internet indisponible', connection);
  }
  if (status === 401 || code === 'AUTH_REQUIRED') {
    if (context === 'connexion') return result('Connexion au compte non aboutie', vous ? 'Vérifiez vos identifiants, puis réessayez.' : 'Vérifie tes identifiants, puis réessaie.');
    return result('Connexion au compte nécessaire', vous ? 'Connectez-vous à nouveau pour continuer.' : 'Connecte-toi à nouveau pour continuer.');
  }
  if (status === 403) return result('Accès réservé', vous ? 'Vérifiez que votre compte dispose de l’accès nécessaire ou contactez l’assistance Fatafalta.' : 'Vérifie que ton compte dispose de l’accès nécessaire ou contacte l’assistance Fatafalta.');
  if (status >= 500) return result(title, retry);
  if (status === 404) {
    if (context === 'recherche') return result(title, vous ? 'Vous pouvez parcourir le classement en attendant. Réessayez un peu plus tard.' : 'Tu peux parcourir le classement en attendant. Réessaie un peu plus tard.');
    if (context === 'classement') return result(title, vous ? 'Continuez votre préparation et réessayez un peu plus tard.' : 'Continue ta préparation et réessaie un peu plus tard.');
    if (context === 'profil') return result(TITLES.profil, vous ? 'Ce profil peut être masqué ou ne plus être disponible. Consultez un autre candidat.' : 'Ce profil peut être masqué ou ne plus être disponible. Consulte un autre candidat.');
    return result('Élément introuvable', vous ? 'Revenez à la liste et choisissez un autre élément.' : 'Reviens à la liste et choisis un autre élément.');
  }
  if (context === 'paiement' && (status === 402 || ['PAYMENT_DECLINED', 'PAYMENT_FAILED'].includes(code))) return result('Paiement refusé', vous ? 'Vérifiez votre moyen de paiement ou choisissez-en un autre avant de réessayer.' : 'Vérifie ton moyen de paiement ou choisis-en un autre avant de réessayer.');
  if (status === 400 || status === 422) {
    const data = error?.response?.data;
    const candidates = [data?.error, data?.message, ...(Array.isArray(data?.errors) ? data.errors.map((entry) => entry?.msg) : [])];
    const approved = candidates.find((text) => typeof text === 'string' && Object.prototype.hasOwnProperty.call(VALIDATION_MESSAGES, text));
    return result('Informations à vérifier', approved ? VALIDATION_MESSAGES[approved][vous ? 1 : 0] : vous ? 'Vérifiez les informations saisies, puis réessayez.' : 'Vérifie les informations saisies, puis réessaie.');
  }
  if (status === 429) return result('Trop de tentatives rapprochées', retry);
  if (status === 409) return result('Action à vérifier', vous ? 'Actualisez les informations avant de réessayer.' : 'Actualise les informations avant de réessayer.');
  const guidance = {
    ouverture: vous ? 'Vérifiez qu’une application capable d’ouvrir ce document est installée, puis réessayez.' : 'Vérifie qu’une application capable d’ouvrir ce document est installée, puis réessaie.',
    selection: vous ? 'Sélectionnez à nouveau le fichier depuis les documents de votre appareil.' : 'Sélectionne à nouveau le fichier depuis les documents de ton appareil.',
  };
  return result(title, Object.prototype.hasOwnProperty.call(guidance, context) ? guidance[context] : retry);
}

/** Pour les zones de texte qui n’ont pas d’emplacement distinct pour le titre. */
export function getErrorMessage(error, context = 'general', register = 'tu') {
  const { title, message } = getUserMessage(error, context, register);
  return `${title}. ${message}`;
}

/** Arguments d’Alert.alert, sans dépendance à React Native. */
export function getErrorAlert(error, context = 'general', register = 'tu') {
  const { title, message } = getUserMessage(error, context, register);
  return [title, message];
}
