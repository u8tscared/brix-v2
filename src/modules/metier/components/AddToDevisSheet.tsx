import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FilePlus2, FileText } from 'lucide-react';
import { Button, Field, Select, Sheet, cn } from '@/components/ui';
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
          <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.025em]">{done.last ? 'Lignes ajoutées' : 'Brouillon créé'}</h3>
          <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-ink-2">
            {valid.length} ligne{valid.length > 1 ? 's' : ''} pour <span className="num font-medium text-ink">{money(total)} HT</span> dans le devis <span className="font-mono text-[12.5px] text-ink">{done.number}</span>. Rien n’est envoyé au client : vous relisez d’abord.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>Continuer le calcul</Button>
            <Button variant="primary" className="flex-1 justify-center" iconRight={<ArrowRight />} onClick={() => navigate(`/app/devis/${done.id}`)}>Ouvrir le devis</Button>
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
      icon={<span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#fdf6e3] text-[#a16207] shadow-[inset_0_0_0_1px_#f5e3b3]"><FilePlus2 className="h-[18px] w-[18px]" strokeWidth={1.9} /></span>}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!valid.length || (effMode === 'new' && !clientId)} onClick={confirm}>{effMode === 'last' ? 'Ajouter les lignes' : 'Créer le brouillon'}</Button>
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
            <span className="text-[13px] font-semibold">{title}</span>
          </div>
          <div className="stagger-fast overflow-hidden rounded-[14px] shadow-card">
            {valid.map((l, i) => (
              <div key={i} className="flex items-baseline gap-3 border-b border-line bg-white px-3.5 py-2.5 text-[13px] last:border-b-0">
                <span className="min-w-0 flex-1 leading-snug">
                  {l.designation}
                  <span className="num block text-[11.5px] text-ink-3">{String(Math.round(l.quantity * 100) / 100).replace('.', ',')} {l.unit} × {money(priceOf(l))}</span>
                </span>
                <span className="num shrink-0 font-medium">{money(l.quantity * priceOf(l))}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between px-1">
            <span className="text-[13px] text-ink-2">Total fournitures et pose</span>
            <span className="text-[20px] font-semibold tracking-[-0.03em]"><AnimatedNumber value={total} format={(n) => money(n)} /> <span className="text-[12px] font-medium text-ink-3">HT</span></span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Option({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-start gap-3 rounded-[14px] p-3.5 text-left transition-[box-shadow,background] duration-200', active ? 'bg-white shadow-[0_0_0_1.5px_var(--ink),0_6px_16px_-10px_rgba(19,15,38,.35)]' : 'bg-white shadow-[0_0_0_1px_var(--line2)] hover:shadow-[0_0_0_1px_#cfcbdd]')}>
      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', active ? 'border-ink' : 'border-line2')}>
        <i className={cn('h-2.5 w-2.5 rounded-full bg-ink transition-transform duration-300 ease-spring', active ? 'scale-100' : 'scale-0')} />
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-ink-2">{text}</span>
      </span>
    </button>
  );
}
