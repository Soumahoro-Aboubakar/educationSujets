# Vidéos YouTube externes rattachées aux leçons

En attendant les vidéos Fatafalta, chaque leçon peut recevoir **une vidéo courte publiée par une
autre chaîne** (≤ 15 min, en français, intégrable). Elle complète le cours écrit sans le remplacer.

On réutilise le mécanisme existant : collection `prepvideos` (clé `{ cible: 'lecon', code, langue }`),
`GET /api/prep/videos`, et le lecteur intégré `fatafalta/src/prep/video/`. Une vidéo écrite en base
apparaît dans l'application **en 5 minutes au plus**, sans nouvelle version sur le Play Store.

## Ce qui a été ajouté

- `PrepVideo.externe` (optionnel) : `chaine`, `chaineId`, `langueAudio`, `verifieLe`. Ces documents ont
  aussi `source.generateur = 'youtube-externe'`.
- L'API expose `auteur` (la chaîne). L'app l'affiche sous le titre (« Chaîne YouTube : … ») pour créditer
  le créateur.
- `backend/scripts/video/externe/` : outillage local (aucune route d'écriture).
- `backend/data/prep/videos-externes/` : données de travail versionnées.
  - `lots/<MODULE>.json` : fiche pédagogique de chaque leçon (généré).
  - `recherches/<MODULE>.json` : propositions brutes de ChatGPT (jamais écrites en base telles quelles).
  - `decisions/<MODULE>.json` : décisions relues, avec justification et source.
  - `selections.json` : état par leçon, `validee` ou `a_rechercher` (trace des recherches infructueuses).
  - `verifications.json` : cache des vérifications YouTube.
  - `candidats/<MODULE>.json` : candidats bruts de la recherche directe YouTube (secours).

## Procédure (depuis `backend/`)

```bash
node scripts/video/externe/inventaire.js                 # 1. lots de recherche (lecture seule)
node scripts/video/externe/rechercher.js MATH-PROBA ...  # 2. recherche déléguée à ChatGPT (Codex --search)
#                                                           code 5 = quota ChatGPT atteint : rien n'est perdu
#   Sans ChatGPT (quota épuisé) : recherche directe sur la page publique de résultats YouTube
node scripts/video/externe/chercher-youtube.js "requête 1" "requête 2"      # vrais candidats (id, durée, chaîne)
node scripts/video/externe/chercher-youtube.js --lot MATH-PROBA             # candidats/<M>.json, requêtes tirées du lot
node scripts/video/externe/revue.js MATH-PROBA                              # fiche de relecture (ChatGPT + secours, vérifiés)
# 3. relire, écrire decisions/<M>.json (une vidéo par leçon, ou null)
node scripts/video/externe/decider.js MATH-PROBA         # 4. vérification YouTube + selections.json
node scripts/video/externe/attacher.js                   # 5. essai à blanc contre la base
node scripts/video/externe/attacher.js --ecrire          # 6. écriture (relançable sans doublon)
node scripts/video/externe/verifier.js --selections --force   # contrôle périodique (vidéos supprimées…)
```

Pour l'étape 5, la base vient de `MONGODB_URI` (variable d'environnement) ou de
`~/.config/fatafalta/config.json` (hors dépôt, `chmod 600`, même configuration que la publication des
vidéos). Le `.env` du backend n'est jamais lu.

## Règles de sélection (appliquées par `decider.js` et à la relecture)

- La vidéo explique **cette leçon** (ses formules, ses notions, son niveau), pas seulement le domaine.
- Durée de 15 min au plus (refus automatique au-delà ; décision du 2026-11-17). Ordre de préférence : 2 à 3 min,
  puis 4 à 6, puis 7 à 10 ; 11 à 15 min seulement en dernier recours.
- Audio en français. L'anglais n'est accepté que par exception explicite (`"anglaisAccepte": true`).
- La vidéo doit être publique et intégrable (oEmbed + `playableInEmbed`). Les directs sont refusés,
  ainsi que les vidéos bloquées en Côte d'Ivoire.
- Une même vidéo ne sert pas à deux leçons du même module.
- Aucune vidéo satisfaisante → `null` (statut `a_rechercher`). Pas de vidéo approximative.
- Droit, institutions, économie : le contenu est souvent ivoirien, OHADA ou UEMOA. Une vidéo de droit
  français n'est retenue que si le principe est identique.

## Garanties d'écriture (`attacher.js`)

- Essai à blanc par défaut. Clé unique en base : relancer ne crée aucun doublon.
- Une vidéo Fatafalta (non externe) n'est **jamais** remplacée. Une autre vidéo externe déjà publiée ne
  l'est qu'avec `--remplacer`.
- Chaque vidéo est revérifiée juste avant l'écriture (une vidéo supprimée entre-temps est refusée).
- Rattachement à la révision publiée du module (`source.contentRevision`). Si la leçon est modifiée, la
  vidéo disparaît jusqu'à nouvelle validation, pour éviter une vidéo qui ne correspond plus au texte.
- Retirer une vidéo : `node scripts/video/publish.js --masquer` (outil existant) ou passer la sélection
  en `a_rechercher`.

## Respect de YouTube

Lecture par le lecteur IFrame officiel uniquement (`react-native-youtube-iframe`). Pas de
téléchargement, pas de réhébergement, pas de lecture automatique. Les commandes du lecteur ne sont
jamais recouvertes. Si la vidéo est indisponible, l'app affiche un état « Réessayer » et le cours écrit
reste accessible. Seules les vidéos dont le créateur autorise l'intégration sont retenues.

## État au 2026-11-17

Les 39 modules (392 leçons) ont été traités : **387 leçons ont une vidéo validée et vérifiée**, 5 restent
`a_rechercher`. Rien n'est encore écrit en production (accès à la base de prod non configuré). Rapport
détaillé : [rapport-2026-11-17.md](rapport-2026-11-17.md).

Les titres YouTube sont nettoyés de leurs emojis à l'écriture (`attacher.js`), sinon ils s'affichent en carrés
dans l'app. Quand la lecture intégrée est refusée, l'app propose « Ouvrir sur YouTube ».
