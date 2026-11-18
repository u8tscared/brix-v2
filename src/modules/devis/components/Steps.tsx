import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/components/ui';
import type { Client, Devis } from '@/lib/types';
import type { CheckItem } from '../checks';
import { isPriced } from '../logic';

export type StepKey = 'client' | 'ouvrages' | 'conditions' | 'envoi';
export interface Step {
  key: StepKey;
  label: string;
  state: 'done' | 'on' | 'todo';
}

/** Où en est le devis : client choisi, ouvrages chiffrés, conditions en ordre, envoyé. */
export function devisSteps(d: Devis, client: Client | undefined, checks: CheckItem[]): Step[] {
  const priced = d.lines.filter(isPriced);
  const linesOk = priced.length > 0 && priced.every((l) => l.designation.trim() && l.quantity && l.unitPriceHt);
  const condKeys = ['vat', 'acompte', 'paiement', 'mentions', 'decennale'];
  const condOk = checks.filter((c) => condKeys.includes(c.key)).every((c) => c.state !== 'bad') && !!d.depositPercent;
  const done: Record<StepKey, boolean> = { client: !!client, ouvrages: linesOk, conditions: linesOk && condOk, envoi: d.status !== 'brouillon' };
  const labels: Record<StepKey, string> = { client: 'Client', ouvrages: 'Ouvrages', conditions: 'Conditions', envoi: d.status === 'signe' ? 'Signé' : d.status === 'brouillon' ? 'Envoi' : 'Envoyé' };
  const keys: StepKey[] = ['client', 'ouvrages', 'conditions', 'envoi'];
  const current = keys.find((k) => !done[k]);
  return keys.map((k) => ({ key: k, label: labels[k], state: done[k] ? 'done' : k === current ? 'on' : 'todo' }));
}

/**
 * Étapes en pastilles (faite = vert avec coche, en cours = dégradé Aube). Chaque étape est cliquable :
 * elle amène au bon endroit du devis. `compact` = numéros seuls, libellé de l'étape en cours (téléphone).
 */
export function Steps({ steps, onGo, compact, className }: { steps: Step[]; onGo: (k: StepKey) => void; compact?: boolean; className?: string }) {
  return (
    <ol className={cn('flex min-w-0 items-center', compact ? 'gap-2' : 'gap-3', className)} aria-label="Étapes du devis">
      {steps.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && <li aria-hidden className={cn('h-[1.5px] shrink rounded-full transition-colors duration-500', compact ? 'w-4' : 'w-5 2xl:w-8', steps[i - 1].state === 'done' ? 'bg-[#bfe9d5]' : 'bg-[#e6e1f1]')} />}
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => onGo(s.key)}
              data-state={s.state === 'todo' ? undefined : s.state}
              aria-current={s.state === 'on' ? 'step' : undefined}
              className="step-halo group rounded-full py-1 pr-1 transition-colors hover:text-ink"
            >
              <b className="transition-transform duration-300 ease-spring group-hover:scale-110 group-active:scale-95">{s.state === 'done' ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}</b>
              <span className={cn(compact && s.state !== 'on' && 'sr-only')}>{s.label}</span>
            </button>
          </li>
        </Fragment>
      ))}
      {compact && !steps.some((s) => s.state === 'on') && <li className="ml-1 text-[13.5px] font-medium text-ink-2">{steps[steps.length - 1].label}</li>}
    </ol>
  );
}
