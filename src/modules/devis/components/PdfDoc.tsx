// Document « devis » au format A4 (794 px de large), fidèle à un vrai devis français.
// Utilisé pour l'aperçu (mis à l'échelle) et pour l'impression / PDF (window.print).

import type { Client, Company, Devis } from '@/lib/types';
import { dateFull, money, num, pct, totals } from '@/lib/format';
import { expiryDate, groupLots, lotName } from '../logic';

const vatLabel = (r: number) => pct(r, r % 1 ? 1 : 0);

export function PdfDoc({ d, client, company, signer }: { d: Devis; client?: Client; company: Company; signer?: string }) {
  const t = totals(d.lines);
  const lots = groupLots(d.lines);
  const deposit = (t.ttc * d.depositPercent) / 100;
  const aides = (d.aides ?? []).reduce((s, a) => s + a.amount, 0);
  const particulier = client?.kind !== 'pro';
  const reduced = t.byVat.some((v) => v.rate === 10 || v.rate === 5.5);
  const issue = (d.sentAt ?? d.createdAt).slice(0, 10);
  return (
    <div className="pdf-doc relative flex min-h-[1123px] w-[794px] flex-col bg-white px-[56px] pb-[40px] pt-[52px] font-sans text-[11.5px] leading-[1.45] text-[#1d1d27]">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#17171f] text-[13px] font-bold text-white">{company.logoInitials || company.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="text-[14px] font-semibold">{company.name || 'Votre entreprise'}</div>
            <div className="text-[10.5px] text-[#5f5f70]">
              {company.address}, {company.city}
              <br />
              {company.phone} · {company.email}
              <br />
              SIRET {company.siret || '—'} · TVA {company.vatNumber || '—'}
              {company.rge && (
                <>
                  <br />
                  Entreprise qualifiée RGE
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[22px] font-semibold tracking-[-0.02em]">DEVIS</div>
          <div className="num text-[11px] text-[#5f5f70]">
            n° {d.number}
            <br />
            du {dateFull(issue)}
            <br />
            valable jusqu'au {dateFull(expiryDate(d))}
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="mt-7 grid grid-cols-2 gap-5">
        <div className="rounded-md border border-[#ececf1] p-3">
          <div className="text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#9898a8]">Client</div>
          {client ? (
            <div className="mt-1">
              <b className="font-semibold">{client.name}</b>
              {client.contact && <div>À l'attention de {client.contact}</div>}
              <div>{client.address}</div>
              <div>{client.city}</div>
              {client.siret && <div className="text-[10.5px] text-[#5f5f70]">SIRET {client.siret}</div>}
            </div>
          ) : (
            <div className="mt-1 text-[#9898a8]">Client à choisir</div>
          )}
        </div>
        <div className="rounded-md border border-[#ececf1] p-3">
          <div className="text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#9898a8]">Objet et lieu des travaux</div>
          <div className="mt-1">
            <b className="font-semibold">{d.title}</b>
            <div>{client ? [client.address, client.city].filter(Boolean).join(', ') || '—' : '—'}</div>
            <div className="text-[10.5px] text-[#5f5f70]">Durée estimée : {((n) => `${n} jour${n > 1 ? 's' : ''} ouvré${n > 1 ? 's' : ''}`)(Math.max(1, Math.ceil(d.lines.filter((l) => l.unit === 'h').reduce((s, l) => s + l.quantity, 0) / 14)))} · démarrage à convenir</div>
          </div>
        </div>
      </div>

      {/* Lignes */}
      <table className="mt-6 w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="border-b-[1.5px] border-[#17171f] text-left text-[9.5px] uppercase tracking-[.06em] text-[#5f5f70]">
            <th className="py-1.5 font-semibold">Désignation</th>
            <th className="w-[46px] py-1.5 text-right font-semibold">Qté</th>
            <th className="w-[44px] py-1.5 pl-2 font-semibold">U.</th>
            <th className="w-[74px] py-1.5 text-right font-semibold">PU HT</th>
            <th className="w-[44px] py-1.5 text-right font-semibold">TVA</th>
            <th className="w-[82px] py-1.5 text-right font-semibold">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot, li) => (
            <LotRows key={lot.section?.id ?? `nolot${li}`} lot={lot} />
          ))}
        </tbody>
      </table>
      {!t.ht && <div className="py-6 text-center text-[#9898a8]">Ajoutez des lignes : elles apparaissent ici en direct.</div>}

      {/* Totaux */}
      <div className="mt-5 flex justify-end break-inside-avoid">
        <div className="w-[300px] text-[11px]">
          <Tot label="Total HT" value={money(t.ht)} />
          {t.byVat.map((v) => (
            <Tot key={v.rate} label={`TVA ${vatLabel(v.rate)} sur ${money(v.base)}`} value={money(v.tva)} />
          ))}
          <div className="mt-1 flex justify-between border-t-[1.5px] border-[#17171f] pt-1.5 text-[13px] font-semibold">
            <span>Total TTC</span>
            <span className="num">{money(t.ttc)}</span>
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

      {/* Conditions et mentions */}
      <div className="mt-6 grid grid-cols-2 gap-5 break-inside-avoid text-[9.5px] leading-[1.5] text-[#5f5f70]">
        <div>
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#17171f]">Conditions</div>
          Devis gratuit, valable {d.validityDays} jours. Acompte de {d.depositPercent} % à la signature, solde à réception des travaux, payable par virement ou carte bancaire. Prix fermes pendant la durée de validité.
          {particulier ? ' Pas d’escompte pour paiement anticipé.' : ' Pénalités de retard : 3 fois le taux d’intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €. Pas d’escompte pour paiement anticipé.'}
          {particulier && ' En cas de vente hors établissement, vous disposez d’un délai de rétractation de 14 jours (art. L221-18 du Code de la consommation). Médiateur de la consommation : CM2C, 49 rue de Ponthieu, 75008 Paris.'}
          {aides > 0 && ' * Aides indicatives, sous réserve d’éligibilité, versées par les organismes et non par l’entreprise.'}
        </div>
        <div>
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#17171f]">Assurance et garanties</div>
          Assurance décennale : {company.decennale || 'à renseigner dans vos réglages'}. Couverture : France métropolitaine. Garantie de parfait achèvement (1 an) et garantie biennale de bon fonctionnement (2 ans).
          {reduced && particulier && (
            <div className="mt-2 rounded border border-[#ececf1] p-2 text-[#1d1d27]">
              <b className="font-semibold">Attestation TVA à taux réduit.</b> Le client atteste que les travaux portent sur un logement achevé depuis plus de deux ans, affecté à l’habitation, et qu’ils ne conduisent pas à une construction neuve (art. 279-0 bis et 278-0 bis A du CGI).
            </div>
          )}
        </div>
      </div>

      {/* Signature */}
      <div className="mt-6 grid grid-cols-2 gap-5 break-inside-avoid">
        <div className="rounded-md border border-[#ececf1] p-3 text-[10px] text-[#5f5f70]">
          <b className="font-semibold text-[#1d1d27]">L’entreprise</b>
          <div className="mt-1">{company.legalName || company.name}</div>
          <div className="mt-4 font-display text-[15px] italic text-[#1d1d27]">{signer}</div>
        </div>
        <div className="rounded-md border border-[#ececf1] p-3 text-[10px] text-[#5f5f70]">
          <b className="font-semibold text-[#1d1d27]">Bon pour accord, le client</b>
          <div className="mt-1">Date, signature précédée de la mention « Bon pour accord »</div>
          {d.status === 'signe' && d.signedAt ? (
            <div className="mt-2 inline-block rounded border border-[#c9f0d6] bg-[#ecfdf3] px-2 py-1 text-[10px] font-medium text-[#16a34a]">
              Signé électroniquement le {dateFull(d.signedAt.slice(0, 10))} · {client?.name}
            </div>
          ) : (
            <div className="mt-2 h-9" />
          )}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-[#ececf1] pt-3 text-[8.5px] text-[#9898a8]">
        <span>
          {company.legalName || company.name} · SIRET {company.siret} · TVA intracommunautaire {company.vatNumber} · IBAN {company.iban}
        </span>
        <span className="shrink-0 pl-4">Établi avec Brix</span>
      </div>
    </div>
  );
}

function LotRows({ lot }: { lot: ReturnType<typeof groupLots>[number] }) {
  return (
    <>
      {lot.section && (
        <tr className="break-inside-avoid border-b border-[#17171f]/70">
          <td colSpan={5} className="pb-1 pt-3 text-[11px] font-semibold">
            {lot.section.designation.startsWith('Lot') ? lot.section.designation : `Lot · ${lotName(lot.section.designation)}`}
          </td>
          <td className="num pb-1 pt-3 text-right text-[11px] font-semibold">{money(lot.ht)}</td>
        </tr>
      )}
      {lot.items.map((l) =>
        l.kind === 'texte' ? (
          <tr key={l.id} className="border-b border-[#ececf1]">
            <td colSpan={6} className="py-1.5 italic text-[#5f5f70]">
              {l.designation}
            </td>
          </tr>
        ) : (
          <tr key={l.id} className="break-inside-avoid border-b border-[#ececf1] align-top">
            <td className="py-1.5 pr-2">
              {l.designation}
              {(l.supplierRef || (l.detail && !/bob/i.test(l.detail))) && <div className="text-[9px] text-[#9898a8]">{l.supplierRef ?? l.detail}</div>}
            </td>
            <td className="num py-1.5 text-right">{num(l.quantity)}</td>
            <td className="py-1.5 pl-2">{l.unit}</td>
            <td className="num py-1.5 text-right">{money(l.unitPriceHt)}</td>
            <td className="num py-1.5 text-right">{vatLabel(l.vatRate)}</td>
            <td className="num py-1.5 text-right">{money(l.quantity * l.unitPriceHt)}</td>
          </tr>
        ),
      )}
    </>
  );
}

function Tot({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-[3px] ${bold ? 'font-semibold text-[#17171f]' : 'text-[#5f5f70]'}`}>
      <span>{label}</span>
      <span className="num shrink-0 text-[#17171f]">{value}</span>
    </div>
  );
}
