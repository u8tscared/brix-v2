import { Download, RefreshCw, Share2, Upload } from 'lucide-react';
import { Badge, Button, Sheet, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull } from '@/lib/format';
import { docState, type Doc } from './store';

/** Fiche d'un document : aperçu de la pièce, validité, actions. */
export function DocSheet({ doc, onClose, onReplace, onFetch, onShare, fetching }: { doc: Doc | null; onClose: () => void; onReplace: (d: Doc) => void; onFetch: (d: Doc) => void; onShare: (d: Doc) => void; fetching: boolean }) {
  const company = useBrix((s) => s.company);
  const st = doc ? docState(doc) : null;
  return (
    <Sheet
      open={!!doc}
      onClose={onClose}
      title={doc?.label}
      subtitle={doc?.issuer}
      width={520}
      footer={
        doc && (
          <>
            <Button variant="ghost" icon={<Share2 />} onClick={() => onShare(doc)}>Partager</Button>
            <div className="flex-1" />
            {doc.auto ? (
              <Button variant="primary" icon={<RefreshCw />} loading={fetching} onClick={() => onFetch(doc)}>Récupérer la dernière</Button>
            ) : (
              <Button variant="primary" icon={<Upload />} onClick={() => onReplace(doc)}>Remplacer</Button>
            )}
          </>
        )
      }
    >
      {doc && st && (
        <div className="space-y-5 pt-3">
          <div className="relative mx-auto aspect-[1/1.3] w-full max-w-[300px] overflow-hidden -rotate-1 rounded-[12px] bg-white p-6 shadow-[0_0_0_1px_#ece8f6,0_30px_50px_-24px_rgba(60,30,120,.35)] transition-transform duration-500 ease-out-quint hover:rotate-0">
            <div className="flex items-start justify-between">
              <div className="h-2 w-20 rounded-full bg-[#15122a]/80" />
              <div className="h-6 w-6 rounded-full border-2 border-[#a78bfa]/50" />
            </div>
            <div className="mt-2 h-1.5 w-28 rounded-full bg-line2" />
            <div className="mt-6 text-[11px] font-semibold uppercase tracking-[.08em] text-ink">{doc.label}</div>
            <div className="mt-1 text-[9.5px] text-ink-2">{company.legalName || company.name} · SIRET {company.siret}</div>
            <div className="mt-4 space-y-1.5">
              {[92, 84, 96, 70, 88, 60, 80].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-[#efedf5]" style={{ width: `${w}%` }} />)}
            </div>
            <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
              <div className="text-[9px] text-ink-3">{doc.file}</div>
              <div className="h-8 w-14 -rotate-6 rounded-[6px] border-2 border-[#d946ef]/30" />
            </div>
          </div>

          <dl className="overflow-hidden rounded-card-sm bg-white shadow-halo">
            <Line label="État">{st.tone === 'ok' || st.tone === 'neutral' ? <Badge tone="ok" dot>À jour</Badge> : <Badge tone={st.tone === 'bad' ? 'bad' : 'warn'} dot>{st.label}</Badge>}</Line>
            {doc.expires && <Line label="Valable jusqu’au"><span className="num">{dateFull(doc.expires)}</span></Line>}
            {doc.renewMonths > 0 && <Line label="Renouvellement">tous les {doc.renewMonths >= 12 ? `${doc.renewMonths / 12} an${doc.renewMonths > 12 ? 's' : ''}` : `${doc.renewMonths} mois`}</Line>}
            <Line label="Fichier"><span className="truncate font-mono text-[12px]">{doc.file}</span></Line>
            {doc.updatedAt && <Line label="Mis à jour le"><span className="num">{dateFull(doc.updatedAt)}</span></Line>}
          </dl>

          {doc.auto && <p className="rounded-card-sm bg-dawn-pale px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">Brix AI récupère ce document tout seul sur le site officiel le jour où il expire. Vous n’avez rien à faire.</p>}

          <Button variant="secondary" className="w-full justify-center" icon={<Download />} onClick={() => toast(`${doc.file} téléchargé (démo)`)}>Télécharger le PDF</Button>
        </div>
      )}
    </Sheet>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-halo-line bg-white px-4 text-[13px] last:border-b-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}
