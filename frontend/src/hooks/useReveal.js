import { useEffect, useState } from 'react';

const supported = typeof window !== 'undefined' && 'IntersectionObserver' in window;

/**
 * Apparition d'une section quand elle entre à l'écran (styles : index.css, [data-reveal]).
 * Une seule fois : une section révélée reste visible, même si l'on remonte la page.
 * Sans IntersectionObserver, le contenu est simplement affiché.
 *
 *   const reveal = useReveal();
 *   <section {...reveal}>…</section>
 *   <ul {...useReveal({ group: true })}><li data-reveal-item style={{ '--i': 0 }}>…</li></ul>
 */
const useReveal = ({ group = false, margin = '0px 0px -12% 0px' } = {}) => {
  // Ref « callback » : l'élément peut n'être monté qu'après un chargement (liste, grille).
  const [node, setNode] = useState(null);
  const [state, setState] = useState(supported ? 'pending' : 'shown');

  useEffect(() => {
    if (state === 'shown' || !node) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setState('shown');
        observer.disconnect();
      }
    }, { rootMargin: margin, threshold: 0.01 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, state, margin]);

  return { ref: setNode, 'data-reveal': state, ...(group ? { 'data-reveal-group': '' } : {}) };
};

export default useReveal;
