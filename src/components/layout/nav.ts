import { DEPARTMENTS, MODULES, type DepartmentKey, type ModuleDef, type ModuleKey } from '@/lib/catalog';

export interface NavGroup {
  dept: DepartmentKey;
  name: string;
  icon: string;
  items: ModuleDef[];
}

// Modules affichés en tête de menu, hors départements (le quotidien).
export const PRIMARY: ModuleKey[] = ['leads', 'devis', 'factures', 'chantiers', 'planning', 'clients'];

/** Construit le menu à partir des modules activés : rien d'inutile n'apparaît. */
export function buildNav(enabled: ModuleKey[]) {
  const on = new Set(enabled);
  const primary = PRIMARY.map((k) => MODULES.find((m) => m.key === k)!).filter((m) => on.has(m.key));
  const groups: NavGroup[] = DEPARTMENTS.map((d) => ({
    dept: d.key,
    name: d.name,
    icon: d.icon,
    items: MODULES.filter((m) => m.dept === d.key && on.has(m.key) && !PRIMARY.includes(m.key) && m.key !== 'outils_metier' && m.key !== 'bob'),
  })).filter((g) => g.items.length > 0);
  return { primary, groups };
}
