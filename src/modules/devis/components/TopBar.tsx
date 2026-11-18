import { ChevronLeft, Cloud, Expand, MoreHorizontal, Send } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { DrawCheck } from '@/components/motion';
import { DEVIS_STATUS } from '@/lib/status';
import type { Devis } from '@/lib/types';
import { Menu, type MenuItem } from './bits';
import { Steps, type Step, type StepKey } from './Steps';

interface Props {
  d: Devis;
  saving: boolean;
  menu: MenuItem[];
  onPreview: () => void;
  onMain: () => void;
  mainLabel: string;
  mainIcon?: JSX.Element;
  phone: boolean;
  onBack: () => void;
  checks?: { ok: number; total: number };
  steps?: Step[];
  onStep?: (k: StepKey) => void;
}

/** Indicateur discret de sauvegarde automatique. */
export function SavedPill({ saving }: { saving: boolean }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 text-[12px] text-ink-3" aria-live="polite">
      <span className="relative grid h-3.5 w-3.5 place-items-center">
        {saving ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vi-500" /> : <DrawCheck key="ok" className="h-3.5 w-3.5 text-ok" strokeWidth={2.6} />}
      </span>
      <span className={cn('transition-colors duration-300', saving && 'text-ink-2')}>{saving ? 'Enregistrement' : 'Enregistré'}</span>
    </span>
  );
}

export function TopBar({ d, saving, menu, onPreview, onMain, mainLabel, mainIcon, phone, onBack, checks, steps, onStep }: Props) {
  const st = DEVIS_STATUS[d.status];
  const more = (
    <Menu
      items={menu}
      trigger={({ toggle }) => (
        <Button variant="secondary" size={phone ? 'icon' : 'icon-sm'} onClick={toggle} aria-label="Plus d’actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}
    />
  );
  if (phone)
    return (
      <div className="sticky top-14 z-20 px-3 pt-1">
        <div className="glass flex h-14 items-center gap-1.5 rounded-full pl-1 pr-1.5">
          <button onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink transition active:scale-95" aria-label="Retour aux devis">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-mono text-[13px] font-semibold">{d.number}</span>
              <Badge tone={st.tone}>{d.status === 'vu' ? 'Vu' : st.label}</Badge>
            </div>
            <SavedPill saving={saving} />
          </div>
          <Button variant="secondary" size="sm" onClick={onPreview} icon={<Expand />} className="!h-11 px-3.5" aria-label="Aperçu plein écran">
            Aperçu
          </Button>
          {more}
        </div>
      </div>
    );
  return (
    <div className="relative z-20 shrink-0 px-3 pt-3 lg:px-4">
      <div className="glass flex h-[60px] items-center gap-3 rounded-[22px] pl-2 pr-2.5">
        <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-white hover:text-ink hover:shadow-pill" aria-label="Retour aux devis">
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0 shrink-0 leading-tight">
          <div className="font-mono text-[13px] font-semibold text-ink">{d.number}</div>
          <Badge tone={st.tone} dot pulse={d.status === 'vu'} className="mt-0.5 !h-[20px]">
            {st.label}
          </Badge>
        </div>
        {steps && onStep && (
          <>
            <span className="mx-1 hidden h-7 w-px bg-[#ece8f6] xl:block" />
            <Steps steps={steps} onGo={onStep} className="hidden xl:flex" />
          </>
        )}
        <div className="flex-1" />
        <span className="hidden h-[30px] shrink-0 items-center rounded-full bg-white/80 pl-2 pr-3 shadow-[0_0_0_1px_#ece8f6] 2xl:inline-flex">
          <SavedPill saving={saving} />
        </span>
        <span className="2xl:hidden" title={saving ? 'Enregistrement' : 'Enregistré'}>
          <Cloud className={cn('h-4 w-4 transition-colors', saving ? 'text-vi-500' : 'text-ink-3')} aria-label={saving ? 'Enregistrement' : 'Enregistré'} />
        </span>
        <Button variant="secondary" size="sm" icon={<Expand />} onClick={onPreview} kbd="P">
          Aperçu
          {checks && checks.ok < checks.total && <span className="num ml-0.5 rounded-full bg-pale-a px-1.5 text-[11px] font-semibold text-deep-a">{checks.total - checks.ok}</span>}
        </Button>
        {more}
        <Button variant="dawn" size="sm" icon={mainIcon ?? <Send />} onClick={onMain} kbd="⌘↵">
          {mainLabel}
        </Button>
      </div>
    </div>
  );
}
