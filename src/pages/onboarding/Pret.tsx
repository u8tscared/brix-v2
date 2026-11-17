// Écran final « Votre Brix est prêt » : construction en briques, récapitulatif, données de départ et import.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Database, FileUp, Sprout, X } from 'lucide-react';
import { DEPARTMENTS, MODULES, OFFERS, PRIORITIES, SIZES, TRADE_BY_KEY } from '@/lib/catalog';
import { BrandTile } from '@/parcours/marque';
import { recommendedPlan, reducedMotion, type Draft } from './draft';
import { DEPT_ICON, TONE } from './icons';
import { parseClientsCsv, type ClientImporte } from './finish';
import { CheckDot, Toggle } from './ui';

const LOGICIELS = ['Obat', 'Tolteck', 'Batappli', 'EBP Bâtiment', 'Sage Batigest', 'Codial', 'Excel', 'Autre'];

interface Props {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  imported: ClientImporte[];
  setImported: (c: ClientImporte[]) => void;
  onBack: () => void;
  onOpen: () => void;
  instant?: boolean;
}

export function Pret({ d, set, imported, setImported, onBack, onOpen, instant }: Props) {
  const bricks = useMemo(() => {
    const on = new Set(d.enabled);
    return DEPARTMENTS.map((dep) => ({ dep, n: MODULES.filter((m) => m.dept === dep.key && on.has(m.key)).length })).filter((b) => b.n > 0);
  }, [d.enabled]);
  const [ready, setReady] = useState(!!instant || reducedMotion());
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), bricks.length * 110 + 1100);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (ready) document.getElementById('ob-pret-title')?.focus({ preventScroll: true });
  }, [ready]);

  const trade = TRADE_BY_KEY[d.trade ?? 'autre'];
  const offer = OFFERS.find((o) => o.key === (d.plan ?? recommendedPlan(d)))!;

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-40 pt-8 md:px-8 md:pt-14">
      {/* Construction */}
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center text-center">
        <div className="relative mb-6 grid h-[84px] w-[84px] place-items-center">
          {ready && <span className="ob-glow" aria-hidden />}
          {ready ? (
            <span className="ob-tile-in relative"><BrandTile size={84} animated /></span>
          ) : (
            <span className="relative grid h-[84px] w-[84px] place-items-center rounded-[22px] bg-white shadow-[0_0_0_1px_#ececf1]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e4e2ee] border-t-[#130f26]" aria-hidden />
            </span>
          )}
        </div>
        <h1 id="ob-pret-title" tabIndex={-1} className="ob-title outline-none" aria-live="polite">
          {ready ? 'Votre Brix est prêt' : 'On pose les briques…'}
        </h1>
        <p className="ob-lead mt-3 max-w-[460px]">
          {ready
            ? `${d.companyName.trim() || 'Votre entreprise'} a ${d.enabled.length} outils pensés pour les ${trade.plural.toLowerCase()}. Encore deux choix et c'est parti.`
            : `Installation des outils, des ouvrages et des prix ${trade.plural.toLowerCase()}.`}
        </p>
        <div className="mt-8 flex max-w-[600px] flex-wrap justify-center gap-2" aria-hidden>
          {bricks.map((b, i) => {
            const I = DEPT_ICON[b.dep.key];
            const t = TONE[b.dep.key];
            return (
              <span key={b.dep.key} className={instant ? '' : 'ob-brick'} style={{ ['--i' as string]: i, ['--r' as string]: `${i % 2 ? 5 : -5}deg` }}>
                <span className="flex h-11 items-center gap-2 rounded-[12px] bg-white pl-1.5 pr-3.5 text-[13px] font-medium shadow-[0_0_0_1px_#ececf1,0_6px_14px_-10px_rgba(45,20,90,.35)]">
                  <span className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ background: t.bg, color: t.fg }}><I className="h-4 w-4" strokeWidth={1.75} /></span>
                  {b.dep.name}
                  <span className="num text-[12px] text-[#9898a8]">{b.n}</span>
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {ready && (
        <div className="ob-rise mt-12 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-6" style={{ animationDelay: instant ? '0ms' : '250ms' }}>
          <Recap d={d} offerName={offer.name} />
          <div className="space-y-4">
            <section className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_#ececf1]" aria-labelledby="ob-start">
              <h2 id="ob-start" className="text-[16px] font-semibold tracking-[-0.02em]">Comment voulez-vous commencer ?</h2>
              <div role="radiogroup" aria-labelledby="ob-start" className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                {[
                  { v: true, I: Database, t: 'Avec des exemples de mon métier', s: `Clients, devis et chantiers fictifs de ${trade.plural.toLowerCase()} pour tout essayer. Supprimables en un geste.` },
                  { v: false, I: Sprout, t: 'Partir de zéro', s: 'Un Brix vide, prêt pour vos vrais clients et vos vrais prix.' },
                ].map((o) => (
                  <button key={String(o.v)} type="button" role="radio" aria-checked={d.withDemo === o.v} onClick={() => set({ withDemo: o.v })} className="ob-card flex flex-col items-start p-4 pr-10">
                    <span className="ob-tile" style={{ width: 36, height: 36, borderRadius: 11, background: d.withDemo === o.v ? '#130f26' : '#f4f3fa', color: d.withDemo === o.v ? '#fff' : '#130f26' }}>
                      <o.I className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="mt-3 text-[14px] font-semibold tracking-[-0.01em]">{o.t}</span>
                    <span className="mt-1 text-[12.5px] leading-snug text-[#9898a8]">{o.s}</span>
                    {d.withDemo === o.v && <CheckDot />}
                  </button>
                ))}
              </div>
            </section>
            <Import d={d} set={set} imported={imported} setImported={setImported} />
            <label className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[22px] bg-white px-5 py-3 shadow-[0_0_0_1px_#ececf1]">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-[-0.01em]">Visite guidée à l'ouverture</span>
                <span className="block text-[12.5px] text-[#9898a8]">Les 5 écrans clés de Brix, en une minute.</span>
              </span>
              <Toggle on={d.tour} onChange={(v) => set({ tour: v })} label="Visite guidée" />
            </label>
          </div>
        </div>
      )}

      {ready && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ececf1] bg-[#f4f3fa]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-[1040px] items-center gap-3 px-4 md:px-8">
            <button type="button" onClick={onBack} className="ob-btn ob-btn-ghost h-12 w-12 px-0 sm:w-auto sm:px-4" aria-label="Modifier mes réponses">
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} /> <span className="hidden sm:inline">Modifier mes réponses</span>
            </button>
            <span className="flex-1" />
            <button type="button" onClick={onOpen} className="bx-btn-dawn ob-btn h-12 flex-1 px-6 sm:flex-none">
              Ouvrir mon Brix <ArrowRight className="h-4 w-4" strokeWidth={2} />
              <span className="ob-kbd">Entrée</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Recap({ d, offerName }: { d: Draft; offerName: string }) {
  const trade = TRADE_BY_KEY[d.trade ?? 'autre'];
  const rows: [string, string][] = [
    ['Entreprise', d.companyName.trim() || 'À compléter'],
    ['Métier', [trade.name, ...d.secondary.map((k) => TRADE_BY_KEY[k].name)].join(', ')],
    ['Taille', SIZES.find((s) => s.key === d.size)?.range ?? 'Seul'],
    ['Priorités', d.priorities.map((p) => PRIORITIES.find((x) => x.key === p)!.label).join(' · ') || 'Aucune'],
    ['Outils', `${d.enabled.length} dans votre menu`],
    ['Offre', `${offerName}, 14 jours offerts`],
    ['Accès', d.email || 'À compléter'],
  ];
  return (
    <section className="order-last h-fit rounded-[22px] bg-white p-5 md:order-none shadow-[0_0_0_1px_#ececf1]" aria-labelledby="ob-recap">
      <h2 id="ob-recap" className="text-[16px] font-semibold tracking-[-0.02em]">Récapitulatif</h2>
      <dl className="ob-cascade mt-3 divide-y divide-[#f0eff5]">
        {rows.map(([k, v], i) => (
          <div key={k} className="flex gap-4 py-2.5 text-[13.5px]" style={{ ['--i' as string]: i }}>
            <dt className="w-[86px] shrink-0 text-[#9898a8]">{k}</dt>
            <dd className="min-w-0 flex-1 break-words font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Import({ d, set, imported, setImported }: Pick<Props, 'd' | 'set' | 'imported' | 'setImported'>) {
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string>();
  const [err, setErr] = useState<string>();
  const read = (f?: File) => {
    if (!f) return;
    setErr(undefined);
    f.text().then((txt) => {
      const rows = parseClientsCsv(txt);
      if (!rows.length) {
        setErr('Aucun client trouvé. Vérifiez que la première ligne contient les titres des colonnes.');
        return;
      }
      setFile(f.name);
      setImported(rows);
    });
  };
  return (
    <section className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_#ececf1]" aria-labelledby="ob-imp">
      <h2 id="ob-imp" className="text-[16px] font-semibold tracking-[-0.02em]">Récupérer vos données <span className="font-normal text-[#9898a8]">(facultatif)</span></h2>
      {imported.length ? (
        <div className="ob-rise mt-3.5 flex items-center gap-3 rounded-2xl bg-[#ecfdf3] p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#16a34a]"><FileUp className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
          <span className="min-w-0 flex-1 text-[13px]">
            <b className="num block font-semibold">{imported.length} clients prêts à importer</b>
            <span className="block truncate text-[#5f5f70]">{imported.slice(0, 3).map((c) => c.name).join(', ')}{imported.length > 3 ? '…' : ''}</span>
          </span>
          <button type="button" onClick={() => { setImported([]); setFile(undefined); }} className="grid h-11 w-11 place-items-center rounded-xl text-[#5f5f70] hover:bg-white" aria-label={`Retirer ${file ?? 'le fichier'}`}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <label
          className="ob-drop mt-3.5 flex min-h-[88px] cursor-pointer items-center gap-3.5 p-4"
          data-over={over}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); read(e.dataTransfer.files[0]); }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4f3fa]"><FileUp className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden /></span>
          <span className="text-[13px] leading-snug text-[#5f5f70]">
            <b className="block font-semibold text-[#130f26]">Déposez votre fichier clients</b>
            CSV ou export Excel. Nom, e-mail, téléphone, ville : Brix reconnaît les colonnes.
          </span>
          <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
        </label>
      )}
      {err && <p className="mt-2 text-[12.5px] text-[#dc2626]" role="alert">{err}</p>}

      <h3 className="mb-2.5 mt-5 text-[13.5px] font-medium text-[#5f5f70]">Vous venez d'un autre logiciel ?</h3>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ancien logiciel">
        {LOGICIELS.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={d.importFrom === x} onClick={() => set({ importFrom: d.importFrom === x ? undefined : x })}
            className={`h-10 rounded-full px-3.5 text-[13px] font-medium transition ${d.importFrom === x ? 'bg-[#130f26] text-white' : 'bg-[#f4f3fa] text-[#5f5f70] hover:text-[#130f26]'}`}>
            {x}
          </button>
        ))}
      </div>
      {d.importFrom && (
        <p key={d.importFrom} className="ob-rise mt-3 text-[12.5px] leading-relaxed text-[#5f5f70]">
          {d.importFrom === 'Autre' || d.importFrom === 'Excel'
            ? 'Exportez vos clients et vos prix en CSV, puis déposez le fichier ci-dessus. Bob s\'adapte aux colonnes.'
            : `Dans ${d.importFrom}, exportez vos clients, votre bibliothèque de prix et vos devis (format CSV ou Excel). Déposez le fichier clients ici, le reste se reprend depuis Réglages, Import.`}
        </p>
      )}
    </section>
  );
}
