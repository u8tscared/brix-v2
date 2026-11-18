// Positions approximatives sur le plan stylisé (viewBox 0 0 400 300) de l'agglomération lyonnaise.
// Sans service de carte externe : si la ville est inconnue, on place le point de façon stable.

import { hash } from './weather';

const PLACES: [RegExp, [number, number]][] = [
  [/lyon\s*1(er|e)?\b/i, [196, 128]],
  [/lyon\s*2/i, [192, 168]],
  [/lyon\s*3/i, [236, 160]],
  [/lyon\s*4/i, [190, 100]],
  [/lyon\s*5/i, [158, 156]],
  [/lyon\s*6/i, [232, 122]],
  [/lyon\s*7/i, [214, 200]],
  [/lyon\s*8/i, [258, 212]],
  [/lyon\s*9/i, [160, 100]],
  [/villeurbanne/i, [282, 132]],
  [/caluire/i, [212, 70]],
  [/bron/i, [312, 190]],
  [/v[ée]nissieux/i, [262, 252]],
  [/vaulx/i, [326, 104]],
  [/oullins/i, [168, 230]],
  [/tassin/i, [112, 132]],
  [/[ée]cully/i, [116, 96]],
  [/rillieux/i, [250, 40]],
  [/saint-priest/i, [334, 238]],
  [/lyon/i, [210, 150]],
];

export function placeOf(city: string, seed = ''): [number, number] {
  for (const [re, p] of PLACES) if (re.test(city)) {
    // léger décalage pour que deux chantiers de la même ville ne se superposent pas
    const j = hash(seed || city);
    return [p[0] + (j - 0.5) * 14, p[1] + (hash(seed + 'y') - 0.5) * 12];
  }
  return [80 + hash(city) * 260, 40 + hash(city + 'y') * 220];
}
