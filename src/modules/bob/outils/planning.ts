// Outils « organisation » partagés par le moteur local (nlu/planning.ts) et l'agent :
// agenda, recherche et point chantier, affectation d'un compagnon.

import { dateLong, money, pct, relative, todayISO, uid } from '@/lib/format';
import { CHANTIER_STATUS } from '@/lib/status';
import type { Chantier, Employee, PlanningEvent } from '@/lib/types';
import { matchesName, norm } from '../nlu/text';
import type { BobCard } from '../nlu/types';
import { margePrevue, type Etat } from './argent';

export const KIND_LABEL: Record<PlanningEvent['kind'], string> = { chantier: 'Chantier', rdv: 'Rendez-vous', sav: 'Entretien', absence: 'Absence', formation: 'Formation', interne: 'Bureau' };
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** L'employé qui correspond à l'utilisateur connecté (le patron par défaut). */
export function moi(s: Etat): string | undefined {
  return s.employees.find((e) => e.firstName && e.firstName === s.user.firstName)?.id ?? s.employees.find((e) => e.role === 'patron')?.id;
}

/** Créneaux entre deux dates incluses, de l'utilisateur ou de toute l'équipe. */
export function evenements(s: Etat, du: string, au: string, equipe: boolean): PlanningEvent[] {
  const me = moi(s);
  return s.events
    .filter((e) => e.date >= du && e.date <= au && (equipe || e.employeeId === me))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export const prenom = (s: Etat, id: string) => s.employees.find((e) => e.id === id)?.firstName ?? '';

export function carteAgenda(s: Etat, evs: PlanningEvent[], titre: string, equipe: boolean): BobCard {
  const plusieursJours = new Set(evs.map((e) => e.date)).size > 1;
  return {
    kind: 'agenda', icon: 'CalendarRange', title: titre, subtitle: equipe ? 'Toute l’équipe' : 'Ton planning',
    rows: evs.map((e) => ({ label: e.title, sub: `${plusieursJours ? `${dateLong(e.date)} · ` : ''}${e.start} – ${e.end} · ${KIND_LABEL[e.kind]}${equipe ? ` · ${prenom(s, e.employeeId)}` : ''}`, value: e.start, tone: e.kind === 'rdv' ? 'violet' : e.kind === 'sav' ? 'warn' : undefined, to: e.chantierId ? `/app/chantiers/${e.chantierId}` : undefined })),
    actions: [{ label: 'Ouvrir le planning', to: '/app/planning', variant: 'secondary' }],
  };
}

/** Retrouve un chantier par son nom ou celui du client ; `phrase` sert de secours (nom cité n'importe où). */
export function trouverChantier(s: Etat, q: string, phrase = q): Chantier | undefined {
  const query = norm(q).replace(/\b(mme|madame|monsieur|m\.)\s+/g, '').replace(/^(le |la )?chantier\s+(de |du |des |chez )?/, '').trim();
  if (query) {
    const byName = s.chantiers.find((c) => matchesName(query, c.name));
    if (byName) return byName;
    const client = s.clients.find((c) => matchesName(query, c.name) || (c.contact && matchesName(query, c.contact)));
    if (client) {
      const ch = s.chantiers.find((c) => c.clientId === client.id);
      if (ch) return ch;
    }
  }
  const n = norm(phrase);
  for (const c of s.chantiers) {
    const client = s.clients.find((x) => x.id === c.clientId);
    const last = client ? norm(client.name).split(' ').pop()! : '';
    if (last.length > 2 && new RegExp(`\\b${last}\\b`).test(n)) return c;
  }
  return undefined;
}

export function statutChantier(s: Etat, c: Chantier) {
  const marginRate = margePrevue(c);
  const team = c.team.map((id) => prenom(s, id)).filter(Boolean).join(', ');
  const late = c.endDate < todayISO() && c.status !== 'termine';
  const card: BobCard = {
    kind: 'chantier', icon: 'HardHat', title: c.name, subtitle: `${c.address} · ${c.city}`, progress: c.progress, figure: `${c.progress} %`, figureLabel: `fin prévue ${relative(c.endDate)}${late ? ' · en retard' : ''}`,
    rows: [
      { label: 'Statut', value: CHANTIER_STATUS[c.status].label },
      { label: 'Budget', value: money(c.budgetHt, true) + ' HT' },
      { label: 'Dépensé', value: money(c.costHt, true) },
      { label: 'Marge prévue', value: pct(marginRate), tone: marginRate < 15 ? 'bad' : marginRate < 25 ? 'warn' : 'ok' },
      { label: 'Équipe', value: team || 'personne' },
      { label: 'Prochaine étape', value: c.nextStep },
      { label: 'Photos', value: String(c.photos) },
    ],
    actions: [{ label: 'Ouvrir le chantier', to: `/app/chantiers/${c.id}`, variant: 'primary' }, { label: 'Planning', to: '/app/planning', variant: 'secondary' }],
  };
  const donnees = { id: c.id, nom: c.name, client: s.clients.find((k) => k.id === c.clientId)?.name ?? '', ville: c.city, statut: CHANTIER_STATUS[c.status].label, avancement: c.progress, debut: c.startDate, fin_prevue: c.endDate, en_retard: late, budget_ht: c.budgetHt, depense: c.costHt, marge_prevue: Math.round(marginRate * 10) / 10, equipe: team, prochaine_etape: c.nextStep, photos: c.photos };
  return { marginRate, late, team, card, donnees };
}

export type Creneau = 'journee' | 'matin' | 'apres_midi';
export const HORAIRES: Record<Creneau, [string, string]> = { journee: ['08:00', '17:00'], matin: ['08:00', '12:00'], apres_midi: ['13:30', '17:00'] };

export const trouverEmploye = (s: Etat, nom: string): Employee | undefined => {
  const n = norm(nom);
  return s.employees.find((e) => new RegExp(`\\b${norm(e.firstName)}\\b`).test(n)) ?? s.employees.find((e) => matchesName(nom, `${e.firstName} ${e.lastName}`));
};

/** Met un compagnon sur un chantier à une date. Écrit dans le store ; la carte permet d'annuler. */
export function planifier(s: Etat, emp: Employee, c: Chantier, date: string, creneau: Creneau) {
  const half = HORAIRES[creneau];
  const conflicts = s.events.filter((e) => e.employeeId === emp.id && e.date === date && e.start < half[1] && e.end > half[0]);
  const client = s.clients.find((k) => k.id === c.clientId);
  const ev: PlanningEvent = { id: uid('pe'), employeeId: emp.id, chantierId: c.id, title: `${client?.name.split(' ').pop() ?? c.name} · ${c.name.split('·').pop()?.trim() ?? ''}`.trim(), date, start: half[0], end: half[1], kind: 'chantier' };
  s.upsertEvent(ev);
  const addedToTeam = !c.team.includes(emp.id);
  if (addedToTeam) s.upsertChantier({ ...c, team: [...c.team, emp.id] });
  s.pushBob({ icon: 'CalendarRange', text: `J'ai mis ${emp.firstName} sur ${c.name}`, detail: `${dateLong(date)} · ${half[0]}-${half[1]}`, cta: 'Planning', to: '/app/planning', done: true });
  const annuler = (st: Etat) => {
    st.removeEvent(ev.id);
    if (addedToTeam) st.upsertChantier(c);
    return 'Créneau retiré du planning.';
  };
  const card = (undo: () => string): BobCard => ({
    kind: 'done', icon: 'CalendarRange', title: `${emp.firstName} · ${c.name}`, subtitle: `${capital(dateLong(date))} · ${half[0]} – ${half[1]}`,
    rows: conflicts.length ? conflicts.map((x) => ({ label: `Déjà prévu : ${x.title}`, sub: `${x.start} – ${x.end}`, tone: 'warn' as const })) : [{ label: 'Prévenu par SMS', sub: emp.phone, tone: 'ok' as const }],
    actions: [{ label: 'Voir le planning', to: '/app/planning', variant: 'secondary' }, { label: 'Annuler', variant: 'ghost', run: undo }],
  });
  return { ev, half, conflicts, addedToTeam, annuler, card };
}
