import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Sheet, toast } from '@/components/ui';
import { todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Expense } from '@/lib/types';
import { FRAIS_CATEGORIES, readReceipt, type ReceiptSample } from './fraisService';
import { ReceiptScan } from './frais/ReceiptScan';

/** Saisie d'une note de frais : depuis une photo (lecture par Brix AI) ou à la main, ou modification. */
export function FraisSheet({ open, onClose, file, sample, initial, photos, setPhoto }: { open: boolean; onClose: () => void; file: File | null; sample?: ReceiptSample; initial?: Expense; photos: Record<string, string>; setPhoto: (id: string, url: string) => void }) {
  const s = useBrix();
  const me = s.employees.find((e) => e.role === 'patron') ?? s.employees[0];
  const blank = (): Expense => ({ id: uid('x'), date: todayISO(), supplier: '', category: 'Petites fournitures', amountTtc: 0, vat: 0, employeeId: me?.id, status: 'a_valider' });
  const [x, setX] = useState<Expense>(initial ?? blank());
  const [reading, setReading] = useState(false);
  const [read, setRead] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = initial ?? blank();
    setX(base);
    setRead(false);
    setPreview(initial ? photos[initial.id] ?? null : null);
    if (file || sample) {
      if (file) {
        const url = URL.createObjectURL(file);
        setPreview(url);
        setPhoto(base.id, url);
      }
      setReading(true);
      readReceipt(file, sample).then((r) => {
        setX((p) => ({ ...p, supplier: r.supplier, category: r.category, amountTtc: r.amountTtc, vat: r.vat, date: r.date }));
        setReading(false);
        setRead(true);
      });
    }
  }, [open, file, sample, initial?.id]);

  const set = (p: Partial<Expense>) => setX((v) => ({ ...v, ...p }));
  const ok = x.supplier.trim() && x.amountTtc > 0 && !reading;
  const save = () => {
    s.upsertExpense(x);
    toast(initial ? 'Note de frais modifiée' : 'Note de frais ajoutée, à valider');
    onClose();
  };
  const chantiers = s.chantiers.filter((c) => c.status !== 'termine');

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Note de frais' : file || sample ? 'Lecture du ticket' : 'Nouvelle dépense'} footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          {initial?.status === 'a_valider' ? (
            <>
              <Button disabled={!ok} onClick={save}>Enregistrer</Button>
              <Button variant="primary" disabled={!ok} onClick={() => { s.upsertExpense({ ...x, status: 'validee' }); toast('Note de frais validée'); onClose(); }}>Valider</Button>
            </>
          ) : initial?.status === 'validee' ? (
            <>
              <Button disabled={!ok} onClick={save}>Enregistrer</Button>
              <Button variant="primary" disabled={!ok} onClick={() => { s.upsertExpense({ ...x, status: 'remboursee' }); toast('Marquée remboursée'); onClose(); }}>Rembourser</Button>
            </>
          ) : (
            <Button variant="primary" disabled={!ok} onClick={save}>Enregistrer</Button>
          )}
        </>
      }>
      <div className="space-y-4">
        {(preview || (sample && !initial)) && <ReceiptScan preview={preview} sample={sample} reading={reading} read={read} date={x.date} />}
        {read && <p className="animate-[fade-up_.4s_var(--ease)_.6s_both] text-[12.5px] text-ink-2">Brix AI a rempli la note. Vérifiez le montant, puis enregistrez.</p>}
        <Field label="Fournisseur"><Input value={x.supplier} disabled={reading} onChange={(e) => set({ supplier: e.target.value })} placeholder="Total, Leroy Merlin…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant TTC"><Input type="number" inputMode="decimal" step="0.01" disabled={reading} value={x.amountTtc || ''} onChange={(e) => set({ amountTtc: Number(e.target.value) })} suffix="€" /></Field>
          <Field label="Dont TVA"><Input type="number" inputMode="decimal" step="0.01" disabled={reading} value={x.vat || ''} onChange={(e) => set({ vat: Number(e.target.value) })} suffix="€" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={x.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="Catégorie">
            <Select value={x.category} onChange={(e) => set({ category: e.target.value })}>
              {FRAIS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Chantier" hint="Le coût est ajouté à la marge du chantier.">
          <Select value={x.chantierId ?? ''} onChange={(e) => set({ chantierId: e.target.value || undefined })}>
            <option value="">Frais généraux (aucun chantier)</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Payé par">
          <Select value={x.employeeId ?? ''} onChange={(e) => set({ employeeId: e.target.value })}>
            {s.employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}
