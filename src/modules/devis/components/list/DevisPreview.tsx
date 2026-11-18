import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { DEVIS_STATUS } from '@/lib/status';
import { useBrix } from '@/lib/store';
import { checkDevis, type FixTarget } from '../../checks';
import { flashField, useEditorFocus } from '../../focus';
import { devisDoc } from '../PdfDoc';
import { DocViewer } from '../viewer/DocViewer';

/** Aperçu plein écran d'un devis depuis la liste (ou n'importe quel écran). */
export function DevisPreview({ id, onClose }: { id: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const last = useRef(id);
  if (id) last.current = id;
  const d = useBrix((s) => s.devis.find((x) => x.id === last.current));
  const client = useBrix((s) => s.clients.find((c) => c.id === d?.clientId));
  const company = useBrix((s) => s.company);
  const user = useBrix((s) => s.user);
  const spec = useMemo(() => (d ? devisDoc({ d, client, company, signer: `${user.firstName} ${user.lastName}` }) : null), [d, client, company, user]);
  const checks = useMemo(() => (d ? checkDevis(d, client, company) : []), [d, client, company]);
  if (!d || !spec) return <DocViewer open={false} onClose={onClose} spec={{ blocks: [], footer: () => null }} kind="" reference="" />;
  const st = DEVIS_STATUS[d.status];
  const open = (q = '') => navigate(`/app/devis/${d.id}${q}`);
  const fix = (t: FixTarget) => {
    if (t === 'company') return navigate('/app/reglages');
    if (t === 'client') useEditorFocus.getState().request('client');
    open();
    if (t !== 'client') setTimeout(() => flashField(t), 700);
  };
  return (
    <DocViewer
      open={!!id}
      onClose={onClose}
      spec={spec}
      kind="Devis"
      reference={d.number}
      subtitle={[client?.name, d.title].filter(Boolean).join(' · ')}
      status={<Badge tone={st.tone}>{st.label}</Badge>}
      checks={d.status === 'signe' ? undefined : checks}
      onFix={fix}
      onEdit={() => open()}
      onSend={d.status === 'signe' || d.status === 'refuse' ? undefined : () => open('?envoyer=1')}
      sendLabel={d.status === 'brouillon' ? 'Envoyer' : 'Renvoyer'}
    />
  );
}
