// Services du département Vendre.
// En démo tout est simulé ici, avec des délais réalistes. Pour brancher la vraie API,
// remplacer le corps de chaque fonction par un appel au worker (ex. fetch('/api/vendre/...')).

import { dayOffset, uid } from '@/lib/format';
import type { Client, DevisLigne, Lead, PlanningEvent } from '@/lib/types';
import { isProName, readLead } from './lib';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Qualification d'une demande par Bob (score, estimation). Vraie version : POST /api/bob/qualify. */
export async function qualifyLead(l: Lead): Promise<Pick<Lead, 'score' | 'estimate'>> {
  await wait(900);
  const r = readLead(l);
  const base: Record<string, number> = { 'Rénovation complète': 7200, 'Borne de recharge': 1650, Dépannage: 380, "Contrat d'entretien": 2800, 'Ajout de prises et chauffage': 980, 'Petit remplacement': 180, 'Petits travaux': 650 };
  const est = base[r.kind] ?? 650;
  const score = Math.min(97, Math.round(45 + (r.urgency === 'urgent' ? 30 : r.urgency === 'semaine' ? 18 : 5) + Math.min(20, est / 400) + (l.email ? 4 : 0)));
  return { score, estimate: est };
}

/** Recherche d'entreprise par SIRET ou nom. Vraie version : API Recherche d'entreprises (data.gouv) via le worker. */
export async function lookupCompany(q: string): Promise<Partial<Client> | null> {
  await wait(700);
  const digits = q.replace(/\D/g, '');
  const known: Partial<Client>[] = [
    { name: 'Le Comptoir des Halles', siret: '894 512 377 00014', address: '14 rue Mercière', city: '69002 Lyon', contact: 'Gérant', email: 'contact@comptoirdeshalles.fr', phone: '04 78 52 10 20' },
    { name: 'Copropriété Bellecour', siret: '752 336 901 00026', address: '22 place Bellecour', city: '69002 Lyon', contact: 'Cabinet Foncia', email: 'bellecour@foncia.fr', phone: '04 72 41 00 00' },
    { name: 'Pharmacie des Gratte-Ciel', siret: '533 908 214 00031', address: '5 avenue Henri Barbusse', city: '69100 Villeurbanne', contact: 'Mme Perrin', email: 'pharmacie.gratteciel@gmail.com', phone: '04 78 84 22 10' },
  ];
  if (!q.trim()) return null;
  const hit = known.find((k) => (digits.length >= 9 && k.siret!.replace(/\D/g, '').startsWith(digits.slice(0, 9))) || k.name!.toLowerCase().includes(q.toLowerCase()));
  if (hit) return hit;
  if (digits.length >= 9) {
    const s = digits.padEnd(14, '0');
    return { name: 'Entreprise ' + s.slice(0, 3), siret: `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9, 14)}`, address: '1 rue de la République', city: '69001 Lyon' };
  }
  return { name: q.trim().replace(/\b\w/g, (c) => c.toUpperCase()), siret: '9' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') + ' 00019', address: '8 rue Garibaldi', city: '69006 Lyon' };
}

/** Lignes de devis pré-remplies à partir d'une demande. Vraie version : Bob côté serveur avec la bibliothèque de prix. */
export function linesFromLead(l: Lead, rate = 55): DevisLigne[] {
  const kind = readLead(l).kind;
  const mk = (designation: string, quantity: number, unit: string, unitPriceHt: number, unitCostHt: number, k: DevisLigne['kind'] = unit === 'h' ? 'main_oeuvre' : 'fourniture'): DevisLigne => ({
    id: uid('l'), kind: k, designation, quantity, unit, unitPriceHt, unitCostHt, vatRate: 10, source: 'bob',
  });
  const section = (t: string): DevisLigne => ({ id: uid('l'), kind: 'section', designation: t, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 });
  switch (kind) {
    case 'Borne de recharge':
      return [section('Borne de recharge'), mk('Borne Legrand Green\'up 7,4 kW', 1, 'u', 1180, 790), mk('Protection différentielle type A 40 A', 1, 'u', 96, 58), mk('Câble 3G6 mm²', 14, 'm', 6.4, 3.9), mk('Pose et mise en service IRVE', 6, 'h', rate + 5, 31.5)];
    case 'Dépannage':
      return [section('Dépannage'), mk('Déplacement et diagnostic', 1, 'forfait', 89, 20, 'ouvrage'), mk('Recherche de défaut et remise en service', 2, 'h', rate, 31.5), mk('Disjoncteur DX³ 20 A courbe C', 1, 'u', 11.9, 7.6)];
    case 'Rénovation complète':
      return [section('Lot 1 · Tableau'), mk('Coffret 3 rangées équipé', 1, 'u', 890, 540), mk('Pose et raccordement du tableau', 6, 'h', rate, 31.5), section('Lot 2 · Distribution'), mk('Prise 2P+T', 28, 'u', 24.5, 12.8), mk('Câble R2V 3G2,5 mm²', 120, 'm', 2.35, 1.42), mk('Saignées, tirage et raccordement', 34, 'h', rate, 31.5), section('Lot 3 · Mise en service'), mk('Attestation Consuel', 1, 'forfait', 180, 120, 'ouvrage')];
    case "Contrat d'entretien":
      return [section("Contrat d'entretien annuel"), mk('Visite de contrôle des parties communes', 4, 'u', 320, 140, 'ouvrage'), mk('Remplacement éclairage défectueux (forfait)', 1, 'forfait', 560, 260, 'ouvrage'), mk('Astreinte dépannage 48 h', 12, 'mois', 85, 20, 'ouvrage')];
    case 'Ajout de prises et chauffage':
      return [section('Chambre'), mk('Prise 2P+T Céliane', 4, 'u', 24.5, 12.8), mk('Radiateur à inertie 1500 W', 1, 'u', 420, 265), mk('Câble R2V 3G2,5 mm²', 25, 'm', 2.35, 1.42), mk('Pose et raccordement', 6, 'h', rate, 31.5)];
    default:
      return [section('Travaux'), mk('Fournitures', 1, 'forfait', 120, 70), mk("Main d'œuvre", 2, 'h', rate, 31.5)];
  }
}

export function clientFromLead(l: Lead): Client {
  const pro = isProName(l.name);
  return {
    id: uid('c'), kind: pro ? 'pro' : 'particulier', name: l.name, email: l.email ?? '', phone: l.phone, address: '', city: l.city,
    tags: [readLead(l).kind], createdAt: new Date().toISOString().slice(0, 10),
    source: l.source === 'whatsapp' ? 'telephone' : l.source, notes: l.request,
  };
}

/** Trois créneaux de visite libres dans l'agenda du patron. Vraie version : GET /api/planning/free-slots. */
export function freeSlots(events: PlanningEvent[], employeeId: string, count = 4): { date: string; start: string; end: string }[] {
  const out: { date: string; start: string; end: string }[] = [];
  const candidates = ['08:00', '10:30', '14:00', '16:30'];
  for (let i = 1; i < 14 && out.length < count; i++) {
    const date = dayOffset(i);
    const wd = new Date(date + 'T12:00').getDay();
    if (wd === 0 || wd === 6) continue;
    const busy = events.filter((e) => e.employeeId === employeeId && e.date === date);
    for (const start of candidates) {
      const [h, m] = start.split(':').map(Number);
      const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!busy.some((b) => b.start < end && b.end > start)) {
        out.push({ date, start, end });
        break;
      }
    }
  }
  return out;
}

