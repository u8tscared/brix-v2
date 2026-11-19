// Morceaux de l'aperçu vivant : menu qui se remplit, devis du métier, indicateurs du cockpit.
import { LayoutDashboard } from 'lucide-react';
import { DEPARTMENTS, MODULES, TRADE_BY_KEY, type PriorityKey } from '@/lib/catalog';
import type { Draft } from '@/pages/onboarding/draft';
import { Ico, TONE, TRADE_ICON } from '@/pages/onboarding/icons';
import { PROFILS, eur, totalHt } from '@/pages/onboarding/metiers';
import { CountUp } from '@/pages/onboarding/ui';

/** Menu latéral : départements et outils activés, qui arrivent en cascade. */
export function PreviewMenu({ d, max = 99 }: { d: Draft; max?: number }) {
  const on = new Set(d.enabled);
  const t = d.trade ? TRADE_BY_KEY[d.trade] : undefined;
  let i = 0;
  let shown = 0;
  return (
    <nav aria-hidden className="space-y-0.5 text-[11.5px]">
      <div className="flex h-7 items-center gap-2 rounded-lg bg-[#f3f1f8] px-2 font-medium">
        <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.75} /> Cockpit
      </div>
      {t && (
        <div key={t.key}>
          <div className="px-2 pb-1 pt-3 text-[9.5px] font-medium uppercase tracking-[.06em] text-ink-3">{t.plural}</div>
          {t.tools.slice(0, 2).map((x) => (
            <div key={x.key} className="ob-rise flex h-7 items-center gap-2 px-2 text-ink-2" style={{ animationDelay: `${i++ * 45}ms` }}>
              <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px]" style={{ background: TONE.metier.bg, color: TONE.metier.fg }}>
                <Ico name="Ruler" className="h-[11px] w-[11px]" />
              </span>
              <span className="truncate">{x.name}</span>
            </div>
          ))}
        </div>
      )}
      {DEPARTMENTS.map((dep) => {
        if (shown >= max) return null;
        const mods = MODULES.filter((m) => m.dept === dep.key && on.has(m.key) && m.key !== 'outils_metier').slice(0, Math.max(0, max - shown));
        if (!mods.length) return null;
        shown += mods.length;
        const tone = TONE[dep.key];
        return (
          <div key={dep.key}>
            <div className="px-2 pb-1 pt-3 text-[9.5px] font-medium uppercase tracking-[.06em] text-ink-3">{dep.name}</div>
            {mods.map((m) => (
              <div key={m.key} className="ob-rise flex h-7 items-center gap-2 px-2 text-ink-2" style={{ animationDelay: `${Math.min(i++, 14) * 40}ms` }}>
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px]" style={{ background: tone.bg, color: tone.fg }}>
                  <Ico name={m.icon} className="h-[11px] w-[11px]" />
                </span>
                <span className="truncate">{m.name}</span>
              </div>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

/** Devis d'exemple du métier choisi, avec ses lignes et ses totaux. */
export function PreviewDevis({ d, lines = 4, compact }: { d: Draft; lines?: number; compact?: boolean }) {
  const key = d.trade ?? 'autre';
  const p = PROFILS[key];
  const ht = totalHt(p);
  const tva = (ht * p.tva) / 100;
  const I = TRADE_ICON[key];
  return (
    <div className="rounded-[14px] bg-white p-3.5 shadow-halo-sm">
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-dawn-diag text-white">
          <I className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
            <span className="bx-mono">D-2026-001</span> · {p.client}
          </div>
          <div key={key} className="ob-rise truncate text-[13px] font-semibold tracking-[-0.01em]">{p.titre}</div>
        </div>
        <span className="rounded-full bg-[#f3f1f8] px-2 py-0.5 text-[10px] font-medium text-ink-2">Brouillon</span>
      </div>
      <div key={`l${key}`} className="ob-cascade mt-3 divide-y divide-[#f0eff5] border-t border-[#f0eff5]">
        {p.lignes.slice(0, lines).map((l, i) => (
          <div key={l.l} className="flex items-baseline gap-2 py-[7px] text-[11.5px]" style={{ ['--i' as string]: i }}>
            <span className="min-w-0 flex-1 truncate text-ink">{l.l}</span>
            {!compact && <span className="num shrink-0 text-ink-3">{String(l.q).replace('.', ',')} {l.u}</span>}
            <span className="num w-[64px] shrink-0 text-right font-medium">{eur(l.q * l.pu)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-end justify-between border-t border-[#f0edf7] pt-2.5">
        <div className="text-[10.5px] leading-relaxed text-ink-3">
          <div className="num">Total HT {eur(ht)}</div>
          <div className="num">TVA {String(p.tva).replace('.', ',')} % {eur(tva)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-ink-3">Total TTC</div>
          <div className="text-[17px] font-semibold tracking-[-0.03em]"><CountUp value={ht + tva} format={(n) => eur(n)} /></div>
        </div>
      </div>
    </div>
  );
}

/** Vocabulaire du métier que Brix comprend (devis, dictée, Brix AI). */
export function PreviewVocab({ d }: { d: Draft }) {
  const key = d.trade ?? 'autre';
  const extra = d.secondary.flatMap((k) => PROFILS[k].vocab.slice(0, 1));
  return (
    <div key={key + extra.join()} className="ob-cascade flex flex-wrap gap-1.5">
      {[...PROFILS[key].vocab.slice(0, 4), ...extra].map((w, i) => (
        <span key={w} className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-medium text-ink-2 shadow-halo-sm" style={{ ['--i' as string]: i }}>{w}</span>
      ))}
    </div>
  );
}

const KPI: Record<PriorityKey, { l: string; v: string; s: string }> = {
  devis_rapides: { l: 'Devis en attente', v: '3', s: '1 à relancer' },
  argent: { l: 'À encaisser', v: '4 280 €', s: '2 factures' },
  organisation: { l: 'Chantiers', v: '3', s: 'cette semaine' },
  equipe: { l: 'Équipe', v: '4 sur 5', s: 'sur chantier' },
  clients: { l: 'Demandes', v: '6', s: 'nouvelles' },
  admin: { l: 'Documents', v: '100 %', s: 'à jour' },
  achats: { l: 'Commandes', v: '2', s: 'livrées jeudi' },
};

/** Indicateurs du cockpit, rangés dans l'ordre des priorités. */
export function PreviewKpis({ d }: { d: Draft }) {
  // Les priorités d'abord, complétées par des indicateurs par défaut (plus pâles).
  const defaults: PriorityKey[] = ['devis_rapides', 'argent', 'organisation', 'clients'];
  const keys = [...d.priorities, ...defaults.filter((k) => !d.priorities.includes(k))].slice(0, 3);
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k, i) => (
        <div key={k} className="ob-rise rounded-[12px] bg-white p-2.5 shadow-halo-sm transition-opacity duration-500" style={{ animationDelay: `${i * 60}ms`, opacity: d.priorities.includes(k) ? 1 : 0.55 }}>
          <div className="truncate text-[10px] text-ink-3">{KPI[k].l}</div>
          <div className="num mt-0.5 truncate text-[15px] font-semibold tracking-[-0.03em]">{KPI[k].v}</div>
          <div className="truncate text-[10px] text-ink-3">{KPI[k].s}</div>
        </div>
      ))}
    </div>
  );
}

/** Pastilles d'équipe selon la taille. */
export function TeamDots({ d }: { d: Draft }) {
  const n = { solo: 1, petite: 4, pme: 5, grande: 5 }[d.size ?? 'solo'];
  const more = { solo: 0, petite: 0, pme: 12, grande: 80 }[d.size ?? 'solo'];
  const init = (d.firstName || 'V')[0].toUpperCase();
  const others = ['K', 'S', 'M', 'L'];
  const colors = ['#130f26', '#0e7490', '#c2410c', '#6d28d9', '#0f766e'];
  return (
    <div key={d.size} className="flex items-center">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="ob-rise -ml-1.5 grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-semibold text-white ring-2 ring-white first:ml-0" style={{ background: colors[i], animationDelay: `${i * 70}ms` }}>
          {i === 0 ? init : others[i - 1]}
        </span>
      ))}
      {more > 0 && <span className="num ml-1.5 text-[10.5px] font-medium text-ink-2">+{more}</span>}
    </div>
  );
}

/** Téléphone : le menu en pastilles teintées par département. */
export function PreviewChips({ d }: { d: Draft }) {
  const on = new Set(d.enabled);
  const mods = MODULES.filter((m) => on.has(m.key));
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {mods.map((m, i) => {
        const t = TONE[m.dept];
        return (
          <span key={m.key} className="ob-rise inline-flex h-7 items-center gap-1.5 rounded-full bg-white pl-1 pr-2.5 text-[11.5px] font-medium text-ink-2 shadow-halo-sm" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
            <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: t.bg, color: t.fg }}><Ico name={m.icon} className="h-3 w-3" /></span>
            {m.name}
          </span>
        );
      })}
    </div>
  );
}
