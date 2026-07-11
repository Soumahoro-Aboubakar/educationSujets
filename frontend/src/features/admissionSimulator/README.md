# Module simulateur d'admission ESATIC / INPHB

## Objectif

Ajouter un module frontend isole permettant a l'etudiant de simuler son admission aux concours ESATIC et INPHB sans appel API. Les calculs, les coefficients et la sauvegarde de brouillon sont executes dans le navigateur.

## Arborescence cible

```text
frontend/src/features/admissionSimulator/
  components/
    AdmissionSimulator.js
  data/
    admissionConfig.js
  hooks/
    useAdmissionDraft.js
  logic/
    admissionCalculations.js
  README.md
frontend/src/pages/
  AdmissionSimulatorPage.js
  ResourcesPage.js
```

## Routes

- `/` : nouvelle page d'accueil premium avec deux choix explicites.
- `/ressources` : page de recherche et telechargement existante, conservee sans changement fonctionnel.
- `/simulateur-admission` : assistant de simulation ESATIC / INPHB.

## Donnees statiques

`data/admissionConfig.js` contient:

- les matieres: Mathematiques, Physique-Chimie, Anglais, Francais;
- les niveaux: Seconde, Premiere, Terminale, BAC;
- les series BAC INPHB;
- les cycles INPHB;
- les filieres INPHB et leurs coefficients de selection;
- les coefficients par matiere utilises pour la MGM INPHB.

La table `INPHB_PROGRAMS` est volontairement locale et extensible. Une nouvelle filiere peut etre ajoutee sans changer l'UI ni le moteur de calcul.

## Moteur de calcul

`logic/admissionCalculations.js` expose des fonctions pures:

- `calculateEsaticSubjectAverage(subjectNotes)`
- `calculateEsaticResult(notes)`
- `calculateInphbClassAverage(subjectNotes)`
- `calculateInphbSubjectMgm(subjectNotes)`
- `calculateInphbResult({ notes, programKey })`
- `calculateAdmissionResult(formState)`

### ESATIC

Pour chaque matiere:

```text
MP = (((MA_Seconde + 2 * MA_Premiere + 3 * MA_Terminale) / 6) + 2 * Note_Bac) / 3
```

Le score affiche est la moyenne des MP des quatre matieres cles.

### INPHB

Le calcul est effectue en cascade:

1. MC par matiere: moyenne ponderee Seconde, Premiere, Terminale.
2. MGM par matiere: combinaison MC et Note BAC.
3. Moyenne generale ponderee par les coefficients matiere.
4. Application du coefficient de selection de la filiere.

## Persistance locale

`hooks/useAdmissionDraft.js` sauvegarde automatiquement l'etat dans `localStorage` avec la cle `education-ci-admission-simulator-v1`. Aucune note n'est envoyee au backend.
