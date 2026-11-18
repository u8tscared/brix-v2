// Construit le brief du matin à partir des données du store.

import type { BrixState } from '@/lib/store';
import { daysBetween, money, todayISO, totals } from '@/lib/format';
import { due, lateInvoices } from './nlu/money';

export interface BriefTodo { id: string; text: string; detail: string; to: string; icon: string }
export interface BriefAlert { id: string; text: string; tone: 'warn' | 'bad' | 'violet' | 'info'; to: string; icon: string }

export function buildBrief(s: BrixState) {
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yISO = yesterday.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const ins = s.bank.filter((t) => t.amount > 0);
  const inYesterday = ins.filter((t) => t.date === yISO).reduce((x, t) => x + t.amount, 0);
  const inMonth = ins.filter((t) => t.date >= monthStart).reduce((x, t) => x + t.amount, 0);
  const late = lateInvoices();
  const lateTotal = late.reduce((x, f) => x + due(f), 0);
  const toCollect = s.factures.filter((f) => !['payee', 'annulee', 'brouillon'].includes(f.status)).reduce((x, f) => x + due(f), 0);
  const clientName = (id: string) => s.clients.find((c) => c.id === id)?.name ?? '';

  const todayEvents = s.events.filter((e) => e.date === today);
  const sites = s.chantiers
    .filter((c) => todayEvents.some((e) => e.chantierId === c.id))
    .map((c) => ({ c, people: [...new Set(todayEvents.filter((e) => e.chantierId === c.id).map((e) => e.employeeId))].map((id) => s.employees.find((e) => e.id === id)).filter(Boolean) as BrixState['employees'] }));
  const rdv = todayEvents.filter((e) => e.kind === 'rdv' || e.kind === 'sav').sort((a, b) => a.start.localeCompare(b.start));

  const team = s.employees.map((e) => {
    const ev = todayEvents.filter((x) => x.employeeId === e.id).sort((a, b) => a.start.localeCompare(b.start));
    return { e, first: ev[0], absent: ev.some((x) => x.kind === 'absence'), training: ev.some((x) => x.kind === 'formation') };
  });

  const alerts: BriefAlert[] = [];
  s.devis.filter((d) => d.status === 'vu' && d.viewedAt === today).forEach((d) =>
    alerts.push({ id: 'v' + d.id, text: `${clientName(d.clientId)} a ouvert ton devis ${d.views ?? 1} fois (${money(totals(d.lines).ht, true)} HT)`, tone: 'violet', to: `/app/devis/${d.id}`, icon: 'FileText' }),
  );
  s.employees.forEach((e) =>
    e.habilitations.forEach((h) => {
      const left = daysBetween(today, h.expires);
      if (left < 0) alerts.push({ id: 'h' + e.id + h.label, text: `${e.firstName} : ${h.label} expirée depuis ${-left} jours`, tone: 'bad', to: '/app/habilitations', icon: 'BadgeCheck' });
      else if (left <= 30) alerts.push({ id: 'h' + e.id + h.label, text: `${e.firstName} : ${h.label} expire dans ${left} jours`, tone: 'warn', to: '/app/habilitations', icon: 'BadgeCheck' });
    }),
  );
  const newLeads = s.leads.filter((l) => l.status === 'nouveau');
  if (newLeads.length) alerts.push({ id: 'leads', text: `${newLeads.length} nouvelle${newLeads.length > 1 ? 's' : ''} demande${newLeads.length > 1 ? 's' : ''} de clients, dont ${newLeads[0].name}`, tone: 'info', to: '/app/demandes', icon: 'Inbox' });
  s.chantiers.filter((c) => c.status === 'en_cours' && c.budgetHt && c.costHt / c.budgetHt > c.progress / 100 + 0.08).forEach((c) =>
    alerts.push({ id: 'm' + c.id, text: `${c.name} : les dépenses vont plus vite que l’avancement`, tone: 'warn', to: `/app/chantiers/${c.id}`, icon: 'HardHat' }),
  );

  const todos: BriefTodo[] = [];
  const urgent = newLeads.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if (urgent) todos.push({ id: 't-lead', text: `Rappeler ${urgent.name}`, detail: urgent.request, to: '/app/demandes', icon: 'PhoneCall' });
  const seen = s.devis.find((d) => d.status === 'vu');
  if (seen) todos.push({ id: 't-devis', text: `Relancer ${clientName(seen.clientId)} sur son devis`, detail: `Vu ${seen.views ?? 1} fois, pas encore signé`, to: `/app/devis/${seen.id}`, icon: 'FileText' });
  if (late.length) todos.push({ id: 't-late', text: `Récupérer ${money(lateTotal, true)} de retards`, detail: late.map((f) => clientName(f.clientId)).join(', '), to: '/app/relances', icon: 'BellRing' });
  const expired = alerts.find((a) => a.tone === 'bad' && a.id.startsWith('h'));
  if (todos.length < 3 && expired) todos.push({ id: 't-hab', text: 'Renouveler une habilitation', detail: expired.text, to: '/app/habilitations', icon: 'BadgeCheck' });

  const first = s.user.firstName || '';
  const parts = [
    `Bonjour ${first}.`,
    inYesterday ? `Hier, tu as encaissé ${money(inYesterday, true)}.` : '',
    `Ce mois-ci, ${money(inMonth, true)} sont rentrés, et il reste ${money(toCollect, true)} à encaisser${late.length ? `, dont ${money(lateTotal, true)} en retard` : ''}.`,
    sites.length ? `Aujourd'hui, ${sites.length} chantier${sites.length > 1 ? 's' : ''} tournent : ${sites.map((x) => `${x.c.name.split('·')[0].trim()} avec ${x.people.map((p) => p.firstName).join(' et ')}`).join(' ; ')}.` : "Pas de chantier prévu aujourd'hui.",
    rdv.length ? `Tu as ${rdv.length} rendez-vous, le premier à ${rdv[0].start.replace(':', ' heures ')} : ${rdv[0].title}.` : '',
    alerts.length ? `À surveiller : ${alerts.slice(0, 3).map((a) => a.text).join('. ')}.` : '',
    todos.length ? `Tes ${todos.length} choses à faire : ${todos.map((t, i) => `${i + 1}, ${t.text}`).join('. ')}.` : '',
    'Bonne journée.',
  ].filter(Boolean);
  const script = parts.join(' ');
  const seconds = Math.round(script.split(/\s+/).length / 2.5);

  return { inYesterday, inMonth, toCollect, late, lateTotal, sites, rdv, team, alerts, todos, script, seconds };
}

export const fmtDuration = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')}` : `${sec} s`);
