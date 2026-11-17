import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Expand, FileText, History, Layers, Mic, Plus, Printer, Receipt, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Segmented, Sheet, cn, toast } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { todayISO, totals } from '@/lib/format';
import { DEVIS_STATUS } from '@/lib/status';
import { useBrix } from '@/lib/store';
import type { Devis, DevisLigne } from '@/lib/types';
import { checkDevis, checkScore, type FixTarget } from './checks';
import { BobColumn, useBobSuggestions, type BobMsg } from './components/BobColumn';
import { useSavedFlash, type MenuItem } from './components/bits';
import { DemoStrip } from './components/DemoStrip';
import { printDoc } from './components/doc/print';
import { HeaderFields } from './components/HeaderFields';
import { HistoryList } from './components/HistoryList';
import type { LineHandlers } from './components/LineRow';
import { LineSheet } from './components/LineSheet';
import { LotBlock, type LotHandlers } from './components/LotBlock';
import { MobileBobCard } from './components/MobileBobCard';
import { MobileSummary } from './components/MobileSummary';
import { devisDoc } from './components/PdfDoc';
import { PreviewPane } from './components/PreviewPane';
import { SendSheet } from './components/SendSheet';
import { TopBar } from './components/TopBar';
import { MobileTotals, TotalsBar } from './components/TotalsBar';
import { DocViewer } from './components/viewer/DocViewer';
import { VoiceDictation } from './components/VoiceDictation';
import { flashField, useEditorFocus } from './focus';
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

  const [params, setParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editLine, setEditLine] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [send, setSend] = useState(false);
  const [viewer, setViewer] = useState(params.get('apercu') === '1');
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
  const spec = useMemo(() => devisDoc({ d, client, company, signer }), [d, client, company, signer]);
  const checks = useMemo(() => checkDevis(d, client, company), [d, client, company]);
  const score = checkScore(checks);

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

  const openSend = () => {
    setViewer(false);
    setSend(true);
  };
  const mainLabel = d.status === 'brouillon' ? 'Envoyer' : d.status === 'signe' ? 'Facturer' : 'Renvoyer';
  const onMain = d.status === 'signe' ? actions.convert : openSend;
  const print = () => {
    toast('Choisissez « Enregistrer au format PDF » pour le télécharger', 'info');
    printDoc(spec, `Devis ${d.number}`);
  };

  // Ouverture directe depuis la liste : ?apercu=1 ou ?envoyer=1
  useEffect(() => {
    if (params.get('envoyer') === '1') setSend(true);
    if (params.has('apercu') || params.has('envoyer')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Correction demandée depuis la vérification : on amène l'artisan au bon champ.
  const fix = (target: FixTarget) => {
    if (target === 'company') return navigate('/app/reglages');
    if (phone && target === 'deposit') return setSummary(true);
    if (!desktop && tablet) setTab('devis');
    setTimeout(() => {
      if (target === 'client') useEditorFocus.getState().request('client');
      else if (target === 'lines') flashField('lines');
      else flashField(target);
    }, 80);
  };

  const menu: MenuItem[] = [
    { label: 'Aperçu plein écran', icon: <Expand />, onClick: () => setViewer(true), hint: 'P' },
    { label: 'Imprimer ou télécharger', icon: <Printer />, onClick: print, hint: 'Ctrl P' },
    { label: 'Dicter des lignes', icon: <Mic />, onClick: () => setVoice(true) },
    { label: 'Dupliquer', icon: <Copy />, onClick: actions.duplicate, divider: true },
    { label: 'Convertir en facture', icon: <Receipt />, onClick: actions.convert },
    { label: 'Historique', icon: <History />, onClick: () => setHistorySheet(true) },
    ...(d.status === 'envoye' || d.status === 'vu' ? [{ label: 'Simuler : le client ouvre', icon: <Layers />, onClick: actions.simulateOpen, divider: true }, { label: 'Simuler : le client signe', icon: <Layers />, onClick: actions.simulateSign }] : []),
    { label: 'Supprimer le devis', icon: <Trash2 />, onClick: actions.remove, danger: true, divider: true },
  ];

  // Raccourcis : « / » cherche un prix, P ouvre l'aperçu, Ctrl+P imprime, Ctrl+Entrée envoie
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const tg = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(tg.tagName) || tg.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        firstSearch.current?.focus();
      } else if (e.key.toLowerCase() === 'p' && mod) {
        e.preventDefault();
        print();
      } else if (e.key.toLowerCase() === 'p' && !typing && !e.altKey) {
        e.preventDefault();
        setViewer(true);
      } else if (e.key === 'Enter' && mod) {
        e.preventDefault();
        onMain();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const lastLotId = [...lots].reverse().find((l) => l.section)?.section?.id;
  const editor = (
    <div className={cn('mx-auto w-full max-w-[920px] space-y-5', phone ? 'px-4 pb-[150px] pt-4' : 'px-5 py-6 xl:px-8')}>
      <HeaderFields d={d} client={client} update={update} phone={phone || edW < 700} />
      <DemoStrip d={d} onOpen={actions.simulateOpen} onSign={actions.simulateSign} onConvert={actions.convert} />
      {phone && suggestions.length > 0 && (
        <MobileBobCard
          count={suggestions.length}
          first={suggestions[0]}
          onApplyFirst={() => {
            const s = suggestions[0];
            if (!s.action) return;
            update(s.action.apply(d));
            useDevisMeta.getState().log(d.id, s.action.done, 'bob');
          }}
          onDismissFirst={() => useDevisMeta.getState().dismiss(d.id, suggestions[0].key)}
          onAll={() => setBobSheet(true)}
        />
      )}
      <div data-field="lines" className={cn('rounded-[14px]', phone ? 'space-y-3' : 'space-y-2')}>
        {lots.map((lot, i) => (
          <LotBlock
            key={lot.section?.id ?? 'nolot'}
            lot={lot}
            index={lots.filter((x, j) => x.section && j < i).length}
            collapsed={!!lot.section && collapsed.has(lot.section.id)}
            onToggle={() =>
              lot.section &&
              setCollapsed((c) => {
                const n = new Set(c);
                n.has(lot.section!.id) ? n.delete(lot.section!.id) : n.add(lot.section!.id);
                return n;
              })
            }
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
        <Button variant={phone ? 'secondary' : 'ghost'} size={phone ? 'lg' : 'sm'} icon={<Mic className="h-4 w-4" />} onClick={() => setVoice(true)}>
          {phone ? 'Dicter' : 'Dicter des lignes à Bob'}
        </Button>
      </div>
      {(d.aides ?? []).length > 0 && (
        <div className="rounded-[14px] bg-white px-4 py-3 text-[13px] shadow-card">
          <div className="mb-1 text-[12px] font-medium text-ink-3">Aides affichées sur le devis</div>
          {(d.aides ?? []).map((a, i) => (
            <div key={a.label} className="flex items-center justify-between gap-3 py-1">
              <span className="min-w-0 truncate">{a.label}</span>
              <button className="h-9 shrink-0 text-[12px] text-ink-3 hover:text-bad" onClick={() => update({ aides: (d.aides ?? []).filter((_, j) => j !== i) })}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const preview = <PreviewPane d={d} client={client} company={company} meta={meta} signer={signer} onExpand={() => setViewer(true)} />;
  const bob = <BobColumn d={d} client={client} company={company} update={update} onVoice={() => setVoice(true)} messages={messages} setMessages={setMessages} className="h-full" />;
  const st = DEVIS_STATUS[d.status];

  return (
    <div className={cn(tablet && 'flex h-dvh flex-col')}>
      <TopBar d={d} saving={saving} menu={menu} phone={phone} onBack={() => navigate('/app/devis')} onPreview={() => setViewer(true)} onMain={onMain} mainLabel={mainLabel} mainIcon={d.status === 'signe' ? <Receipt className="h-3.5 w-3.5" /> : undefined} checks={score} />
      {tablet && !desktop && (
        <div className="flex shrink-0 justify-center border-b border-line bg-white py-2">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'devis', label: 'Devis' }, { value: 'apercu', label: 'Aperçu' }, { value: 'bob', label: 'Bob', count: suggestions.length || undefined }]} />
        </div>
      )}
      {phone ? (
        <>
          {editor}
          <MobileTotals t={t} onSend={onMain} sendLabel={mainLabel} onDetails={() => setSummary(true)} onVoice={() => setVoice(true)} />
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          {(desktop || tab === 'devis') && (
            <section ref={edRef} className="flex min-w-0 flex-1 flex-col bg-page">
              <div className="min-h-0 flex-1 overflow-y-auto">{editor}</div>
              <TotalsBar d={d} t={t} update={update} />
            </section>
          )}
          {((desktop && wide) || (!desktop && tab === 'apercu')) && (
            <aside className={cn('min-h-0 overflow-y-auto border-l border-line bg-[#f4f3f8] px-4 py-5', desktop ? 'w-[268px] shrink-0 2xl:w-[300px]' : 'flex-1')}>
              <div className={cn(!desktop && 'mx-auto max-w-[520px]')}>{preview}</div>
            </aside>
          )}
          {(desktop || tab === 'bob') && <aside className={cn('min-h-0 border-l border-line bg-white', desktop ? 'w-[300px] shrink-0 2xl:w-[340px]' : 'mx-auto w-full max-w-[640px] border-r')}>{bob}</aside>}
        </div>
      )}

      <DocViewer
        open={viewer}
        onClose={() => setViewer(false)}
        spec={spec}
        kind="Devis"
        reference={d.number}
        subtitle={[client?.name, d.title].filter(Boolean).join(' · ')}
        status={<Badge tone={st.tone}>{st.label}</Badge>}
        checks={d.status === 'signe' ? undefined : checks}
        onFix={fix}
        onEdit={() => undefined}
        editLabel="Modifier"
        onSend={d.status === 'signe' ? undefined : openSend}
        sendLabel={d.status === 'brouillon' ? 'Envoyer' : 'Renvoyer'}
      />
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
        checks={checks}
        spec={spec}
        onPatchMeta={actions.patchMeta}
        onPickClient={() => {
          setSend(false);
          setTimeout(() => useEditorFocus.getState().request('client'), 260);
        }}
        onPreview={() => {
          setSend(false);
          setViewer(true);
        }}
        onSend={actions.send}
      />
      <Sheet open={bobSheet} onClose={() => setBobSheet(false)} title="Bob" subtitle="Conseils sur ce devis">
        <div className="-mx-5 -mb-5 h-[70dvh]">{bob}</div>
      </Sheet>
      <Sheet open={historySheet} onClose={() => setHistorySheet(false)} title="Historique" subtitle={d.number}>
        <HistoryList d={d} client={client} meta={meta} limit={50} />
      </Sheet>
      <MobileSummary open={summary} onClose={() => setSummary(false)} d={d} t={t} update={update} />
    </div>
  );
}
