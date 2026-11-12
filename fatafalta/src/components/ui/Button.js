import React from 'react';
import { PrepButton } from '../../prep/ui/primitives';

// Historical API: accent is a burgundy CTA, gold remains subscription-only.
const VARIANTS = { primary: 'primary', secondary: 'secondary', ghost: 'link', accent: 'primary' };

const Button = ({ variant = 'primary', icon, ...props }) => (
  <PrepButton {...props} variant={VARIANTS[variant] || 'primary'} iconLeft={icon} />
);

export default Button;
