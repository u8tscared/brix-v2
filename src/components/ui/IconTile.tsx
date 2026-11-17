import type { ReactNode } from 'react';
import type { DepartmentKey } from '@/lib/catalog';
import { Icon } from './Icon';
import { cn } from './cn';

/**
 * Couleur de chaque département. Les icônes de modules sont posées sur une tuile
 * teintée de cette couleur : on reconnaît un domaine d'un coup d'œil.
 * Teintes choisies dans la famille Aube (violet, magenta, pêche) + 4 neutres chauds/froids.
 */
export const DEPT_TONE: Record<DepartmentKey, { fg: string; bg: string; ring: string; solid: string }> = {
  vendre: { fg: '#6d28d9', bg: '#f3edff', ring: '#e4d8fd', solid: '#7c3aed' },
  facturer: { fg: '#b0219f', bg: '#fcecfa', ring: '#f6d3f1', solid: '#c026d3' },
  chantiers: { fg: '#c2410c', bg: '#fff1e7', ring: '#fdd9bf', solid: '#ea580c' },
  equipe: { fg: '#0e7490', bg: '#e8f7fa', ring: '#c5e9f0', solid: '#0891b2' },
  achats: { fg: '#0f766e', bg: '#e7f6f3', ring: '#c4ebe3', solid: '#0d9488' },
  bob: { fg: '#15122a', bg: '#efeef4', ring: '#dfdce9', solid: '#15122a' },
  metier: { fg: '#a16207', bg: '#fdf6e3', ring: '#f5e3b3', solid: '#ca8a04' },
  visibilite: { fg: '#be123c', bg: '#fdecef', ring: '#f9d0d8', solid: '#e11d48' },
  gestion: { fg: '#3730a3', bg: '#eef0fd', ring: '#d9ddfa', solid: '#4f46e5' },
};

const sizes = { xs: 'h-6 w-6 rounded-[7px] [&_svg]:h-3.5 [&_svg]:w-3.5', sm: 'h-8 w-8 rounded-[9px] [&_svg]:h-4 [&_svg]:w-4', md: 'h-10 w-10 rounded-[12px] [&_svg]:h-[19px] [&_svg]:w-[19px]', lg: 'h-12 w-12 rounded-[14px] [&_svg]:h-[22px] [&_svg]:w-[22px]', xl: 'h-14 w-14 rounded-[16px] [&_svg]:h-6 [&_svg]:w-6' };

/** Icône sur tuile teintée. Passer `dept` pour la couleur du domaine, ou `solid` pour la version pleine. */
export function IconTile({ name, icon, dept = 'vendre', size = 'md', solid, className }: { name?: string; icon?: ReactNode; dept?: DepartmentKey; size?: keyof typeof sizes; solid?: boolean; className?: string }) {
  const t = DEPT_TONE[dept];
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', sizes[size], className)}
      style={solid ? { background: `linear-gradient(160deg, ${t.solid}, ${t.fg})`, color: '#fff', boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 4px 10px -4px ${t.fg}66` } : { background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
    >
      {icon ?? (name ? <Icon name={name} strokeWidth={1.9} /> : null)}
    </span>
  );
}
