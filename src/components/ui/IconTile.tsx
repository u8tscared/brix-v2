import type { ReactNode } from 'react';
import type { DepartmentKey } from '@/lib/catalog';
import { Icon } from './Icon';
import { cn } from './cn';

/**
 * Couleur de chaque département (Halo) : fond pâle + encre franche.
 * Les icônes de modules sont posées sur une pastille de cette couleur : on reconnaît un domaine d'un coup d'œil.
 * fg = encre (icône, texte), bg = fond pâle, ring = filet (si besoin), solid = aplat vif (points, anneaux).
 */
export const DEPT_TONE: Record<DepartmentKey, { fg: string; bg: string; ring: string; solid: string }> = {
  vendre: { fg: '#6d28d9', bg: '#f1eafe', ring: '#e4d8fd', solid: '#7c3aed' },
  facturer: { fg: '#b02bc4', bg: '#fce8fd', ring: '#f6d3f1', solid: '#d946ef' },
  chantiers: { fg: '#d4661b', bg: '#fff0e4', ring: '#fdd9bf', solid: '#fb923c' },
  equipe: { fg: '#2f5fd0', bg: '#e8f0fe', ring: '#cfdcfb', solid: '#3b82f6' },
  achats: { fg: '#0f8a5f', bg: '#e5f6ef', ring: '#c4ebd9', solid: '#10b981' },
  bob: { fg: '#15122a', bg: '#efedf5', ring: '#dfdce9', solid: '#15122a' },
  metier: { fg: '#a86206', bg: '#fdf3dc', ring: '#f5e3b3', solid: '#f59e0b' },
  visibilite: { fg: '#c81e4a', bg: '#fde9ee', ring: '#f9d0d8', solid: '#f43f5e' },
  gestion: { fg: '#4338ca', bg: '#eceefe', ring: '#d9ddfa', solid: '#6366f1' },
};

/** Tons Halo hors département (pour un statut ou un type : violet, magenta, pêche, vert, bleu…). */
export const HALO_TONE = {
  violet: { fg: '#6d28d9', bg: '#f1eafe', solid: '#7c3aed' },
  mag: { fg: '#b02bc4', bg: '#fce8fd', solid: '#d946ef' },
  peach: { fg: '#d4661b', bg: '#fff0e4', solid: '#fb923c' },
  green: { fg: '#0f8a5f', bg: '#e5f6ef', solid: '#10b981' },
  blue: { fg: '#2f5fd0', bg: '#e8f0fe', solid: '#3b82f6' },
  cyan: { fg: '#0e7490', bg: '#e3f5f8', solid: '#06b6d4' },
  amber: { fg: '#a86206', bg: '#fdf3dc', solid: '#f59e0b' },
  rose: { fg: '#c81e4a', bg: '#fde9ee', solid: '#f43f5e' },
  indigo: { fg: '#4338ca', bg: '#eceefe', solid: '#6366f1' },
  neutral: { fg: '#5d5a72', bg: '#f3f1f8', solid: '#15122a' },
} as const;
export type HaloTone = keyof typeof HALO_TONE;

// Pastilles Halo : 40 px / 13 px de rayon en md (comme la maquette), proportionnelles ailleurs.
const sizes = {
  xs: 'h-6 w-6 rounded-[8px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  sm: 'h-8 w-8 rounded-[10px] [&_svg]:h-4 [&_svg]:w-4',
  row: 'h-[34px] w-[34px] rounded-[11px] [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 w-10 rounded-tile [&_svg]:h-[19px] [&_svg]:w-[19px]',
  lg: 'h-12 w-12 rounded-[15px] [&_svg]:h-[22px] [&_svg]:w-[22px]',
  xl: 'h-14 w-14 rounded-[18px] [&_svg]:h-6 [&_svg]:w-6',
};

/**
 * Icône sur pastille teintée. `dept` pour la couleur du domaine, ou `tone` pour un ton Halo libre.
 * `solid` = version pleine (dégradé de la teinte, icône blanche) ; `dawn` = pastille dégradé Aube (rare : Brix, Brix AI).
 */
export function IconTile({ name, icon, dept = 'vendre', tone, size = 'md', solid, dawn, className }: { name?: string; icon?: ReactNode; dept?: DepartmentKey; tone?: HaloTone; size?: keyof typeof sizes; solid?: boolean; dawn?: boolean; className?: string }) {
  const t = tone ? HALO_TONE[tone] : DEPT_TONE[dept];
  const style = dawn
    ? { background: 'var(--dawn-d)', color: '#fff', boxShadow: '0 6px 16px -6px rgba(217,70,239,.6), inset 0 1px 0 rgba(255,255,255,.25)' }
    : solid
      ? { background: `linear-gradient(160deg, ${t.solid}, ${t.fg})`, color: '#fff', boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 6px 14px -6px ${t.fg}88` }
      : { background: t.bg, color: t.fg };
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', sizes[size], className)} style={style}>
      {icon ?? (name ? <Icon name={name} strokeWidth={1.9} /> : null)}
    </span>
  );
}
