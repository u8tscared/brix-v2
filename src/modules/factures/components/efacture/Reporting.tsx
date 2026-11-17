// E-reporting (ventes aux particuliers, encaissements) et journal des transmissions.

import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, FileBarChart2, XCircle } from 'lucide-react';
import { Badge, Card, CardHeader, cn } from '@/components/ui';
import { capitalize, dateShort, money, monthName, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { amounts } from '../../lib/model';
import { allPayments, useFactures } from '../../store';

/** Prochaine date de fin de décade (10, 20, fin de mois) après aujourd'hui. */
function nextDecade(today = new Date()) {
  const d = today.getDate();
  const y = today.getFullYear();
  const m = today.getMonth();
  if (d < 10) return new Date(y, m, 10);
  if (d < 20) return new Date(y, m, 20);
  return new Date(y, m + 1, 0);
}

export function EReporting() {
  const s = useBrix();
  const payments = useFactures((x) => x.payments);
  const today = todayISO();
  const month = today.slice(0, 7);
  const isB2C = (clientId: string) => s.clients.find((c) => c.id === clientId)?.kind !== 'pro';
  const b2c = s.factures.filter((f) => f.status !== 'brouillon' && f.status !== 'annulee' && isB2C(f.clientId) && f.issueDate.startsWith(month));
  const b2cHt = b2c.reduce((t, f) => t + amounts(f).ht * amounts(f).sign, 0);
  const b2cTva = b2c.reduce((t, f) => t + amounts(f).tva * amounts(f).sign, 0);
  const cashed = allPayments(s.factures, payments).filter((p) => p.date.startsWith(month));
  const cashedSum = cashed.reduce((t, p) => t + p.amount, 0);
  const nd = nextDecade();
  const endMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10);
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const rows = [
    { icon: <ArrowUpRight className="h-4 w-4" />, title: 'Ventes aux particuliers', detail: `${b2c.length} facture${b2c.length > 1 ? 's' : ''} · TVA ${money(b2cTva)}`, value: money(b2cHt), unit: 'HT', next: `Prochain envoi le ${fmt(nd)}`, freq: 'tous les 10 jours' },
    { icon: <ArrowDownLeft className="h-4 w-4" />, title: 'Encaissements de prestations', detail: `${cashed.length} paiement${cashed.length > 1 ? 's' : ''} reçu${cashed.length > 1 ? 's' : ''}`, value: money(cashedSum), unit: 'TTC', next: `Envoi le ${fmt(endMonth)}`, freq: 'chaque mois' },
  ];

  return (
    <Card>
      <CardHeader title="E-reporting" meta={capitalize(monthName())} action={<Badge tone="ok">Automatique</Badge>} />
      <div className="space-y-3 p-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Pour les ventes aux particuliers, pas de facture électronique : le fisc reçoit seulement les totaux. Brix les calcule et les envoie pour vous. Obligatoire à partir du 1er septembre 2027, déjà prêt.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.title} className="rounded-xl border border-line p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-sub text-ink-2">{r.icon}</span>
                {r.title}
              </div>
              <div className="num mt-3 text-[24px] font-semibold tracking-[-0.02em]">
                {r.value} <span className="text-[13px] font-normal text-ink-3">{r.unit}</span>
              </div>
              <div className="text-[12.5px] text-ink-2">{r.detail}</div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink-2">
                <Clock3 className="h-3.5 w-3.5" /> {r.next} · {r.freq}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function Journal({ limit }: { limit?: number }) {
  const journal = useFactures((s) => s.journal);
  const list = limit ? journal.slice(0, limit) : journal;
  const icon = { emise: <ArrowUpRight className="h-4 w-4" />, recue: <ArrowDownLeft className="h-4 w-4" />, ereporting: <FileBarChart2 className="h-4 w-4" /> };
  return (
    <Card>
      <CardHeader title="Journal des transmissions" meta="Tout ce qui passe par la plateforme agréée, horodaté" />
      <ul className="divide-y divide-line">
        {list.map((j) => (
          <li key={j.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', j.direction === 'recue' ? 'bg-[#eef2ff] text-brand' : j.direction === 'ereporting' ? 'bg-sub text-ink-2' : 'bg-vi-50 text-vi-700')}>{icon[j.direction]}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">{j.event}</div>
              <div className="truncate text-[12px] text-ink-3">
                <span className="num">{j.number}</span> · {j.direction === 'recue' ? 'reçue' : j.direction === 'emise' ? 'envoyée' : 'déclaration'} · {j.platform}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-3">
              {dateShort(j.at.slice(0, 10))} {j.at.slice(11, 16)}
              {j.ok ? <CheckCircle2 className="h-4 w-4 text-ok" /> : <XCircle className="h-4 w-4 text-bad" />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
