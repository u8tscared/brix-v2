// En-tête éditable d'une facture : client, objet, dates et mentions obligatoires 2026.

import { ScrollText } from 'lucide-react';
import { Field, IconTile, Input, Select, Switch, cn } from '@/components/ui';
import { dateFull, dayOffset, daysBetween } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { CATEGORY_LABEL, sirenOf, type FactureExtra, type OperationCategory } from '../lib/model';

export function MetaForm({ f, extra, onChange, onExtra, readOnly }: { f: Facture; extra: FactureExtra; onChange: (p: Partial<Facture>) => void; onExtra: (p: Partial<FactureExtra>) => void; readOnly: boolean }) {
  const clients = useBrix((s) => s.clients);
  const chantiers = useBrix((s) => s.chantiers);
  const client = clients.find((c) => c.id === f.clientId);
  const chantier = chantiers.find((c) => c.id === f.chantierId);
  const terms = daysBetween(f.issueDate, f.dueDate);
  const siren = sirenOf(extra.clientSiren ?? client?.siret);
  const deliveryPlaceholder = (chantier ? [chantier.address, chantier.city].filter(Boolean).join(', ') : client ? [client.address, client.city].filter(Boolean).join(', ') : '') || 'Adresse du chantier';

  if (readOnly) {
    return (
      <div data-field="client" className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-halo-line shadow-halo md:grid-cols-4">
        <Cell label="Client" value={client?.name ?? '·'} />
        <Cell label="Émise le" value={dateFull(f.issueDate)} />
        <Cell label="Échéance" value={f.kind === 'avoir' ? '·' : dateFull(f.dueDate)} />
        <Cell label="Opération" value={CATEGORY_LABEL[extra.category ?? 'services'].split(' (')[0]} />
        {client?.kind === 'pro' && <Cell label="SIREN client" value={siren ? siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : 'Manquant'} bad={!siren} />}
        <Cell label="Livraison / chantier" value={extra.deliveryAddress || deliveryPlaceholder} className={client?.kind === 'pro' ? 'col-span-1 md:col-span-2' : 'col-span-2 md:col-span-3'} />
        <Cell label="TVA" value={extra.vatOnDebits ? 'Sur les débits' : 'Sur les encaissements'} className="max-md:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Client">
          <Select
            data-field="client"
            value={f.clientId}
            onChange={(e) => {
              const c = clients.find((x) => x.id === e.target.value);
              onChange({ clientId: e.target.value });
              onExtra({ clientSiren: c?.siret ? sirenOf(c.siret) : undefined });
            }}
          >
            {!client && <option value="">Choisir un client</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.kind === 'pro' ? ' (pro)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Chantier">
          <Select value={f.chantierId ?? ''} onChange={(e) => onChange({ chantierId: e.target.value || undefined })}>
            <option value="">Aucun chantier</option>
            {chantiers
              .filter((c) => !f.clientId || c.clientId === f.clientId)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </Select>
        </Field>
        <Field label="Date d’émission">
          <Input type="date" value={f.issueDate} onChange={(e) => onChange({ issueDate: e.target.value, dueDate: dayOffset(terms, new Date(e.target.value + 'T12:00')) })} />
        </Field>
        <Field label="Échéance" hint={client?.kind === 'pro' ? 'Entre pros : 60 jours maximum (45 jours fin de mois).' : undefined}>
          <div data-field="validity" className="flex gap-1 rounded-full bg-halo-track p-1">
            {[0, 15, 30, 45].map((d) => (
              <button key={d} onClick={() => onChange({ dueDate: dayOffset(d, new Date(f.issueDate + 'T12:00')) })} aria-pressed={terms === d} className={cn('h-10 flex-1 whitespace-nowrap rounded-full px-1 text-[12.5px] font-medium transition duration-300 ease-spring', d === 0 && 'flex-[1.6]', terms === d ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:text-ink')}>
                {d === 0 ? 'À réception' : `${d} j`}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div data-field="chantier" className="rounded-card bg-white shadow-halo">
        <div className="flex items-center gap-2.5 border-b border-halo-line px-4 py-3 text-[14px] font-semibold tracking-[-0.02em] md:px-5">
          <IconTile icon={<ScrollText />} tone="indigo" size="sm" />
          Mentions obligatoires 2026
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5">
          <Field label="Catégorie de l’opération">
            <Select value={extra.category ?? 'services'} onChange={(e) => onExtra({ category: e.target.value as OperationCategory })}>
              {(Object.keys(CATEGORY_LABEL) as OperationCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          {client?.kind === 'pro' ? (
            <Field label="SIREN du client" hint={siren.length === 9 ? 'Brix vérifie l’annuaire au moment de l’envoi.' : 'Obligatoire pour une facture entre pros.'}>
              <Input inputMode="numeric" value={extra.clientSiren ?? siren} placeholder="9 chiffres" onChange={(e) => onExtra({ clientSiren: e.target.value.replace(/\D/g, '').slice(0, 9) })} className={cn(siren.length !== 9 && '[&]:border-bad')} />
            </Field>
          ) : (
            <Field label="SIREN du client">
              <div className="flex h-11 items-center rounded-field bg-pale-n px-3.5 text-[13px] text-ink-2">{client ? 'Particulier : non requis' : 'Choisissez d’abord le client'}</div>
            </Field>
          )}
          <Field label="Adresse de livraison ou du chantier" className="md:col-span-2" hint="Si elle diffère de l’adresse du client.">
            <Input value={extra.deliveryAddress ?? ''} placeholder={deliveryPlaceholder} onChange={(e) => onExtra({ deliveryAddress: e.target.value })} />
          </Field>
          <label className="flex items-center gap-3 md:col-span-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">Option pour la TVA sur les débits</div>
              <div className="text-[12px] text-ink-2">Seulement si vous l’avez demandée aux impôts. Par défaut, la TVA des travaux est due à l’encaissement.</div>
            </div>
            <Switch checked={!!extra.vatOnDebits} onChange={(v) => onExtra({ vatOnDebits: v })} label="TVA sur les débits" />
          </label>
          <label className="flex items-center gap-3 md:col-span-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">Retenue de garantie 5 %</div>
              <div className="text-[12px] text-ink-2">Le client garde 5 % pendant un an après la réception.</div>
            </div>
            <Switch checked={!!f.retenueGarantie} onChange={(v) => { onChange({ retenueGarantie: v ? 5 : undefined }); onExtra({ retenueReleaseDate: v ? dayOffset(365) : undefined }); }} label="Retenue de garantie" />
          </label>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, bad, className }: { label: string; value: string; bad?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 bg-white px-4 py-3', className)}>
      <div className="text-[11.5px] text-ink-3">{label}</div>
      <div className={cn('text-[13.5px] font-medium leading-snug', bad && 'text-deep-r')}>{value}</div>
    </div>
  );
}
