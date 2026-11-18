// Outils partagés du département Vendre : libellés, calculs par client, qualification des demandes.
import type { LucideIcon } from 'lucide-react';
import { Globe, Handshake, LayoutGrid, MessageCircle, PhoneCall, Search, Users } from 'lucide-react';
import type { Tone } from '@/components/ui/Badge';
import type { HaloTone } from '@/components/ui/IconTile';
import { totals } from '@/lib/format';
import type { BrixState } from '@/lib/store';
import type { Client, Lead } from '@/lib/types';

export const LEAD_SOURCE: Record<Lead['source'], { label: string; icon: LucideIcon }> = {
  site: { label: 'Site internet', icon: Globe },
  telephone: { label: 'Téléphone', icon: PhoneCall },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  plateforme: { label: 'Habitatpresto', icon: LayoutGrid },
  google: { label: 'Google', icon: Search },
  parrainage: { label: 'Parrainage', icon: Handshake },
};

/** Ton Halo de chaque canal (pastille de la source). */
export const LEAD_SOURCE_TONE: Record<Lead['source'], HaloTone> = { site: 'violet', telephone: 'blue', whatsapp: 'green', plateforme: 'peach', google: 'amber', parrainage: 'mag' };

export const CLIENT_SOURCE: Record<NonNullable<Client['source']>, string> = {
  site: 'Site internet',
  telephone: 'Téléphone',
  'bouche-a-oreille': 'Bouche-à-oreille',
  google: 'Google',
  plateforme: 'Plateforme',
  parrainage: 'Parrainage',
};
export const clientSourceIcon = (s?: Client['source']): LucideIcon =>
  s === 'site' ? Globe : s === 'telephone' ? PhoneCall : s === 'google' ? Search : s === 'plateforme' ? LayoutGrid : s === 'parrainage' ? Handshake : Users;

export const LEAD_STATUS: Record<Lead['status'], { label: string; tone: Tone; hint: string }> = {
  nouveau: { label: 'Nouvelles', tone: 'violet', hint: 'À rappeler' },
  qualifie: { label: 'Qualifiées', tone: 'info', hint: 'Bob a tout vérifié' },
  rdv: { label: 'Visite prévue', tone: 'warn', hint: 'Rendez-vous calé' },
  devis: { label: 'Devis envoyé', tone: 'neutral', hint: 'En attente de signature' },
  gagne: { label: 'Gagnées', tone: 'ok', hint: 'Devenues chantier' },
  perdu: { label: 'Perdues', tone: 'bad', hint: 'Classées' },
};
export const LEAD_FLOW: Lead['status'][] = ['nouveau', 'qualifie', 'rdv', 'devis', 'gagne'];

export type Urgency = 'urgent' | 'semaine' | 'flexible';
export const URGENCY: Record<Urgency, { label: string; tone: Tone }> = {
  urgent: { label: 'Urgent', tone: 'bad' },
  semaine: { label: 'Cette semaine', tone: 'warn' },
  flexible: { label: 'Pas pressé', tone: 'neutral' },
};

/** Lecture rapide d'une demande par Bob (déterministe en démo, remplacée par l'IA côté serveur). */
export function readLead(l: Lead): { urgency: Urgency; summary: string; kind: string } {
  const t = l.request.toLowerCase();
  const urgency: Urgency = /urgent|saute|panne|plus de courant|fuite|vite/.test(t) ? 'urgent' : /rénovation|achat|devis|borne/.test(t) ? 'semaine' : 'flexible';
  let kind = 'Petits travaux';
  if (/rénovation|complète/.test(t)) kind = 'Rénovation complète';
  else if (/borne|irve|tesla|recharge/.test(t)) kind = 'Borne de recharge';
  else if (/disjoncteur|panne|saute/.test(t)) kind = 'Dépannage';
  else if (/entretien|contrat/.test(t)) kind = "Contrat d'entretien";
  else if (/prise|radiateur/.test(t)) kind = 'Ajout de prises et chauffage';
  else if (/interrupteur/.test(t)) kind = 'Petit remplacement';
  const m2 = t.match(/(\d+)\s?m²/);
  const extra = m2 ? ` · ${m2[1]} m²` : /maison/.test(t) ? ' · maison' : /appartement/.test(t) ? ' · appartement' : '';
  return { urgency, kind, summary: `${kind}${extra} à ${l.city}` };
}

export const isProName = (name: string) => /restaurant|copropri|sci |sarl|sas|cabinet|boulangerie|syndic|hôtel|société|entreprise/i.test(name + ' ');

/** Chiffres clés d'un client à partir du store. */
export function clientStats(s: Pick<BrixState, 'devis' | 'factures' | 'chantiers'>, clientId: string) {
  const devis = s.devis.filter((d) => d.clientId === clientId);
  const factures = s.factures.filter((f) => f.clientId === clientId);
  const chantiers = s.chantiers.filter((c) => c.clientId === clientId);
  const billed = factures.filter((f) => f.status !== 'annulee' && f.status !== 'brouillon').reduce((a, f) => a + totals(f.lines).ttc, 0);
  const paid = factures.reduce((a, f) => a + f.paidAmount, 0);
  const signedHt = devis.filter((d) => d.status === 'signe').reduce((a, d) => a + totals(d.lines).ht, 0);
  const pendingHt = devis.filter((d) => ['envoye', 'vu', 'brouillon'].includes(d.status)).reduce((a, d) => a + totals(d.lines).ht, 0);
  const caHt = factures.filter((f) => f.status !== 'annulee').reduce((a, f) => a + totals(f.lines).ht, 0);
  const late = factures.filter((f) => f.status === 'en_retard');
  const dates = [...devis.map((d) => d.sentAt || d.createdAt), ...factures.map((f) => f.issueDate)].sort();
  return { devis, factures, chantiers, billed, paid, due: Math.max(0, billed - paid), signedHt, pendingHt, caHt, late, lastActivity: dates[dates.length - 1] };
}

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;
export const waHref = (phone: string, text = '') => {
  const p = phone.replace(/\D/g, '').replace(/^0/, '33');
  return `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

// Avatars Halo : fond pâle + encre franche du même ton (violet, pêche, vert, bleu, magenta, ambre).
const AVATAR = ['#f1eafe', '#fff0e4', '#e5f6ef', '#e8f0fe', '#fce8fd', '#fdf3dc'];
const AVATAR_INK = ['#6d28d9', '#d4661b', '#0f8a5f', '#2f5fd0', '#b02bc4', '#a86206'];
const avatarIndex = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length;
export const clientColor = (id: string) => AVATAR[avatarIndex(id)];
export const clientInk = (id: string) => AVATAR_INK[avatarIndex(id)];
