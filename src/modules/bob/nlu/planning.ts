// Intentions « organisation » : agenda, point chantier, affecter un compagnon.

import { useBrix } from '@/lib/store';
import { dateLong, money, pct, relative, todayISO, uid } from '@/lib/format';
import { CHANTIER_STATUS } from '@/lib/status';
import type { Chantier, PlanningEvent } from '@/lib/types';
import { matchesName, norm, parseDay } from './text';
import type { BobReply } from './types';

const S = () => useBrix.getState();

const KIND_LABEL: Record<PlanningEvent['kind'], string> = { chantier: 'Chantier', rdv: 'Rendez-vous', sav: 'Entretien', absence: 'Absence', formation: 'Formation', interne: 'Bureau' };

function meId() {
  const s = S();
  return s.employees.find((e) => e.firstName && e.firstName === s.user.firstName)?.id ?? s.employees.find((e) => e.role === 'patron')?.id;
}

export function agenda(n: string): BobReply {
  const s = S();
  const day = parseDay(n) ?? { iso: todayISO(), label: "aujourd'hui" };
  const team = /equipe|gars|compagnons|tout le monde|qui fait quoi/.test(n);
  const me = meId();
  const evs = s.events.filter((e) => e.date === day.iso && (team || e.employeeId === me)).sort((a, b) => a.start.localeCompare(b.start));
  const empName = (id: string) => s.employees.find((e) => e.id === id)?.firstName ?? '';
  const others = s.events.filter((e) => e.date === day.iso && e.employeeId !== me);
  const busy = new Set(others.map((e) => e.employeeId)).size;
  if (!evs.length)
    return {
      text: `Rien de prévu pour toi ${day.label}.${busy && !team ? ` ${busy} personne${busy > 1 ? 's' : ''} de l’équipe ${busy > 1 ? 'sont' : 'est'} sur chantier.` : ''}`,
      suggestions: ['Et pour l’équipe ?', 'Ajoute Yanis sur le chantier Dupuis jeudi'],
    };
  const first = evs[0];
  return {
    text: `${capital(day.label)}, ${team ? 'l’équipe a' : 'tu as'} ${evs.length} créneau${evs.length > 1 ? 'x' : ''}. ${team ? '' : `Tu commences à ${first.start.replace(':', ' h ')} : ${first.title}.`}`.trim(),
    cards: [{
      kind: 'agenda', icon: 'CalendarRange', title: capital(dateLong(day.iso)), subtitle: team ? 'Toute l’équipe' : 'Ton planning',
      rows: evs.map((e) => ({ label: e.title, sub: `${e.start} – ${e.end} · ${KIND_LABEL[e.kind]}${team ? ` · ${empName(e.employeeId)}` : ''}`, value: e.start, tone: e.kind === 'rdv' ? 'violet' : e.kind === 'sav' ? 'warn' : undefined, to: e.chantierId ? `/app/chantiers/${e.chantierId}` : undefined })),
      actions: [{ label: 'Ouvrir le planning', to: '/app/planning', variant: 'secondary' }],
    }],
    suggestions: team ? ['Qu’est-ce que j’ai demain ?'] : ['Et pour l’équipe ?', 'Où en est le chantier Lefèvre ?'],
  };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function findChantier(n: string): Chantier | undefined {
  const s = S();
  const m = n.match(/chantier\s+(?:de\s+|du\s+|des\s+|chez\s+)?(.+?)(?:\s+(?:jeudi|lundi|mardi|mercredi|vendredi|samedi|dimanche|demain|aujourd'hui|le \d+)\b.*)?[?.!]*$/);
  const q = m ? m[1].replace(/\b(mme|madame|monsieur|m\.)\s+/g, '').trim() : '';
  const candidates = s.chantiers;
  if (q) {
    const byName = candidates.find((c) => matchesName(q, c.name));
    if (byName) return byName;
    const client = s.clients.find((c) => matchesName(q, c.name) || (c.contact && matchesName(q, c.contact)));
    if (client) return candidates.find((c) => c.clientId === client.id);
  }
  // Sinon : un nom de client cité n'importe où
  for (const c of candidates) {
    const client = s.clients.find((x) => x.id === c.clientId);
    const last = client ? norm(client.name).split(' ').pop()! : '';
    if (last.length > 2 && new RegExp(`\\b${last}\\b`).test(n)) return c;
  }
  return undefined;
}

export function chantierStatus(n: string): BobReply {
  const s = S();
  const c = findChantier(n);
  if (!c) {
    const actifs = s.chantiers.filter((x) => x.status === 'en_cours');
    return {
      text: `Je n’ai pas trouvé ce chantier. Tu en as ${actifs.length} en cours.`,
      suggestions: actifs.slice(0, 3).map((x) => `Où en est le chantier ${s.clients.find((k) => k.id === x.clientId)?.name.split(' ').pop()} ?`),
    };
  }
  const projCost = c.costHt * (100 / Math.max(c.progress, 1));
  const marginRate = c.budgetHt ? ((c.budgetHt - projCost) / c.budgetHt) * 100 : 0;
  const team = c.team.map((id) => s.employees.find((e) => e.id === id)?.firstName).filter(Boolean).join(', ');
  const late = c.endDate < todayISO() && c.status !== 'termine';
  return {
    text: `${c.name} : ${c.progress} % fait, ${CHANTIER_STATUS[c.status].label.toLowerCase()}. Prochaine étape : ${(c.nextStep.charAt(0).toLowerCase() + c.nextStep.slice(1)).replace(/\.+$/, '')}.${marginRate < 20 ? ' Attention, la marge se resserre.' : ''}`,
    cards: [{
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
    }],
  };
}

export function assign(n: string): BobReply | null {
  const s = S();
  const emp = s.employees.find((e) => new RegExp(`\\b${norm(e.firstName)}\\b`).test(n));
  if (!emp) return null;
  const c = findChantier(n);
  if (!c) return { text: `Sur quel chantier tu veux mettre ${emp.firstName} ?`, suggestions: s.chantiers.filter((x) => x.status !== 'termine').slice(0, 3).map((x) => `Ajoute ${emp.firstName} sur le chantier ${s.clients.find((k) => k.id === x.clientId)?.name.split(' ').pop()} demain`) };
  const day = parseDay(n) ?? parseDay('demain')!;
  const half = /matin/.test(n) ? ['08:00', '12:00'] : /apres[- ]midi|aprem/.test(n) ? ['13:30', '17:00'] : ['08:00', '17:00'];
  const conflicts = s.events.filter((e) => e.employeeId === emp.id && e.date === day.iso && e.start < half[1] && e.end > half[0]);
  const client = s.clients.find((k) => k.id === c.clientId);
  const ev: PlanningEvent = { id: uid('pe'), employeeId: emp.id, chantierId: c.id, title: `${client?.name.split(' ').pop() ?? c.name} · ${c.name.split('·').pop()?.trim() ?? ''}`.trim(), date: day.iso, start: half[0], end: half[1], kind: 'chantier' };
  s.upsertEvent(ev);
  const addedToTeam = !c.team.includes(emp.id);
  if (addedToTeam) s.upsertChantier({ ...c, team: [...c.team, emp.id] });
  s.pushBob({ icon: 'CalendarRange', text: `J'ai mis ${emp.firstName} sur ${c.name}`, detail: `${dateLong(day.iso)} · ${half[0]}-${half[1]}`, cta: 'Planning', to: '/app/planning', done: true });
  return {
    text: `C’est noté : ${emp.firstName} sera sur ${c.name} ${day.label}, de ${half[0].replace(':', ' h ')} à ${half[1].replace(':', ' h ')}.${conflicts.length ? ` Attention, il avait déjà ${conflicts.map((x) => x.title).join(', ')} sur ce créneau.` : ''}`,
    cards: [{
      kind: 'done', icon: 'CalendarRange', title: `${emp.firstName} · ${c.name}`, subtitle: `${capital(dateLong(day.iso))} · ${half[0]} – ${half[1]}`,
      rows: conflicts.length ? conflicts.map((x) => ({ label: `Déjà prévu : ${x.title}`, sub: `${x.start} – ${x.end}`, tone: 'warn' as const })) : [{ label: 'Prévenu par SMS', sub: emp.phone, tone: 'ok' as const }],
      actions: [
        { label: 'Voir le planning', to: '/app/planning', variant: 'secondary' },
        {
          label: 'Annuler', variant: 'ghost',
          run: () => {
            const st = useBrix.getState();
            st.removeEvent(ev.id);
            if (addedToTeam) st.upsertChantier(c);
            return 'Créneau retiré du planning.';
          },
        },
      ],
    }],
  };
}
