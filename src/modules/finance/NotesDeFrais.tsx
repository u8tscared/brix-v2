import { useRef, useState } from 'react';
import { Camera, Check, Download, PenLine, Receipt } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Segmented, Stat, toast } from '@/components/ui';
import { dateShort, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Expense } from '@/lib/types';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { FraisSheet } from './components/fraisSheet';
import { exportCsv } from './components/fraisService';

type Filter = 'a_valider' | 'validee' | 'remboursee' | 'toutes';
const STATUS: Record<Expense['status'], { label: string; tone: 'warn' | 'info' | 'ok' }> = {
  a_valider: { label: 'À valider', tone: 'warn' },
  validee: { label: 'Validée', tone: 'info' },
  remboursee: { label: 'Remboursée', tone: 'ok' },
};

export default function NotesDeFrais() {
  const s = useBrix();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>('toutes');
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; initial?: Expense }>({ open: false });
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const list = [...s.expenses].sort((a, b) => b.date.localeCompare(a.date)).filter((e) => filter === 'toutes' || e.status === filter);
  const todo = s.expenses.filter((e) => e.status === 'a_valider');
  const month = s.expenses.filter((e) => e.date.slice(0, 7) === todayISO().slice(0, 7));
  const vat = month.reduce((a, e) => a + e.vat, 0);
  const emp = (id?: string) => s.employees.find((e) => e.id === id);
  const ch = (id?: string) => s.chantiers.find((c) => c.id === id);

  const pick = (f?: File) => {
    if (!f) return;
    setFile(f);
    setSheet({ open: true });
  };
  const setStatus = (e: Expense, status: Expense['status']) => {
    s.upsertExpense({ ...e, status });
    toast(status === 'validee' ? `${e.supplier} validée` : `${money(e.amountTtc)} remboursés à ${emp(e.employeeId)?.firstName ?? 'votre salarié'} (démo)`);
  };
  const validateAll = () => {
    todo.forEach((e) => s.upsertExpense({ ...e, status: 'validee' }));
    toast(`${todo.length} notes validées`);
  };
  const doExport = () => {
    exportCsv(list, (e) => ({ employee: emp(e.employeeId) ? `${emp(e.employeeId)!.firstName} ${emp(e.employeeId)!.lastName}` : '', chantier: ch(e.chantierId)?.name ?? 'Frais généraux' }));
    toast('Fichier CSV téléchargé, prêt pour le comptable');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notes de frais"
        subtitle="Une photo du ticket, Bob lit le montant et la TVA, vous validez."
        actions={
          <>
            <Button icon={<Download className="h-4 w-4" />} onClick={doExport} disabled={!list.length}>Exporter</Button>
            <Button icon={<PenLine className="h-4 w-4" />} onClick={() => { setFile(null); setSheet({ open: true }); }}>Saisir</Button>
            <Button variant="dawn" size="lg" className="order-first w-full justify-center sm:order-none sm:h-10 sm:w-auto sm:text-sm" icon={<Camera className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Photographier un ticket</Button>
          </>
        }
      />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <StatStrip cols={3}>
        <Stat label="À valider" value={money(todo.reduce((a, e) => a + e.amountTtc, 0))} sub={todo.length ? `${todo.length} ticket${todo.length > 1 ? 's' : ''}` : 'Rien en attente'} />
        <Stat label="Ce mois-ci" value={money(month.reduce((a, e) => a + e.amountTtc, 0))} sub={`${month.length} dépenses`} />
        <Stat label="TVA récupérable" value={money(vat)} sub="déduite automatiquement" />
      </StatStrip>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'toutes', label: 'Toutes', count: s.expenses.length }, { value: 'a_valider', label: 'À valider', count: todo.length }, { value: 'validee', label: 'Validées' }, { value: 'remboursee', label: 'Remboursées' }]} />
        <div className="flex-1" />
        {todo.length > 1 && <Button size="sm" variant="ghost" icon={<Check className="h-4 w-4" />} onClick={validateAll}>Tout valider</Button>}
      </div>

      {!s.expenses.length ? (
        <EmptyState icon={<Receipt />} title="Aucune note de frais" text="Prenez en photo votre premier ticket de caisse : c'est réglé en 10 secondes." action={<Button variant="primary" icon={<Camera className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Photographier</Button>} />
      ) : (
        <Card className="overflow-hidden">
          {list.map((e) => {
            const who = emp(e.employeeId);
            const c = ch(e.chantierId);
            return (
              <div key={e.id} onClick={() => { setFile(null); setSheet({ open: true, initial: e }); }} className="flex min-h-[68px] cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-[#fafafc]">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-sub">
                  {photos[e.id] ? <img src={photos[e.id]} alt="" className="h-full w-full object-cover" /> : <Receipt className="h-5 w-5 text-ink-3" strokeWidth={1.75} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{e.supplier}</div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
                    {who && <Avatar initials={who.initials} color={who.color} size={16} />}
                    {e.status === 'a_valider' && <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn sm:hidden" aria-label="À valider" />}
                    <span className="truncate">{e.category} · {dateShort(e.date)} · {c ? c.name.split('·')[0].trim() : 'Frais généraux'}</span>
                  </div>
                </div>
                <div className="hidden sm:block"><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></div>
                <div className="w-24 shrink-0 text-right">
                  <div className="num text-[13.5px] font-semibold">{money(e.amountTtc)}</div>
                  <div className="num text-[11.5px] text-ink-3">TVA {money(e.vat)}</div>
                </div>
                <div className="hidden w-[104px] shrink-0 justify-end sm:flex" onClick={(ev) => ev.stopPropagation()}>
                  {e.status === 'a_valider' && <Button size="sm" variant="primary" onClick={() => setStatus(e, 'validee')}>Valider</Button>}
                  {e.status === 'validee' && <Button size="sm" onClick={() => setStatus(e, 'remboursee')}>Rembourser</Button>}
                  {e.status === 'remboursee' && <Check className="h-4 w-4 text-ok" />}
                </div>
              </div>
            );
          })}
          {!list.length && <div className="px-4 py-10 text-center text-[13px] text-ink-3">Rien dans cette catégorie.</div>}
        </Card>
      )}

      <FraisSheet open={sheet.open} onClose={() => setSheet({ open: false })} file={file} initial={sheet.initial} photos={photos} setPhoto={(id, url) => setPhotos((p) => ({ ...p, [id]: url }))} />
    </div>
  );
}