export async function sendSms(_to: string, _text: string) {
  await wait(600);
  return { ok: true, demo: true };
}

/** Contacts importés depuis Google ou l'iPhone (simulé). Vraie version : OAuth Google People API / CardDAV. */
export async function importFromProvider(provider: 'google' | 'iphone'): Promise<Partial<Client>[]> {
  await wait(1400);
  const base: Partial<Client>[] = [
    { name: 'Nadia Belkacem', phone: '06 24 88 15 02', email: 'nadia.belkacem@gmail.com', city: '69100 Villeurbanne' },
    { name: 'Jean-Pierre Collin', phone: '06 85 40 12 77', email: 'jp.collin@wanadoo.fr', city: '69500 Bron' },
    { name: 'Agence Immo Croix-Rousse', phone: '04 78 29 61 10', email: 'contact@immo-croixrousse.fr', city: '69004 Lyon' },
    { name: 'Laurence Petit', phone: '07 66 31 20 48', email: 'l.petit@outlook.fr', city: '69003 Lyon' },
  ];
  return provider === 'google' ? base : base.slice(0, 3).reverse();
}

/** Lecture réelle d'un fichier CSV ou vCard dans le navigateur. */
export function parseContacts(text: string, filename: string): Partial<Client>[] {
  if (/\.vcf$/i.test(filename) || text.includes('BEGIN:VCARD')) {
    return text
      .split(/END:VCARD/i)
      .map((card) => {
        const get = (k: string) => card.match(new RegExp(`^${k}[^:\\n]*:(.*)$`, 'im'))?.[1]?.trim() ?? '';
        const fn = get('FN') || get('N').split(';').filter(Boolean).reverse().join(' ');
        const adr = get('ADR').split(';').filter(Boolean);
        return { name: fn, phone: get('TEL'), email: get('EMAIL'), address: adr[0] ?? '', city: adr.slice(1).join(' ') };
      })
      .filter((c) => c.name);
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const split = (l: string) => l.split(sep).map((x) => x.replace(/^"|"$/g, '').trim());
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iName = idx(/nom|name|client|raison/);
  const iFirst = idx(/prénom|prenom|first/);
  const iPhone = idx(/t[ée]l|phone|mobile|portable/);
  const iMail = idx(/mail/);
  const iAdr = idx(/adresse|address|rue/);
  const iCity = idx(/ville|city|commune/);
  const hasHeader = iName >= 0 || iPhone >= 0 || iMail >= 0;
  return (hasHeader ? lines.slice(1) : lines)
    .map((l) => {
      const c = split(l);
      const at = (i: number, fb: number) => (i >= 0 ? c[i] : hasHeader ? '' : c[fb]) ?? '';
      const name = [at(iFirst, -1), at(iName, 0)].filter(Boolean).join(' ');
      return { name, phone: at(iPhone, 1), email: at(iMail, 2), address: at(iAdr, 3), city: at(iCity, 4) };
    })
    .filter((c) => c.name);
}

/** Réponse à un avis rédigée par Bob. Vraie version : POST /api/bob/review-reply puis Google Business Profile API. */
export async function draftReviewReply(r: { author: string; rating: number; text: string }, signer: string): Promise<string> {
  await wait(1100);
  const first = r.author.split(' ')[0].replace(/\.$/, '');
  if (r.rating >= 5) return `Merci beaucoup ${first} pour ce retour ! Ravi que le résultat vous plaise. N'hésitez pas si vous avez besoin de nous pour la suite. ${signer}`;
  if (r.rating === 4) return `Merci ${first} pour votre avis. Vous avez raison pour le démarrage, nous avons depuis revu notre planning pour prévenir plus tôt en cas de décalage. Content que le résultat soit à la hauteur. ${signer}`;
  return `Bonjour ${first}, merci d'avoir pris le temps d'écrire. Je suis désolé que l'expérience n'ait pas été à la hauteur : je vous appelle cette semaine pour trouver une solution. ${signer}`;
}

/** Envoi d'une demande d'avis (SMS ou e-mail avec lien direct vers la fiche Google). */
export async function sendReviewRequest(_clientId: string, _channel: 'sms' | 'mail') {
  await wait(700);
  return { ok: true, demo: true };
}
