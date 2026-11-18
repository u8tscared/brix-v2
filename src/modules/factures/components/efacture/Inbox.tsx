// Factures fournisseurs reçues par la plateforme agréée : approuver, refuser, rapprocher.

import { useState } from 'react';
import { Check, ChevronDown, HardHat, Landmark, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Select, cn, toast } from '@/components/ui';
import { dateFull, dateShort, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { SUPPLIER_INVOICES, type SupplierInvoice } from '../../lib/suppliers';
import { PLATFORMS } from '../../service';
import { useFactures, type InboxState } from '../../store';

const STATE: Record<InboxState, { label: string; tone: 'neutral' | 'ok' | 'bad' | 'info' | 'warn' }> = {
  a_traiter: { label: 'À valider', tone: 'warn' },
  approuvee: { label: 'Approuvée', tone: 'info' },
  refusee: { label: 'Refusée', tone: 'bad' },
  payee: { label: 'Payée', tone: 'ok' },
};

const REASONS = ['Montant différent de la commande', 'Matériel non livré', 'Facture en double', 'Mauvais destinataire'];

export function Inbox() {
  const inbox = useFactures((s) => s.inbox);
  const todo = SUPPLIER_INVOICES.filter((i) => (inbox[i.id]?.state ?? 'a_traiter') === 'a_traiter').length;
  const total = SUPPLIER_INVOICES.reduce((s, i) => s + i.ht + i.tva, 0);
  return (
    <Card>
      <CardHeader title="Factures reçues de vos fournisseurs" meta={`${todo} à valider · ${money(total)} TTC ce mois`} />
      <ul className="divide-y divide-halo-line">
        {SUPPLIER_INVOICES.map((i) => (
          <InboxRow key={i.id} inv={i} />
        ))}
      </ul>
      <p className="border-t border-halo-line px-4 py-3 text-[12px] text-ink-3">Elles arrivent toutes seules, déjà lues : pas de saisie, pas de PDF à télécharger. Les montants partent directement en comptabilité.</p>
    </Card>
  );
}

function InboxRow({ inv }: { inv: SupplierInvoice }) {
  const fx = useFactures();
  const chantier = useBrix((s) => s.chantiers.find((c) => c.id === inv.chantierId));
  const state = fx.inbox[inv.id]?.state ?? 'a_traiter';
  const [open, setOpen] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const ttc = inv.ht + inv.tva;
  const late = state !== 'payee' && inv.dueDate < new Date().toISOString().slice(0, 10);
  const platform = PLATFORMS[fx.platform ?? 'superpdp'].name;

  const act = (next: InboxState, event: string, msg: string) => {
    fx.setInbox(inv.id, { state: next });
    fx.log({ number: inv.number, direction: 'recue', event, platform, ok: next !== 'refusee' });
    toast(msg);
    setRefusing(false);
  };

  return (
    <li>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-halo-hover">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-pale-p text-[12px] font-semibold text-deep-p">{inv.supplier.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium">{inv.supplier}</span>
            <Badge tone={STATE[state].tone}>{STATE[state].label}</Badge>
          </div>
          <div className="truncate text-[12.5px] text-ink-2">
            {inv.label} · reçue le {dateShort(inv.date)}
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[14px] font-semibold">{money(ttc)}</div>
          <div className={cn('text-[11.5px]', late ? 'font-medium text-deep-r' : 'text-ink-3')}>{state === 'payee' ? 'réglée' : `éch. ${dateShort(inv.dueDate)}`}</div>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-up space-y-3 bg-halo-hover/60 px-4 pb-4 pt-1">
          <div className="rounded-card-sm bg-white shadow-halo-sm">
            {inv.lines.map((l) => (
              <div key={l.label} className="flex justify-between gap-3 border-b border-halo-line px-3.5 py-2 text-[12.5px] last:border-b-0">
                <span className="min-w-0 truncate">
                  {l.label} <span className="text-ink-3">· {l.qty} {l.unit}</span>
                </span>
                <span className="num">{money(l.qty * l.price)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-halo-line px-3.5 py-2 text-[12.5px] text-ink-2">
              <span>N° {inv.number} · TVA {money(inv.tva)}</span>
              <span className="num font-semibold text-ink">{money(ttc)} TTC</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            {chantier && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pale-p px-2.5 py-1 text-deep-p">
                <HardHat className="h-3.5 w-3.5" /> Affectée au chantier {chantier.name}
              </span>
            )}
            {inv.bankHint && state !== 'payee' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pale-g px-2.5 py-1 text-deep-g">
                <Landmark className="h-3.5 w-3.5" /> Paiement trouvé : {inv.bankHint.label}, {dateFull(inv.bankHint.date)}
              </span>
            )}
          </div>
          {refusing ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={reason} onChange={(e) => setReason(e.target.value)} className="sm:flex-1">
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <Button variant="danger" className="h-11" onClick={() => act('refusee', `Refusée · ${reason}`, `Refus transmis à ${inv.supplier}`)}>Confirmer le refus</Button>
              <Button variant="ghost" className="h-11" onClick={() => setRefusing(false)}>Annuler</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state === 'a_traiter' && (
                <>
                  <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => act('approuvee', 'Approuvée', `Facture ${inv.supplier} approuvée, le fournisseur est prévenu`)}>Approuver</Button>
                  <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setRefusing(true)}>Refuser</Button>
                </>
              )}
              {state !== 'payee' && state !== 'refusee' && (
                <Button variant="secondary" icon={<Landmark className="h-4 w-4" />} onClick={() => act('payee', inv.bankHint ? 'Rapprochée du paiement bancaire' : 'Marquée payée', inv.bankHint ? 'Rapprochée avec votre banque' : 'Marquée payée')}>
                  {inv.bankHint ? 'Rapprocher le paiement' : 'Marquer payée'}
                </Button>
              )}
              {state !== 'a_traiter' && (
                <Button variant="ghost" onClick={() => fx.setInbox(inv.id, { state: 'a_traiter' })}>Remettre à valider</Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
