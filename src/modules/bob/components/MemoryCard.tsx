import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, Select, Textarea, toast } from '@/components/ui';
import { useBobLocal, type BobMemory, type MemoryKind } from '../store';

const KIND: Record<MemoryKind, string> = { prix: 'Prix', habitude: 'Habitude', formulation: 'Formulation' };

/** Mémoire de Bob : ce qu'il a appris de tes devis et de tes mails, modifiable. */
export function MemoryCard() {
  const { memory, updateMemory, removeMemory, addMemory } = useBobLocal();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<MemoryKind | 'all'>('all');
  const list = memory.filter((m) => filter === 'all' || m.kind === filter);

  return (
    <Card>
      <CardHeader title="Ce que Bob a appris" meta={`${memory.length} éléments`} action={<Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Ajouter</Button>} />
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 scrollbar-none">
        {(['all', 'prix', 'habitude', 'formulation'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium ${filter === k ? 'bg-ink text-white' : 'bg-sub text-ink-2'}`}>
            {k === 'all' ? 'Tout' : KIND[k] + 's'}
          </button>
        ))}
      </div>
      <p className="px-4 pt-2 text-[12.5px] text-ink-2">Bob s’en sert pour chiffrer et écrire comme toi. Corrige-le si besoin : il retient tout de suite.</p>
      <div className="mt-2">
        {adding && <MemoryEditor onCancel={() => setAdding(false)} onSave={(m) => { addMemory({ ...m, learnedFrom: 'ajouté par toi' }); setAdding(false); toast('Bob s’en souviendra.'); }} />}
        {list.map((m) =>
          editing === m.id ? (
            <MemoryEditor key={m.id} initial={m} onCancel={() => setEditing(null)} onSave={(p) => { updateMemory(m.id, p); setEditing(null); toast('Mémoire mise à jour.'); }} />
          ) : (
            <div key={m.id} className="group flex items-start gap-3 border-t border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-medium">{m.label}</span>
                  <Badge tone={m.kind === 'prix' ? 'violet' : m.kind === 'habitude' ? 'info' : 'neutral'}>{KIND[m.kind]}</Badge>
                </div>
                <div className="mt-0.5 text-[13px] text-ink-2">{m.value}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">Appris de {m.learnedFrom}</div>
              </div>
              <button onClick={() => setEditing(m.id)} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink" aria-label="Modifier"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { removeMemory(m.id); toast('Bob a oublié cet élément.', 'info', { label: 'Annuler', run: () => addMemory(m) }); }} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-bad-bg hover:text-bad" aria-label="Oublier"><Trash2 className="h-4 w-4" /></button>
            </div>
          ),
        )}
      </div>
    </Card>
  );
}

function MemoryEditor({ initial, onSave, onCancel }: { initial?: BobMemory; onSave: (m: Omit<BobMemory, 'id' | 'learnedFrom'>) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<MemoryKind>(initial?.kind ?? 'prix');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  return (
    <div className="space-y-2 border-t border-line bg-[#fbfbfd] px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <Select value={kind} onChange={(e) => setKind(e.target.value as MemoryKind)}>
          <option value="prix">Prix</option>
          <option value="habitude">Habitude</option>
          <option value="formulation">Formulation</option>
        </Select>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Prise 2P+T posée" autoFocus />
      </div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex. 26 € HT la prise et 30 minutes de pose" className="min-h-[64px]" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={onCancel}>Annuler</Button>
        <Button size="sm" variant="primary" icon={<Check className="h-4 w-4" />} disabled={!label.trim() || !value.trim()} onClick={() => onSave({ kind, label: label.trim(), value: value.trim() })}>Enregistrer</Button>
      </div>
    </div>
  );
}
