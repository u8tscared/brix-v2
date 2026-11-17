import type { PlanningEvent } from '@/lib/types';

/** Couleurs par type de créneau (planning et listes). */
export const KIND_STYLE: Record<PlanningEvent['kind'], { label: string; block: string; bar: string; dot: string }> = {
  chantier: { label: 'Chantier', block: 'bg-vi-50 border-vi-200 text-vi-700', bar: 'bg-vi-700', dot: '#6d28d9' },
  rdv: { label: 'Rendez-vous', block: 'bg-[#eef2ff] border-[#d5ddfb] text-brand', bar: 'bg-brand', dot: '#1f389d' },
  sav: { label: 'SAV, entretien', block: 'bg-[#fff4ec] border-[#fed7b5] text-[#c2410c]', bar: 'bg-peach', dot: '#fb923c' },
  absence: { label: 'Absence', block: 'bg-sub border-line2 text-ink-2', bar: 'bg-ink-3', dot: '#9898a8' },
  formation: { label: 'Formation', block: 'bg-[#ecfdf3] border-[#c9f0d6] text-ok', bar: 'bg-ok', dot: '#16a34a' },
  interne: { label: 'Interne', block: 'bg-white border-line2 text-ink', bar: 'bg-ink', dot: '#17171f' },
};

export const KINDS = Object.keys(KIND_STYLE) as PlanningEvent['kind'][];

/** Teinte d'une personne : on reconnaît qui fait quoi d'un coup d'œil. Absence = hachures neutres. */
export function personTone(color: string, kind: PlanningEvent['kind']) {
  if (kind === 'absence') {
    return { background: 'repeating-linear-gradient(135deg,#f4f3f8 0 6px,#ecebf2 6px 12px)', borderLeft: '3px solid #cfcbdd', color: '#5d5a72' };
  }
  const c = /^#1[0-9a-f]{5}$/i.test(color) ? '#3d3758' : color;
  return { background: `${c}14`, borderLeft: `3px solid ${c}`, color: '#15122a', boxShadow: `inset 0 0 0 1px ${c}22` };
}
