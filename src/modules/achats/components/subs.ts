import type { Tone } from '@/components/ui';
import { dateFull, daysBetween, todayISO } from '@/lib/format';
import { addDays } from '@/modules/equipe/data';
import type { SubContractor } from '../data';

export interface DocState { key: string; label: string; detail: string; tone: Tone; status: string; level: 0 | 1 | 2 }

/** Contrôle des documents obligatoires (vigilance, art. L8222-1 du code du travail). */
export function subDocs(s: SubContractor): DocState[] {
  const today = todayISO();
  const urssafEnd = addDays(s.urssafAt, 182);
  const u = daysBetween(today, urssafEnd);
  const kbisAge = daysBetween(s.kbisAt, today);
  const dec = daysBetween(today, s.decennale.expires);
  const rc = daysBetween(today, s.rcproExpires);
  const st = (days: number, soon: number) => (days < 0 ? { tone: 'bad' as Tone, status: `Expirée depuis ${-days} j`, level: 2 as const } : days <= soon ? { tone: 'warn' as Tone, status: `Expire dans ${days} j`, level: 1 as const } : { tone: 'ok' as Tone, status: 'À jour', level: 0 as const });
  return [
    { key: 'urssaf', label: 'Attestation URSSAF de vigilance', detail: `Datée du ${dateFull(s.urssafAt)}, valable jusqu’au ${dateFull(urssafEnd)} · à renouveler tous les 6 mois`, ...st(u, 30) },
    { key: 'kbis', label: 'Extrait Kbis', detail: `Daté du ${dateFull(s.kbisAt)}${kbisAge > 90 ? ' · plus de 3 mois' : ''}`, ...(kbisAge > 90 ? { tone: 'warn' as Tone, status: 'À actualiser', level: 1 as const } : { tone: 'ok' as Tone, status: 'À jour', level: 0 as const }) },
    { key: 'decennale', label: 'Assurance décennale', detail: `${s.decennale.insurer} · jusqu’au ${dateFull(s.decennale.expires)}`, ...st(dec, 45) },
    { key: 'rcpro', label: 'Responsabilité civile pro', detail: `jusqu’au ${dateFull(s.rcproExpires)}`, ...st(rc, 45) },
  ];
}

export function subStatus(s: SubContractor): { tone: Tone; label: string; level: 0 | 1 | 2 } {
  const docs = subDocs(s);
  const worst = Math.max(...docs.map((d) => d.level)) as 0 | 1 | 2;
  if (worst === 2) return { tone: 'bad', label: 'Bloqué', level: 2 };
  if (worst === 1) return { tone: 'warn', label: 'À renouveler', level: 1 };
  return { tone: 'ok', label: 'Conforme', level: 0 };
}

export const AUTOLIQ_MENTION = 'Autoliquidation : TVA due par le preneur, article 283-2 nonies du CGI';
