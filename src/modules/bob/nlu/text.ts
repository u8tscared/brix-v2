// Petits outils de lecture du français courant (sans dépendance).

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50,
  'une dizaine': 10, 'une douzaine': 12, quelques: 3, plusieurs: 3,
};

/** Lit une quantité en tête de chaîne : « 3 prises », « deux spots », « 12,5 m² ». */
export function leadingQuantity(s: string): { qty: number; rest: string } {
  const t = s.trim();
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) return { qty: Number(m[1].replace(',', '.')), rest: m[2] };
  for (const [w, n] of Object.entries(NUMBERS).sort((a, b) => b[0].length - a[0].length)) {
    if (t === w || t.startsWith(w + ' ')) return { qty: n, rest: t.slice(w.length).trim() };
  }
  return { qty: 1, rest: t.replace(/^(le|la|les|des|du|de la|de l')\s+/, '') };
}

export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Trouve une date dans la phrase : aujourd'hui, demain, après-demain, un jour de semaine, « le 24 ». */
export function parseDay(n: string, base = new Date()): { iso: string; label: string } | null {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (/apres[- ]demain/.test(n)) {
    d.setDate(d.getDate() + 2);
    return { iso: iso(d), label: 'après-demain' };
  }
  if (/\bdemain\b/.test(n)) {
    d.setDate(d.getDate() + 1);
    return { iso: iso(d), label: 'demain' };
  }
  if (/aujourd'?hui|ce matin|cet apres|ce soir|\bce jour\b/.test(n)) return { iso: iso(d), label: "aujourd'hui" };
  for (let i = 0; i < 7; i++) {
    const w = WEEKDAYS[i];
    if (new RegExp(`\\b${w}\\b`).test(n)) {
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return { iso: iso(d), label: `${w} ${d.getDate()}` };
    }
  }
  const m = n.match(/\ble (\d{1,2})\b/);
  if (m) {
    const day = Number(m[1]);
    if (day >= 1 && day <= 31) {
      if (day < d.getDate()) d.setMonth(d.getMonth() + 1);
      d.setDate(day);
      return { iso: iso(d), label: `le ${day}` };
    }
  }
  return null;
}

export const PHONE_RE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
export const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

/** Met une majuscule à chaque mot d'un nom propre. */
export const titleCase = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 2 && /^(de|du|la|le|d')$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

/** Similarité simple : le mot cherché apparaît dans le nom normalisé. */
export const matchesName = (query: string, name: string) => {
  const q = norm(query).replace(/^(mme|madame|m\.?|monsieur|mr|mlle|mademoiselle|chez|famille)\s+/, '');
  if (!q) return false;
  const words = norm(name).split(/[\s·,.-]+/);
  return q.split(' ').every((w) => w.length > 1 && words.some((x) => x === w || (w.length > 3 && x.startsWith(w))));
};
