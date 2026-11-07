# Vidéos Fatafalta — consignes de qualité (gabarit de génération)

Ces consignes accompagnent chaque dossier de génération (`npm run video:brief`) et s'appliquent à
tout générateur de vidéo, humain ou IA. Elles priment sur toute autre préférence de style.

## 1. Simple, claire et détaillée

- Une idée par scène. Phrases courtes, vocabulaire courant, ton bienveillant (tutoiement, comme l'application).
- Détaillée ne veut pas dire longue : chaque étape d'un raisonnement est montrée, aucune n'est sautée.
- **Aucune durée imposée** : la durée suit le module (un module court donne une vidéo courte).
- Fin de vidéo : récapitulatif des points à retenir (blocs « À retenir » et « Récapitulatif » du module).

## 2. Expliquer AVANT d'utiliser

- Toute notion difficile, tout thème, terme technique ou concept avancé est **défini dans une scène
  antérieure ou dans la scène même où il apparaît pour la première fois**, avec un exemple concret.
- Le dossier de génération fournit le **glossaire ordonné** (termes dans l'ordre de première
  apparition dans le cours) : chaque terme doit être défini avant sa première utilisation.
- Le storyboard déclare, scène par scène, les termes définis (`definit`) et utilisés (`utilise`) ;
  `verifierStoryboard` refuse un storyboard qui utilise un terme avant de l'avoir défini.
- Cours de langue, version française : la grammaire est expliquée en français, les phrases étudiées
  sont dites en anglais, lentement, puis traduites. Version anglaise : tout en anglais, débit naturel.

## 3. Visuels représentatifs et de qualité

- Chaque scène porte un visuel **utile au propos** : schéma, illustration, animation, tableau ou
  formule animée. Pas de décor gratuit, pas de banque d'images sans rapport.
- Tableaux du cours → tableaux animés ligne par ligne ; formules → construction pas à pas ;
  pièges fréquents → visuel « erreur / correction » côte à côte.
- Identité « La copie d'excellence » : encre `#0D1B32`, papier `#FCFAF5`, bordeaux `#6C2838` pour
  l'action, or `#B48A48` rare ; titres en Playfair Display, texte en Inter.
- Texte à l'écran lisible sur téléphone (corps ≥ 28 px en 1080p), contrastes ≥ 4,5:1, sous-titres incrustés.
- Mouvement sobre et cohérent avec le propos (apparition, surlignage, flèche qui relie) ; aucun clignotement.

## 4. Exactitude

- Le contenu vient **uniquement** du module ou du concours concerné (dossier de génération) : aucun fait
  ajouté. Un fait daté ou incertain (épreuves, coefficients) est présenté comme « à vérifier sur l'avis
  de concours de l'année ».
- Relecture par un second modèle d'une autre famille puis validation du propriétaire (§ 26.2) avant
  la publication.
