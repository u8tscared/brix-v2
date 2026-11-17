import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BellRing, Copy, Expand, FileCode2, FileMinus2, FileSignature, Link2, Printer, Send, Trash2, Wallet } from 'lucide-react';
import { Button, EmptyState, Segmented, UnderlineTabs, toast } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { PageLoader } from '@/components/layout/AppShell';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import type { FixTarget } from '@/modules/devis/checks';
import { printDoc } from '@/modules/devis/components/doc/print';
import { SavedPill } from '@/modules/devis/components/TopBar';
import { DocViewer } from '@/modules/devis/components/viewer/DocViewer';
import { flashField } from '@/modules/devis/focus';
import { EDot, KindBadge, StatusBadge } from './components/bits';
import { CreateFromDevisSheet } from './components/CreateFromDevisSheet';
import { EInvoicePanel } from './components/EInvoicePanel';
import { DetailTotals, ScaledInvoice } from './components/DetailParts';
import { INVOICE_TITLE } from './components/invoiceDoc';
import { useInvoiceModel } from './components/useInvoiceModel';
import { LineEditor } from './components/LineEditor';
import { MetaForm } from './components/MetaForm';
import { MoreMenu } from './components/MoreMenu';
import { PaymentLinkSheet, RecordPaymentSheet } from './components/PaymentSheets';
import { PaymentPanel } from './components/PaymentPanel';
import { ReminderSheet } from './components/ReminderSheet';
import { SendSheet } from './components/SendSheet';
import { blankFacture, buildAvoir } from './lib/billing';
import { buildFacturX, downloadText } from './lib/facturx';
import { amounts, liveStatus } from './lib/model';
import { buildUbl } from './lib/ubl';
import { useFactures } from './store';

export default function FactureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const f = useBrix((s) => s.factures.find((x) => x.id === id));

  useEffect(() => {
    if (id !== 'nouvelle') return;
    const s = useBrix.getState();
    const draft = blankFacture(s.nextNumber('facture'), '', s.company.defaultVat || 10);
    s.upsertFacture(draft);
    useFactures.getState().setExtra(draft.id, { category: 'services' });
    navigate(`/app/factures/${draft.id}`, { replace: true });
  }, [id]);

  if (id === 'nouvelle')
    return (
      <div className="p-6">
        <PageLoader />
      </div>
    );
  if (!f)
    return (
      <div className="p-6">
        <EmptyState title="Facture introuvable" text="Elle a peut-être été supprimée." action={<Button onClick={() => navigate('/app/factures')}>Retour aux factures</Button>} />
      </div>
    );
  return <Detail key={f.id} f={f} />;
}

type Side = 'apercu' | 'paiement' | 'efacture';
type Tab = 'facture' | Side;

