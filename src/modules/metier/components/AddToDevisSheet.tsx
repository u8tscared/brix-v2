import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { money } from '@/lib/format';
import { addLinesToDevis, lastDraft, type QuoteLine } from '../addToDevis';

export function AddToDevisSheet({ open, onClose, lines, title }: { open: boolean; onClose: () => void; lines: QuoteLine[]; title: string }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const draft = useMemo(() => (open ? lastDraft() : undefined), [open]);
  const draftClient = clients.find((c) => c.id === draft?.clientId);
  const [mode, setMode] = useState<'new' | 'last'>(draft ? 'last' : 'new');
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const valid = lines.filter((l) => l.quantity > 0);
  const total = valid.reduce((x, l) => x + l.quantity * l.unitPriceHt, 0);
  const effMode = draft ? mode : 'new';

  const confirm = () => {
    const id = addLinesToDevis(valid, { mode: effMode, clientId, title });
    onClose();
    toast(effMode === 'last' ? `${valid.length} lignes ajoutées au devis ${draft?.number}.` : 'Brouillon de devis créé.', 'ok', { label: 'Ouvrir', run: () => navigate(`/app/devis/${id}`) });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajouter au devis"
      subtitle={`${valid.length} ligne${valid.length > 1 ? 's' : ''} · ${money(total)} HT (prix indicatifs, modifiables)`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!valid.length || (effMode === 'new' && !clientId)} onClick={confirm}>{effMode === 'last' ? 'Ajouter les lignes' : 'Créer le brouillon'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {draft && (
            <Option active={mode === 'last'} onClick={() => setMode('last')} title={`Ajouter au brouillon ${draft.number}`} text={`${draftClient?.name ?? 'Client'} · ${draft.title}`} />
          )}
          <Option active={effMode === 'new'} onClick={() => setMode('new')} title="Nouveau brouillon de devis" text="Rien n’est envoyé : vous relisez avant." />
        </div>
        {effMode === 'new' && (
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <div className="rounded-[12px] border border-line">
          {valid.map((l, i) => (
            <div key={i} className="flex items-baseline gap-3 border-b border-line px-3 py-2 text-[13px] last:border-b-0">
              <span className="min-w-0 flex-1">{l.designation}<span className="block text-[11.5px] text-ink-3">{l.quantity} {l.unit} × {money(l.unitPriceHt)}</span></span>
              <span className="num shrink-0 font-medium">{money(l.quantity * l.unitPriceHt)}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function Option({ active, onClick, title, text }: { active: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-start gap-3 rounded-[12px] border p-3 text-left transition', active ? 'border-ink shadow-[0_0_0_1px_var(--ink)]' : 'border-line2 hover:border-ink-3')}>
      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-ink' : 'border-line2')}>{active && <i className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
      <span>
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-ink-2">{text}</span>
      </span>
    </button>
  );
}
