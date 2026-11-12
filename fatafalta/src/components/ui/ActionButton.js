import React from 'react';
import { PrepButton } from '../../prep/ui/primitives';

/** API historique du parcours Sujets, rendu par le bouton commun. */
const ActionButton = ({ icon, ...props }) => <PrepButton iconLeft={icon} {...props} />;

export default ActionButton;
