import type { SceneT } from '../timeline';
/** `lead` = images de fondu avant le début « officiel » de la scène ; f = useCurrentFrame() - lead. */
export type SceneProps = { scene: SceneT; lead: number };
