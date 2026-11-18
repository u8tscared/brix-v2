import type { PlanningEvent } from '@/lib/types';

/** Couleurs par type de créneau (planning et listes). */
export const KIND_STYLE: Record<PlanningEvent['kind'], { label: string; block: string; bar: string; dot: string }> = {
  chantier: { label: 'Chantier', block: 'bg-pale-v border-vi-200 text-deep-v', bar: 'bg-vi-700', dot: '#6d28d9' },
  rdv: { label: 'Rendez-vous', block: 'bg-[#eef2ff] border-[#d5ddfb] text-brand', bar: 'bg-brand', dot: '#1f389d' },
  sav: { label: 'SAV, entretien', block: 'bg-[#fff4ec] border-[#fed7b5] text-[#c2410c]', bar: 'bg-peach', dot: '#fb923c' },
  absence: { label: 'Absence', block: 'bg-halo-track border-halo-line text-ink-2', bar: 'bg-ink-3', dot: '#9898a8' },
  formation: { label: 'Formation', block: 'bg-[#ecfdf3] border-[#c9f0d6] text-ok', bar: 'bg-ok', dot: '#16a34a' },
  interne: { label: 'Interne', block: 'bg-white border-halo-line text-ink', bar: 'bg-ink', dot: '#17171f' },
};

export const KINDS = Object.keys(KIND_STYLE) as PlanningEvent['kind'][];

/** Teinte d'une personne : on reconnaît qui fait quoi d'un coup d'œil (pilule pâle à sa couleur). Absence = hachures neutres. */
export function personColor(color: string) {
  // Une teinte trop sombre (encre) donnerait une pilule grise : on la remplace par le magenta Aube.
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return color;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 60 ? '#d946ef' : color;
}

export function personTone(color: string, kind: PlanningEvent['kind']) {
  if (kind === 'absence') {
    return { background: 'repeating-linear-gradient(135deg,#f6f4fb 0 6px,#eeebf6 6px 12px)', color: '#5d5a72', boxShadow: 'inset 0 0 0 1px #e6e1f1' };
  }
  const c = personColor(color);
  return { background: `linear-gradient(135deg, ${c}1f, ${c}10)`, color: '#15122a', boxShadow: `inset 0 0 0 1px ${c}26` };
}
