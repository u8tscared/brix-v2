// Aperçu fidèle du PDF de la facture, avec toutes les mentions obligatoires (réforme 2026).

import { createPortal } from 'react-dom';
import { cn } from '@/components/ui';
import { dateFull, money } from '@/lib/format';
import type { Chantier, Client, Company, Devis, Facture } from '@/lib/types';
import { amounts, CATEGORY_LABEL, sirenOf, type FactureExtra } from '../lib/model';

export interface PaperProps {
  f: Facture;
  company: Company;
  client?: Client;
  extra: FactureExtra;
  devis?: Devis;
  chantier?: Chantier;
  original?: Facture;
  className?: string;
}

const TITLE: Record<Facture['kind'], string> = {
  facture: 'Facture',
  acompte: "Facture d'acompte",
  situation: 'Situation de travaux',
  solde: 'Facture de solde',
  avoir: 'Avoir',
};

export function InvoicePaper({ f, company, client, extra, devis, chantier, original, className }: PaperProps) {
  const a = amounts(f);
  const pro = client?.kind === 'pro';
  const siren = sirenOf(extra.clientSiren || client?.siret);
  const delivery = extra.deliveryAddress || (chantier ? [chantier.address, chantier.city].filter(Boolean).join(', ') : client ? [client.address, client.city].filter(Boolean).join(', ') : '');
  const category = extra.category ?? 'services';
  const sign = a.sign === -1 ? '−' : '';
  let lot = '';
  return (
    <div className={cn('facture-paper bg-white text-[10.5px] leading-[1.45] text-[#1d1d27]', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#15122a] text-[11px] font-semibold text-white">{company.logoInitials || company.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold">{company.name}</div>
            <div className="text-[#5f5f70]">
              {company.address}, {company.city}
            </div>
            <div className="text-[#5f5f70]">
              SIRET {company.siret} · TVA {company.vatNumber}
            </div>
            <div className="text-[#5f5f70]">
              {company.phone} · {company.email}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('font-bold uppercase tracking-[0.04em]', f.kind === 'facture' || f.kind === 'avoir' ? 'text-[14px]' : 'text-[11.5px]')}>{TITLE[f.kind]}{f.kind === 'situation' && extra.situation ? ` n°${extra.situation.index}` : ''}</div>
          <div className="num font-medium">{f.number}</div>
          <div className="text-[#5f5f70]">Émise le {dateFull(f.issueDate)}</div>
          {f.kind !== 'avoir' && <div className="text-[#5f5f70]">Échéance {dateFull(f.dueDate)}</div>}
        </div>
      </div>

      <div className="mt-3.5 h-[3px] w-[40px] rounded-full" style={{ background: 'linear-gradient(90deg,#6d28d9,#d946ef 62%,#fb923c)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <div className="rounded-[8px] bg-[#f6f5fa] p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9898a8]">Client</div>
          <div className="font-semibold">{client?.name ?? 'Client à choisir'}</div>
          {client?.contact && <div>{client.contact}</div>}
          <div className="text-[#5f5f70]">{client ? [client.address, client.city].filter(Boolean).join(', ') || '·' : '·'}</div>
          {pro && <div className={cn(!siren && 'font-medium text-[#dc2626]')}>SIREN {siren ? siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : 'à renseigner'}</div>}
        </div>
        <div className="rounded-[8px] bg-[#f6f5fa] p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9898a8]">Adresse de livraison / du chantier</div>
          <div>{delivery || '·'}</div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9898a8]">Opération</div>
          <div>{CATEGORY_LABEL[category]}</div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[#5f5f70]">
        {f.title && <span className="font-medium text-[#1d1d27]">{f.title}</span>}
        {devis && <span>Devis n° {devis.number}{devis.signedAt ? ` signé le ${dateFull(devis.signedAt)}` : ''}</span>}
        {original && <span>Annule et remplace la facture n° {original.number} du {dateFull(original.issueDate)}</span>}
        {extra.vatOnDebits && <span>Option pour le paiement de la taxe d’après les débits</span>}
      </div>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-b border-[#15122a] text-left text-[9px] uppercase tracking-[0.05em] text-[#5f5f70]">
            <th className="py-1.5 font-semibold">Désignation</th>
            <th className="w-[38px] py-1.5 text-right font-semibold">Qté</th>
            <th className="w-[64px] py-1.5 text-right font-semibold">PU HT</th>
            <th className="w-[34px] py-1.5 text-right font-semibold">TVA</th>
            <th className="w-[72px] py-1.5 text-right font-semibold">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {f.lines.map((l) => {
            if (l.kind === 'section') {
              lot = l.designation;
              return (
                <tr key={l.id} className="border-b border-[#ececf1]">
                  <td colSpan={5} className="pb-1 pt-2 font-semibold">{lot}</td>
                </tr>
              );
            }
            if (l.kind === 'texte') return (
              <tr key={l.id}><td colSpan={5} className="py-1 italic text-[#5f5f70]">{l.designation}</td></tr>
            );
            return (
              <tr key={l.id} className="border-b border-[#ececf1] align-top">
                <td className="py-1 pr-2">
                  {l.designation || <span className="text-[#9898a8]">Ligne sans désignation</span>}
                  {l.detail && <div className="text-[9.5px] text-[#9898a8]">{l.detail}</div>}
                </td>
                <td className="num py-1 text-right">{String(l.quantity).replace('.', ',')} {l.unit === 'forfait' ? '' : l.unit}</td>
                <td className="num py-1 text-right">{money(l.unitPriceHt)}</td>
                <td className="num py-1 text-right">{l.vatRate} %</td>
                <td className="num py-1 text-right">{sign}{money(l.quantity * l.unitPriceHt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <div className="w-[62%] min-w-[200px] space-y-0.5">
          <Tot label="Total HT" value={`${sign}${money(a.ht)}`} />
          {a.byVat.map((v) => (
            <Tot key={v.rate} label={`TVA ${v.rate} % sur ${money(v.base)}`} value={`${sign}${money(v.tva)}`} />
          ))}
          <Tot label="Total TTC" value={`${sign}${money(a.ttc)}`} strong />
          {a.retenue > 0 && <Tot label={`Retenue de garantie ${f.retenueGarantie} %`} value={`−${money(a.retenue)}`} />}
          {a.paid > 0 && <Tot label="Déjà réglé" value={`−${money(a.paid)}`} />}
          {f.kind !== 'avoir' && (
            <div className="mt-1 flex justify-between rounded-md bg-[#15122a] px-2 py-1.5 text-[11.5px] font-semibold text-white">
              <span>Net à payer</span>
              <span className="num">{money(a.remaining)}</span>
            </div>
          )}
        </div>
      </div>

      {f.kind !== 'avoir' && (
        <div className="mt-3 rounded-md border border-[#ececf1] p-2.5">
          <div className="font-semibold">Règlement</div>
          <div className="text-[#5f5f70]">
            {f.kind === 'acompte' ? 'Payable à réception' : `À régler avant le ${dateFull(f.dueDate)}`} par virement : IBAN {company.iban}
            {extra.paymentLink && <> · ou par carte, Apple Pay ou en 3 fois sur {extra.paymentLink.url.replace('https://', '')}</>}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-0.5 border-t border-[#ececf1] pt-2 text-[8.5px] leading-[1.5] text-[#5f5f70]">
        {pro ? (
          <>
            <p>En cas de retard de paiement, pénalités au taux de 3 fois le taux d’intérêt légal, exigibles dès le lendemain de l’échéance, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L. 441-10 et D. 441-5 du code de commerce).</p>
          </>
        ) : (
          <p>En cas de retard de paiement, intérêts au taux légal à compter de la mise en demeure.</p>
        )}
        <p>Pas d’escompte pour paiement anticipé.</p>
        {a.retenue > 0 && <p>Retenue de garantie de {f.retenueGarantie} % (loi n° 71-584 du 16 juillet 1971), libérable{extra.retenueReleaseDate ? ` le ${dateFull(extra.retenueReleaseDate)}` : ' un an après la réception des travaux'}, sauf réserves.</p>}
        {f.lines.some((l) => l.kind !== 'section' && l.vatRate === 10) && !pro && <p>TVA à 10 % : travaux d’amélioration dans un logement de plus de deux ans (art. 279-0 bis du CGI), attestation remise par le client.</p>}
        {company.decennale && <p>Assurance décennale : {company.decennale}, couverture France métropolitaine.</p>}
        <p>{company.legalName || company.name} · SIREN {sirenOf(company.siret)} · Facture électronique Factur-X (EN 16931).</p>
      </div>
    </div>
  );
}

function Tot({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t border-[#ececf1] pt-1 font-semibold')}>
      <span className={strong ? '' : 'text-[#5f5f70]'}>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

/** Copie imprimable (Ctrl+P / « Télécharger le PDF ») rendue hors de l'application. */
export function PrintableInvoice(props: PaperProps) {
  return createPortal(
    <div className="print-only">
      <style>{`.print-only{display:none}@media print{@page{size:A4;margin:14mm}body>*:not(.print-only){display:none!important}.print-only{display:block}.print-only .facture-paper{font-size:10pt}}`}</style>
      <InvoicePaper {...props} />
    </div>,
    document.body,
  );
}
