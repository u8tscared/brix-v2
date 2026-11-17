import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { Button, EmptyState, Input, Segmented, Sheet, Switch, cn, toast } from '@/components/ui';
import { dateFull, dayOffset, money, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { AnimatedNumber } from '@/components/motion';
import type { Devis, Facture } from '@/lib/types';
import { billedFor, buildAcompte, buildSituation, buildSolde, planSituation, previousProgress } from '../lib/billing';
import { amounts, round2, type FactureExtra, type SituationLot } from '../lib/model';
import { useFactures } from '../store';

type Kind = 'acompte' | 'situation' | 'solde';

/** Créer une facture à partir d'un devis signé : acompte, situation de travaux ou solde. */
export function CreateFromDevisSheet({ open, onClose, devisId, kind: initialKind }: { open: boolean; onClose: () => void; devisId?: string; kind?: Kind }) {
  const navigate = useNavigate();
  const s = useBrix();
  const extras = useFactures((x) => x.extras);
  const setExtra = useFactures((x) => x.setExtra);
  const signed = s.devis.filter((d) => d.status === 'signe');
  const [selected, setSelected] = useState<string | undefined>(devisId);
  const [kind, setKind] = useState<Kind>(initialKind ?? 'acompte');
  const devis = s.devis.find((d) => d.id === selected);

  useEffect(() => {
    if (open) {
      setSelected(devisId ?? (signed.length === 1 ? signed[0].id : undefined));
      if (initialKind) setKind(initialKind);
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={devis ? `Facturer ${devis.number}` : 'Facturer un devis signé'} subtitle={devis ? devis.title : 'Choisissez le devis à facturer.'} width={560}>
      {!devis ? (
        signed.length === 0 ? (
          <EmptyState title="Aucun devis signé" text="Dès qu’un client signe un devis, vous pourrez le facturer ici en deux clics." />
        ) : (
          <div className="stagger-fast space-y-2">
            {signed.map((d) => (
              <DevisPick key={d.id} d={d} onPick={() => setSelected(d.id)} />
            ))}
          </div>
        )
      ) : (
        <DevisBilling
          devis={devis}
          kind={kind}
          setKind={setKind}
          onBack={devisId ? undefined : () => setSelected(undefined)}
          onCreate={(f, extra) => {
            s.upsertFacture(f);
            if (extra) setExtra(f.id, extra);
            toast(`${f.number} créée en brouillon`);
            onClose();
            navigate(`/app/factures/${f.id}`);
          }}
          extras={extras}
        />
      )}
    </Sheet>
  );
}

function DevisPick({ d, onPick }: { d: Devis; onPick: () => void }) {
  const client = useBrix((s) => s.clients.find((c) => c.id === d.clientId));
  const factures = useBrix((s) => s.factures);
  const ht = totals(d.lines).ht;
  const billed = billedFor(d.id, factures).reduce((sum, f) => sum + amounts(f).ht, 0);
  const pct = ht ? Math.min(100, Math.round((billed / ht) * 100)) : 0;
  return (
    <button onClick={onPick} className="group flex w-full items-center gap-3 rounded-[14px] bg-white p-3.5 text-left shadow-card transition duration-200 hover:-translate-y-px hover:shadow-raise">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{client?.name}</div>
        <div className="truncate text-[12.5px] text-ink-2">
          {d.number} · {d.title}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sub">
            <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11.5px] text-ink-3">{pct} % facturé</span>
        </div>
      </div>
      <div className="num text-right text-[14px] font-semibold">{money(ht)} <span className="block text-[11px] font-normal text-ink-3">HT</span></div>
    </button>
  );
}

function DevisBilling({ devis, kind, setKind, onBack, onCreate, extras }: { devis: Devis; kind: Kind; setKind: (k: Kind) => void; onBack?: () => void; onCreate: (f: Facture, extra?: FactureExtra) => void; extras: Record<string, FactureExtra> }) {
  const s = useBrix();
  const t = totals(devis.lines);
  const [percent, setPercent] = useState(devis.depositPercent || 30);
  const prev = useMemo(() => previousProgress(devis, s.factures, extras), [devis, s.factures, extras]);
  const [lots, setLots] = useState<SituationLot[]>(prev.lots);
  const [retenue, setRetenue] = useState(true);
  const chantier = s.chantiers.find((c) => c.id === devis.chantierId);
  const release = dayOffset(365, chantier ? new Date(chantier.endDate + 'T12:00') : new Date());
  const plan = planSituation(lots, prev.depositsHt, prev.depositNumbers, prev.depositsByRate);
  const already = billedFor(devis.id, s.factures);

  const create = () => {
    const number = s.nextNumber('facture');
    if (kind === 'acompte') return onCreate(buildAcompte(devis, number, percent), { depositPercent: percent, category: 'services' });
    if (kind === 'situation') {
      if (!plan.lines.length) return toast('Indiquez l’avancement d’au moins un lot', 'warn');
      return onCreate(buildSituation(devis, number, prev.index, plan, retenue ? 5 : 0), { situation: { index: prev.index, lots }, retenueReleaseDate: retenue ? release : undefined, category: 'services' });
    }
    onCreate(buildSolde(devis, number, s.factures), { category: 'services' });
  };

  const previewTtc = (() => {
    if (kind === 'acompte') return round2(t.ttc * percent / 100);
    if (kind === 'situation') return round2(plan.lines.reduce((sum, l) => sum + l.unitPriceHt * (1 + l.vatRate / 100), 0));
    const soldeHt = t.ht - already.reduce((sum, f) => sum + amounts(f).ht, 0);
    return round2(soldeHt * (t.ttc / (t.ht || 1)));
  })();

  return (
    <div className="space-y-5">
      {onBack && (
        <button onClick={onBack} className="-mt-1 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> Autre devis
        </button>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-sub p-3 text-[12.5px]">
        <div>
          <div className="text-ink-3">Devis</div>
          <div className="num font-semibold">{money(t.ht)} HT</div>
        </div>
        <div>
          <div className="text-ink-3">Déjà facturé</div>
          <div className="num font-semibold">{money(already.reduce((sum, f) => sum + amounts(f).ht, 0))}</div>
        </div>
        <div>
          <div className="text-ink-3">Factures</div>
          <div className="truncate font-semibold">{already.length ? already.map((f) => f.number).join(', ') : 'aucune'}</div>
        </div>
      </div>

      <Segmented
        value={kind}
        onChange={setKind}
        className="w-full [&>button]:flex-1 [&>button]:justify-center"
        options={[
          { value: 'acompte', label: 'Acompte' },
          { value: 'situation', label: 'Situation' },
          { value: 'solde', label: 'Solde' },
        ]}
      />

      {kind === 'acompte' && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">Une avance demandée au démarrage, déduite ensuite des situations et du solde.</p>
          <div className="flex flex-wrap gap-2">
            {[20, 30, 40, 50].map((p) => (
              <button key={p} onClick={() => setPercent(p)} className={cn('h-11 min-w-[64px] rounded-[10px] border px-3 text-[14px] font-medium transition', percent === p ? 'border-ink bg-ink text-white' : 'border-line2 bg-white hover:bg-sub')}>
                {p} %
              </button>
            ))}
            <Input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Math.max(1, Math.min(100, Number(e.target.value) || 0)))} suffix="%" className="w-28" />
          </div>
        </div>
      )}

      {kind === 'situation' && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">
            Situation n°{prev.index}. Glissez l’avancement <b className="font-medium text-ink">cumulé</b> de chaque lot : Brix facture seulement la différence
            {prev.depositsHt > 0 ? ' et déduit l’acompte au prorata.' : '.'}
          </p>
          <div className="divide-y divide-line rounded-[14px] bg-white shadow-card">
            {lots.map((l, i) => (
              <div key={l.name} className="p-3">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate font-medium">{l.name}</span>
                  <span className="num shrink-0 text-ink-2">
                    {money(l.totalHt, true)} HT · <b className="text-ink">{l.pct} %</b>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={l.pct}
                  aria-label={`Avancement ${l.name}`}
                  onChange={(e) => setLots(lots.map((x, j) => (j === i ? { ...x, pct: Math.max(x.prevPct, Number(e.target.value)) } : x)))}
                  className="mt-2 h-8 w-full accent-[#6d28d9]"
                />
                <div className="flex justify-between text-[11.5px] text-ink-3">
                  <span>Déjà facturé {l.prevPct} %</span>
                  <span>{l.pct > l.prevPct ? `+${l.pct - l.prevPct} % ce mois-ci` : 'Pas d’avancement'}</span>
                </div>
              </div>
            ))}
          </div>
          {plan.deductionHt > 0 && (
            <div className="flex justify-between rounded-lg bg-sub px-3 py-2 text-[12.5px]">
              <span className="text-ink-2">Déduction acompte au prorata</span>
              <span className="num font-medium">−{money(plan.deductionHt)} HT</span>
            </div>
          )}
          <label className="flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">Retenue de garantie 5 %</div>
              <div className="text-[12px] text-ink-2">Gardée par le client un an, libérable le {dateFull(release)}. Brix vous le rappellera.</div>
            </div>
            <Switch checked={retenue} onChange={setRetenue} label="Retenue de garantie" />
          </label>
        </div>
      )}

      {kind === 'solde' && (
        <div className="space-y-2 text-[13px] text-ink-2">
          <p>Reprend tout le devis et déduit ce qui a déjà été facturé :</p>
          {already.length ? (
            <ul className="space-y-1">
              {already.map((f) => (
                <li key={f.id} className="flex justify-between rounded-lg bg-sub px-3 py-2">
                  <span>
                    {f.number} · {f.kind === 'acompte' ? 'acompte' : 'situation'}
                  </span>
                  <span className="num font-medium text-ink">−{money(amounts(f).ht)} HT</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-sub px-3 py-2">Rien n’a encore été facturé : le solde est le devis complet.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-ink-3">Montant de la facture</div>
          <div className="num text-[24px] font-semibold tracking-[-0.03em]"><AnimatedNumber value={previewTtc} format={(n) => money(n)} duration={400} /> <span className="text-[13px] font-medium text-ink-3">TTC</span></div>
        </div>
        <Button variant="primary" size="lg" icon={<Check className="h-4 w-4" />} onClick={create}>
          Créer le brouillon
        </Button>
      </div>
    </div>
  );
}
