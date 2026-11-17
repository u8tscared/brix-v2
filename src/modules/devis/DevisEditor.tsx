import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, FileText, History, Layers, Mic, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, Segmented, Sheet, cn } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { todayISO, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis, DevisLigne } from '@/lib/types';
import { BobColumn, SuggestionCard, useBobSuggestions, type BobMsg } from './components/BobColumn';
import { useSavedFlash, type MenuItem } from './components/bits';
import { DemoStrip } from './components/DemoStrip';
import { HeaderFields } from './components/HeaderFields';
import { HistoryList } from './components/HistoryList';
import type { LineHandlers } from './components/LineRow';
import { LineSheet } from './components/LineSheet';
import { LotBlock, type LotHandlers } from './components/LotBlock';
import { MobileSummary } from './components/MobileSummary';
import { PreviewPane } from './components/PreviewPane';
import { SendSheet } from './components/SendSheet';
import { PrintPortal, TopBar } from './components/TopBar';
import { MobileTotals, TotalsBar } from './components/TotalsBar';
import { VoiceDictation } from './components/VoiceDictation';
import type { LibTrade } from './library';
import { duplicateLine, duplicateLot, groupLots, insertGrouped, insertInLot, lotName, mainVat, moveBefore, moveLine, moveLot, newSection, removeLine, removeLot, renumber } from './logic';
import { useDevisMeta, useMeta } from './store';
import { useDevisActions } from './useDevisActions';

const TRADE_TO_LIB: Partial<Record<string, LibTrade>> = { electricien: 'electricite', plombier: 'plomberie', peintre: 'peinture', carreleur: 'carrelage', plaquiste: 'platrerie', menuisier: 'menuiserie', macon: 'maconnerie', climaticien: 'plomberie' };

export default function DevisEditor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const created = useRef(false);

  // « nouveau » : crée un brouillon puis remplace l'URL par son identifiant
  useEffect(() => {
    if (id !== 'nouveau' || created.current) return;
    created.current = true;
    const s = useBrix.getState();
    const d: Devis = { id: `q_${Date.now().toString(36)}`, number: s.nextNumber('devis'), clientId: '', title: 'Nouveau devis', status: 'brouillon', createdAt: todayISO(), validityDays: 30, depositPercent: 30, lines: renumber([newSection('Travaux')]) };
    s.upsertDevis(d);
    useDevisMeta.getState().log(d.id, 'Devis créé', 'me');
    navigate(`/app/devis/${d.id}`, { replace: true });
  }, [id, navigate]);

  const d = useBrix((s) => s.devis.find((x) => x.id === id));
  if (id === 'nouveau') return <div className="p-8 text-center text-ink-3">Création du devis…</div>;
  if (!d)
    return (
      <div className="p-5 md:p-8">
        <EmptyState icon={<FileText />} title="Ce devis n’existe plus" text="Il a peut-être été supprimé." action={<Button variant="primary" onClick={() => navigate('/app/devis')}>Retour aux devis</Button>} />
      </div>
    );
  return <Editor key={d.id} d={d} />;
}

