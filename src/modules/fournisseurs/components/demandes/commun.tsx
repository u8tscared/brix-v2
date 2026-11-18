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
        'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border transition duration-300 ease-spring',
        on ? 'border-transparent bg-vi-600 text-white shadow-[0_4px_10px_-4px_rgba(109,40,217,.6)]' : 'border-[#ddd6ee] bg-white text-transparent',
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
const TONS_INFO = { neutre: 'bg-pale-n text-deep-n', violet: 'bg-pale-v text-deep-v', peche: 'bg-pale-p text-deep-p', vert: 'bg-pale-g text-deep-g', bleu: 'bg-pale-b text-deep-b', mag: 'bg-pale-m text-deep-m' } as const;
export function Info({ icon, label, children, ton = 'neutre' }: { icon: ReactNode; label: string; children: ReactNode; ton?: keyof typeof TONS_INFO }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-tile [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.9]', TONS_INFO[ton])}>{icon}</span>
      <div className="min-w-0 pt-px">
        <div className="text-[12px] text-ink-3">{label}</div>
        <div className="text-[13.5px] font-medium leading-snug text-ink first-letter:uppercase">{children}</div>
      </div>
    </div>
  );
}

/** Indicateur d'étapes en pastilles (faite = vert, en cours = dégradé Aube). */
export function Etapes({ actuelle, libelles }: { actuelle: number; libelles: string[] }) {
  return (
    <ol className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label={`Étape ${actuelle} sur ${libelles.length}`}>
      {libelles.map((l, i) => {
        const n = i + 1;
        return (
          <li key={l} className="flex min-w-0 items-center gap-2" aria-current={n === actuelle ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={cn('h-px w-4 shrink-0 transition-colors sm:w-6', n <= actuelle ? 'bg-[#bfe8d5]' : 'bg-halo-line')} />}
            <span className="step-halo min-w-0" data-state={n < actuelle ? 'done' : n === actuelle ? 'on' : undefined}>
              <b>{n < actuelle ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : n}</b>
              <span className={cn('truncate', n !== actuelle && 'max-sm:hidden')}>{l}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
