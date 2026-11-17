import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Fusion des classes : une classe passée en `className` remplace celle du composant (h-10 sur un Button, etc.).
// On déclare les jetons maison de tailwind.config.js pour qu'ils soient bien rangés.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [{ shadow: ['card', 'pop', 'dawn'] }],
      'bg-image': [{ bg: ['dawn'] }],
      rounded: [{ rounded: ['xl2'] }],
    },
  },
});

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
