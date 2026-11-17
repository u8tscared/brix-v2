// Fin de l'inscription : création du Brix, import des clients, e-mail de bienvenue et notification.
import { TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import type { Client } from '@/lib/types';
import { useBoite } from '@/emails/boite';
import { useNotifs } from '@/modules/notifications/store';
import { recommendedPlan, type Draft } from './draft';
import { PROFILS } from './metiers';

export type ClientImporte = Pick<Client, 'name' | 'email' | 'phone' | 'city' | 'address'>;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Lecture tolérante d'un CSV de clients (séparateur ; ou ,, colonnes devinées par leur nom). */
export function parseClientsCsv(text: string): ClientImporte[] {
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (rows.length < 2) return [];
  const sep = (rows[0].match(/;/g)?.length ?? 0) >= (rows[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const split = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
  const head = split(rows[0]).map(norm);
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iName = col('nom', 'name', 'client', 'raison');
  const iFirst = col('prenom', 'first');
  const iMail = col('mail');
  const iTel = col('tel', 'phone', 'portable', 'mobile');
  const iCity = col('ville', 'city', 'commune');
  const iAddr = col('adresse', 'address', 'rue');
  return rows
    .slice(1)
    .map(split)
    .map((c) => {
      const name = [iFirst >= 0 && iFirst !== iName ? c[iFirst] : '', iName >= 0 ? c[iName] : c[0]].filter(Boolean).join(' ').trim();
      return { name, email: iMail >= 0 ? c[iMail] ?? '' : '', phone: iTel >= 0 ? c[iTel] ?? '' : '', city: iCity >= 0 ? c[iCity] ?? '' : '', address: iAddr >= 0 ? c[iAddr] ?? '' : '' };
    })
    .filter((c) => c.name)
    .slice(0, 2000);
}

export function finishOnboarding(d: Draft, imported: ClientImporte[]) {
  const s = useBrix.getState();
  const trade = d.trade ?? 'autre';
  const initials = d.companyName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const email = d.email.trim() || s.user.email;
  s.completeOnboarding({
    company: {
      name: d.companyName.trim(), legalName: d.companyName.trim().toUpperCase(), siret: d.siret, address: d.address, city: d.city, trade, secondaryTrades: d.secondary,
      size: d.size ?? 'solo', employees: { solo: 1, petite: 4, pme: 20, grande: 80 }[d.size ?? 'solo'], email, logoInitials: initials || 'B',
    },
    user: { firstName: d.firstName.trim(), lastName: d.lastName.trim(), email, role: 'patron' },
    priorities: d.priorities,
    enabled: d.enabled,
    plan: d.plan ?? recommendedPlan(d),
    withDemoData: d.withDemo,
  });
  if (!d.tour) useBrix.getState().setPrefs({ tourDone: true });

  const now = new Date().toISOString();
  imported.forEach((c, i) =>
    useBrix.getState().upsertClient({ id: `c_imp_${Date.now().toString(36)}_${i}`, kind: 'particulier', tags: ['Import'], createdAt: now, ...c }),
  );
  if (imported.length || d.importFrom) useBrix.getState().markTask('import', true);

  const prenom = d.firstName.trim();
  const entreprise = d.companyName.trim();
  const metier = TRADE_BY_KEY[trade].name;
  useBoite.getState().ajouter({
    modele: 'bienvenue',
    pour: 'artisan',
    a: email,
    de: 'Brix',
    donnees: { prenom, entreprise, metier, lienApp: location.href.split('#')[0] + '#/app', etapes: [...PROFILS[trade].etapes] },
  });
  useNotifs.getState().ajouter({
    type: 'systeme',
    titre: 'Bienvenue sur Brix',
    texte: `${entreprise} est prêt avec ${d.enabled.length} outils. Premier conseil : ${PROFILS[trade].etapes[0].charAt(0).toLowerCase()}${PROFILS[trade].etapes[0].slice(1)}.`,
    vers: '/app',
  });
}
