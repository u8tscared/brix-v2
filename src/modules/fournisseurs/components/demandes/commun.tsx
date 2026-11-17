// Petits éléments partagés par la demande de prix, son détail et le portail fournisseur.
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/ui';
import { dateShort } from '@/lib/format';

/** Case à cocher visuelle (la cible tactile est la ligne qui la contient). */
export function Coche({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border transition',
        on ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-transparent',
        className,
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}

/** « 12,50 » ou « 12.5 » ou « 1 250,00 » → 12.5 ; vide ou illisible → null. */
export function lirePrix(s: string): number | null {
  const t = s.replace(/[\s  €]/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/** 12.5 → « 12,50 » pour pré-remplir un champ. */
export const ecrirePrix = (n: number | null | undefined) => (n == null ? '' : n.toFixed(2).replace('.', ','));

/** Filtre la frappe dans un champ décimal : chiffres et une seule virgule. */
export function saisieDecimale(s: string): string {
  const t = s.replace('.', ',').replace(/[^\d,]/g, '');
  const i = t.indexOf(',');
  return i < 0 ? t : t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, 2);
}

/** Moment d'un événement : « aujourd'hui à 08:12 », « hier à 17:40 », sinon « 12 nov. à 09:00 ». */
export function quand(at: string): string {
  const d = new Date(at);
  const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  // Jours comparés en heure locale (une date ISO est en UTC : autour de minuit, slice(0, 10) se trompe de jour).
  const cle = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const auj = new Date();
  if (cle(d) === cle(auj)) return `aujourd’hui à ${h}`;
  const hier = new Date(auj);
  hier.setDate(hier.getDate() - 1);
  if (cle(d) === cle(hier)) return `hier à ${h}`;
  return `le ${dateShort(at)} à ${h}`;
}

export const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;

/** Petite paire « libellé / valeur » des en-têtes. */
export function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-page text-ink-2 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-[1.75]">{icon}</span>
      <div className="min-w-0 pt-px">
        <div className="text-[12px] text-ink-3">{label}</div>
        <div className="text-[13.5px] font-medium leading-snug text-ink first-letter:uppercase">{children}</div>
      </div>
    </div>
  );
}

/** Indicateur d'étapes « 1 · 2 · 3 » des panneaux. */
export function Etapes({ actuelle, libelles }: { actuelle: number; libelles: string[] }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label={`Étape ${actuelle} sur ${libelles.length}`}>
      {libelles.map((l, i) => {
        const n = i + 1;
        return (
          <li key={l} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={cn('h-1 rounded-full transition-colors', n <= actuelle ? 'bg-ink' : 'bg-line2')} />
            <span className={cn('truncate text-[11.5px] font-medium', n === actuelle ? 'text-ink' : 'text-ink-3')}>
              {n}. {l}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
