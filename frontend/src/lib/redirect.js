import { isStaff } from '../context/AuthContext';

/** Chemin interne sûr (pas de redirection vers un autre site). */
export const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : null);

/** Destination après authentification : la page d'origine, sinon l'espace adapté au rôle. */
export const afterAuthPath = (user, next) => safeNext(next) || (isStaff(user) ? '/dashboard' : '/compte');
