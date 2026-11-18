import { createPortal } from 'react-dom';
import type { Chantier, Client, Company } from '@/lib/types';
import { dateFull } from '@/lib/format';
import type { Pv } from '../../store';

export const addYears = (iso: string, y: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setFullYear(d.getFullYear() + y);
  return d.toISOString().slice(0, 10);
};

export const guarantees = (date: string) => [
  { label: 'Garantie de parfait achèvement', years: 1, until: addYears(date, 1), text: 'Tous les désordres signalés pendant un an.' },
  { label: 'Garantie biennale de bon fonctionnement', years: 2, until: addYears(date, 2), text: 'Équipements dissociables : appareillages, radiateurs, volets.' },
  { label: 'Garantie décennale', years: 10, until: addYears(date, 10), text: 'Dommages qui compromettent la solidité ou rendent l’ouvrage impropre à sa destination.' },
];

/** Le PV tel qu'il sera imprimé ou enregistré en PDF (A4). */
export function PvDocument({ pv, ch, client, company }: { pv: Pv; ch: Chantier; client?: Client; company: Company }) {
  const open = pv.reserves.filter((r) => !r.done);
  return (
    <div className="mx-auto w-full max-w-[720px] bg-white p-6 text-[12.5px] leading-relaxed text-ink sm:p-10 print:max-w-none print:p-0">
      <div className="flex items-start justify-between gap-6 border-b border-ink pb-4">
        <div>
          <div className="text-[15px] font-semibold">{company.name}</div>
          <div className="text-ink-2">{company.address}, {company.city}</div>
          <div className="text-ink-2">SIRET {company.siret} · {company.phone}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[18px] font-semibold">Procès-verbal de réception</div>
          <div className="text-ink-2">des travaux, article 1792-6 du Code civil</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Maître d’ouvrage</div>
          <div className="font-medium">{client?.name ?? pv.clientName}</div>
          <div className="text-ink-2">{client?.address}, {client?.city}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Chantier</div>
          <div className="font-medium">{ch.name}</div>
          <div className="text-ink-2">{ch.address}, {ch.city}</div>
        </div>
      </div>

      <p className="mt-5">
        Le maître d’ouvrage, après avoir visité les travaux réalisés par l’entreprise {company.name}, déclare que la réception est prononcée le <b>{dateFull(pv.date)}</b>{' '}
        {pv.withReserves && open.length ? <b>avec les réserves suivantes</b> : <b>sans réserve</b>}.
      </p>

      {pv.withReserves && open.length > 0 && (
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr className="border-b border-line2 text-left text-[11px] uppercase tracking-wide text-ink-3">
              <th className="py-1.5 pr-2">N°</th>
              <th className="py-1.5 pr-2">Réserve</th>
              <th className="py-1.5">Emplacement</th>
            </tr>
          </thead>
          <tbody>
            {open.map((r, i) => (
              <tr key={r.id} className="border-b border-halo-line align-top">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2">{r.text}</td>
                <td className="py-1.5">{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pv.withReserves && open.length > 0 && <p className="mt-2 text-ink-2">L’entreprise s’engage à lever ces réserves dans un délai de 30 jours.</p>}

      <div className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Point de départ des garanties</div>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          {guarantees(pv.date).map((g) => (
            <tr key={g.label} className="border-b border-halo-line">
              <td className="py-1.5 pr-2">{g.label} ({g.years} an{g.years > 1 ? 's' : ''})</td>
              <td className="py-1.5 text-right">jusqu’au {dateFull(g.until)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-ink-2">Assurance décennale : {company.decennale || 'à compléter'}.</p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        {(['client', 'artisan'] as const).map((k) => (
          <div key={k}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{k === 'client' ? 'Le maître d’ouvrage' : 'L’entreprise'}</div>
            <div className="text-ink-2">{k === 'client' ? pv.clientName : company.name}</div>
            <div className="mt-1 grid h-24 place-items-center rounded-lg border border-halo-line">
              {pv.signatures[k] ? <img src={pv.signatures[k]} alt={`Signature ${k}`} className="max-h-full" /> : <span className="text-ink-3">Signature</span>}
            </div>
            <div className="mt-1 text-ink-3">Le {dateFull(pv.signedAt ?? pv.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Copie du PV rendue uniquement à l'impression (window.print → « Enregistrer en PDF »). */
export function PvPrintPortal(props: Parameters<typeof PvDocument>[0]) {
  return createPortal(
    <>
      <style>{`@media print { body > *:not(#pv-print) { display: none !important; } #pv-print { display: block !important; } @page { size: A4; margin: 16mm; } }`}</style>
      <div id="pv-print" className="hidden">
        <PvDocument {...props} />
      </div>
    </>,
    document.body,
  );
}
