import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Field, Input, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { uid } from '@/lib/format';
import type { PlanningEvent } from '@/lib/types';
import { KIND_STYLE, KINDS } from './kinds';
import { overlaps, toMin } from './utils';

export type SlotDraft = Partial<PlanningEvent> & { employeeId: string; date: string };

export function SlotSheet({ draft, onClose }: { draft: SlotDraft | null; onClose: () => void }) {
  const { employees, chantiers, events, upsertEvent, removeEvent } = useBrix();
  const [e, setE] = useState<PlanningEvent | null>(null);
  const editing = !!draft?.id && events.some((x) => x.id === draft.id);

  useEffect(() => {
    if (!draft) return setE(null);
    const ch = chantiers.find((c) => c.id === draft.chantierId);
    setE({ id: draft.id ?? uid('pe'), employeeId: draft.employeeId, date: draft.date, start: draft.start ?? '08:00', end: draft.end ?? '12:00', kind: draft.kind ?? 'chantier', title: draft.title ?? (ch ? ch.name : ''), chantierId: draft.chantierId });
  }, [draft, chantiers]);

  if (!e) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const set = (p: Partial<PlanningEvent>) => setE({ ...e, ...p });
  const clash = events.find((x) => overlaps(x, e));
  const invalid = toMin(e.end) <= toMin(e.start) || !e.title.trim();

  const pickChantier = (id: string) => {
    const ch = chantiers.find((c) => c.id === id);
    set({ chantierId: id || undefined, kind: id ? 'chantier' : e.kind, title: ch ? ch.name : e.title });
  };

  const save = () => {
    upsertEvent({ ...e, title: e.title.trim() });
    toast(editing ? 'Créneau modifié' : 'Créneau ajouté au planning');
    onClose();
  };

  return (
    <Sheet
      open={!!draft}
      onClose={onClose}
      title={editing ? 'Modifier le créneau' : 'Nouveau créneau'}
      width={460}
      footer={
        <>
          {editing && (
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              className="mr-auto"
              onClick={() => {
                const copy = e;
                removeEvent(e.id);
                toast('Créneau supprimé', 'ok', { label: 'Annuler', run: () => upsertEvent(copy) });
                onClose();
              }}
            >
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={invalid} onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => set({ kind: k })} className={cn('flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition', e.kind === k ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}>
              <i className={cn('h-2 w-2 rounded-full', KIND_STYLE[k].bar)} /> {KIND_STYLE[k].label}
            </button>
          ))}
        </div>
        {(e.kind === 'chantier' || e.chantierId) && (
          <Field label="Chantier">
            <Select value={e.chantierId ?? ''} onChange={(x) => pickChantier(x.target.value)}>
              <option value="">Aucun</option>
              {chantiers.filter((c) => c.status !== 'termine' || c.id === e.chantierId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Intitulé">
          <Input value={e.title} onChange={(x) => set({ title: x.target.value })} placeholder="Ex. : Pose tableau, visite client" />
        </Field>
        {employees.length > 1 && (
          <Field label="Personne">
            <Select value={e.employeeId} onChange={(x) => set({ employeeId: x.target.value })}>
              {employees.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
          <Field label="Jour">
            <Input type="date" value={e.date} onChange={(x) => set({ date: x.target.value })} />
          </Field>
          <Field label="Début">
            <Input type="time" step={900} value={e.start} onChange={(x) => set({ start: x.target.value })} />
          </Field>
          <Field label="Fin">
            <Input type="time" step={900} value={e.end} onChange={(x) => set({ end: x.target.value })} />
          </Field>
        </div>
        {clash && (
          <div className="flex items-start gap-2 rounded-xl bg-bad-bg px-3 py-2.5 text-[13px] text-bad">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Conflit avec « {clash.title} » ({clash.start} – {clash.end}). Vous pouvez enregistrer quand même.</span>
          </div>
        )}
        {toMin(e.end) <= toMin(e.start) && <p className="text-[13px] text-bad">L'heure de fin doit être après l'heure de début.</p>}
      </div>
    </Sheet>
  );
}
