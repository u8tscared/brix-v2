// Échéances de la flotte et de l'outillage, calculées une seule fois pour toute la page.
import { daysBetween, num, todayISO } from '@/lib/format';
import { addDays } from '@/modules/equipe/data';
import type { Tool, Vehicle } from '../data';

export const nextCheck = (t: Tool) => (t.lastCheck && t.checkMonths ? addDays(t.lastCheck, Math.round(t.checkMonths * 30.44)) : undefined);
export const daysTo = (date: string) => daysBetween(todayISO(), date);
export const shortName = (v: Vehicle) => v.name.split(' ').slice(0, 2).join(' ');

export interface Due { id: string; kind: 'ct' | 'service' | 'tool'; title: string; sub: string; days: number; label?: string; vehicle?: Vehicle; tool?: Tool }

/** Tout ce qui arrive dans les 30 jours (ou 1 000 km pour l'entretien), le plus urgent d'abord. */
export function dueSoon(vehicles: Vehicle[], tools: Tool[]): Due[] {
  const out: Due[] = [];
  vehicles.forEach((v) => {
    const ct = daysTo(v.ctDate);
    if (ct <= 30) out.push({ id: `${v.id}-ct`, kind: 'ct', title: `Contrôle technique du ${shortName(v)}`, sub: v.plate, days: ct, vehicle: v });
    const kmLeft = v.nextServiceKm - v.km;
    const sd = daysTo(v.nextServiceDate);
    if (kmLeft <= 1000 || sd <= 30) out.push({ id: `${v.id}-sv`, kind: 'service', title: `Entretien du ${shortName(v)}`, sub: kmLeft <= 1000 ? `dans ${num(Math.max(0, kmLeft), 0)} km, à ${num(v.nextServiceKm, 0)} km` : v.plate, days: sd, label: kmLeft <= 1000 ? `${num(Math.max(0, kmLeft), 0)}` : undefined, vehicle: v });
  });
  tools.forEach((t) => {
    const n = nextCheck(t);
    if (!n) return;
    const d = daysTo(n);
    if (d <= 30) out.push({ id: `${t.id}-chk`, kind: 'tool', title: `${t.checkLabel} : ${t.name.toLowerCase()}`, sub: t.brand, days: d, tool: t });
  });
  return out.sort((a, b) => a.days - b.days);
}
