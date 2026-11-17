import { useRef, useState } from 'react';
import { Check, Copy, FolderLock, Link2, Share2, ShieldCheck, Upload, X } from 'lucide-react';
import { Button, Card, IconTile, PageHeader, Select, Sheet, cn, toast } from '@/components/ui';
import { AnimatedNumber, Ring, SuccessDot } from '@/components/motion';
import { DocCard } from './components/documents/DocCard';
import { DocSheet } from './components/documents/DocSheet';
import { GROUPS, TENDER, docState, guessDoc, lc, useDocs, type Doc } from './components/documents/store';

export default function Documents() {
  const { docs, renew } = useDocs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [fetching, setFetching] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [open, setOpen] = useState<Doc | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [dropped, setDropped] = useState<{ file: File; docId: string } | null>(null);
  const [overZone, setOverZone] = useState(false);

  const states = docs.map((d) => docState(d));
  const expired = docs.filter((_, i) => states[i].tone === 'bad');
  const soon = docs.filter((_, i) => states[i].tone === 'warn');
  const ok = docs.length - expired.length - soon.length;
  const score = Math.round((ok / docs.length) * 100);

  const flash = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 2400);
  };
  const apply = (id: string, file?: string) => {
    renew(id, file);
    flash(id);
    toast(`${docs.find((d) => d.id === id)?.label} : à jour`);
  };
  const pick = (id: string) => {
    setTarget(id);
    fileRef.current?.click();
  };
  const onFile = (f?: File) => {
    if (!f) return;
    if (target) {
      apply(target, f.name);
      setTarget(null);
      setOpen(null);
    } else {
      setDropped({ file: f, docId: guessDoc(f.name, docs)?.id ?? expired[0]?.id ?? soon[0]?.id ?? docs[0].id });
    }
  };
  const fetchAuto = (d: Doc) => {
    setFetching(d.id);
    setTimeout(() => {
      renew(d.id);
      setFetching(null);
      setOpen(null);
      flash(d.id);
      toast(`Bob a récupéré la nouvelle ${lc(d.label)} (démo)`);
    }, 1500);
  };
  const share = () => setLink(`https://brix.fr/d/${Math.random().toString(36).slice(2, 8)}`);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stopSelecting = () => { setSelecting(false); setPicked([]); };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="FolderLock" dept="gestion" size="lg" />}
        title="Documents"
        subtitle="Le coffre de l’entreprise : toujours à jour, prêt à envoyer en un lien."
        actions={
          selecting ? null : (
            <>
              <Button icon={<FolderLock />} onClick={() => { setSelecting(true); setPicked(TENDER); }}>Dossier appel d’offres</Button>
              <Button variant="primary" icon={<Share2 />} onClick={() => setSelecting(true)}>Partager</Button>
            </>
          )
        }
      />
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="relative flex items-center gap-5 overflow-hidden p-5 md:p-6">
          <div aria-hidden className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,#eef0fd,transparent)]" />
          <Ring value={score} size={92} stroke={7} tone={expired.length ? 'warn' : 'ok'} className="relative">
            <span className="flex flex-col items-center leading-none">
              <span className="text-[22px] font-semibold tracking-[-0.03em]"><AnimatedNumber value={score} />%</span>
              <span className="mt-0.5 text-[10px] font-medium text-ink-3">à jour</span>
            </span>
          </Ring>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3"><ShieldCheck className="h-3.5 w-3.5" />Coffre-fort chiffré, hébergé en France</div>
            <div className="mt-1 text-[18px] font-semibold leading-snug tracking-[-0.025em]">
              {expired.length ? `${expired.length} document${expired.length > 1 ? 's' : ''} à remplacer` : soon.length ? `${soon.length} document${soon.length > 1 ? 's' : ''} expire${soon.length > 1 ? 'nt' : ''} bientôt` : 'Tout est à jour'}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ok" /><span className="num font-semibold text-ink">{ok}</span> à jour</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#d97706]" /><span className="num font-semibold text-ink">{soon.length}</span> bientôt</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-bad" /><span className="num font-semibold text-ink">{expired.length}</span> expiré{expired.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </Card>

        <label
          onDragOver={(e) => { e.preventDefault(); setOverZone(true); }}
          onDragLeave={() => setOverZone(false)}
          onDrop={(e) => { e.preventDefault(); setOverZone(false); setTarget(null); onFile(e.dataTransfer.files?.[0]); }}
          onClick={(e) => { e.preventDefault(); setTarget(null); fileRef.current?.click(); }}
          className={cn('group flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-5 py-5 text-center transition-all duration-300 ease-out-quint', overZone ? 'scale-[1.01] border-[#4f46e5] bg-[#eef0fd]' : 'border-line2 bg-white/50 hover:border-ink-3 hover:bg-white')}
        >
          <span className={cn('grid h-11 w-11 place-items-center rounded-full bg-white shadow-card transition-transform duration-300 ease-spring', overZone ? '-translate-y-1 scale-110 text-[#4f46e5]' : 'text-ink-2 group-hover:-translate-y-0.5')}>
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-[14px] font-semibold">{overZone ? 'Lâchez, on s’occupe du reste' : 'Glissez un document ici'}</span>
          <span className="text-[12.5px] text-ink-3">ou touchez pour choisir un PDF ou une photo. Brix reconnaît la pièce.</span>
        </label>
      </div>

      {(expired.length > 0 || soon.some((d) => d.auto)) && !selecting && (
        <div className="flex items-start gap-3 rounded-[16px] bg-night px-4 py-3.5 text-white shadow-ink md:px-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[12px] font-semibold">B</span>
          <p className="text-[13.5px] leading-relaxed text-white/90">
            {expired.length > 0 && <>Ta {lc(expired[0].label)} a expiré : ne pose plus de borne avant de l’avoir renouvelée. </>}
            {soon.some((d) => d.auto) && <>Je récupère moi-même l’{lc(soon.find((d) => d.auto)!.label)} le jour où elle expire, tu n’as rien à faire.</>}
          </p>
        </div>
      )}

      {selecting && (
        <div className="sticky top-2 z-20 flex animate-[toast-in_.4s_var(--spring)_both] items-center gap-2 rounded-[16px] bg-[#15122a] p-2 pl-4 text-white shadow-pop">
          <span className="min-w-0 flex-1 text-[13.5px]"><span className="num font-semibold">{picked.length}</span> document{picked.length > 1 ? 's' : ''} sélectionné{picked.length > 1 ? 's' : ''}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Annuler" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={stopSelecting}><X /></Button>
          <Button variant="secondary" icon={<Link2 />} disabled={!picked.length} onClick={share}>Créer le lien</Button>
        </div>
      )}

      {(Object.keys(GROUPS) as Doc['group'][]).map((g) => (
        <section key={g}>
          <h2 className="eyebrow mb-2.5 px-1">{GROUPS[g]}</h2>
          <div className="stagger-fast grid gap-3 [&>*]:min-w-0 md:grid-cols-2">
            {docs.filter((d) => d.group === g).map((d) => (
              <DocCard key={d.id} d={d} selecting={selecting} picked={picked.includes(d.id)} fresh={fresh === d.id} fetching={fetching === d.id} onOpen={() => setOpen(d)} onToggle={() => toggle(d.id)} onDropFile={(f) => apply(d.id, f.name)} />
            ))}
          </div>
        </section>
      ))}

      <DocSheet doc={open} onClose={() => setOpen(null)} fetching={!!open && fetching === open.id} onFetch={fetchAuto} onReplace={(d) => pick(d.id)} onShare={(d) => { setOpen(null); setPicked([d.id]); share(); }} />

      <Sheet
        open={!!dropped}
        onClose={() => setDropped(null)}
        side="center"
        width={440}
        title="Ranger ce fichier"
        subtitle={dropped?.file.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDropped(null)}>Annuler</Button>
            <Button variant="primary" onClick={() => { if (dropped) apply(dropped.docId, dropped.file.name); setDropped(null); }}>Ranger</Button>
          </>
        }
      >
        {dropped && (
          <div className="space-y-3">
            {guessDoc(dropped.file.name, docs) && <p className="flex items-center gap-2 text-[13px] text-ok"><Check className="h-4 w-4" />Brix a reconnu : {guessDoc(dropped.file.name, docs)?.label}</p>}
            <Select value={dropped.docId} onChange={(e) => setDropped({ ...dropped, docId: e.target.value })} aria-label="Document remplacé">
              {docs.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
            <p className="text-[12.5px] text-ink-3">L’ancienne version est gardée dans l’historique.</p>
          </div>
        )}
      </Sheet>

      <Sheet open={!!link} onClose={() => { setLink(null); stopSelecting(); }} side="center" width={460}>
        <div className="flex flex-col items-center pt-6 text-center">
          <SuccessDot size={52} />
          <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.025em]">Lien prêt à envoyer</h3>
          <p className="mt-1 text-[13px] text-ink-2">{picked.length} document{picked.length > 1 ? 's' : ''} · valable 30 jours · consultations suivies</p>
        </div>
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 rounded-[12px] bg-sub px-3 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
            <Link2 className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{link}</span>
          </div>
          <Button variant="primary" className="w-full justify-center" icon={<Copy />} onClick={() => { navigator.clipboard?.writeText(link ?? '').catch(() => {}); toast('Lien copié'); }}>Copier le lien</Button>
          <ul className="stagger-fast space-y-1.5 pt-1 text-[12.5px] text-ink-2">
            {docs.filter((d) => picked.includes(d.id)).map((d) => <li key={d.id} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" />{d.label}</li>)}
          </ul>
          <p className="text-[12px] text-ink-3">Le lien affiche toujours la dernière version : si une attestation est renouvelée, votre client voit la nouvelle.</p>
        </div>
      </Sheet>
    </div>
  );
}
