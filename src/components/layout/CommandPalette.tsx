import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, CornerDownLeft, Search, X } from 'lucide-react';
import { IconTile, Kbd, cn } from '@/components/ui';
import { MODULES, TRADE_BY_KEY, type DepartmentKey } from '@/lib/catalog';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { devisExample } from '@/modules/bob/tradeExamples';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: string;
  dept: DepartmentKey;
  solid?: boolean;
  kbd?: string;
  run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ORDER = ['Actions', 'Demander à Bob', 'Clients', 'Devis', 'Factures', 'Chantiers', 'Outils métier', 'Aller à', 'Bob'];

/** Barre de commande universelle (⌘K) : tout trouver et tout lancer en 2 touches. */
export function CommandPalette() {
  const ui = useUI();
  const s = useBrix();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.set({ palette: !useUI.getState().palette });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        ui.set({ bob: !useUI.getState().bob, palette: false });
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  useEffect(() => {
    if (ui.palette) {
      setQ('');
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [ui.palette]);

  const close = () => ui.set({ palette: false });
  const go = (p: string) => () => {
    close();
    navigate(p);
  };
  const ask = (t: string) => () => {
    close();
    ui.askBob(t);
  };

  const cmds = useMemo<Cmd[]>(() => {
    const clientName = (id: string) => s.clients.find((c) => c.id === id)?.name;
    const list: Cmd[] = [
      { id: 'new-devis', group: 'Actions', label: 'Nouveau devis', icon: 'FileText', dept: 'vendre', kbd: 'N', run: go('/app/devis/nouveau') },
      { id: 'new-facture', group: 'Actions', label: 'Nouvelle facture', icon: 'Receipt', dept: 'facturer', run: go('/app/factures/nouvelle') },
      { id: 'new-client', group: 'Actions', label: 'Nouveau client', icon: 'Contact', dept: 'vendre', run: go('/app/clients?nouveau=1') },
      { id: 'new-chantier', group: 'Actions', label: 'Nouveau chantier', icon: 'HardHat', dept: 'chantiers', run: go('/app/chantiers?nouveau=1') },
    ];
    for (const m of MODULES.filter((m) => s.enabled.includes(m.key))) list.push({ id: 'm-' + m.key, group: 'Aller à', label: m.name, hint: m.short, icon: m.icon, dept: m.dept, run: go('/app/' + m.path) });
    const trade = TRADE_BY_KEY[s.company.trade];
    for (const t of trade?.tools ?? []) list.push({ id: 't-' + t.key, group: 'Outils métier', label: t.name, hint: t.short, icon: t.icon, dept: 'metier', run: go('/app/outils/' + t.key) });
    for (const c of s.clients) list.push({ id: 'c-' + c.id, group: 'Clients', label: c.name, hint: c.city, icon: 'Contact', dept: 'vendre', run: go('/app/clients/' + c.id) });
    for (const d of s.devis) list.push({ id: 'd-' + d.id, group: 'Devis', label: `${d.number} · ${d.title}`, hint: clientName(d.clientId), icon: 'FileText', dept: 'vendre', run: go('/app/devis/' + d.id) });
    for (const f of s.factures) list.push({ id: 'f-' + f.id, group: 'Factures', label: `${f.number} · ${f.title}`, hint: money(f.lines.reduce((a, l) => a + l.quantity * l.unitPriceHt, 0)) + ' HT', icon: 'Receipt', dept: 'facturer', run: go('/app/factures/' + f.id) });
    for (const c of s.chantiers) list.push({ id: 'ch-' + c.id, group: 'Chantiers', label: c.name, hint: c.city, icon: 'HardHat', dept: 'chantiers', run: go('/app/chantiers/' + c.id) });
    list.push({ id: 'reglages', group: 'Aller à', label: 'Réglages', icon: 'Settings', dept: 'gestion', run: go('/app/reglages') });
    return list;
  }, [s.enabled, s.clients, s.devis, s.factures, s.chantiers, s.company.trade]);

  const { results, found } = useMemo(() => {
    const raw = q.trim();
    const nq = norm(raw);
    if (!nq) {
      const bob: Cmd[] = [
        { id: 'b-devis', group: 'Demander à Bob', label: devisExample(s.company.trade), icon: 'AudioLines', dept: 'bob', solid: true, run: ask(devisExample(s.company.trade)) },
        { id: 'b-retard', group: 'Demander à Bob', label: 'Qui est en retard de paiement ?', icon: 'AudioLines', dept: 'bob', solid: true, kbd: '⌘J', run: ask('Qui est en retard de paiement ?') },
      ];
      return { results: [...cmds.filter((c) => c.group === 'Actions'), ...bob, ...cmds.filter((c) => c.group === 'Aller à').slice(0, 6)], found: true };
    }
    const hits = cmds
      .map((c) => {
        const label = norm(c.label);
        const score = label.startsWith(nq) ? 3 : label.split(/[\s·-]+/).some((w) => w.startsWith(nq)) ? 2 : norm(c.label + ' ' + (c.hint ?? '')).includes(nq) ? 1 : 0;
        return { c, score };
      })
      .filter((x) => x.score > 0);
    // Par section, les meilleurs d'abord ; 6 au plus par section.
    const groups = ORDER.map((g) => hits.filter((x) => x.c.group === g).sort((a, b) => b.score - a.score).slice(0, 6).map((x) => x.c));
    const flat = groups.flat();
    const bob: Cmd = { id: 'ask', group: 'Bob', label: `Demander à Bob : « ${raw} »`, icon: 'AudioLines', dept: 'bob', solid: true, run: ask(raw) };
    return { results: [...flat, bob], found: flat.length > 0 };
  }, [q, cmds, s.company.trade]);

  useEffect(() => setI(0), [q]);
  // Garde la ligne active visible quand on navigue au clavier.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [i]);

  if (!ui.palette) return null;
  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[calc(10px+var(--safe-t))] md:pt-[11vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#1b1236]/20 backdrop-blur-[6px]" onClick={close} />
      <div role="dialog" aria-label="Rechercher" className="relative flex max-h-[min(640px,calc(100dvh-24px))] w-full max-w-[640px] origin-top animate-[scale-in_.22s_var(--ease)_both] flex-col overflow-hidden rounded-[26px] bg-white/[.88] shadow-pop backdrop-blur-2xl backdrop-saturate-150">
        <div className="flex items-center gap-3 border-b border-[#efebf7] px-5">
          <Search className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => (x + 1) % results.length); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => (x - 1 + results.length) % results.length); }
              if (e.key === 'Enter') { e.preventDefault(); results[i]?.run(); }
              if (e.key === 'Escape') close();
            }}
            placeholder="Chercher un client, un devis, un outil… ou demander à Bob"
            aria-activedescendant={results[i] ? `cmd-${results[i].id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
          {q && (
            <button onClick={() => { setQ(''); inputRef.current?.focus(); }} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-sub hover:text-ink" aria-label="Effacer">
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="hidden md:inline-flex"><Kbd>Échap</Kbd></span>
          <button onClick={close} className="-mr-2 h-11 px-2 text-[14px] font-medium text-ink-2 md:hidden">Annuler</button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {!found && (
            <div className="animate-fade-in px-3 pb-2 pt-6 text-center">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sub text-ink-3"><Search className="h-5 w-5" strokeWidth={1.75} /></div>
              <div className="mt-3 text-[14px] font-semibold">Rien trouvé pour « {q.trim()} »</div>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-snug text-ink-2">Essayez un nom de client, un numéro de devis (D-2026-…) ou une ville. Ou posez la question à Bob :</p>
            </div>
          )}
          {results.map((c, idx) => {
            const head = c.group !== lastGroup ? (lastGroup = c.group) : null;
            const active = idx === i;
            return (
              <div key={c.id} className={cn(idx < 14 && 'animate-[fade-up_.28s_var(--ease)_both]')} style={idx < 14 ? { animationDelay: `${idx * 14}ms` } : undefined}>
                {head && head !== 'Bob' && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-3 first:pt-1.5">{head}</div>}
                {head === 'Bob' && found && <div className="mx-3 my-2 h-px bg-line" />}
                <button
                  id={`cmd-${c.id}`}
                  data-idx={idx}
                  onMouseMove={() => i !== idx && setI(idx)}
                  onClick={c.run}
                  className={cn('flex min-h-[48px] w-full items-center gap-3 rounded-[16px] px-2.5 py-1.5 text-left text-[13.5px] transition-[background,box-shadow] duration-150', active ? 'bg-white shadow-halo-sm' : 'hover:bg-white/60')}
                >
                  <IconTile name={c.icon} dept={c.dept} size="sm" solid={c.solid} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.label}</span>
                    {c.hint && <span className="block truncate text-[12px] text-ink-3 sm:hidden">{c.hint}</span>}
                  </span>
                  {c.hint && <span className="hidden max-w-[40%] truncate text-[12px] text-ink-3 sm:block">{c.hint}</span>}
                  {c.kbd && !active && <span className="hidden md:inline-flex"><Kbd>{c.kbd}</Kbd></span>}
                  <CornerDownLeft className={cn('h-3.5 w-3.5 shrink-0 text-ink-3 transition-opacity duration-150', active ? 'opacity-100' : 'opacity-0')} />
                </button>
              </div>
            );
          })}
        </div>

        <footer className="hidden items-center gap-4 border-t border-[#efebf7] bg-white/50 px-5 py-2.5 text-[11.5px] text-ink-3 md:flex">
          <span className="flex items-center gap-1.5"><Kbd><ArrowUp className="h-3 w-3" /></Kbd><Kbd><ArrowDown className="h-3 w-3" /></Kbd> naviguer</span>
          <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft className="h-3 w-3" /></Kbd> ouvrir</span>
          <span className="ml-auto flex items-center gap-1.5"><Kbd>⌘J</Kbd> parler à Bob</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
