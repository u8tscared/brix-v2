// Facture au format A4, découpée en blocs pour la mise en pages (mêmes pages à l'écran,
// dans le visionneur et à l'impression). Toutes les mentions obligatoires (réforme 2026).

import type { ReactNode } from 'react';
import { dateFull, money } from '@/lib/format';
import { DocFooter } from '@/modules/devis/components/PdfDoc';
import type { DocBlock, DocSpec } from '@/modules/devis/components/doc/PagedDoc';
import { amounts, CATEGORY_LABEL, sirenOf } from '../lib/model';
import type { PaperProps } from './InvoicePaper';

const GRID = 'grid grid-cols-[minmax(0,1fr)_60px_80px_44px_86px] gap-x-2';
const MUTED = 'text-[#5f5f70]';
const LABEL = 'text-[9px] font-semibold uppercase tracking-[.1em] text-[#9898a8]';

export const INVOICE_TITLE: Record<PaperProps['f']['kind'], string> = {
  facture: 'Facture',
  acompte: "Facture d'acompte",
  situation: 'Situation de travaux',
  solde: 'Facture de solde',
  avoir: 'Avoir',
};

export function invoiceDoc({ f, company, client, extra, devis, chantier, original }: PaperProps): DocSpec {
  const a = amounts(f);
  const pro = client?.kind === 'pro';
  const siren = sirenOf(extra.clientSiren || client?.siret);
  const delivery = extra.deliveryAddress || (chantier ? [chantier.address, chantier.city].filter(Boolean).join(', ') : client ? [client.address, client.city].filter(Boolean).join(', ') : '');
  const sign = a.sign === -1 ? '−' : '';
  const title = `${INVOICE_TITLE[f.kind]}${f.kind === 'situation' && extra.situation ? ` n°${extra.situation.index}` : ''}`;
  const blocks: DocBlock[] = [];

  blocks.push({
    key: 'head',
    node: (
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#15122a] text-[13px] font-semibold text-white">{company.logoInitials || company.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">{company.name}</div>
            <div className={`mt-0.5 text-[10.5px] leading-[1.55] ${MUTED}`}>
              {company.address}, {company.city}
              <br />
              {company.phone} · {company.email}
              <br />
              SIRET {company.siret} · TVA {company.vatNumber}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`${title.length > 14 ? 'text-[20px]' : 'text-[26px]'} font-semibold leading-none tracking-[-0.03em]`}>{title}</div>
          <div className="mt-1.5 font-mono text-[11px] font-medium">{f.number}</div>
          <div className={`mt-1 text-[10.5px] leading-[1.55] ${MUTED}`}>
            Émise le {dateFull(f.issueDate)}
            {f.kind !== 'avoir' && (
              <>
                <br />
                Échéance le {dateFull(f.dueDate)}
              </>
            )}
          </div>
        </div>
      </div>
    ),
  });

  blocks.push({
    key: 'dawn',
    gap: 16,
    node: <div className="h-[3px] w-[44px] rounded-full" style={{ background: 'linear-gradient(90deg,#6d28d9,#d946ef 62%,#fb923c)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />,
  });

  blocks.push({
    key: 'parties',
    gap: 16,
    node: (
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[8px] bg-[#f6f5fa] p-3.5">
          <div className={LABEL}>Facturé à</div>
          <div className="mt-1.5">
            <b className={`text-[12px] font-semibold ${client ? '' : 'text-[#c2410c]'}`}>{client?.name ?? 'Client à choisir'}</b>
            {client?.contact && <div>{client.contact}</div>}
            <div>{client ? [client.address, client.city].filter(Boolean).join(', ') : ''}</div>
            {pro && <div className={siren ? MUTED : 'font-medium text-[#dc2626]'}>SIREN {siren ? siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : 'à renseigner'}</div>}
          </div>
        </div>
        <div className="rounded-[8px] border border-[#ececf1] p-3.5">
          <div className={LABEL}>Adresse du chantier</div>
          <div className="mt-1.5">{delivery || 'À préciser'}</div>
          <div className={`mt-2 ${LABEL}`}>Opération</div>
          <div className="mt-0.5">{CATEGORY_LABEL[extra.category ?? 'services']}</div>
        </div>
      </div>
    ),
  });

  const refs = [f.title && <b key="t" className="font-semibold text-[#1d1d27]">{f.title}</b>, devis && <span key="d">Devis n° {devis.number}{devis.signedAt ? ` signé le ${dateFull(devis.signedAt.slice(0, 10))}` : ''}</span>, original && <span key="o">Annule et remplace la facture n° {original.number} du {dateFull(original.issueDate)}</span>, extra.vatOnDebits && <span key="v">Option pour le paiement de la taxe d’après les débits</span>].filter(Boolean);
  if (refs.length) blocks.push({ key: 'refs', gap: 14, node: <div className={`flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] ${MUTED}`}>{refs}</div> });

  f.lines.forEach((l, i) => {
    const first = i === 0 ? 18 : 0;
    if (l.kind === 'section')
      blocks.push({ key: l.id, row: true, keepWithNext: true, gap: first || 6, node: <div className="border-b border-[#15122a]/70 pb-1 pt-2.5 text-[11.5px] font-semibold">{l.designation.replace(/^lot\s*\d*\s*[·:.-]\s*/i, '')}</div> });
    else if (l.kind === 'texte') blocks.push({ key: l.id, row: true, gap: first, node: <div className={`border-b border-[#ececf1] py-1.5 text-[10.5px] italic ${MUTED}`}>{l.designation}</div> });
    else
      blocks.push({
        key: l.id,
        row: true,
        gap: first,
        node: (
          <div className={`${GRID} border-b border-[#ececf1] py-1.5 text-[10.5px]`}>
            <span className="pr-2">
              {l.designation || <span className="text-[#c2410c]">Ligne sans désignation</span>}
              {l.detail && <span className="block text-[9px] text-[#9898a8]">{l.detail}</span>}
            </span>
            <span className="num text-right">
              {String(l.quantity).replace('.', ',')} {l.unit === 'forfait' ? 'fft' : l.unit}
            </span>
            <span className={`num text-right ${l.unitPriceHt < 0 ? 'text-[#6d28d9]' : ''}`}>{money(l.unitPriceHt)}</span>
            <span className="num text-right">{String(l.vatRate).replace('.', ',')} %</span>
            <span className={`num text-right font-medium ${l.unitPriceHt < 0 ? 'text-[#6d28d9]' : ''}`}>
              {sign}
              {money(l.quantity * l.unitPriceHt)}
            </span>
          </div>
        ),
      });
  });
  if (!f.lines.length) blocks.push({ key: 'empty', gap: 18, node: <div className="rounded-[8px] border border-dashed border-[#dfdce9] py-8 text-center text-[#9898a8]">Ajoutez des lignes : elles apparaissent ici en direct.</div> });

  blocks.push({
    key: 'totals',
    gap: 18,
    node: (
      <div className="flex justify-end">
        <div className="w-[300px] text-[11px]">
          <Tot label="Total HT" value={`${sign}${money(a.ht)}`} />
          {a.byVat.map((v) => (
            <Tot key={v.rate} label={`TVA ${String(v.rate).replace('.', ',')} % sur ${money(v.base)}`} value={`${sign}${money(v.tva)}`} />
          ))}
          <Tot label="Total TTC" value={`${sign}${money(a.ttc)}`} strong />
          {a.retenue > 0 && <Tot label={`Retenue de garantie ${f.retenueGarantie} %`} value={`−${money(a.retenue)}`} />}
          {a.paid > 0 && <Tot label="Déjà réglé" value={`−${money(a.paid)}`} />}
          {f.kind !== 'avoir' && (
            <div className="mt-1.5 flex items-baseline justify-between rounded-[8px] bg-[#15122a] px-3 py-2 text-white">
              <span className="text-[11.5px] font-medium">Net à payer</span>
              <span className="num text-[15px] font-semibold tracking-[-0.01em]">{money(a.remaining)}</span>
            </div>
          )}
        </div>
      </div>
    ),
  });

  if (f.kind !== 'avoir')
    blocks.push({
      key: 'pay',
      gap: 18,
      node: (
        <div className="rounded-[8px] border border-[#ececf1] p-3 text-[10.5px]">
          <div className="font-semibold">Règlement</div>
          <div className={MUTED}>
            {f.kind === 'acompte' ? 'Payable à réception' : `À régler avant le ${dateFull(f.dueDate)}`} par virement : IBAN {company.iban}
            {extra.paymentLink && <> · ou par carte, Apple Pay ou en 3 fois sur {extra.paymentLink.url.replace('https://', '')}</>}
          </div>
        </div>
      ),
    });

  blocks.push({
    key: 'legal',
    gap: 16,
    node: (
      <div className={`space-y-0.5 border-t border-[#ececf1] pt-2 text-[9px] leading-[1.55] ${MUTED}`}>
        {pro ? <p>En cas de retard de paiement, pénalités au taux de 3 fois le taux d’intérêt légal, exigibles dès le lendemain de l’échéance, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L. 441-10 et D. 441-5 du code de commerce).</p> : <p>En cas de retard de paiement, intérêts au taux légal à compter de la mise en demeure.</p>}
        <p>Pas d’escompte pour paiement anticipé.</p>
        {a.retenue > 0 && <p>Retenue de garantie de {f.retenueGarantie} % (loi n° 71-584 du 16 juillet 1971), libérable{extra.retenueReleaseDate ? ` le ${dateFull(extra.retenueReleaseDate)}` : ' un an après la réception des travaux'}, sauf réserves.</p>}
        {f.lines.some((l) => l.kind !== 'section' && l.vatRate === 10) && !pro && <p>TVA à 10 % : travaux d’amélioration dans un logement de plus de deux ans (art. 279-0 bis du CGI), attestation remise par le client.</p>}
        {company.decennale && <p>Assurance décennale : {company.decennale}, couverture France métropolitaine.</p>}
        <p>{company.legalName || company.name} · SIREN {sirenOf(company.siret)} · Facture électronique Factur-X (EN 16931).</p>
      </div>
    ),
  });

  return {
    blocks,
    tableHead: (
      <div className={`${GRID} border-b-[1.5px] border-[#15122a] pb-1.5 text-[9px] font-semibold uppercase tracking-[.08em] ${MUTED}`}>
        <span>Désignation</span>
        <span className="text-right">Qté</span>
        <span className="text-right">PU HT</span>
        <span className="text-right">TVA</span>
        <span className="text-right">Total HT</span>
      </div>
    ),
    running: (
      <div className="flex items-center justify-between border-b border-[#ececf1] pb-2 text-[10px] text-[#9898a8]">
        <span className="font-medium text-[#1d1d27]">{company.name}</span>
        <span>
          {INVOICE_TITLE[f.kind]} <span className="font-mono">{f.number}</span> · {client?.name ?? ''}
        </span>
      </div>
    ),
    footer: (page, total) => <DocFooter company={company} page={page} total={total} />,
  };
}

function Tot({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-[3px] ${strong ? 'mt-0.5 border-t border-[#ececf1] pt-1.5 font-semibold text-[#15122a]' : MUTED}`}>
      <span>{label}</span>
      <span className="num shrink-0 text-[#15122a]">{value}</span>
    </div>
  );
}