function Editor({ d }: { d: Devis }) {
  const navigate = useNavigate();
  const company = useBrix((s) => s.company);
  const user = useBrix((s) => s.user);
  const client = useBrix((s) => s.clients.find((c) => c.id === d.clientId));
  const upsertDevis = useBrix((s) => s.upsertDevis);
  const meta = useMeta(d.id);
  const actions = useDevisActions(d.id);
  const desktop = useMediaQuery('(min-width: 1280px)');
  const wide = useMediaQuery('(min-width: 1440px)');
  const tablet = useMediaQuery('(min-width: 768px)');
  const phone = !tablet;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editLine, setEditLine] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [send, setSend] = useState(false);
  const [previewSheet, setPreviewSheet] = useState(false);
  const [previewCol, setPreviewCol] = useState(true);
  const [tab, setTab] = useState<'devis' | 'apercu' | 'bob'>('devis');
  const [bobSheet, setBobSheet] = useState(false);
  const [historySheet, setHistorySheet] = useState(false);
  const [summary, setSummary] = useState(false);
  const [messages, setMessages] = useState<BobMsg[]>([]);
  const firstSearch = useRef<HTMLInputElement | null>(null);
  const saving = useSavedFlash(d);
  const [edW, setEdW] = useState(900);
  const edRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = edRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setEdW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  });

  const update = useCallback((p: Partial<Devis>) => {
    const cur = useBrix.getState().devis.find((x) => x.id === d.id);
    if (cur) upsertDevis({ ...cur, ...p });
  }, [d.id, upsertDevis]);
  const setLines = useCallback((fn: (l: DevisLigne[]) => DevisLigne[]) => {
    const cur = useBrix.getState().devis.find((x) => x.id === d.id);
    if (cur) upsertDevis({ ...cur, lines: fn(cur.lines) });
  }, [d.id, upsertDevis]);

  const t = useMemo(() => totals(d.lines), [d.lines]);
  const lots = useMemo(() => groupLots(d.lines), [d.lines]);
  const vat = mainVat(d.lines, company.defaultVat);
  const suggestions = useBobSuggestions(d, client, company);
  const signer = `${user.firstName} ${user.lastName}`.trim();

  const lh: LineHandlers = {
    onChange: (lid, p) => setLines((ls) => ls.map((l) => (l.id === lid ? { ...l, ...p } : l))),
    onMove: (lid, dir) => setLines((ls) => moveLine(ls, lid, dir)),
    onDuplicate: (lid) => setLines((ls) => duplicateLine(ls, lid)),
    onRemove: (lid) => setLines((ls) => removeLine(ls, lid)),
    onEdit: (lid) => setEditLine(lid),
    onDrop: (drag, before) => setLines((ls) => moveBefore(ls, drag, before)),
  };
  const lotH: LotHandlers = {
    onRename: (sid, name) => setLines((ls) => ls.map((l) => (l.id === sid ? { ...l, designation: l.designation.replace(/^(lot\s*\d*\s*[·:.-]\s*)?.*$/i, (_m, p: string | undefined) => `${p ?? 'Lot · '}${name}`) } : l))),
    onMoveLot: (sid, dir) => setLines((ls) => moveLot(ls, sid, dir)),
    onDuplicateLot: (sid) => setLines((ls) => duplicateLot(ls, sid)),
    onRemoveLot: (sid) => setLines((ls) => removeLot(ls, sid)),
    onAddLines: (sid, add) => setLines((ls) => insertInLot(ls, sid, add)),
    onVoice: () => setVoice(true),
  };
  const addLot = () => setLines((ls) => renumber([...ls, newSection('Nouveau lot')]));

  const openSend = () => setSend(true);
  const mainLabel = d.status === 'brouillon' ? 'Envoyer pour signature' : d.status === 'signe' ? 'Convertir en facture' : 'Renvoyer';
  const onMain = d.status === 'signe' ? actions.convert : openSend;
  const print = () => setTimeout(() => window.print(), 50);

  const menu: MenuItem[] = [
    { label: 'Dupliquer', icon: <Copy />, onClick: actions.duplicate },
    { label: 'Convertir en facture', icon: <FileText />, onClick: actions.convert },
    { label: 'Télécharger le PDF', icon: <Download />, onClick: print, hint: 'Ctrl P' },
    { label: 'Historique', icon: <History />, onClick: () => setHistorySheet(true) },
    { label: 'Dicter des lignes', icon: <Mic />, onClick: () => setVoice(true) },
    ...(d.status === 'envoye' || d.status === 'vu' ? [{ label: 'Simuler : le client ouvre', icon: <Layers />, onClick: actions.simulateOpen, divider: true }, { label: 'Simuler : le client signe', icon: <Layers />, onClick: actions.simulateSign }] : []),
    { label: 'Supprimer le devis', icon: <Trash2 />, onClick: actions.remove, danger: true, divider: true },
  ];

  // Raccourcis : « / » cherche un prix, Ctrl+Entrée envoie
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(tg.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        firstSearch.current?.focus();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onMain();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const lastLotId = [...lots].reverse().find((l) => l.section)?.section?.id;
  const editor = (
    <div className={cn('mx-auto w-full max-w-[920px] space-y-5', phone ? 'px-4 pb-28 pt-4' : 'px-5 py-5 xl:px-6')}>
      <HeaderFields d={d} client={client} update={update} phone={phone || edW < 700} />
      <DemoStrip d={d} onOpen={actions.simulateOpen} onSign={actions.simulateSign} onConvert={actions.convert} />
      {phone && suggestions.length > 0 && (
        <MobileBobCard count={suggestions.length} first={suggestions[0]} onApplyFirst={() => {
          const s = suggestions[0];
          if (!s.action) return;
          update(s.action.apply(d));
          useDevisMeta.getState().log(d.id, s.action.done, 'bob');
        }} onDismissFirst={() => useDevisMeta.getState().dismiss(d.id, suggestions[0].key)} onAll={() => setBobSheet(true)} />
      )}
      <div className={cn(phone ? 'space-y-3' : 'space-y-1')}>
        {lots.map((lot, i) => (
          <LotBlock
            key={lot.section?.id ?? 'nolot'}
            lot={lot}
            index={lots.filter((x, j) => x.section && j < i).length}
            collapsed={!!lot.section && collapsed.has(lot.section.id)}
            onToggle={() => lot.section && setCollapsed((c) => {
              const n = new Set(c);
              n.has(lot.section!.id) ? n.delete(lot.section!.id) : n.add(lot.section!.id);
              return n;
            })}
            vatRate={vat}
            h={lh}
            lh={lotH}
            phone={phone}
            searchRef={lot.section?.id === lastLotId ? (el) => (firstSearch.current = el) : undefined}
          />
        ))}
      </div>
      <div className={cn('flex flex-wrap gap-2', phone && 'grid grid-cols-2')}>
        <Button variant="secondary" size={phone ? 'lg' : 'sm'} icon={<Plus className="h-4 w-4" />} onClick={addLot}>
          Ajouter un lot
        </Button>
        <Button variant={phone ? 'primary' : 'ghost'} size={phone ? 'lg' : 'sm'} icon={<Mic className="h-4 w-4" />} onClick={() => setVoice(true)}>
          {phone ? 'Dicter' : 'Dicter des lignes à Bob'}
        </Button>
      </div>
      {(d.aides ?? []).length > 0 && (
        <div className="rounded-xl border border-line bg-white px-4 py-3 text-[13px]">
          <div className="mb-1 text-[12px] font-medium text-ink-3">Aides affichées sur le devis</div>
          {(d.aides ?? []).map((a, i) => (
            <div key={a.label} className="flex items-center justify-between gap-3 py-1">
              <span className="min-w-0 truncate">{a.label}</span>
              <button className="shrink-0 text-[12px] text-ink-3 hover:text-bad" onClick={() => update({ aides: (d.aides ?? []).filter((_, j) => j !== i) })}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const preview = <PreviewPane d={d} client={client} company={company} meta={meta} signer={signer} />;
  const bob = <BobColumn d={d} client={client} company={company} update={update} onVoice={() => setVoice(true)} messages={messages} setMessages={setMessages} className="h-full" />;
  const showPreviewCol = desktop && (wide ? previewCol : !previewCol);

  return (
    <div className={cn(tablet && 'flex h-dvh flex-col')}>
      <TopBar
        d={d}
        saving={saving}
        menu={menu}
        phone={phone}
        onBack={() => navigate('/app/devis')}
        previewActive={desktop ? showPreviewCol : tab === 'apercu'}
        onPreview={() => (phone ? setPreviewSheet(true) : desktop ? setPreviewCol((v) => !v) : setTab(tab === 'apercu' ? 'devis' : 'apercu'))}
        onMain={onMain}
        mainLabel={mainLabel}
      />
      {tablet && !desktop && (
        <div className="flex shrink-0 justify-center border-b border-line bg-white py-2">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'devis', label: 'Devis' }, { value: 'apercu', label: 'Aperçu' }, { value: 'bob', label: 'Bob', count: suggestions.length || undefined }]} />
        </div>
      )}
      {phone ? (
        <>
          {editor}
          <MobileTotals t={t} onSend={onMain} sendLabel={d.status === 'signe' ? 'Facturer' : d.status === 'brouillon' ? 'Envoyer' : 'Renvoyer'} onDetails={() => setSummary(true)} />
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          {(desktop || tab === 'devis') && (
            <section ref={edRef} className="flex min-w-0 flex-1 flex-col bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto">{editor}</div>
              <TotalsBar d={d} t={t} update={update} />
            </section>
          )}
          {(showPreviewCol || (!desktop && tab === 'apercu')) && (
            <aside className={cn('min-h-0 overflow-y-auto border-l border-line bg-[#fafafc] px-4 py-5', desktop ? 'w-[264px] shrink-0 2xl:w-[300px]' : 'flex-1')}>
              <div className={cn(!desktop && 'mx-auto max-w-[520px]')}>{preview}</div>
            </aside>
          )}
          {(desktop || tab === 'bob') && <aside className={cn('min-h-0 border-l border-line bg-white', desktop ? 'w-[300px] shrink-0 2xl:w-[340px]' : 'mx-auto w-full max-w-[640px] border-r')}>{bob}</aside>}
        </div>
      )}

      <LineSheet line={d.lines.find((l) => l.id === editLine)} onClose={() => setEditLine(null)} h={lh} />
      <VoiceDictation
        open={voice}
        onClose={() => setVoice(false)}
        fullscreen={phone}
        hourlyRate={company.hourlyRate}
        vatRate={vat}
        trade={TRADE_TO_LIB[company.trade]}
        subtitle={client ? `${client.name} · ${d.title}` : d.title}
        onInsert={(add) => {
          setLines((ls) => insertGrouped(ls, add));
          const cur = useBrix.getState().devis.find((x) => x.id === d.id);
          if (cur && /^nouveau devis$/i.test(cur.title.trim())) {
            const names = [...new Set(add.map((l) => l.lot))];
            update({ title: names.length > 1 ? `${names[0]} et ${names[1].toLowerCase()}` : names[0] ?? cur.title });
          }
          useDevisMeta.getState().log(d.id, `Dicté : ${add.length} ligne${add.length > 1 ? 's' : ''} ajoutée${add.length > 1 ? 's' : ''} (${[...new Set(add.map((l) => lotName(l.lot)))].join(', ')})`, 'bob');
          setMessages((m) => [...m, { id: 'v' + Date.now(), from: 'bob', text: `J'ai rangé ${add.length} ligne${add.length > 1 ? 's' : ''} dans les bons lots, avec tes prix de bibliothèque et ton taux horaire.`, undoPatch: { lines: d.lines } }]);
          setVoice(false);
        }}
      />
      <SendSheet
        open={send}
        onClose={() => setSend(false)}
        d={d}
        client={client}
        company={company}
        user={user}
        meta={meta}
        onPatchMeta={actions.patchMeta}
        onPickClient={() => setSend(false)}
        onSend={async (o) => {
          await actions.send(o);
          setSend(false);
        }}
      />
      <Sheet open={previewSheet} onClose={() => setPreviewSheet(false)} title="Aperçu" subtitle={`${d.number} · ce que reçoit le client`}>
        {preview}
      </Sheet>
      <Sheet open={bobSheet} onClose={() => setBobSheet(false)} title="Bob" subtitle="Suggestions sur ce devis">
        <div className="-mx-5 -mb-5 h-[70dvh]">{bob}</div>
      </Sheet>
      <Sheet open={historySheet} onClose={() => setHistorySheet(false)} title="Historique" subtitle={d.number}>
        <HistoryList d={d} client={client} meta={meta} limit={50} />
      </Sheet>
      <MobileSummary open={summary} onClose={() => setSummary(false)} d={d} t={t} update={update} />
      <PrintPortal d={d} client={client} company={company} signer={signer} />
    </div>
  );
}

function MobileBobCard({ count, first, onApplyFirst, onDismissFirst, onAll }: { count: number; first: Parameters<typeof SuggestionCard>[0]['s']; onApplyFirst: () => void; onDismissFirst: () => void; onAll: () => void }) {
  return (
    <div className="rounded-2xl border border-vi-100 bg-vi-50/40 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[12.5px] font-semibold text-vi-700">Bob a {count} suggestion{count > 1 ? 's' : ''}</span>
        {count > 1 && (
          <button onClick={onAll} className="h-9 px-1 text-[12.5px] font-medium text-ink-2">
            Tout voir
          </button>
        )}
      </div>
      <SuggestionCard s={first} onApply={onApplyFirst} onDismiss={onDismissFirst} />
    </div>
  );
}
