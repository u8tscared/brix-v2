// Intentions « organisation » du moteur local : agenda, point chantier, affecter un compagnon.
// La logique vit dans outils/planning.ts (partagée avec l'agent).

import { useBrix } from '@/lib/store';
import { dateLong, todayISO } from '@/lib/format';
import { CHANTIER_STATUS } from '@/lib/status';
import type { Chantier } from '@/lib/types';
import { capital, carteAgenda, evenements, moi, planifier, statutChantier, trouverChantier, trouverEmploye, type Creneau } from '../outils/planning';
import { parseDay } from './text';
import type { BobReply } from './types';

const S = () => useBrix.getState();

export function agenda(n: string): BobReply {
  const s = S();
  const day = parseDay(n) ?? { iso: todayISO(), label: "aujourd'hui" };
  const team = /equipe|gars|compagnons|tout le monde|qui fait quoi/.test(n);
  const me = moi(s);
  const evs = evenements(s, day.iso, day.iso, team);
  const busy = new Set(s.events.filter((e) => e.date === day.iso && e.employeeId !== me).map((e) => e.employeeId)).size;
  if (!evs.length)
    return {
      text: `Rien de prévu pour toi ${day.label}.${busy && !team ? ` ${busy} personne${busy > 1 ? 's' : ''} de l’équipe ${busy > 1 ? 'sont' : 'est'} sur chantier.` : ''}`,
      suggestions: ['Et pour l’équipe ?', 'Ajoute Yanis sur le chantier Dupuis jeudi'],
    };
  const first = evs[0];
  return {
    text: `${capital(day.label)}, ${team ? 'l’équipe a' : 'tu as'} ${evs.length} créneau${evs.length > 1 ? 'x' : ''}. ${team ? '' : `Tu commences à ${first.start.replace(':', ' h ')} : ${first.title}.`}`.trim(),
    cards: [carteAgenda(s, evs, capital(dateLong(day.iso)), team)],
    suggestions: team ? ['Qu’est-ce que j’ai demain ?'] : ['Et pour l’équipe ?', 'Où en est le chantier Lefèvre ?'],
  };
}

export function findChantier(n: string): Chantier | undefined {
  const m = n.match(/chantier\s+(?:de\s+|du\s+|des\s+|chez\s+)?(.+?)(?:\s+(?:jeudi|lundi|mardi|mercredi|vendredi|samedi|dimanche|demain|aujourd'hui|le \d+)\b.*)?[?.!]*$/);
  return trouverChantier(S(), m ? m[1] : '', n);
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
  const r = statutChantier(s, c);
  return {
    text: `${c.name} : ${c.progress} % fait, ${CHANTIER_STATUS[c.status].label.toLowerCase()}. Prochaine étape : ${(c.nextStep.charAt(0).toLowerCase() + c.nextStep.slice(1)).replace(/\.+$/, '')}.${r.marginRate < 20 ? ' Attention, la marge se resserre.' : ''}`,
    cards: [r.card],
  };
}

export function assign(n: string): BobReply | null {
  const s = S();
  const emp = trouverEmploye(s, n);
  if (!emp) return null;
  const c = findChantier(n);
  if (!c) return { text: `Sur quel chantier tu veux mettre ${emp.firstName} ?`, suggestions: s.chantiers.filter((x) => x.status !== 'termine').slice(0, 3).map((x) => `Ajoute ${emp.firstName} sur le chantier ${s.clients.find((k) => k.id === x.clientId)?.name.split(' ').pop()} demain`) };
  const day = parseDay(n) ?? parseDay('demain')!;
  const creneau: Creneau = /matin/.test(n) ? 'matin' : /apres[- ]midi|aprem/.test(n) ? 'apres_midi' : 'journee';
  const r = planifier(s, emp, c, day.iso, creneau);
  return {
    text: `C’est noté : ${emp.firstName} sera sur ${c.name} ${day.label}, de ${r.half[0].replace(':', ' h ')} à ${r.half[1].replace(':', ' h ')}.${r.conflicts.length ? ` Attention, il avait déjà ${r.conflicts.map((x) => x.title).join(', ')} sur ce créneau.` : ''}`,
    cards: [r.card(() => r.annuler(useBrix.getState()))],
  };
}
