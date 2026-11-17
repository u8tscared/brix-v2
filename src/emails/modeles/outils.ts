// Outils de mise en forme des e-mails : échappement, montants, dates. TypeScript pur (app + worker).

const ENTITES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Échappe une donnée pour l'insérer dans du HTML (texte ou valeur d'attribut entre guillemets). */
export function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"'`]/g, (c) => ENTITES[c]);
}

/** Texte libre (mot de l'artisan) : échappé, sauts de ligne conservés. */
export function escMultiligne(v: unknown): string {
  return esc(v).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br>');
}

/** URL sûre pour un href : seulement http(s) et mailto/tel, sinon « # ». */
export function urlSure(v: unknown): string {
  const s = String(v ?? '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(s)) return esc(s);
  return '#';
}

const FINE = '\u202F'; // espace fine insécable (séparateur de milliers)
const INSEC = '\u00A0'; // espace insécable (avant « € »)

/** 4374.81 → « 4 374,81 € » (fr-FR, déterministe, sans dépendre de l'ICU). */
export function euros(n: unknown): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  const neg = v < 0;
  const centimes = Math.round(Number((Math.abs(v) * 100).toFixed(6)));
  const [ent, dec] = (centimes / 100).toFixed(2).split('.');
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, FINE);
  return `${neg ? '-' : ''}${groupes},${dec}${INSEC}€`;
}

/** Nombre sans décimales inutiles : 2,5 / 84 / 1 200. */
export function nombre(n: unknown): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  const [ent, dec] = String(Math.round(v * 1000) / 1000).split('.');
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, FINE) + (dec ? `,${dec}` : '');
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

interface Parties { j: number; m: number; a: number; h?: number; min?: number }

function parties(iso: unknown): Parties | null {
  const s = String(iso ?? '');
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (jour) return { a: +jour[1], m: +jour[2], j: +jour[3] };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const f = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
    return { a: +p.year, m: +p.month, j: +p.day, h: +p.hour, min: +p.minute };
  } catch {
    return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, j: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
  }
}

/** « 17 décembre 2026 » (heure de Paris). Chaîne vide si la date est invalide. */
export function dateLongue(iso: unknown, avecAnnee = true): string {
  const p = parties(iso);
  if (!p) return '';
  return `${p.j === 1 ? '1er' : p.j}${INSEC}${MOIS[p.m - 1]}${avecAnnee ? ` ${p.a}` : ''}`;
}

/** « 17 novembre 2026 à 14 h 32 » ; sans heure si la donnée n'en a pas. */
export function dateHeure(iso: unknown): string {
  const p = parties(iso);
  if (!p) return '';
  const base = dateLongue(iso);
  if (p.h === undefined || p.min === undefined) return base;
  return `${base} à ${p.h}${INSEC}h${INSEC}${String(p.min).padStart(2, '0')}`;
}

/** Coupe un texte trop long pour un sujet (sans couper un mot si possible). */
export function court(s: unknown, max: number): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.]+$/, '')}…`;
}

/** Pluriel simple : pluriel(3, 'article') → « 3 articles ». */
export function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${nombre(n)} ${Math.abs(n) >= 2 ? motPluriel : mot}`;
}

/** Initiales sûres (2 lettres max). */
export function initiales(s: unknown): string {
  const t = String(s ?? '').trim();
  if (!t) return 'B';
  return t.slice(0, 3).toUpperCase();
}

/** Ligne de texte brut soulignée, pour la version texte. */
export function titreTexte(s: string): string {
  return `${s}\n${'-'.repeat(Math.min(60, s.length))}`;
}
