---
version: 1
slug: "frontend-src-pages-prep-preppages-js"
primary_target: "frontend/src/pages/prep/PrepPages.js"
related_targets: []
---

# Espace de préparation web (frontend/src/pages/prep)

Scope : /preparation et ses sous-routes, desktop et mobile (et PWA iOS). Mode : Operate.
Audience : candidats ivoiriens aux concours, débutants et avancés ; compte obligatoire pour étudier.
Tâche : savoir quoi étudier maintenant (débutant) ou aller droit au module voulu (avancé), lire la leçon avec sa vidéo, s'entraîner, voir sa progression.
Contraintes : identité du site (ivoire, encre, or rare, Inter), pas celle d'Expo ; sujets PDF = routes /sujets existantes ; contenus dynamiques ; réseau lent.

## Direction contract

THESIS: Deux entrées pour un même programme : « Mon plan » décide pour le débutant (tâches du jour, alternance des matières), « Programme » rend la main à l'avancé (atlas par matière, accès direct à toute leçon ou niveau). Refuse la grille de cartes de cours identiques.
OWN-WORLD: papier ivoire #FCFAF5, encre #0D1B32 pour le texte et l'action, or #B48A48 seulement pour la maîtrise et le soulignement, filets #E4DED2, Inter très gras et serré pour les titres, chiffres tabulaires ; surfaces plates, aucune ombre hors éléments flottants.
STORY: l'élève arrive, voit sa prochaine tâche et sa journée, l'ouvre en un clic, termine, revient au plan ; l'avancé bascule sur Programme, ouvre n'importe quel module.
FIRST VIEWPORT: desktop : rail gauche 248 px (programme, navigation, lien Sujets) ; colonne principale : titre du programme, bande du jour (objectif en minutes, série), onglets Mon plan / Programme ; liste numérotée de tâches, la première en grand avec son action ; colonne droite 320 px : semaine et matières. Mobile : barre d'onglets basse.
FORM: tableau de bord à deux modes (plan + atlas), n°1 de ma liste reformulée après la réponse de l'utilisateur ; seed: none (unavailable)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