function Detail({ f }: { f: Facture }) {
  const navigate = useNavigate();
  const s = useBrix();
  const fx = useFactures();
  const wide = useMediaQuery('(min-width: 1280px)');
  const { client, devis, original, pro, extra, input: maybeInput, missing, spec: docSpec, checks } = useInvoiceModel(f);
  const input = maybeInput!;
  const spec = docSpec!;
  const draft = f.status === 'brouillon';
  const st = liveStatus(f);
  const a = amounts(f);

  const [side, setSide] = useState<Side>(draft ? 'apercu' : st === 'payee' ? 'efacture' : 'paiement');
  const [tab, setTab] = useState<Tab>('facture');
  const [sheet, setSheet] = useState<null | 'pay' | 'link' | 'remind' | 'send' | 'devis'>(null);
  const [viewer, setViewer] = useState(false);
  const close = () => setSheet(null);

  // Arrivée depuis la liste : ?apercu=1, ?envoyer=1, ?encaisser=1, ?relancer=1
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const open = params.get('apercu') ? 'viewer' : params.get('envoyer') ? 'send' : params.get('encaisser') ? 'pay' : params.get('relancer') ? 'remind' : null;
    if (!open) return;
    if (open === 'viewer') setViewer(true);
    else setSheet(open);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (p: Partial<Facture>) => s.upsertFacture({ ...f, ...p });
  const download = (fmt: 'cii' | 'ubl') => {
    downloadText(`${f.number}-${fmt === 'cii' ? 'factur-x' : 'ubl'}.xml`, fmt === 'cii' ? buildFacturX(input) : buildUbl(input));
    toast(fmt === 'cii' ? 'Fichier Factur-X téléchargé' : 'Fichier UBL téléchargé');
  };
  const print = () => {
    toast('Choisissez « Enregistrer au format PDF » pour le télécharger', 'info');
    printDoc(spec, `${INVOICE_TITLE[f.kind]} ${f.number}`);
  };
  const avoir = () => {
    const n = buildAvoir(f, s.nextNumber('facture'));
    s.upsertFacture(n);
    fx.setExtra(n.id, { creditOf: f.id, category: extra.category, deliveryAddress: extra.deliveryAddress, clientSiren: extra.clientSiren });
    toast(`Avoir ${n.number} créé en brouillon : ajustez les lignes à annuler`);
    navigate(`/app/factures/${n.id}`);
  };
  const duplicate = () => {
    const n = { ...blankFacture(s.nextNumber('facture'), f.clientId, s.company.defaultVat), title: f.title, lines: f.lines.map((l) => ({ ...l, id: `${l.id}_c${Date.now().toString(36)}` })) };
    s.upsertFacture(n);
    fx.setExtra(n.id, { category: extra.category, deliveryAddress: extra.deliveryAddress });
    navigate(`/app/factures/${n.id}`);
  };
  const fix = (t: FixTarget) => {
    if (t === 'company') return navigate('/app/reglages');
    setTab('facture');
    setTimeout(() => flashField(t === 'lines' ? 'lines' : t), 80);
  };
  const openSend = () => {
    if (!f.clientId) return toast('Choisissez d’abord un client', 'warn');
    setViewer(false);
    setSheet('send');
  };

  // Raccourcis : P aperçu, Ctrl+P impression
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const typing = /input|textarea|select/i.test((e.target as HTMLElement).tagName);
      if (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        print();
      } else if (e.key.toLowerCase() === 'p' && !typing && !e.altKey) setViewer(true);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // Action principale selon l'état de la facture.
  const primary = draft
    ? { label: 'Émettre et envoyer', short: 'Émettre', icon: <Send className="h-4 w-4" />, run: openSend }
    : f.kind === 'avoir'
      ? { label: 'Envoyer l’avoir', short: 'Envoyer', icon: <Send className="h-4 w-4" />, run: openSend }
      : a.remaining > 0
        ? { label: 'Paiement reçu', short: 'Encaisser', icon: <Wallet className="h-4 w-4" />, run: () => setSheet('pay') }
        : null;

  const menu = [
    { label: 'Aperçu plein écran', icon: <Expand />, onClick: () => setViewer(true) },
    { label: 'Imprimer ou télécharger le PDF', icon: <Printer />, onClick: print },
    { label: 'Fichier Factur-X (XML)', icon: <FileCode2 />, onClick: () => download('cii') },
    { label: 'Renvoyer au client', icon: <Send />, onClick: openSend, hidden: draft },
    { label: 'Lien de paiement', icon: <Link2 />, onClick: () => setSheet('link'), hidden: draft || a.remaining <= 0 },
    { label: 'Relancer', icon: <BellRing />, onClick: () => setSheet('remind'), hidden: draft || a.remaining <= 0 },
    { label: 'Facturer un devis signé', icon: <FileSignature />, onClick: () => setSheet('devis'), hidden: !draft },
    { label: 'Dupliquer', icon: <Copy />, onClick: duplicate },
    { label: 'Créer un avoir', icon: <FileMinus2 />, onClick: avoir, hidden: draft || f.kind === 'avoir' },
    { label: 'Supprimer le brouillon', icon: <Trash2 />, danger: true, hidden: !draft, onClick: () => (update({ status: 'annulee' }), toast('Brouillon supprimé'), navigate('/app/factures')) },
  ];

  const sidePanels: Record<Side, React.ReactNode> = {
    apercu: (
      <div className="space-y-3">
        <ScaledInvoice spec={spec} onExpand={() => setViewer(true)} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Expand className="h-3.5 w-3.5" />} onClick={() => setViewer(true)}>
            Agrandir
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={print}>
            Imprimer
          </Button>
          <Button variant="ghost" size="sm" icon={<FileCode2 className="h-3.5 w-3.5" />} onClick={() => download('cii')}>
            Factur-X
          </Button>
        </div>
      </div>
    ),
    paiement: <PaymentPanel f={f} onPay={() => setSheet('pay')} onLink={() => setSheet('link')} onRemind={() => setSheet('remind')} />,
    efacture: <EInvoicePanel f={f} client={client} missing={missing} onDownload={download} />,
  };

  const editor = (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <KindBadge kind={f.kind} />
          {devis && (
            <Link to={`/app/devis/${devis.id}`} className="text-[12.5px] text-ink-2 hover:text-ink hover:underline">
              Devis <span className="font-mono">{devis.number}</span>
            </Link>
          )}
          {original && (
            <Link to={`/app/factures/${original.id}`} className="text-[12.5px] text-ink-2 hover:underline">
              Annule {original.number}
            </Link>
          )}
        </div>
        {draft ? (
          <textarea
            rows={1}
            value={f.title}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            onChange={(e) => update({ title: e.target.value.replace(/\n/g, ' ') })}
            placeholder="Objet de la facture"
            aria-label="Objet de la facture"
            className="-ml-1.5 block w-[calc(100%+12px)] resize-none overflow-hidden rounded-[10px] bg-transparent px-1.5 py-0.5 text-[24px] font-semibold leading-tight tracking-[-0.035em] transition placeholder:text-ink-3 hover:bg-white/60 focus:bg-white focus:outline-none md:text-[28px]"
          />
        ) : (
          <h1 className="text-[24px] font-semibold tracking-[-0.035em] md:text-[28px]">{f.title || f.number}</h1>
        )}
      </div>
      <MetaForm f={f} extra={extra} readOnly={!draft} onChange={update} onExtra={(p) => fx.setExtra(f.id, p)} />
      <div data-field="lines" className="rounded-[16px] bg-white p-3 shadow-card md:p-4">
        <LineEditor lines={f.lines} readOnly={!draft} defaultVat={s.company.defaultVat || 10} onChange={(lines) => update({ lines })} negativeNote={f.kind === 'situation' || f.kind === 'solde' ? 'Les lignes en violet sont des déductions (acomptes ou situations déjà facturés).' : undefined} />
      </div>
      <DetailTotals f={f} />
    </div>
  );

  return (
    <div className="min-h-full">
      <header className="sticky top-14 z-20 flex h-14 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur-xl md:top-0 md:h-[60px] md:px-6">
        <Button variant="ghost" size="icon" aria-label="Retour aux factures" onClick={() => navigate('/app/factures')}>
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="truncate font-mono text-[13.5px] font-semibold">{f.number}</span>
          <span className="hidden sm:inline-flex">
            <StatusBadge status={st} />
          </span>
          {pro && !draft && <EDot status={f.einvoice.status} showLabel className="hidden lg:inline-flex" />}
          {draft && (
            <span className="hidden md:inline-flex">
              <SavedPill saving={false} />
            </span>
          )}
        </div>
        <Button variant="secondary" className="hidden md:inline-flex" size="sm" icon={<Expand className="h-4 w-4" />} onClick={() => setViewer(true)} kbd="P">
          Aperçu
        </Button>
        <Button variant="secondary" size="icon" className="md:hidden" aria-label="Aperçu plein écran" onClick={() => setViewer(true)}>
          <Expand />
        </Button>
        <MoreMenu items={menu} />
        {primary && (
          <Button variant="dawn" size="sm" className="h-9 max-md:h-10" icon={primary.icon} onClick={primary.run}>
            <span className="sm:hidden">{primary.short}</span>
            <span className="hidden sm:inline">{primary.label}</span>
          </Button>
        )}
      </header>

      {wide ? (
        <div className="grid grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-w-0 px-8 py-7">
            <div className="mx-auto max-w-[860px] animate-[fade-up_.45s_var(--ease)_both]">{editor}</div>
          </div>
          <aside className="sticky top-[60px] h-[calc(100dvh-60px)] overflow-y-auto border-l border-line bg-[#f4f3f8] p-5">
            <Segmented value={side} onChange={setSide} className="mb-4 w-full [&>button]:flex-1 [&>button]:justify-center" options={[{ value: 'apercu', label: 'Aperçu' }, { value: 'paiement', label: 'Paiement' }, { value: 'efacture', label: 'E-facture' }]} />
            <div key={side} className="animate-[fade-up_.35s_var(--ease)_both]">
              {sidePanels[side]}
            </div>
          </aside>
        </div>
      ) : (
        <div className="px-4 pb-6 pt-1 md:px-7">
          <UnderlineTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'facture', label: draft ? 'Modifier' : 'Facture' },
              { value: 'apercu', label: 'Aperçu' },
              { value: 'paiement', label: 'Paiement' },
              { value: 'efacture', label: 'E-facture' },
            ]}
          />
          <div key={tab} className="mx-auto max-w-[760px] animate-[fade-up_.35s_var(--ease)_both] pt-5">
            {tab === 'facture' ? editor : sidePanels[tab]}
          </div>
        </div>
      )}

      <DocViewer
        open={viewer}
        onClose={() => setViewer(false)}
        spec={spec}
        kind={INVOICE_TITLE[f.kind]}
        reference={f.number}
        subtitle={[client?.name, f.title].filter(Boolean).join(' · ')}
        status={<StatusBadge status={st} />}
        checks={draft ? checks : undefined}
        onFix={fix}
        onEdit={draft ? () => setTab('facture') : undefined}
        onSend={draft || f.kind === 'avoir' ? openSend : a.remaining > 0 ? () => (setViewer(false), setSheet(st === 'en_retard' ? 'remind' : 'pay')) : undefined}
        sendLabel={draft ? 'Émettre et envoyer' : f.kind === 'avoir' ? 'Envoyer' : st === 'en_retard' ? 'Relancer' : 'Paiement reçu'}
      />
      <RecordPaymentSheet f={f} open={sheet === 'pay'} onClose={close} />
      <PaymentLinkSheet f={f} open={sheet === 'link'} onClose={close} clientEmail={client?.email} clientPhone={client?.phone} />
      <ReminderSheet f={f} open={sheet === 'remind'} onClose={close} />
      <SendSheet f={f} open={sheet === 'send'} onClose={close} missing={missing} checks={checks} onPreview={() => (close(), setViewer(true))} />
      <CreateFromDevisSheet open={sheet === 'devis'} onClose={close} />
    </div>
  );
}
