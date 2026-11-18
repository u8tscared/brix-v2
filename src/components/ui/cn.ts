import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Fusion des classes : une classe passée en `className` remplace celle du composant (h-10 sur un Button, etc.).
// On déclare les jetons maison de tailwind.config.js pour qu'ils soient bien rangés.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [{ shadow: ['xs', 'card', 'halo', 'halo-lg', 'halo-sm', 'pill', 'glass', 'raise', 'lift', 'pop', 'dawn', 'dawn-lg', 'ink', 'focus'] }],
      'bg-image': [{ bg: ['dawn', 'dawn-soft', 'dawn-diag', 'dawn-pale', 'dawn-mist'] }],
      rounded: [{ rounded: ['xl2', '2.5xl', '4xl', 'card', 'card-sm', 'tile', 'field', 'sheet', 'pill'] }],
      'font-size': [{ text: ['2xs', 'halo-title', 'halo-title-sm', 'num-xl', 'num-lg', 'num-md'] }],
    },
  },
});

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
