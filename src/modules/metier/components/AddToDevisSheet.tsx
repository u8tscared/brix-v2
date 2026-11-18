import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, FilePlus2, FileText, Package } from 'lucide-react';
import { Button, Card, Field, IconTile, Select, Sheet, cn } from '@/components/ui';
import { AnimatedNumber, SuccessDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { money } from '@/lib/format';
import { addLinesToDevis, lastDraft, priceOf, type QuoteLine } from '../addToDevis';

/** Envoi des quantités calculées vers un devis : nouveau brouillon ou dernier brouillon, avec confirmation animée. */
export function AddToDevisSheet({ open, onClose, lines, title }: { open: boolean; onClose: () => void; lines: QuoteLine[]; title: string }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const draft = useMemo(() => (open ? lastDraft() : undefined), [open]);
  const draftClient = clients.find((c) => c.id === draft?.clientId);
  const [mode, setMode] = useState<'new' | 'last'>(draft ? 'last' : 'new');
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [done, setDone] = useState<{ id: string; number: string; last: boolean } | null>(null);
  const valid = lines.filter((l) => l.quantity > 0);
  const total = valid.reduce((x, l) => x + l.quantity * priceOf(l), 0);
  const effMode = draft ? mode : 'new';

  useEffect(() => {
    if (open) {
      setDone(null);
      setMode(draft ? 'last' : 'new');
    }
  }, [open, draft]);

  const confirm = () => {
    const id = addLinesToDevis(valid, { mode: effMode, clientId, title });
    const d = useBrix.getState().devis.find((x) => x.id === id);
    setDone({ id, number: d?.number ?? '', last: effMode === 'last' });
  };

  if (done) {
    return (
      <Sheet open={open} onClose={onClose} side="center" width={420}>
        <div className="flex flex-col items-center px-2 pb-2 pt-8 text-center">
          <SuccessDot size={56} />
          <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.035em]">{done.last ? 'Lignes ajoutées' : 'Brouillon créé'}</h3>
          <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-ink-2">
            {valid.length} ligne{valid.length > 1 ? 's' : ''} pour <span className="num font-medium text-ink">{money(total)} HT</span> dans le devis <span className="font-mono text-[12.5px] text-ink">{done.number}</span>. Rien n’est envoyé au client : vous relisez d’abord.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>Continuer le calcul</Button>
            <Button variant="dawn" className="flex-1 justify-center" iconRight={<ArrowRight />} onClick={() => navigate(`/app/devis/${done.id}`)}>Ouvrir le devis</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter au devis"
      subtitle="Prix indicatifs, modifiables dans le devis."
      icon={<IconTile icon={<FilePlus2 />} dept="vendre" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="dawn" disabled={!valid.length || (effMode === 'new' && !clientId)} onClick={confirm}>{effMode === 'last' ? 'Ajouter les lignes' : 'Créer le brouillon'}</Button>
        </>
      }
    >
      <div className="space-y-5 pt-1">
        <div className="space-y-2">
          {draft && <Option active={mode === 'last'} onClick={() => setMode('last')} title={`Ajouter au brouillon ${draft.number}`} text={`${draftClient?.name ?? 'Client'} · ${draft.title}`} />}
          <Option active={effMode === 'new'} onClick={() => setMode('new')} title="Nouveau brouillon de devis" text="Rien n’est envoyé : vous relisez avant." />
        </div>
        {effMode === 'new' && (
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</span>
            <span className="ml-auto text-[12px] text-ink-3">{valid.length} ligne{valid.length > 1 ? 's' : ''}</span>
          </div>
          <div className="stagger-fast space-y-2">
            {valid.map((l, i) => (
              <div key={i} className="row-card gap-3 px-3.5 py-3 text-[13px]">
                <IconTile size="row" icon={l.unit === 'h' ? <Clock3 /> : <Package />} tone={l.unit === 'h' ? 'blue' : 'peach'} />
                <span className="min-w-0 flex-1 leading-snug">
                  {l.designation}
                  <span className="num block text-[11.5px] text-ink-3">{String(Math.round(l.quantity * 100) / 100).replace('.', ',')} {l.unit} × {money(priceOf(l))}</span>
                </span>
                <span className="num shrink-0 font-medium">{money(l.quantity * priceOf(l))}</span>
              </div>
            ))}
          </div>
          <Card tone="dawn" className="mt-3 flex flex-col gap-1.5 p-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <span className="label-halo">Total fournitures et pose</span>
            <span className="num-halo whitespace-nowrap text-[30px] leading-none"><AnimatedNumber value={total} format={(n) => money(n)} /> <span className="text-[13px] font-medium tracking-normal text-ink-3">HT</span></span>
          </Card>
        </div>
      </div>
    </Sheet>
  );
}

function Option({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-start gap-3 rounded-card-sm p-4 text-left transition-[box-shadow,background] duration-200', active ? 'bg-white shadow-[0_0_0_1.5px_#c4a8f8,0_10px_24px_-12px_rgba(109,40,217,.35)]' : 'bg-white shadow-halo-sm hover:shadow-[0_0_0_1px_#e3dcf3]')}>
      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', active ? 'border-vi-600' : 'border-[#ddd6ee]')}>
        <i className={cn('h-2.5 w-2.5 rounded-full bg-dawn transition-transform duration-300 ease-spring', active ? 'scale-100' : 'scale-0')} />
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-ink-2">{text}</span>
      </span>
    </button>
  );
}
