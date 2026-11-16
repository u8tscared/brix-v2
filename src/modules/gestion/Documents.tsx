import { useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, Download, FileText, FolderLock, Link2, RefreshCw, Share2, Upload } from 'lucide-react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Badge, Button, Card, cn, PageHeader, Sheet, Stat, toast } from '@/components/ui';
import { dateFull, daysBetween, dayOffset, todayISO } from '@/lib/format';
import { StatStrip } from '@/modules/vendre/components/StatStrip';

// Coffre de l'entreprise. Stockage simulé en démo (persisté dans le navigateur).
// Vraie version : fichiers dans R2, métadonnées dans D1 (table documents), récupération
// automatique des attestations URSSAF et fiscale via les API publiques (net-entreprises, impots.gouv).

interface Doc { id: string; label: string; issuer: string; group: 'societe' | 'assurances' | 'attestations' | 'qualifications'; expires?: string; file: string; auto?: boolean; renewMonths: number }

const seed = (): Doc[] => [
  { id: 'kbis', label: 'Extrait Kbis', issuer: 'Greffe du tribunal de commerce de Lyon', group: 'societe', expires: dayOffset(52), file: 'kbis-benali-electricite.pdf', auto: true, renewMonths: 3 },
  { id: 'statuts', label: 'Statuts de la société', issuer: 'BENALI ELECTRICITE SARL', group: 'societe', file: 'statuts.pdf', renewMonths: 0 },
  { id: 'rib', label: 'RIB du compte pro', issuer: 'Qonto', group: 'societe', file: 'rib-qonto.pdf', renewMonths: 0 },
  { id: 'decennale', label: 'Attestation décennale', issuer: 'AXA · contrat n° 7845120', group: 'assurances', expires: `${new Date().getFullYear()}-12-31`, file: 'attestation-decennale-2026.pdf', renewMonths: 12 },
  { id: 'rcpro', label: 'Responsabilité civile pro', issuer: 'AXA', group: 'assurances', expires: dayOffset(196), file: 'rc-pro.pdf', renewMonths: 12 },
  { id: 'urssaf', label: 'Attestation de vigilance URSSAF', issuer: 'URSSAF Rhône-Alpes', group: 'attestations', expires: dayOffset(12), file: 'vigilance-urssaf.pdf', auto: true, renewMonths: 6 },
  { id: 'fiscale', label: 'Attestation de régularité fiscale', issuer: 'impots.gouv.fr', group: 'attestations', expires: dayOffset(143), file: 'regularite-fiscale.pdf', auto: true, renewMonths: 12 },
  { id: 'rge', label: 'Certificat RGE', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(38), file: 'rge-qualifelec.pdf', renewMonths: 12 },
  { id: 'qualifelec', label: 'Qualification Qualifelec E2', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(310), file: 'qualifelec-e2.pdf', renewMonths: 48 },
  { id: 'irve', label: 'Qualification IRVE P1', issuer: 'Qualifelec', group: 'qualifications', expires: dayOffset(-4), file: 'irve-p1.pdf', renewMonths: 48 },
];

const useDocs = create<{ docs: Doc[]; renew: (id: string, file?: string) => void }>()(
  persist(
    (set) => ({
      docs: seed(),
      renew: (id, file) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, file: file ?? d.file, expires: d.renewMonths ? dayOffset(Math.round(d.renewMonths * 30.4)) : d.expires } : d)) })),
    }),
    { name: 'brix-v2-documents', version: 1 },
  ),
);

const GROUPS: Record<Doc['group'], string> = { societe: 'Société', assurances: 'Assurances', attestations: 'Attestations sociales et fiscales', qualifications: 'Qualifications et labels' };
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const TENDER = ['kbis', 'urssaf', 'fiscale', 'decennale', 'rcpro'];

function state(d: Doc) {
  if (!d.expires) return { tone: 'neutral' as const, label: 'Sans date limite', days: Infinity };
  const days = daysBetween(todayISO(), d.expires);
  if (days < 0) return { tone: 'bad' as const, label: `Expiré depuis ${-days} jour${days < -1 ? 's' : ''}`, days };
  if (days <= 45) return { tone: 'warn' as const, label: `Expire dans ${days} jour${days > 1 ? 's' : ''}`, days };
  return { tone: 'ok' as const, label: `Valable jusqu'au ${dateFull(d.expires)}`, days };
}

