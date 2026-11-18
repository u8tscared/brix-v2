// Brouillon d'inscription : forme, calculs (offre conseillée) et sauvegarde dans sessionStorage.
import { MODULE_BY_KEY, PLAN_ORDER, type ModuleKey, type Plan, type PriorityKey } from '@/lib/catalog';
import type { CompanySize, TradeKey } from '@/lib/types';

export interface Draft {
  trade?: TradeKey;
  secondary: TradeKey[];
  size?: CompanySize;
  companyName: string;
  siret: string;
  address: string;
  city: string;
  priorities: PriorityKey[];
  enabled: ModuleKey[];
  plan?: Plan; // offre choisie à la main (sinon : conseillée)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  withDemo: boolean;
  importFrom?: string;
  tour: boolean;
  accessOk?: boolean; // accès déjà validé (le mot de passe n'est pas sauvegardé)
  /** « Continuer avec Google » : jeton d'identité, gardé en mémoire seulement (comme le mot de passe). */
  google?: { credential: string; email: string };
}

export const EMPTY: Draft = {
  secondary: [], companyName: '', siret: '', address: '', city: '', priorities: [], enabled: [],
  firstName: '', lastName: '', email: '', password: '', withDemo: true, tour: true,
};

export const STEPS = [
  { key: 'metier', label: 'Métier' },
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'priorites', label: 'Priorités' },
  { key: 'outils', label: 'Outils' },
  { key: 'acces', label: 'Accès' },
] as const;

export const PRET = STEPS.length; // index de l'écran final

/** Offre conseillée : la plus haute exigée par les outils cochés, Entreprise à partir de 50 personnes. */
export function recommendedPlan(d: Draft): Plan {
  if (d.size === 'grande') return 'entreprise';
  const need = d.enabled.reduce<Plan>((acc, k) => {
    const p = MODULE_BY_KEY[k]?.plan ?? 'start';
    return PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(acc) ? p : acc;
  }, 'start');
  // Seul, on ne conseille jamais plus que Pro : les outils Équipe restent proposés en option.
  return d.size === 'solo' && need === 'equipe' ? 'pro' : need;
}

export const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/** Ce qui manque pour passer l'étape (null = on peut continuer). */
export function missing(step: number, d: Draft): string | null {
  switch (step) {
    case 0: return d.trade ? null : 'Choisissez votre métier';
    case 1: return d.companyName.trim().length < 2 ? 'Indiquez le nom de votre entreprise' : !d.size ? 'Indiquez votre taille' : null;
    case 2: return d.priorities.length ? null : 'Choisissez au moins une priorité';
    case 3: return d.enabled.length ? null : 'Gardez au moins un outil';
    case 4:
      if (!d.firstName.trim()) return 'Indiquez votre prénom';
      if (!emailOk(d.email)) return 'Indiquez un e-mail valide';
      if (d.google) return null;
      return d.password.length >= 8 || (d.accessOk && !d.password) ? null : 'Mot de passe de 8 caractères minimum';
    default: return null;
  }
}

/** Première étape incomplète : on n'ouvre jamais une étape dont les précédentes ne sont pas remplies. */
export const firstOpen = (d: Draft, upTo: number) => {
  for (let i = 0; i < Math.min(upTo, PRET); i++) if (missing(i, d)) return i;
  return upTo;
};

const KEY = 'brix-inscription-v2';

export interface Saved {
  d: Draft;
  step: number;
  touched: boolean;
}

export function load(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return { ...s, d: { ...EMPTY, ...s.d, password: '', google: undefined } };
  } catch {
    return null;
  }
}

export function save(s: Saved) {
  try {
    // Le mot de passe ne quitte jamais la mémoire de la page.
    sessionStorage.setItem(KEY, JSON.stringify({ ...s, d: { ...s.d, password: '', google: undefined } }));
  } catch {
    /* navigation privée : on continue sans sauvegarde */
  }
}

export function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* rien */
  }
}

export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
