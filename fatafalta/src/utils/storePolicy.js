import { Platform } from 'react-native';

/**
 * Politique commerciale des builds distribués par les stores (Google Play, App Store).
 *
 * L'application native est une application de consultation : elle ne vend rien, n'affiche
 * ni prix ni appel à l'achat, et n'ouvre aucun parcours de paiement (règles Payments de
 * Google Play, « consumption-only »). Les droits acquis ailleurs sont reconnus par le serveur.
 *
 * Seule la version Web (PWA, hors store) conserve le parcours d'abonnement.
 * Cette règle est locale et fermée par défaut : aucune réponse serveur ne peut la rouvrir
 * sur un build natif.
 */
export const PURCHASE_FLOW_AVAILABLE = Platform.OS === 'web';

/** Vrai seulement si la plateforme l'autorise et que le serveur ne l'a pas explicitement désactivé. */
export const canOfferPurchase = (serverAllows) => PURCHASE_FLOW_AVAILABLE && serverAllows !== false;
