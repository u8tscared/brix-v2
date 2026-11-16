import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AudioLines, CornerDownLeft, FileText, HardHat, Receipt, Search, User } from 'lucide-react';
import { Icon, Kbd, cn } from '@/components/ui';
import { MODULES, TRADE_BY_KEY } from '@/lib/catalog';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Barre de commande universelle (⌘K) : tout trouver et tout lancer en 2 touches. */
export function CommandPalette() {
  const ui = useUI();
  const s = useBrix();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.set({ palette: !useUI.getState().palette });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        ui.set({ bob: !useUI.getState().bob });
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

  const go = (p: string) => () => {
    ui.set({ palette: false });
    navigate(p);
  };

  const cmds = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      { id: 'new-devis', group: 'Actions', label: 'Nouveau devis', hint: 'N', icon: <FileText />, run: go('/app/devis/nouveau') },
      { id: 'new-facture', group: 'Actions', label: 'Nouvelle facture', icon: <Receipt />, run: go('/app/factures/nouvelle') },
      { id: 'new-client', group: 'Actions', label: 'Nouveau client', icon: <User />, run: go('/app/clients?nouveau=1') },
      { id: 'new-chantier', group: 'Actions', label: 'Nouveau chantier', icon: <HardHat />, run: go('/app/chantiers?nouveau=1') },
    ];
    for (const m of MODULES.filter((m) => s.enabled.includes(m.key))) list.push({ id: 'm-' + m.key, group: 'Aller à', label: m.name, hint: m.short, icon: <Icon name={m.icon} />, run: go('/app/' + m.path) });
    const trade = TRADE_BY_KEY[s.company.trade];
    for (const t of trade?.tools ?? []) list.push({ id: 't-' + t.key, group: 'Outils métier', label: t.name, hint: t.short, icon: <Icon name={t.icon} />, run: go('/app/outils/' + t.key) });
    for (const c of s.clients) list.push({ id: 'c-' + c.id, group: 'Clients', label: c.name, hint: c.city, icon: <User />, run: go('/app/clients/' + c.id) });
    for (const d of s.devis) list.push({ id: 'd-' + d.id, group: 'Devis', label: `${d.number} · ${d.title}`, hint: s.clients.find((c) => c.id === d.clientId)?.name, icon: <FileText />, run: go('/app/devis/' + d.id) });
    for (const f of s.factures) list.push({ id: 'f-' + f.id, group: 'Factures', label: `${f.number} · ${f.title}`, hint: money(f.lines.reduce((a, l) => a + l.quantity * l.unitPriceHt, 0)) + ' HT', icon: <Receipt />, run: go('/app/factures/' + f.id) });
    for (const c of s.chantiers) list.push({ id: 'ch-' + c.id, group: 'Chantiers', label: c.name, hint: c.city, icon: <HardHat />, run: go('/app/chantiers/' + c.id) });
    list.push({ id: 'reglages', group: 'Aller à', label: 'Réglages', icon: <Icon name="Settings" />, run: go('/app/reglages') });
    return list;
  }, [s.enabled, s.clients, s.devis, s.factures, s.chantiers, s.company.trade]);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    const base = nq ? cmds.filter((c) => norm(c.label + ' ' + (c.hint ?? '')).includes(nq)) : cmds.filter((c) => c.group === 'Actions' || c.group === 'Aller à').slice(0, 12);
    const ask: Cmd[] = nq ? [{ id: 'ask', group: 'Bob', label: `Demander à Bob : « ${q.trim()} »`, icon: <AudioLines />, run: () => ui.askBob(q.trim()) }] : [];
    return [...base.slice(0, 30), ...ask];
  }, [q, cmds]);

  useEffect(() => setI(0), [q]);

  if (!ui.palette) return null;
  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[10vh]">
      <div className="absolute inset-0 bg-[#17171f]/30 backdrop-blur-[2px]" onClick={() => ui.set({ palette: false })} />
      <div className="relative w-full max-w-[620px] animate-scale-in overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-[18px] w-[18px] text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(results.length - 1, x + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              if (e.key === 'Enter') results[i]?.run();
              if (e.key === 'Escape') ui.set({ palette: false });
            }}
            placeholder="Chercher un client, un devis, un outil… ou demander à Bob"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          />
          <Kbd>Échap</Kbd>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {results.length === 0 && <div className="px-3 py-10 text-center text-sm text-ink-3">Rien trouvé.</div>}
          {results.map((c, idx) => {
            const head = c.group !== lastGroup ? (lastGroup = c.group) : null;
            return (
              <div key={c.id}>
                {head && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.05em] text-ink-3">{head}</div>}
                <button
                  onMouseMove={() => setI(idx)}
                  onClick={c.run}
                  className={cn('flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[13.5px]', idx === i ? 'bg-sub' : '')}
                >
                  <span className={cn('grid h-7 w-7 place-items-center rounded-lg [&_svg]:h-4 [&_svg]:w-4', c.group === 'Bob' ? 'bg-ink text-white' : 'bg-vi-50 text-vi-700')}>{c.icon}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>
                  {c.hint && <span className="hidden max-w-[45%] truncate text-xs text-ink-3 sm:block">{c.hint}</span>}
                  {idx === i ? <CornerDownLeft className="h-3.5 w-3.5 text-ink-3" /> : <ArrowRight className="h-3.5 w-3.5 text-transparent" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