export default function Documents() {
  const { docs, renew } = useDocs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [fetching, setFetching] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);

  const expired = docs.filter((d) => state(d).tone === 'bad');
  const soon = docs.filter((d) => state(d).tone === 'warn');
  const ok = docs.length - expired.length - soon.length;

  const upload = (id: string) => {
    setTarget(id);
    fileRef.current?.click();
  };
  const onFile = (f?: File) => {
    if (!f || !target) return;
    renew(target, f.name);
    toast(`${docs.find((d) => d.id === target)?.label} mise à jour`);
    setTarget(null);
  };
  const fetchAuto = (d: Doc) => {
    setFetching(d.id);
    setTimeout(() => {
      renew(d.id);
      setFetching(null);
      toast(`Bob a récupéré la nouvelle ${lc(d.label)} (démo)`);
    }, 1500);
  };
  const share = () => {
    const code = Math.random().toString(36).slice(2, 8);
    setLink(`https://brix.fr/d/${code}`);
  };
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Documents"
        subtitle="Le coffre de l'entreprise : toujours à jour, prêt à envoyer en un lien."
        actions={
          selecting ? (
            <>
              <Button onClick={() => { setSelecting(false); setPicked([]); }}>Annuler</Button>
              <Button variant="dawn" icon={<Link2 className="h-4 w-4" />} disabled={!picked.length} onClick={share}>Créer le lien ({picked.length})</Button>
            </>
          ) : (
            <>
              <Button icon={<FolderLock className="h-4 w-4" />} onClick={() => { setSelecting(true); setPicked(TENDER); }}>Dossier appel d'offres</Button>
              <Button variant="primary" icon={<Share2 className="h-4 w-4" />} onClick={() => setSelecting(true)}>Partager</Button>
            </>
          )
        }
      />
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

      <StatStrip cols={3}>
        <Stat label="À jour" value={<span className="text-ok">{ok}</span>} sub={`sur ${docs.length} documents`} />
        <Stat label="Expirent bientôt" value={<span className={soon.length ? 'text-warn' : ''}>{soon.length}</span>} sub="dans les 45 jours" />
        <Stat label="Expirés" value={<span className={expired.length ? 'text-bad' : ''}>{expired.length}</span>} sub={expired.length ? 'à remplacer avant le prochain chantier' : 'Aucun'} />
      </StatStrip>

      {(expired.length > 0 || soon.length > 0) && !selecting && (
        <Card className="flex items-start gap-3 p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">B</span>
          <p className="text-[14px] leading-relaxed">
            {expired.length > 0 && <>Ta {lc(expired[0].label)} a expiré : ne pose plus de borne avant de l'avoir renouvelée. </>}
            {soon.some((d) => d.auto) && <>Je récupère moi-même l'{lc(soon.find((d) => d.auto)!.label)} le jour où elle expire, tu n'as rien à faire.</>}
          </p>
        </Card>
      )}

      {(Object.keys(GROUPS) as Doc['group'][]).map((g) => (
        <section key={g}>
          <h2 className="mb-2 px-1 text-[13px] font-semibold text-ink-2">{GROUPS[g]}</h2>
          <Card className="overflow-hidden">
            {docs.filter((d) => d.group === g).map((d) => {
              const st = state(d);
              const on = picked.includes(d.id);
              return (
                <div key={d.id} onClick={selecting ? () => toggle(d.id) : undefined} className={cn('flex min-h-[64px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0', selecting && 'cursor-pointer hover:bg-[#fafafc]')}>
                  {selecting ? (
                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border', on ? 'border-ink bg-ink text-white' : 'border-line2')}>{on && <Check className="h-4 w-4" />}</span>
                  ) : (
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', st.tone === 'bad' ? 'bg-bad-bg text-bad' : st.tone === 'warn' ? 'bg-warn-bg text-warn' : 'bg-sub text-ink-2')}>
                      {st.tone === 'bad' || st.tone === 'warn' ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" strokeWidth={1.75} />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">{d.label}</div>
                    <div className="truncate text-[12px] text-ink-3">{d.issuer}</div>
                    <div className="mt-1 md:hidden"><Badge tone={st.tone}>{st.label}</Badge></div>
                  </div>
                  <div className="hidden md:block">{st.tone === 'ok' ? <span className="flex items-center gap-1 text-[12.5px] text-ink-2"><CheckCircle2 className="h-3.5 w-3.5 text-ok" />{st.label}</span> : <Badge tone={st.tone}>{st.label}</Badge>}</div>
                  {!selecting && (
                    <div className="flex shrink-0 items-center gap-1">
                      {d.auto && st.days <= 45 ? (
                        <Button size="sm" variant="soft" className="h-10 min-w-10 justify-center sm:h-8" loading={fetching === d.id} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => fetchAuto(d)}><span className="hidden sm:inline">Récupérer</span></Button>
                      ) : (
                        <Button size="sm" className="h-10 min-w-10 justify-center sm:h-8" variant={st.tone === 'bad' ? 'primary' : 'ghost'} icon={<Upload className="h-3.5 w-3.5" />} onClick={() => upload(d.id)}><span className="hidden sm:inline">{st.tone === 'bad' ? 'Remplacer' : 'Mettre à jour'}</span></Button>
                      )}
                      <button onClick={() => toast(`${d.file} téléchargé (démo)`)} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink" aria-label="Télécharger"><Download className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      ))}

      <Sheet open={!!link} onClose={() => { setLink(null); setSelecting(false); setPicked([]); }} title="Lien prêt à envoyer" subtitle={`${picked.length} document${picked.length > 1 ? 's' : ''} · valable 30 jours · consultations suivies`}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-sub px-3 py-3">
            <Link2 className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate font-medium">{link}</span>
          </div>
          <Button variant="primary" className="w-full justify-center" icon={<Copy className="h-4 w-4" />} onClick={() => { navigator.clipboard?.writeText(link ?? '').catch(() => {}); toast('Lien copié'); }}>Copier le lien</Button>
          <ul className="space-y-1 text-[12.5px] text-ink-2">
            {docs.filter((d) => picked.includes(d.id)).map((d) => <li key={d.id} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" />{d.label}</li>)}
          </ul>
          <p className="text-xs text-ink-3">Le lien affiche toujours la dernière version : si une attestation est renouvelée, votre client voit la nouvelle.</p>
        </div>
      </Sheet>
    </div>
  );
}
