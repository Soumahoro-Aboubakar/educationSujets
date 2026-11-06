import { EntourerRenderer, QcmRenderer, SurlignerRenderer } from './Choice';
import { ClasserRenderer, GlisserRenderer } from './DragFill';
import { OrdreRenderer, RelierRenderer } from './OrderMatch';
import { NumeriqueRenderer, VraiFauxRenderer } from './SwipeNumeric';

/**
 * Registre des types d'exercices (§ 11.1) : ajouter un type = ajouter une entrée ici et son
 * validateur dans prepCore ; le moteur de session n'est pas modifié.
 */
export const RENDERERS = {
  qcm: QcmRenderer,
  vraiFaux: VraiFauxRenderer,
  glisser: GlisserRenderer,
  entourer: EntourerRenderer,
  ordre: OrdreRenderer,
  relier: RelierRenderer,
  classer: ClasserRenderer,
  numerique: NumeriqueRenderer,
  surligner: SurlignerRenderer,
};

/** Les types où le geste prend le pas sur le défilement de la page. */
export const GESTURE_HEAVY = new Set(['ordre', 'classer', 'glisser', 'relier', 'vraiFaux']);

export default RENDERERS;
