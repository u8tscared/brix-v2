// Document « devis » au format A4, fidèle à un vrai devis français.
// Le contenu est découpé en blocs (PagedDoc) : mêmes pages à l'écran, dans le visionneur et à l'impression.

import type { ReactNode } from 'react';
import type { Client, Company, Devis } from '@/lib/types';
import { dateFull, money, num, pct, totals } from '@/lib/format';
import { expiryDate, groupLots, lotName } from '../logic';
import { DocPages, type DocBlock, type DocSpec } from './doc/PagedDoc';

const vatLabel = (r: number) => pct(r, r % 1 ? 1 : 0);
const GRID = 'grid grid-cols-[minmax(0,1fr)_46px_40px_76px_44px_84px] gap-x-2';
const MUTED = 'text-[#5f5f70]';
const LABEL = 'text-[9px] font-semibold uppercase tracking-[.1em] text-[#9898a8]';

export interface DevisDocProps {
  d: Devis;
  client?: Client;
  company: Company;
  signer?: string;
}

function Logo({ company, size = 44 }: { company: Company; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-[10px] bg-[#15122a] font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {company.logoInitials || company.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/** Découpe du devis en blocs prêts à être mis en pages. */
export function devisDoc({ d, client, company, signer }: DevisDocProps): DocSpec {
  const t = totals(d.lines);
  const lots = groupLots(d.lines);
  const deposit = (t.ttc * d.depositPercent) / 100;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const particulier = client?.kind !== 'pro';
  const reduced = t.byVat.some((v) => v.rate === 10 || v.rate === 5.5);
  const issue = (d.sentAt ?? d.createdAt).slice(0, 10);
  const hours = d.lines.filter((l) => l.unit === 'h').reduce((s, l) => s + l.quantity, 0);
  const days = Math.max(1, Math.ceil(hours / 14));
  const blocks: DocBlock[] = [];

  blocks.push({
    key: 'head',
    node: (
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3.5">
          <Logo company={company} />
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">{company.name || 'Votre entreprise'}</div>
            <div className={`mt-0.5 text-[10.5px] leading-[1.55] ${MUTED}`}>
              {company.address}, {company.city}
              <br />
              {company.phone} · {company.email}
              <br />
              SIRET {company.siret || 'à renseigner'} · TVA {company.vatNumber || 'à renseigner'}
              {company.rge && <> · Qualifiée RGE</>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[26px] font-semibold leading-none tracking-[-0.03em]">Devis</div>
          <div className="mt-1.5 font-mono text-[11px] font-medium">{d.number}</div>
          <div className={`mt-1 text-[10.5px] leading-[1.55] ${MUTED}`}>
            Émis le {dateFull(issue)}
            <br />
            Valable jusqu'au {dateFull(expiryDate(d))}
          </div>
        </div>
      </div>
    ),
  });

  blocks.push({
    key: 'parties',
    gap: 26,
    node: (
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[8px] bg-[#f6f5fa] p-3.5">
          <div className={LABEL}>Client</div>
          {client ? (
            <div className="mt-1.5">
              <b className="text-[12px] font-semibold">{client.name}</b>
              {client.contact && <div>À l'attention de {client.contact}</div>}
              <div>{client.address}</div>
              <div>{client.city}</div>
              {(client.email || client.phone) && <div className={`text-[10.5px] ${MUTED}`}>{[client.phone, client.email].filter(Boolean).join(' · ')}</div>}
              {client.siret && <div className={`text-[10.5px] ${MUTED}`}>SIRET {client.siret}</div>}
            </div>
          ) : (
            <div className="mt-1.5 text-[#c2410c]">Client à choisir</div>
          )}
        </div>
        <div className="rounded-[8px] border border-[#ececf1] p-3.5">
          <div className={LABEL}>Objet et lieu des travaux</div>
          <div className="mt-1.5">
            <b className="text-[12px] font-semibold">{d.title}</b>
            <div>{client ? [client.address, client.city].filter(Boolean).join(', ') || 'Adresse à préciser' : 'Adresse à préciser'}</div>
            <div className={`text-[10.5px] ${MUTED}`}>
              Durée estimée : {days} jour{days > 1 ? 's' : ''} ouvré{days > 1 ? 's' : ''} · démarrage à convenir
            </div>
          </div>
        </div>
      </div>
    ),
  });

  let lotIndex = 0;
  lots.forEach((lot, li) => {
    if (lot.section) {
      lotIndex++;
      blocks.push({
        key: `lot-${lot.section.id}`,
        row: true,
        keepWithNext: true,
        gap: li === 0 ? 22 : 6,
        node: (
          <div className={`${GRID} border-b border-[#15122a]/70 pb-1 pt-2.5 text-[11.5px] font-semibold`}>
            <span className="col-span-5">
              <span className="mr-1.5 font-mono text-[10px] text-[#9898a8]">{String(lotIndex).padStart(2, '0')}</span>
              {lotName(lot.section.designation)}
            </span>
            <span className="num text-right">{money(lot.ht)}</span>
          </div>
        ),
      });
    }
    lot.items.forEach((l) =>
      blocks.push({
        key: l.id,
        gap: blocks.length === 2 ? 22 : 0,
        row: true,
        node:
          l.kind === 'texte' ? (
            <div className={`border-b border-[#ececf1] py-1.5 text-[10.5px] italic ${MUTED}`}>{l.designation}</div>
          ) : (
            <div className={`${GRID} border-b border-[#ececf1] py-1.5 text-[10.5px]`}>
              <span className="pr-2">
                {l.designation || <span className="text-[#c2410c]">Ligne sans désignation</span>}
                {(l.supplierRef || (l.detail && !/bob/i.test(l.detail))) && <span className="block text-[9px] text-[#9898a8]">{l.supplierRef ?? l.detail}</span>}
              </span>
              <span className="num text-right">{num(l.quantity)}</span>
              <span className="pl-1">{l.unit}</span>
              <span className="num text-right">{money(l.unitPriceHt)}</span>
              <span className="num text-right">{vatLabel(l.vatRate)}</span>
              <span className="num text-right font-medium">{money(l.quantity * l.unitPriceHt)}</span>
            </div>
          ),
      }),
    );
  });
  if (!t.ht) blocks.push({ key: 'empty', gap: 8, node: <div className="rounded-[8px] border border-dashed border-[#dfdce9] py-8 text-center text-[#9898a8]">Ajoutez des lignes : elles apparaissent ici en direct.</div> });

  blocks.push({
    key: 'totals',
    gap: 18,
    node: (
      <div className="flex justify-end">
        <div className="w-[300px] text-[11px]">
          <Tot label="Total HT" value={money(t.ht)} />
          {t.byVat.map((v) => (
            <Tot key={v.rate} label={`TVA ${vatLabel(v.rate)} sur ${money(v.base)}`} value={money(v.tva)} />
          ))}
          <div className="mt-1.5 flex items-baseline justify-between rounded-[8px] bg-[#15122a] px-3 py-2 text-white">
            <span className="text-[11.5px] font-medium">Total TTC</span>
            <span className="num text-[15px] font-semibold tracking-[-0.01em]">{money(t.ttc)}</span>
          </div>
          {d.depositPercent > 0 && <Tot label={`Acompte ${d.depositPercent} % à la signature`} value={money(deposit)} />}
          {aides > 0 && (
            <>
              {(d.aides ?? []).map((a) => (
                <Tot key={a.label} label={`${a.label}*`} value={`− ${money(a.amount)}`} />
              ))}
              <Tot label="Reste à charge estimé" value={money(t.ttc - aides)} bold />
            </>
          )}
        </div>
      </div>
    ),
  });

  blocks.push({
    key: 'conditions',
    gap: 22,
    node: (
      <div className={`grid grid-cols-2 gap-5 text-[9.5px] leading-[1.55] ${MUTED}`}>
        <div>
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#15122a]">Conditions</div>
          Devis gratuit, valable {d.validityDays} jours. {d.depositPercent > 0 ? `Acompte de ${d.depositPercent} % à la signature, solde` : 'Paiement'} à réception des travaux, par virement ou carte bancaire. Prix fermes pendant la durée de validité.
          {particulier ? ' Pas d’escompte pour paiement anticipé.' : ' Pénalités de retard : 3 fois le taux d’intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €. Pas d’escompte pour paiement anticipé.'}
          {particulier && ' En cas de vente hors établissement, vous disposez d’un délai de rétractation de 14 jours (art. L221-18 du Code de la consommation). Médiateur de la consommation : CM2C, 49 rue de Ponthieu, 75008 Paris.'}
          {aides > 0 && ' * Aides indicatives, sous réserve d’éligibilité, versées par les organismes et non par l’entreprise.'}
        </div>
        <div>
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#15122a]">Assurance et garanties</div>
          Assurance décennale : {company.decennale || 'à renseigner dans vos réglages'}. Couverture : France métropolitaine. Garantie de parfait achèvement (1 an) et garantie biennale de bon fonctionnement (2 ans).
          {reduced && particulier && (
            <div className="mt-2 rounded-[6px] border border-[#ececf1] p-2 text-[#1d1d27]">
              <b className="font-semibold">Attestation TVA à taux réduit.</b> Le client atteste que les travaux portent sur un logement achevé depuis plus de deux ans, affecté à l’habitation, et qu’ils ne conduisent pas à une construction neuve (art. 279-0 bis et 278-0 bis A du CGI).
            </div>
          )}
        </div>
      </div>
    ),
  });

  blocks.push({
    key: 'sign',
    gap: 20,
    node: (
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-[8px] border border-[#ececf1] p-3 text-[10px] ${MUTED}`}>
          <b className="font-semibold text-[#1d1d27]">L’entreprise</b>
          <div className="mt-0.5">{company.legalName || company.name}</div>
          <div className="mt-3 text-[17px] italic text-[#1d1d27]" style={{ fontFamily: 'Georgia, serif' }}>
            {signer}
          </div>
        </div>
        <div className={`rounded-[8px] border border-[#ececf1] p-3 text-[10px] ${MUTED}`}>
          <b className="font-semibold text-[#1d1d27]">Bon pour accord, le client</b>
          <div className="mt-0.5">Date et signature précédées de la mention « Bon pour accord »</div>
          {d.status === 'signe' && d.signedAt ? (
            <div className="mt-2 inline-block rounded-[6px] border border-[#c9f0d6] bg-[#ecfdf3] px-2 py-1 text-[10px] font-medium text-[#16a34a]">
              Signé électroniquement le {dateFull(d.signedAt.slice(0, 10))} · {client?.name}
            </div>
          ) : (
            <div className="mt-2 h-9" />
          )}
        </div>
      </div>
    ),
  });

  return {
    blocks,
    tableHead: (
      <div className={`${GRID} border-b-[1.5px] border-[#15122a] pb-1.5 text-[9px] font-semibold uppercase tracking-[.08em] ${MUTED}`}>
        <span>Désignation</span>
        <span className="text-right">Qté</span>
        <span className="pl-1">U.</span>
        <span className="text-right">PU HT</span>
        <span className="text-right">TVA</span>
        <span className="text-right">Total HT</span>
      </div>
    ),
    running: (
      <div className="flex items-center justify-between border-b border-[#ececf1] pb-2 text-[10px] text-[#9898a8]">
        <span className="flex items-center gap-2">
          <Logo company={company} size={20} />
          <span className="font-medium text-[#1d1d27]">{company.name}</span>
        </span>
        <span>
          Devis <span className="font-mono">{d.number}</span> · {client?.name ?? ''}
        </span>
      </div>
    ),
    footer: (page, total) => <DocFooter company={company} page={page} total={total} />,
  };
}

export function DocFooter({ company, page, total }: { company: Company; page: number; total: number }) {
  return (
    <div className="flex h-full items-end justify-between gap-4 border-t border-[#ececf1] pb-0 pt-2 text-[8.5px] text-[#9898a8]">
      <span className="truncate">
        {company.legalName || company.name} · SIRET {company.siret} · TVA {company.vatNumber} · IBAN {company.iban}
      </span>
      <span className="num shrink-0">
        Page {page} / {total}
      </span>
    </div>
  );
}

function Tot({ label, value, bold }: { label: ReactNode; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-[3px] ${bold ? 'font-semibold text-[#15122a]' : MUTED}`}>
      <span>{label}</span>
      <span className="num shrink-0 text-[#15122a]">{value}</span>
    </div>
  );
}

/** Toutes les pages du devis, empilées (taille réelle par défaut). */
export function PdfDoc(props: DevisDocProps & { scale?: number; gap?: number }) {
  const { scale, gap, ...p } = props;
  return <DocPages spec={devisDoc(p)} scale={scale} gap={gap} pageClassName="shadow-[0_1px_2px_rgba(19,15,38,.08),0_8px_24px_-12px_rgba(19,15,38,.2)]" />;
}
