# Storyboard — publicité Fatafalta (web)

Durée : **86 s** · 30 i/s · deux montages pilotés par la même timeline (16:9 1920×1080 et 9:16 1080×1920).
Voix : Microsoft Neural `fr-FR-RemyMultilingualNeural` (edge-tts). Musique : composition originale générée par programme.
Les plages ci-dessous sont les durées **réelles**, mesurées sur la voix générée (`src/voice-timings.json`).

| # | Temps | Voix off | Image 16:9 | Adaptation 9:16 |
|---|---|---|---|---|
| 1 | 00:00 – 00:10 | « Tu prépares un concours ? Le BAC, le BEPC, le CAFOP, l'INFAS ou une grande école ? Tu passes des heures à chercher les bons sujets pour t'entraîner ? » | Image 1 : la question claque en gros sur la photo d'un élève qui révise la nuit (lampe, horloge vers minuit). Les pastilles BAC, BEPC, CAFOP, INFAS et Grandes écoles apparaissent quand elles sont prononcées. Une horloge aux aiguilles accélérées accompagne « des heures à chercher… ». | Texte en haut, élève au centre, dégradé encre. |
| 2 | 00:10 – 00:19 | « Et si tout ce dont tu avais besoin était réuni au même endroit ? Découvre Fatafalta, ta plateforme de préparation… » | Les six piliers (sujets, corrigés, leçons vidéo, exercices, concours blancs, progression) convergent sur « Découvre ». Le logo « F corné » apparaît et son coin doré se déplie. Au mot « plateforme », la page d'accueil réelle de fatafalta.com monte en perspective. | Page d'accueil réelle capturée dans Safari sur le simulateur iPhone. |
| 3 | 00:19 – 00:34 | « Tous les concours de Côte d'Ivoire, au même endroit : ENA, INPHB, ESATIC, INFJ, ENSEA, ENS, CAFOP… Plus de mille cent anciens sujets, avec les corrigés disponibles, sur ordinateur comme sur ton téléphone. » | Chaque concours s'allume dans la liste au moment où il est prononcé, et le navigateur affiche sa vraie page d'anciens sujets (ENA, INPHB, INFJ, ENSEA, ENS, CAFOP). Compteurs réels : 1 174 sujets publiés, 25 organismes. Au mot « téléphone », l'iPhone entre avec le catalogue. | Un iPhone affiche la vraie page mobile de chaque concours, puis le catalogue. |
| 4 | 00:34 – 00:47 | « …une préparation pas à pas : chaque leçon est courte, avec sa vidéo explicative. Tu préfères lire ? Le cours complet est juste en dessous. » | Leçon réelle « Comprendre une dérivée ». Un tap sur la vidéo la lance (capture réelle du lecteur). Au mot « lire », le cours écrit défile en douceur : définitions, « À retenir », « Piège fréquent ». | Même plan, téléphone centré. |
| 5 | 00:47 – 00:57 | « Ensuite, tu t'exerces : chaque réponse est corrigée aussitôt. Ton plan du jour…, ta progression, et tu vois ton rang parmi les candidats… » | Carrousel de vrais écrans : exercice, puis correction « Bien joué » avec son explication, plan du jour (objectif atteint), progression (21 questions, 71 % au 1er essai), classement (1er). | Un écran à la fois. |
| 6 | 00:57 – 01:03 | « Et pour te mettre dans les conditions de l'examen, passe des concours blancs chronométrés, notés sur vingt. » | Fond encre, écran réel du concours blanc (24 questions, 40 min, 2 matières). Le chronomètre démarre et « Noté sur 20 » s'affiche. | Écran mobile recadré, chronomètre en haut. |
| 7 | 01:03 – 01:13 | « Derrière chaque concours, il y a un rêve. Un métier. Un avenir à construire… » | Une jeune femme sur un balcon d'Abidjan à l'heure dorée. « Un rêve. Un métier. Un avenir. » s'affichent mot à mot, puis « Chaque jour te rapproche de ton objectif ». | Visage à gauche, texte en bas. |
| 8 | 01:13 – 01:26 | « Ne laisse pas ta préparation au hasard. Rejoins Fatafalta : inscris-toi gratuitement sur fatafalta.com. Fatafalta : prépare aujourd'hui les réussites de demain ! » | Logo, puis « Inscris-toi gratuitement ». L'adresse fatafalta.com se tape en direct, suivie de « 7 jours gratuits, sans abonnement. » (offre réelle du site). Signature soulignée d'or, puis 2,9 s de plan final. | Même composition, en colonne. |

## Règles appliquées
- **Uniquement de vraies interfaces.** Pages publiques capturées sur fatafalta.com, en lecture seule. Espace de préparation capturé sur l'environnement de test local (compte de test, base locale), jamais en production.
- **Seulement des points forts.**
  - Les concours sont montrés avec leurs pages les plus fournies. ESATIC est cité mais sa page (11 sujets) n'est pas affichée.
  - Le classement est recadré sous la carte « Ta place », qui affiche le nombre total de candidats de la base de test.
  - Sur le plan du jour, la pastille de rang est remplacée par le temps réel du jour (35 min).
  - L'historique des concours blancs n'apparaît pas.
- **Chiffres et offres repris du site** (21-11-2026) : 1 174 sujets, 25 organismes, 7 jours gratuits, concours blanc noté sur 20.
- **Progression et rang** : ils viennent de vraies réponses envoyées au serveur local avec le compte de test (15 exercices réussis sur 16, 15 leçons lues). Ce n'est pas un vrai élève.
- **Images d'illustration** : les deux photos (scènes 1 et 7) sont générées par ChatGPT et montrent des personnes fictives (voir `assets/_generated/PROMPTS.md`).
- **Application mobile Android absente**, conformément au brief : tout est montré sur le web, ordinateur et iPhone (Safari).
