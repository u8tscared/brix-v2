// Format des réponses de Brix AI : un texte court, des cartes riches et des suggestions.
// Le moteur local et les outils de Brix AI en ligne (outils/*.ts) produisent les mêmes cartes.

export interface BobCardAction {
  label: string;
  /** Navigation interne (/app/...). */
  to?: string;
  /** Action immédiate (envoi, annulation…). Renvoie un message de confirmation. */
  run?: () => string | void;
  /** Texte envoyé à Brix AI comme si l'utilisateur l'avait tapé. */
  ask?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
}

export interface BobCardRow {
  label: string;
  sub?: string;
  value?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'violet';
  to?: string;
}

export interface BobCard {
  kind: 'money' | 'list' | 'devis' | 'agenda' | 'chantier' | 'lesson' | 'done' | 'info';
  icon?: string;
  title: string;
  subtitle?: string;
  /** Chiffre principal (déjà formaté). */
  figure?: string;
  figureLabel?: string;
  progress?: number;
  rows?: BobCardRow[];
  paragraphs?: string[];
  bullets?: string[];
  source?: string;
  actions?: BobCardAction[];
}

export interface BobReply {
  text: string;
  cards?: BobCard[];
  suggestions?: string[];
}

export interface EngineContext {
  pathname: string;
  /** Mémoire courte de la conversation (ex. dernière liste de retards). */
  memo: Record<string, unknown>;
}
