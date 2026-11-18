// Apparence de chaque type de notification (icône Lucide + teinte) et regroupement par jour.
import { BadgeCheck, Bell, CircleDollarSign, Eye, FileSearch, MessageCircleQuestion, PackageCheck, Send, Star, Truck, XCircle, type LucideIcon } from 'lucide-react';
import { dayOffset } from '@/lib/format';
import type { Notif, TypeNotif } from './store';

export const APPARENCE: Record<TypeNotif, { I: LucideIcon; fond: string; encre: string; libelle: string }> = {
  devis_signe: { I: BadgeCheck, fond: '#ecfdf3', encre: '#15803d', libelle: 'Devis signé' },
  paiement_recu: { I: CircleDollarSign, fond: '#ecfdf3', encre: '#15803d', libelle: 'Paiement' },
  devis_ouvert: { I: Eye, fond: '#f5f0ff', encre: '#6d28d9', libelle: 'Devis consulté' },
  devis_question: { I: MessageCircleQuestion, fond: '#fff7ed', encre: '#c2410c', libelle: 'Question' },
  devis_refuse: { I: XCircle, fond: '#f4f4f6', encre: '#5d5a72', libelle: 'Devis décliné' },
  facture_ouverte: { I: FileSearch, fond: '#f5f0ff', encre: '#6d28d9', libelle: 'Facture consultée' },
  fournisseur_reponse: { I: Truck, fond: '#eff6ff', encre: '#1d4ed8', libelle: 'Fournisseur' },
  commande_confirmee: { I: PackageCheck, fond: '#eff6ff', encre: '#1d4ed8', libelle: 'Commande' },
  relance_envoyee: { I: Send, fond: '#f4f4f6', encre: '#5d5a72', libelle: 'Relance' },
  avis_recu: { I: Star, fond: '#fffbeb', encre: '#b45309', libelle: 'Avis client' },
  systeme: { I: Bell, fond: '#f4f4f6', encre: '#15122a', libelle: 'Brix' },
};

export function groupes(items: Notif[]): { titre: string; items: Notif[] }[] {
  const auj = dayOffset(0);
  const hier = dayOffset(-1);
  const g: Record<string, Notif[]> = { "Aujourd'hui": [], Hier: [], 'Plus tôt': [] };
  for (const n of items) {
    const j = n.at.slice(0, 10);
    g[j === auj ? "Aujourd'hui" : j === hier ? 'Hier' : 'Plus tôt'].push(n);
  }
  return Object.entries(g)
    .filter(([, v]) => v.length)
    .map(([titre, v]) => ({ titre, items: v }));
}

export function heure(iso: string) {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  if (iso.slice(0, 10) === dayOffset(0)) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
