# Instructions pour Claude Code — Fatafalta

## Avant tout ajout ou publication de sujet / corrigé (OBLIGATOIRE)

Consulter le référentiel anti-doublons `docs/referentiel-sujets/` et appliquer sa procédure
(détail : `docs/referentiel-sujets/README.md`, section « Règle obligatoire ») :

1. `cd backend && npm run referentiel:sync` si le référentiel date de plus d'un jour (lecture seule sur le serveur).
2. Décrire le lot dans un JSON (format : `docs/referentiel-sujets/README.md`, exemple : `docs/referentiel-sujets/exemple-lot.json`).
3. `cd backend && npm run verify:subjects -- <lot.json>` — ne publie rien.
4. `doublon_confirme` → ne pas publier, citer l'identifiant existant ; `doublon_probable` → suspendre et comparer les fichiers ;
   `a_verifier` → ne pas conclure seul, exposer l'incertitude ; `nouvelle_ressource` → publier après contrôle des avertissements.
5. Après publication réussie : `npm run referentiel:empreinte -- --id <id> --fichier <pdf>` puis `npm run referentiel:sync`.

Fichiers de référence : `docs/referentiel-sujets/inventaire-complet.json` (ressources), `index-doublons.json`
(doublons connus et décisions manuelles), `taxonomie.json` (organismes, parcours, matières, années existants —
réutiliser ces libellés plutôt que d'en créer des variantes), `relations-documents.json` (sujets ↔ corrigés).

Ne jamais supprimer, modifier ou republier un sujet existant sans autorisation explicite.

## Sécurité

Ne pas lire ni modifier `.env` ni `keys.text` (voir `README.md`, « Règlement de sécurité »).
