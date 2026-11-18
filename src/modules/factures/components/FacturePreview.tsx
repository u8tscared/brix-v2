import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrix } from '@/lib/store';
import type { FixTarget } from '@/modules/devis/checks';
import { flashField } from '@/modules/devis/focus';
import { DocViewer } from '@/modules/devis/components/viewer/DocViewer';
import { amounts, liveStatus } from '../lib/model';
import { StatusBadge } from './bits';
import { INVOICE_TITLE } from './invoiceDoc';
import { useInvoiceModel } from './useInvoiceModel';

/** Aperçu plein écran d'une facture depuis la liste, sans ouvrir la fiche. */
export function FacturePreview({ id, onClose }: { id: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const last = useRef(id);
  if (id) last.current = id;
  const f = useBrix((s) => s.factures.find((x) => x.id === last.current));
  const { client, spec, checks } = useInvoiceModel(f);
  if (!f || !spec) return <DocViewer open={false} onClose={onClose} spec={{ blocks: [], footer: () => null }} kind="" reference="" />;

  const draft = f.status === 'brouillon';
  const a = amounts(f);
  const go = (q = '') => navigate(`/app/factures/${f.id}${q}`);
  const fix = (t: FixTarget) => {
    if (t === 'company') return navigate('/app/reglages');
    go();
    setTimeout(() => flashField(t), 700);
  };
  const send = draft || f.kind === 'avoir' ? { label: draft ? 'Émettre et envoyer' : 'Envoyer', q: '?envoyer=1' } : a.remaining > 0 ? (liveStatus(f) === 'en_retard' ? { label: 'Relancer', q: '?relancer=1' } : { label: 'Paiement reçu', q: '?encaisser=1' }) : null;

  return (
    <DocViewer
      open={!!id}
      onClose={onClose}
      spec={spec}
      kind={INVOICE_TITLE[f.kind]}
      reference={f.number}
      subtitle={[client?.name, f.title].filter(Boolean).join(' · ')}
      status={<StatusBadge status={liveStatus(f)} />}
      checks={draft ? checks : undefined}
      onFix={fix}
      onEdit={() => go()}
      editLabel={draft ? 'Modifier' : 'Ouvrir'}
      onSend={send ? () => go(send.q) : undefined}
      sendLabel={send?.label}
    />
  );
}
