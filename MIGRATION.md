# Migration vers le catalogue dynamique

Les routes legacy `/api/institutions` et `/api/nodes` enregistrent un compteur quotidien dans la collection `legacyroutemetrics`.

La bascule définitive vers `/api/organismes`, `/api/structures`, `/api/noeuds` et `/api/matieres` sera considérée sûre après **zéro appel legacy pendant 14 jours consécutifs en production**.

Les métriques sont conservées par jour et par route avec les champs `route`, `day` et `count`.