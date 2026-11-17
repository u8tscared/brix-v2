// Contrôle qualité des photos et légendes automatiques, selon le métier.

import type { Chantier, TradeKey } from '@/lib/types';
import type { ArtKind, ChantierPhoto, Phase } from '../store';

export interface Subject {
  tag: string;
  label: string;
  art: ArtKind;
}

/** Ce qu'une photo peut montrer (choix rapide au moment de la prise). */
export function subjectsFor(trade: TradeKey): Subject[] {
  const common: Subject[] = [{ tag: 'vue', label: 'Vue générale', art: 'mur' }];
  switch (trade) {
    case 'electricien':
      return [
        { tag: 'tableau-avant', label: 'Tableau avant travaux', art: 'tableau' },
        { tag: 'saignees', label: 'Saignées, gaines', art: 'saignee' },
        { tag: 'tableau-ouvert', label: 'Tableau ouvert, avant fermeture', art: 'tableau' },
        { tag: 'tableau-fini', label: 'Tableau fini et repéré', art: 'tableau' },
        { tag: 'prises', label: 'Prises, interrupteurs', art: 'prise' },
        { tag: 'eclairage', label: 'Éclairage', art: 'spots' },
        ...common,
      ];
    case 'plombier':
    case 'climaticien':
      return [
        { tag: 'reseaux', label: 'Réseaux avant fermeture', art: 'saignee' },
        { tag: 'appareil', label: 'Appareil posé', art: 'clim' },
        { tag: 'etancheite', label: 'Test d’étanchéité', art: 'mur' },
        ...common,
      ];
    default:
      return [{ tag: 'support', label: 'Support avant travaux', art: 'mur' }, { tag: 'detail', label: 'Détail de finition', art: 'mur' }, ...common];
  }
}

interface Rule {
  tag: string;
  message: string;
  when: (ch: Chantier) => boolean;
}

const RULES: Partial<Record<TradeKey, Rule[]>> = {
  electricien: [
    { tag: 'tableau-avant', message: 'Il manque la photo du tableau avant travaux', when: () => true },
    { tag: 'saignees', message: 'Il manque la photo des saignées avant rebouchage', when: (c) => c.progress >= 20 },
    { tag: 'tableau-ouvert', message: 'Il manque la photo du tableau avant fermeture', when: (c) => c.progress >= 30 },
    { tag: 'tableau-fini', message: 'Il manque la photo du tableau fini et repéré', when: (c) => c.progress >= 95 || c.status === 'termine' || c.status === 'reception' },
  ],
  plombier: [
    { tag: 'reseaux', message: 'Il manque la photo des réseaux avant fermeture des cloisons', when: (c) => c.progress >= 25 },
    { tag: 'etancheite', message: 'Il manque la photo du test d’étanchéité', when: (c) => c.progress >= 70 },
  ],
};

export interface QualityCheck {
  tag: string;
  message: string;
  ok: boolean;
}

export function qualityChecks(ch: Chantier, trade: TradeKey, photos: ChantierPhoto[]): QualityCheck[] {
  const tags = new Set(photos.map((p) => p.tag).filter(Boolean));
  const rules: Rule[] = RULES[trade] ?? [
    { tag: 'support', message: 'Il manque une photo avant travaux', when: () => true },
    { tag: 'detail', message: 'Il manque une photo de finition', when: (c) => c.progress >= 90 },
  ];
  // Règle « avant » générique : au moins une photo avant.
  return rules
    .filter((r) => r.when(ch))
    .map((r) => ({ tag: r.tag, message: r.message, ok: tags.has(r.tag) || (r.tag === 'support' && photos.some((p) => p.phase === 'avant')) }));
}

export const PHASE_LABEL: Record<Phase, string> = { avant: 'Avant', pendant: 'Pendant', apres: 'Après' };

/** Légende proposée automatiquement (simulée ; prod : vision IA via le worker). */
export function autoCaption(subject: Subject | undefined, room: string, phase: Phase): string {
  const r = room.toLowerCase();
  if (!subject || subject.tag === 'vue') return `${room} : vue générale ${phase === 'avant' ? 'avant travaux' : phase === 'apres' ? 'après travaux' : 'en cours'}`;
  const where = r ? ` (${r})` : '';
  return `${subject.label}${where}`;
}
