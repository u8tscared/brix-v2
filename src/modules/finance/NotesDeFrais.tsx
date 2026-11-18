import { useRef, useState } from 'react';
import { CalendarDays, Camera, Check, Download, PenLine, Percent, Receipt, ScanLine, Wallet } from 'lucide-react';
import { Avatar, Badge, Button, Card, cn, EmptyState, IconTile, PageHeader, Segmented, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { dateShort, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Expense } from '@/lib/types';
import { FraisSheet } from './components/fraisSheet';
import { exportCsv, sampleReceipt, type ReceiptSample } from './components/fraisService';
import { BigMoney, Label } from './components/kit';

type Filter = 'a_valider' | 'validee' | 'remboursee' | 'toutes';
const STATUS: Record<Expense['status'], { label: string; tone: 'warn' | 'info' | 'ok' }> = {
  a_valider: { label: 'À valider', tone: 'warn' },
  validee: { label: 'À rembourser', tone: 'info' },
  remboursee: { label: 'Remboursée', tone: 'ok' },
};

export default function NotesDeFrais() {
  const s = useBrix();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>('toutes');
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState<ReceiptSample | undefined>();
  const [sheet, setSheet] = useState<{ open: boolean; initial?: Expense }>({ open: false });
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState(false);

  const list = [...s.expenses].sort((a, b) => b.date.localeCompare(a.date)).filter((e) => filter === 'toutes' || e.status === filter);
  const todo = s.expenses.filter((e) => e.status === 'a_valider');
  const toRefund = s.expenses.filter((e) => e.status === 'validee');
  const month = s.expenses.filter((e) => e.date.slice(0, 7) === todayISO().slice(0, 7));
  const vat = month.reduce((a, e) => a + e.vat, 0);
  const emp = (id?: string) => s.employees.find((e) => e.id === id);
  const ch = (id?: string) => s.chantiers.find((c) => c.id === id);
  const todoPeople = [...new Set(todo.map((e) => e.employeeId))].map(emp).filter(Boolean);

  const openWith = (f: File | null, smp?: ReceiptSample) => {
    setFile(f);
    setSample(smp);
    setSheet({ open: true });
  };
  const pick = (f?: File) => f && openWith(f);
  const setStatus = (e: Expense, status: Expense['status']) => {
    setFlash((x) => ({ ...x, [e.id]: true }));
    setTimeout(() => {
      s.upsertExpense({ ...e, status });
      setFlash((x) => ({ ...x, [e.id]: false }));
    }, 650);
    toast(status === 'validee' ? `${e.supplier} validée, à rembourser` : `${money(e.amountTtc)} remboursés à ${emp(e.employeeId)?.firstName ?? 'votre salarié'}`);
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
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="ScanLine" dept="facturer" size="lg" />}
        kicker="Facturer et encaisser"
        title="Notes de frais"
        titleMuted="une photo, c'est rangé."
        subtitle="Une photo du ticket, Bob lit le montant et la TVA, vous validez."
        actions={
          <>
            <Button icon={<Download />} onClick={doExport} disabled={!list.length} className="max-sm:flex-1">Exporter</Button>
            <Button icon={<PenLine />} onClick={() => openWith(null)} className="max-sm:flex-1">Saisir</Button>
            <Button variant="dawn" size="lg" className="order-first w-full justify-center sm:order-none sm:h-10 sm:w-auto sm:text-sm" icon={<Camera />} onClick={() => fileRef.current?.click()}>Photographier un ticket</Button>
          </>
        }
      />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="grid grid-cols-2 overflow-hidden">
          <div className="col-span-2 flex flex-wrap items-end justify-between gap-4 border-b border-halo-line p-5 md:p-7">
            <div>
              <IconTile icon={<Receipt />} tone="peach" />
              <Label className="mt-4">À valider</Label>
              <BigMoney value={todo.reduce((a, e) => a + e.amountTtc, 0)} cents className="mt-1.5 block text-[40px] md:text-[48px]" />
              <div className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-2">
                {todoPeople.length > 0 && (
                  <span className="flex -space-x-1.5">{todoPeople.map((p) => <Avatar key={p!.id} initials={p!.initials} color={p!.color} size={20} ring />)}</span>
                )}
                {todo.length ? `${todo.length} ticket${todo.length > 1 ? 's' : ''} en attente` : 'Rien en attente'}
              </div>
            </div>
            {todo.length > 0 && <Button variant="primary" icon={<Check />} onClick={validateAll}>Tout valider</Button>}
          </div>
          <div className="border-r border-halo-line p-4 md:p-5">
            <Label><IconTile icon={<CalendarDays />} tone="violet" size="xs" />Ce mois-ci</Label>
            <BigMoney value={month.reduce((a, e) => a + e.amountTtc, 0)} cents className="mt-2.5 block text-[26px]" />
            <div className="mt-1.5 text-[12px] text-ink-3">{month.length} dépense{month.length > 1 ? 's' : ''} · {toRefund.length} à rembourser</div>
          </div>
          <div className="p-4 md:p-5">
            <Label><IconTile icon={<Percent />} tone="green" size="xs" />TVA récupérable</Label>
            <BigMoney value={vat} cents className="mt-2.5 block text-[26px] text-deep-g" />
            <div className="mt-1.5 text-[12px] text-ink-3">déduite toute seule</div>
          </div>
        </Card>

        <button
          onClick={() => openWith(null, sampleReceipt())}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn('group relative isolate hidden flex-col items-center justify-center gap-3 overflow-hidden rounded-card border-[1.5px] border-dashed p-6 text-center transition-[background,border-color,transform] duration-300 lg:flex', drag ? 'border-[#c9b2fb] bg-pale-v' : 'glass border-[#ddd3f3] hover:-translate-y-0.5 hover:border-[#c9b2fb] hover:bg-white/90')}
        >
          <span className="relative grid h-14 w-12 place-items-center rounded-[8px] bg-white shadow-halo-lg transition-transform duration-500 ease-out-quint group-hover:-translate-y-1 group-hover:rotate-[-4deg]">
            <Receipt className="h-5 w-5 text-ink-3" strokeWidth={1.75} />
            <span className="absolute inset-x-1.5 top-1/2 h-[2px] rounded-full bg-[#d946ef] opacity-0 shadow-[0_0_10px_#d946ef] transition-opacity duration-300 group-hover:opacity-100" />
          </span>
          <div>
            <div className="text-[14px] font-semibold">{drag ? 'Lâchez, Bob s’en occupe' : 'Glissez la photo d’un ticket ici'}</div>
            <div className="mt-1 text-[12.5px] text-ink-2">ou <span className="font-medium text-deep-v underline-offset-4 group-hover:underline">essayez avec un ticket d’exemple</span></div>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'toutes', label: 'Toutes', count: s.expenses.length }, { value: 'a_valider', label: 'À valider', count: todo.length }, { value: 'validee', label: 'À rembourser', count: toRefund.length }, { value: 'remboursee', label: 'Remboursées' }]} />
      </div>

      {!s.expenses.length ? (
        <EmptyState icon={<Receipt />} title="Aucune note de frais" text="Prenez en photo votre premier ticket de caisse : c'est réglé en 10 secondes." action={<Button variant="primary" icon={<Camera />} onClick={() => fileRef.current?.click()}>Photographier</Button>} />
      ) : !list.length ? (
        <EmptyState icon={<Check />} title="Rien ici" text={filter === 'a_valider' ? 'Toutes les notes sont validées.' : 'Aucune note dans cette catégorie.'} />
      ) : (
        <div>
          <div key={filter} className="stagger-fast space-y-2">
            {list.map((e) => {
              const who = emp(e.employeeId);
              const c = ch(e.chantierId);
              const done = flash[e.id];
              return (
                <div key={e.id} onClick={() => { setFile(null); setSample(undefined); setSheet({ open: true, initial: e }); }} className={cn('row-card group min-h-[72px] cursor-pointer gap-3 py-3 md:px-5', done && 'shadow-[0_0_0_1.5px_#b7ebd3,0_10px_28px_-12px_rgba(16,185,129,.35)]')}>
                  <Thumb src={photos[e.id]} amount={e.amountTtc} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium">{e.supplier}</span>
                      <span className="num-halo shrink-0 text-[16px] sm:hidden">{money(e.amountTtc)}</span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
                      {who && <Avatar initials={who.initials} color={who.color} size={16} />}
                      <span className="truncate">{e.category} · {dateShort(e.date)} · {c ? c.name.split('·')[0].trim() : 'Frais généraux'}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 sm:hidden" onClick={(ev) => ev.stopPropagation()}>
                      <Badge tone={STATUS[e.status].tone} dot>{STATUS[e.status].label}</Badge>
                      <Action e={e} done={done} onSet={setStatus} />
                    </div>
                  </div>
                  <div className="hidden sm:block"><Badge tone={STATUS[e.status].tone} size="md" dot>{STATUS[e.status].label}</Badge></div>
                  <div className="hidden w-24 shrink-0 text-right sm:block">
                    <div className="num-halo text-[16px]">{money(e.amountTtc)}</div>
                    <div className="num text-[11.5px] text-ink-3">TVA {money(e.vat)}</div>
                  </div>
                  <div className="hidden w-[118px] shrink-0 justify-end sm:flex" onClick={(ev) => ev.stopPropagation()}>
                    <Action e={e} done={done} onSet={setStatus} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-[12px] text-ink-3"><ScanLine className="h-3.5 w-3.5" />Vos salariés envoient leurs tickets depuis l’app ouvrier, ils arrivent ici à valider.</p>

      <FraisSheet open={sheet.open} onClose={() => setSheet({ open: false })} file={file} sample={sample} initial={sheet.initial} photos={photos} setPhoto={(id, url) => setPhotos((p) => ({ ...p, [id]: url }))} />
    </div>
  );
}

function Action({ e, done, onSet }: { e: Expense; done?: boolean; onSet: (e: Expense, s: Expense['status']) => void }) {
  if (done) return <SuccessDot size={24} />;
  if (e.status === 'a_valider') return <Button size="sm" variant="primary" icon={<Check />} onClick={() => onSet(e, 'validee')}>Valider</Button>;
  if (e.status === 'validee') return <Button size="sm" icon={<Wallet />} onClick={() => onSet(e, 'remboursee')}>Rembourser</Button>;
  return <Check className="mr-2 h-4 w-4 text-deep-g" />;
}

/** Vignette du ticket : la photo si on l'a, sinon un petit ticket dessiné. */
function Thumb({ src, amount }: { src?: string; amount: number }) {
  if (src) return <img src={src} alt="" className="h-12 w-10 shrink-0 rounded-[6px] object-cover shadow-halo" />;
  return (
    <span className="relative flex h-12 w-10 shrink-0 rotate-[-3deg] flex-col gap-[3px] rounded-[4px] bg-white px-1.5 pt-1.5 shadow-[0_0_0_1px_#ece8f6,0_4px_10px_-4px_rgba(60,30,120,.22)] transition-transform duration-300 group-hover:rotate-0">
      <i className="h-[2px] w-5 rounded-full bg-ink-3/50" />
      <i className="h-[2px] w-4 rounded-full bg-line2" />
      <i className="h-[2px] w-6 rounded-full bg-line2" />
      <span className="num mt-auto pb-1 text-[7.5px] font-bold leading-none text-ink-2">{Math.round(amount)} €</span>
    </span>
  );
}
