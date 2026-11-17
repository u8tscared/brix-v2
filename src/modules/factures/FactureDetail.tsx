import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, Check, Copy, FileCode2, FileMinus2, FileSignature, Link2, Printer, Send, Trash2, Wallet } from 'lucide-react';
import { Button, EmptyState, Segmented, UnderlineTabs, cn, toast } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { PageLoader } from '@/components/layout/AppShell';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { EDot, KindBadge, StatusBadge } from './components/bits';
import { CreateFromDevisSheet } from './components/CreateFromDevisSheet';
import { EInvoicePanel } from './components/EInvoicePanel';
import { InvoicePaper, PrintableInvoice } from './components/InvoicePaper';
import { LineEditor } from './components/LineEditor';
import { MetaForm } from './components/MetaForm';
import { MoreMenu } from './components/MoreMenu';
import { PaymentLinkSheet, RecordPaymentSheet } from './components/PaymentSheets';
import { PaymentPanel } from './components/PaymentPanel';
import { ReminderSheet } from './components/ReminderSheet';
import { SendSheet } from './components/SendSheet';
import { blankFacture, buildAvoir } from './lib/billing';
import { fromFacture, validateEInvoice } from './lib/einvoice-input';
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

  if (id === 'nouvelle') return <div className="p-6"><PageLoader /></div>;
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
  const extra = fx.extras[f.id] ?? {};
  const client = s.clients.find((c) => c.id === f.clientId);
  const devis = s.devis.find((d) => d.id === f.devisId);
  const chantier = s.chantiers.find((c) => c.id === f.chantierId);
  const original = extra.creditOf ? s.factures.find((x) => x.id === extra.creditOf) : undefined;
  const draft = f.status === 'brouillon';
  const st = liveStatus(f);
  const a = amounts(f);
  const pro = client?.kind === 'pro';

  const [side, setSide] = useState<Side>(draft ? 'apercu' : st === 'payee' ? 'efacture' : 'paiement');
  const [tab, setTab] = useState<Tab>('facture');
  const [sheet, setSheet] = useState<null | 'pay' | 'link' | 'remind' | 'send' | 'devis'>(null);
  const close = () => setSheet(null);

  const input = useMemo(() => fromFacture(f, s.company, client, extra, { devisNumber: devis?.number, original }), [f, s.company, client, extra, devis, original]);
  const missing = useMemo(() => {
    const m = validateEInvoice(input, { b2b: pro });
    if (!f.clientId) m.unshift('Client');
    return [...new Set(m)];
  }, [input, pro, f.clientId]);

  const update = (p: Partial<Facture>) => s.upsertFacture({ ...f, ...p });
  const download = (fmt: 'cii' | 'ubl') => {
    downloadText(`${f.number}-${fmt === 'cii' ? 'factur-x' : 'ubl'}.xml`, fmt === 'cii' ? buildFacturX(input) : buildUbl(input));
    toast(fmt === 'cii' ? 'Fichier Factur-X téléchargé' : 'Fichier UBL téléchargé');
  };
  const print = () => {
    toast('Choisissez « Enregistrer au format PDF »', 'info');
    setTimeout(() => window.print(), 250);
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

  // Action principale selon l'état de la facture.
  const primary = draft
    ? { label: 'Émettre et envoyer', short: 'Émettre', icon: <Send className="h-4 w-4" />, run: () => (f.clientId ? setSheet('send') : toast('Choisissez d’abord un client', 'warn')) }
    : f.kind === 'avoir'
      ? { label: 'Envoyer l’avoir', short: 'Envoyer', icon: <Send className="h-4 w-4" />, run: () => setSheet('send') }
      : a.remaining > 0
        ? { label: 'Paiement reçu', short: 'Encaisser', icon: <Wallet className="h-4 w-4" />, run: () => setSheet('pay') }
        : null;

  const menu = [
    { label: 'Télécharger le PDF', icon: <Printer />, onClick: print },
    { label: 'Fichier Factur-X (XML)', icon: <FileCode2 />, onClick: () => download('cii') },
    { label: 'Renvoyer au client', icon: <Send />, onClick: () => setSheet('send'), hidden: draft },
    { label: 'Lien de paiement', icon: <Link2 />, onClick: () => setSheet('link'), hidden: draft || a.remaining <= 0 },
    { label: 'Relancer', icon: <BellRing />, onClick: () => setSheet('remind'), hidden: draft || a.remaining <= 0 },
    { label: 'Facturer un devis signé', icon: <FileSignature />, onClick: () => setSheet('devis'), hidden: !draft },
    { label: 'Dupliquer', icon: <Copy />, onClick: duplicate },
    { label: 'Créer un avoir', icon: <FileMinus2 />, onClick: avoir, hidden: draft || f.kind === 'avoir' },
    { label: 'Supprimer le brouillon', icon: <Trash2 />, danger: true, hidden: !draft, onClick: () => { update({ status: 'annulee' }); toast('Brouillon supprimé'); navigate('/app/factures'); } },
  ];

  const paper = <InvoicePaper f={f} company={s.company} client={client} extra={extra} devis={devis} chantier={chantier} original={original} />;
  const sidePanels: Record<Side, React.ReactNode> = {
    apercu: (
      <div className="space-y-3">
        <div className="rounded-xl bg-white p-5 shadow-card">{paper}</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={print}>PDF</Button>
          <Button variant="secondary" size="sm" icon={<FileCode2 className="h-3.5 w-3.5" />} onClick={() => download('cii')}>Factur-X</Button>
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
              Devis {devis.number}
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
            className="block w-full resize-none overflow-hidden bg-transparent font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] placeholder:text-ink-3 focus:outline-none md:text-[26px]"
          />
        ) : (
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">{f.title || f.number}</h1>
        )}
      </div>
      <MetaForm f={f} extra={extra} readOnly={!draft} onChange={update} onExtra={(p) => fx.setExtra(f.id, p)} />
      <div className="rounded-[14px] border border-line bg-white p-3 md:p-4">
        <LineEditor lines={f.lines} readOnly={!draft} defaultVat={s.company.defaultVat || 10} onChange={(lines) => update({ lines })} negativeNote={f.kind === 'situation' || f.kind === 'solde' ? 'Les lignes en violet sont des déductions (acomptes ou situations déjà facturés).' : undefined} />
      </div>
      <Totals f={f} />
    </div>
  );

  return (
    <div className="min-h-full">
      <header className="sticky top-14 z-20 flex h-14 items-center gap-2 border-b border-line bg-page/90 px-3 backdrop-blur-xl md:top-0 md:h-[60px] md:px-6">
        <Button variant="ghost" size="icon" aria-label="Retour aux factures" onClick={() => navigate('/app/factures')}>
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="num truncate text-[14px] font-semibold">{f.number}</span>
          <span className="hidden sm:inline-flex"><StatusBadge status={st} /></span>
          {pro && !draft && <EDot status={f.einvoice.status} showLabel className="hidden lg:inline-flex" />}
          {draft && <span className="hidden items-center gap-1 text-[12px] text-ink-3 md:inline-flex"><Check className="h-3.5 w-3.5" /> Enregistré</span>}
        </div>
        <Button variant="secondary" className="hidden md:inline-flex" icon={<Printer className="h-4 w-4" />} onClick={print}>PDF</Button>
        <MoreMenu items={menu} />
        {primary && (
          <Button variant="dawn" icon={primary.icon} onClick={primary.run}>
            <span className="sm:hidden">{primary.short}</span>
            <span className="hidden sm:inline">{primary.label}</span>
          </Button>
        )}
      </header>

      {wide ? (
        <div className="grid grid-cols-[minmax(0,1fr)_460px]">
          <div className="min-w-0 px-8 py-7">
            <div className="mx-auto max-w-[860px]">{editor}</div>
          </div>
          <aside className="sticky top-[60px] h-[calc(100dvh-60px)] overflow-y-auto border-l border-line bg-[#fbfbfd] p-5">
            <Segmented
              value={side}
              onChange={setSide}
              className="mb-4 w-full [&>button]:flex-1 [&>button]:justify-center"
              options={[
                { value: 'apercu', label: 'Aperçu' },
                { value: 'paiement', label: 'Paiement' },
                { value: 'efacture', label: 'E-facture' },
              ]}
            />
            {sidePanels[side]}
          </aside>
        </div>
      ) : (
        <div className="px-4 pb-6 pt-1 md:px-7">
          <UnderlineTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'facture', label: draft ? 'Modifier' : 'Facture' },
              { value: 'apercu', label: 'Aperçu PDF' },
              { value: 'paiement', label: 'Paiement' },
              { value: 'efacture', label: 'E-facture' },
            ]}
          />
          <div className="mx-auto max-w-[760px] pt-5">{tab === 'facture' ? editor : sidePanels[tab]}</div>
        </div>
      )}

      <PrintableInvoice f={f} company={s.company} client={client} extra={extra} devis={devis} chantier={chantier} original={original} />
      <RecordPaymentSheet f={f} open={sheet === 'pay'} onClose={close} />
      <PaymentLinkSheet f={f} open={sheet === 'link'} onClose={close} clientEmail={client?.email} clientPhone={client?.phone} />
      <ReminderSheet f={f} open={sheet === 'remind'} onClose={close} />
      <SendSheet f={f} open={sheet === 'send'} onClose={close} missing={missing} />
      <CreateFromDevisSheet open={sheet === 'devis'} onClose={close} />
    </div>
  );
}

function Totals({ f }: { f: Facture }) {
  const a = amounts(f);
  const sign = a.sign === -1 ? '−' : '';
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1 text-[13px] text-ink-2">
        <div className="flex gap-6">
          <span>Total HT</span>
          <span className="num ml-auto text-ink md:ml-0">{sign}{money(a.ht)}</span>
        </div>
        {a.byVat.map((v) => (
          <div key={v.rate} className="flex gap-6">
            <span>TVA {String(v.rate).replace('.', ',')} %</span>
            <span className="num ml-auto text-ink md:ml-0">{sign}{money(v.tva)}</span>
          </div>
        ))}
        {a.retenue > 0 && (
          <div className="flex gap-6">
            <span>Retenue de garantie {f.retenueGarantie} %</span>
            <span className="num ml-auto text-ink md:ml-0">−{money(a.retenue)}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[12px] text-ink-3">{f.kind === 'avoir' ? 'Montant de l’avoir' : a.retenue ? 'Net à payer TTC' : 'Total TTC'}</div>
        <div className={cn('num font-display text-[28px] font-semibold leading-tight tracking-[-0.02em]')}>{sign}{money(f.kind === 'avoir' ? a.ttc : a.net)}</div>
      </div>
    </div>
  );
}
