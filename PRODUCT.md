# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive — trois rendus d'un même produit :
- **Android natif** : application Expo (`fatafalta/`), publiée sur Google Play, avec sa propre identité (« La copie d'excellence » : bordeaux, Playfair, fonds nuit).
- **Web** (`frontend/`, React + Tailwind) : site public des sujets PDF et espace d'apprentissage, sur ordinateur et sur mobile.
- **iOS** : la même application web, installée en PWA depuis Safari (pas d'App Store pour l'instant, faute de budget).

## Users

Candidats ivoiriens aux concours (ENSEA, INFJ, ENS, INPHB, ESATIC, INFAS…), de la fin du lycée aux premières années d'université, souvent débutants. Ils étudient surtout sur téléphone, avec une connexion limitée et des appareils modestes, et sur ordinateur pour des sessions longues. Un même élève peut commencer sur Android, continuer sur ordinateur et finir sur iPhone.

## Product Purpose

Fatafalta réunit deux choses :
1. **Les anciens sujets de concours et leurs corrigés** (PDF), consultables et téléchargeables.
2. **Une préparation guidée** : programmes par concours, modules, leçons courtes (avec une vidéo explicative), exercices corrigés, progression, révisions, classement.

Réussite : l'élève sait toujours quoi faire ensuite, progresse chaque jour un peu, et retrouve sa progression sur tous ses appareils.

## Positioning

Une préparation pensée pour les concours ivoiriens (programmes, droit OHADA/ivoirien, institutions de Côte d'Ivoire), construite sur un catalogue réel de sujets officiels passés, avec une progression unique synchronisée entre l'app Android et le web.

## Access rules (confirmées le 2026-11-17)

- **Sujets et corrigés (web)** : navigation et consultation sans compte, comme aujourd'hui ; ce comportement doit être maintenu.
- **Préparation (web)** : compte obligatoire pour étudier (leçons, exercices, progression). Un visiteur peut découvrir l'offre, mais doit créer un compte avant d'étudier.
- Droits premium vérifiés côté serveur ; mêmes abonnements, permissions et progression sur toutes les plateformes.

## Constraints

- Le web garde sa propre identité graphique (référence : le site actuel), distincte de celle de l'app Expo, qui ne doit pas être uniformisée.
- Pas de troisième rendu des sujets PDF : le web réutilise ses pages existantes (`/sujets`, `/sujets/document/:id`).
- Contenus 100 % dynamiques (organismes, programmes, modules, leçons, vidéos, exercices) depuis l'API existante.
- Performance d'abord : connexions instables, données mobiles chères, appareils peu puissants.
- Langue : français ; tutoiement dans l'espace de préparation (comme l'app).
- Niveau visuel attendu : premium, au niveau des meilleurs designs publiés sur Dribbble, sans effets gratuits.
