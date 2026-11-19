import React, { useCallback, useEffect, useSyncExternalStore } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cx } from '../ui';

/*
 * Barre latérale repliable, réglage commun à tout le site (préparation, compte, tableau de bord).
 * Le choix est mémorisé sur l'appareil et partagé entre les pages et les onglets ouverts.
 * Raccourci : ⌘B (Mac) ou Ctrl+B. Sur mobile, les barres latérales sont remplacées par des onglets.
 */

const KEY = 'fatafalta.barre-laterale';
const listeners = new Set();
const read = () => { try { return window.localStorage.getItem(KEY) === 'repliee'; } catch (e) { return false; } };
let collapsed = typeof window === 'undefined' ? false : read();

const emit = () => listeners.forEach((listener) => listener());
const onStorage = (event) => { if (event.key === KEY) { collapsed = read(); emit(); } };
const subscribe = (listener) => {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
};

export const setSidebarCollapsed = (value) => {
  collapsed = Boolean(value);
  try { window.localStorage.setItem(KEY, collapsed ? 'repliee' : 'ouverte'); } catch (e) { /* stockage indisponible : réglage limité à la session */ }
  emit();
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const SIDEBAR_SHORTCUT = isMac ? '⌘B' : 'Ctrl+B';

/** État de la barre latérale ; `shortcut` active ⌘B / Ctrl+B (une seule barre par page). */
export const useSidebar = ({ shortcut = true } = {}) => {
  const value = useSyncExternalStore(subscribe, () => collapsed, () => false);
  const toggle = useCallback(() => setSidebarCollapsed(!collapsed), []);
  useEffect(() => {
    if (!shortcut) return undefined;
    const onKey = (event) => {
      if (event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, toggle]);
  return { collapsed: value, toggle };
};

export const sidebarToggleLabel = (isCollapsed) => (isCollapsed ? 'Ouvrir la barre latérale' : 'Fermer la barre latérale');
export const SidebarToggleIcon = ({ collapsed: isCollapsed, ...props }) => (isCollapsed ? <PanelLeftOpen {...props} /> : <PanelLeftClose {...props} />);

/**
 * Infobulle d'un élément de barre repliée : le libellé apparaît à droite au survol ou au focus clavier.
 * Le parent porte `group relative`.
 */
export const SidebarTip = ({ show, children, className }) => (show ? (
  <span
    role="tooltip"
    className={cx(
      'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-medium text-white opacity-0 shadow-soft',
      'transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none',
      className,
    )}
  >
    {children}
  </span>
) : null);
