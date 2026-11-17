import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, cn, Segmented, Sheet, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { dateShort, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { BankTx } from '@/lib/types';
import { applyPayment, openAmount } from './tresorerieService';

const CATEGORIES = ['Achats matériel', 'Carburant', 'Charges sociales', 'Salaires', 'Assurances', 'Loyer', 'Stationnement', 'Repas', 'Sous-traitance', 'Impôts et taxes', 'Banque', 'Autre'];

export function TransactionsCard() {
  const s = useBrix();
  const [filter, setFilter] = useState<'toutes' | 'a_traiter'>('toutes');
  const [matching, setMatching] = useState<BankTx | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const classify = (t: BankTx, category: string) => {
    s.upsertBank({ ...t, category });
    setDone(t.id);
    setTimeout(() => setDone((d) => (d === t.id ? null : d)), 1400);
  };
  const todo = (t: BankTx) => (t.amount > 0 ? !t.matchedFactureId : !t.category);
  const list = [...s.bank].sort((a, b) => b.date.localeCompare(a.date)).filter((t) => filter === 'toutes' || todo(t));
  const nTodo = s.bank.filter(todo).length;
  const open = s.factures.filter((f) => !['payee', 'annulee', 'brouillon'].includes(f.status));
  const suggestions = matching ? [...open].sort((a, b) => Math.abs(openAmount(a) - matching.amount) - Math.abs(openAmount(b) - matching.amount)) : [];

  const match = (tx: BankTx, fid: string) => {
    const f = s.factures.find((x) => x.id === fid)!;
    s.upsertBank({ ...tx, matchedFactureId: fid });
    s.upsertFacture(applyPayment(f, tx.amount));
    setMatching(null);
    toast(`Paiement associé à ${f.number}`);
  };

  return (
    <Card className="min-w-0">
      <CardHeader title="Opérations" meta={`${s.bank.length}`} action={<Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'toutes', label: 'Toutes' }, { value: 'a_traiter', label: 'À traiter', count: nTodo }]} />} />
      <div key={filter} className="stagger-fast">
      {list.map((t) => {
        const f = t.matchedFactureId ? s.factures.find((x) => x.id === t.matchedFactureId) : undefined;
        const In = t.amount > 0;
        return (
          <div key={t.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', In ? 'bg-ok-bg text-ok' : 'bg-sub text-ink-2')}>
              {In ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{t.label}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                <span>{dateShort(t.date)}</span>
                {f ? (
                  <Link to={`/app/factures/${f.id}`} className="inline-flex items-center gap-1 text-ok hover:underline"><Check className="h-3 w-3" />{f.number}</Link>
                ) : In ? (
                  <Badge tone="warn">Sans facture</Badge>
                ) : (
                  <select value={t.category ?? ''} onChange={(e) => classify(t, e.target.value)} className={cn('h-7 max-w-[150px] rounded-full border-0 px-2.5 text-[12px] font-medium shadow-[inset_0_0_0_1px_var(--line2)] transition focus:outline-none focus:ring-4 focus:ring-vi-100', t.category ? 'bg-sub text-ink-2' : 'bg-warn-bg text-warn shadow-[inset_0_0_0_1px_#fde3b0]')}>
                    <option value="" disabled>Classer…</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                )}
                {done === t.id && <SuccessDot size={16} />}
              </div>
            </div>
            <div className={cn('num shrink-0 text-right text-[13.5px] font-semibold', In && 'text-ok')}>{In ? '+' : ''}{money(t.amount)}</div>
            {In && !f && <Button size="sm" variant="soft" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => setMatching(t)} className="hidden sm:inline-flex">Associer</Button>}
            {In && !f && <button onClick={() => setMatching(t)} className="grid h-11 w-11 place-items-center rounded-full bg-vi-50 text-vi-700 sm:hidden" aria-label="Associer"><Link2 className="h-4 w-4" /></button>}
          </div>
        );
      })}
      </div>
      {!list.length && (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <SuccessDot size={28} />
          <div className="text-[14px] font-medium">Tout est rapproché</div>
          <div className="text-[12.5px] text-ink-3">Chaque opération a sa facture ou sa catégorie.</div>
        </div>
      )}

      <Sheet open={!!matching} onClose={() => setMatching(null)} title="À quelle facture correspond ce paiement ?" subtitle={matching ? `${matching.label} · ${money(matching.amount)}` : ''}>
        <div className="space-y-2">
          {suggestions.map((f, i) => {
            const cl = s.clients.find((c) => c.id === f.clientId);
            return (
              <button key={f.id} onClick={() => matching && match(matching, f.id)} className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-line px-3.5 text-left hover:border-vi-200 hover:bg-vi-50">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{cl?.name} · {f.number}</div>
                  <div className="truncate text-[12px] text-ink-3">{f.title}</div>
                </div>
                {i === 0 && <Badge tone="violet">Bob propose</Badge>}
                <span className="num text-[13px] font-semibold">{money(openAmount(f))}</span>
              </button>
            );
          })}
          {!suggestions.length && <p className="py-6 text-center text-[13px] text-ink-3">Aucune facture en attente.</p>}
          <p className="pt-2 text-xs text-ink-3">Un acompte versé sans facture ? Créez la facture d'acompte depuis le devis, Bob l'associera tout seul.</p>
        </div>
      </Sheet>
    </Card>
  );
}
