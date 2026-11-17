import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Eye, Loader2, MoreHorizontal, Send } from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { DEVIS_STATUS } from '@/lib/status';
import type { Client, Company, Devis } from '@/lib/types';
import { Menu, type MenuItem } from './bits';
import { PdfDoc } from './PdfDoc';

interface Props {
  d: Devis;
  saving: boolean;
  menu: MenuItem[];
  onPreview: () => void;
  previewActive?: boolean;
  onMain: () => void;
  mainLabel: string;
  phone: boolean;
  onBack: () => void;
}

export function TopBar({ d, saving, menu, onPreview, previewActive, onMain, mainLabel, phone, onBack }: Props) {
  const st = DEVIS_STATUS[d.status];
  const saved = (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-3" aria-live="polite">
      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      {saving ? 'Enregistrement…' : 'Enregistré'}
    </span>
  );
  const more = (
    <Menu
      items={menu}
      trigger={({ toggle }) => (
        <Button variant="secondary" size={phone ? 'icon' : 'icon-sm'} onClick={toggle} aria-label="Plus d’actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}
    />
  );
  if (phone)
    return (
      <div className="sticky top-14 z-20 flex h-14 items-center gap-2 border-b border-line/70 bg-page/90 px-2 backdrop-blur-xl">
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full text-ink" aria-label="Retour aux devis">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="num truncate text-[14px] font-semibold">{d.number}</span>
            <Badge tone={st.tone}>{d.status === 'vu' ? 'Vu' : st.label}</Badge>
          </div>
          {saved}
        </div>
        <Button variant="secondary" size="icon" onClick={onPreview} aria-label="Aperçu du devis">
          <Eye className="h-4 w-4" />
        </Button>
        {more}
      </div>
    );
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-5 lg:px-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-[13.5px]" aria-label="Fil d’Ariane">
        <Link to="/app/devis" className="text-ink-2 hover:text-ink">
          Devis
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
        <span className="num truncate font-medium">{d.number}</span>
      </nav>
      <Badge tone={st.tone}>{st.label}</Badge>
      <span className="hidden sm:inline-flex">{saved}</span>
      <div className="flex-1" />
      <Button variant={previewActive ? 'soft' : 'secondary'} size="sm" icon={<Eye className="h-4 w-4" />} onClick={onPreview} aria-pressed={previewActive}>
        Aperçu
      </Button>
      {more}
      <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={onMain} className="h-9 px-3.5">
        {mainLabel}
      </Button>
    </div>
  );
}

/** Version imprimable : seul le document est imprimé (Ctrl+P ou « Télécharger le PDF »). */
export function PrintPortal({ d, client, company, signer }: { d: Devis; client?: Client; company: Company; signer?: string }) {
  return createPortal(
    <div id="devis-print" className={cn('hidden')}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body > *:not(#devis-print) { display: none !important; }
          #devis-print { display: block !important; }
          #devis-print .pdf-doc { min-height: 297mm; width: 210mm; padding: 14mm 14mm 10mm; }
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <PdfDoc d={d} client={client} company={company} signer={signer} />
    </div>,
    document.body,
  );
}
