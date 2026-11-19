# Fatafalta web : préparation, PWA iPhone et notifications

## Ce que contient le site

- `/preparation/:programme` : espace d'étude, avec trois vues (Mon plan, Programme, Progrès).
- `/preparation/:programme/:module/lecon/:lecon` : leçon avec sa vidéo ; `…/niveau/:n` : exercices d'un niveau.
- `/preparation/:programme/revisions` : révisions espacées et cahier d'erreurs.
- `/preparation/:programme/concours-blanc` : épreuve chronométrée, notée sur 20 par le serveur.
- `/preparation/:programme/test-de-niveau` : 18 questions ; le plan démarre ensuite au bon module dans chaque matière.
- `/preparation/:programme/classement` : classement par semaine, par mois ou depuis le début.

Règles d'accès : les sujets restent consultables sans compte ; la préparation exige un compte. Les droits sont vérifiés par le serveur.

## PWA (iPhone sans App Store)

- `frontend/public/manifest.webmanifest` : manifeste, icônes dans `public/icons`, écrans de lancement dans `public/splash`.
- `frontend/public/sw.js` : service worker. Il est enregistré en production uniquement.
  - Quand le code des pages change, augmenter `VERSION` dans `sw.js`.
  - Les fichiers `/static/*` sont versionnés par le build et n'ont pas besoin de ce changement.
- `frontend/src/components/site/PwaHelper.js` :
  - propose « Mettre à jour » quand une nouvelle version est prête ;
  - affiche le guide d'installation sur iPhone (Safari → Partager → Sur l'écran d'accueil).

## Notifications (rappel quotidien à 18 h)

Elles sont inactives tant que les clés ne sont pas configurées : la route `GET /api/push/cle` renvoie 404 et le réglage est masqué dans le site.

Mise en service, une seule fois :

1. Générer les clés sur votre poste : `cd backend && npx web-push generate-vapid-keys`.
2. Sur Render, dans les variables d'environnement du backend, ajouter :
   - `VAPID_PUBLIC_KEY` = la clé publique ;
   - `VAPID_PRIVATE_KEY` = la clé privée (secret : à ne jamais commiter) ;
   - `VAPID_SUBJECT` = `mailto:` suivi de votre adresse de contact.
3. Redéployer. L'élève active ensuite « Rappel quotidien » dans la vue Progrès.

Fonctionnement :

- Un rappel part par jour et par navigateur, à 18 h UTC (18 h à Abidjan), seulement si l'élève n'a pas étudié ce jour-là.
- Les abonnements expirés sont supprimés automatiquement.
- `PUSH_REMINDERS=off` coupe les rappels sans toucher aux abonnements.
- Sur iPhone, il faut iOS 16.4 ou plus récent, et l'app doit être installée sur l'écran d'accueil.
- Le serveur gratuit de Render se met en veille : s'il dort à 18 h, le rappel part à son réveil, dans l'heure, ou pas du tout ce jour-là. Pour garantir l'heure, utiliser une instance payante ou une tâche planifiée (« cron job ») Render.
