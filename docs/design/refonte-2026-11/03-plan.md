# Plan de refonte priorisé

Chaque lot : livrable seul, vérifié sur Android (et iOS quand possible), petit écran + grand texte,
logique métier, routes et données inchangées. Exécution : ChatGPT (Codex) code, Claude vérifie ;
Claude reprend si le quota ChatGPT est épuisé.

| Lot | Contenu | Taille | Modèle |
|---|---|---|---|
| **0. Fondations** | utilitaire `ordinal()` + correction de tous les « 1ᵉ » ; suppression des sur-titres d'écran ; état désactivé lisible (`PrepButton`, `Button`) ; `components/ui/Button` aligné sur `PrepButton` ; remplacement des 105 couleurs en dur par des jetons | M | gpt-6.1-sol, moyen |
| **1. Accueil Prépa** | héros unique « La copie du jour » ; stats compactées en une ligne (le détail vit dans Mon bilan) ; « Révisions » intégré au héros ou en ligne ; parcours en marge, modules à venir regroupés, coin corné réservé au maîtrisé | L | gpt-6-astra, élevé |
| **2. Leçon et session** | marges du tableau, état « Vérifier » ; retour d'exercice en annotation de correcteur ; tampon « Maîtrisé » en fin de module ; bilan de session | L | gpt-6-astra, élevé |
| **3. Mon bilan + classement** | hiérarchie sans doublons, tendance sur 7 jours, rythme commun podium / liste, tableau d'affichage | M | gpt-6.1-sol, élevé |
| **4. Sujets / documents** | feuille plus haute, en-tête compact, détail document, téléchargements, lecteur PDF | M | gpt-6.1-sol, moyen |
| **5. Compte / Moi / abonnement** | une seule action principale, essai explicite (« 1 jour sur 7 utilisé »), connexion / inscription, portefeuille, retrait, codes promo | M | gpt-6.1-sol, moyen |
| **6. Onboarding + choix du concours + révisions + concours blanc** | cohérence avec les lots 1–2 | M | gpt-6.1-sol, moyen |
| **7. Mode sombre « Nuit d'étude »** | jetons sombres, bascule système, vérification de contraste écran par écran | L | gpt-6-astra, élevé |
| **8. Adaptativité + polish final** | grandes polices, petits écrans (SE), tablette, paysage ; passe `/impeccable polish` | M | gpt-6.1-sol, élevé |
| (Admin) | écrans d'administration : seulement lots 0 et 8 (cohérence), pas de refonte | S | gpt-6-luna |

Images éventuelles (via ChatGPT) : tampon « Maîtrisé » (lot 2), halo de lampe (lot 7). À décider au lot.

Critères d'acceptation communs : une action principale par écran dans le tiers bas ; cibles ≥ 44 pt ;
contraste ≥ 4,5:1 ; aucune couleur hors jetons ; or rare ; états chargement / vide / erreur / verrouillé ;
animations Reanimated transform/opacity, « Réduire les animations » respecté ; captures avant / après.
