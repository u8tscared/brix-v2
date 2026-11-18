import type { ArtKind } from '@/modules/chantiers/store';

/** Illustration de chantier utilisée en démo (les vraies photos du chantier remplacent ces vignettes). */
export const ART_BY_CHANTIER: Record<string, ArtKind> = {
  ch_morel: 'tableau',
  ch_martin: 'four',
  ch_tilleuls: 'hublot',
  ch_lefevre: 'spots',
  ch_nguyen: 'baie',
  ch_dupuis: 'borne',
};
export const artFor = (id: string): ArtKind => ART_BY_CHANTIER[id] ?? 'prise';

export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
