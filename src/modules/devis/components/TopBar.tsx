import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Expand, MoreHorizontal, Send } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { DrawCheck } from '@/components/motion';
import { DEVIS_STATUS } from '@/lib/status';
import type { Devis } from '@/lib/types';
import { Menu, type MenuItem } from './bits';

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

export function TopBar({ d, saving, menu, onPreview, onMain, mainLabel, mainIcon, phone, onBack, checks }: Props) {
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
      <div className="sticky top-14 z-20 flex h-14 items-center gap-1.5 border-b border-line/70 bg-page/90 px-2 backdrop-blur-xl">
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full text-ink" aria-label="Retour aux devis">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[13.5px] font-semibold">{d.number}</span>
            <Badge tone={st.tone}>{d.status === 'vu' ? 'Vu' : st.label}</Badge>
          </div>
          <SavedPill saving={saving} />
        </div>
        <Button variant="secondary" size="lg" onClick={onPreview} icon={<Expand className="h-4 w-4" />} className="h-11 px-3.5" aria-label="Aperçu plein écran">
          Aperçu
        </Button>
        {more}
      </div>
    );
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-5 lg:h-[60px] lg:px-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-[13.5px]" aria-label="Fil d’Ariane">
        <Link to="/app/devis" className="text-ink-2 transition hover:text-ink">
          Devis
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
        <span className="truncate font-mono text-[13px] font-medium">{d.number}</span>
      </nav>
      <Badge tone={st.tone} dot pulse={d.status === 'vu'}>
        {st.label}
      </Badge>
      <span className="hidden sm:inline-flex">
        <SavedPill saving={saving} />
      </span>
      <div className="flex-1" />
      <Button variant="secondary" size="sm" icon={<Expand className="h-4 w-4" />} onClick={onPreview} kbd="P">
        Aperçu
        {checks && checks.ok < checks.total && <span className="num ml-0.5 rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn">{checks.total - checks.ok}</span>}
      </Button>
      {more}
      <Button variant="dawn" size="sm" icon={mainIcon ?? <Send className="h-3.5 w-3.5" />} onClick={onMain} kbd="⌘↵" className="h-9 px-3.5">
        {mainLabel}
      </Button>
    </div>
  );
}
