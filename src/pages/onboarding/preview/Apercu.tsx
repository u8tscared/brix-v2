// Aperçu vivant de l'app qui se construit : grand panneau à droite (ordinateur), bandeau repliable (téléphone).
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { OFFERS, SIZES, TRADE_BY_KEY } from '@/lib/catalog';
import { BrandTile } from '@/parcours/marque';
import { recommendedPlan, type Draft } from '@/pages/onboarding/draft';
import { PreviewChips, PreviewDevis, PreviewKpis, PreviewMenu, PreviewVocab, TeamDots } from './parts';

// Zone mise en lumière à chaque étape.
const FOCUS = ['devis', 'tete', 'kpis', 'menu', 'tete'] as const;

const CAPTION = [
  'Vos ouvrages, vos prix et votre vocabulaire arrivent avec votre métier.',
  'L\'interface s\'adapte à votre taille : rien d\'inutile si vous êtes seul.',
  'Votre cockpit montre d\'abord ce qui compte pour vous.',
  'Votre menu ne contient que les outils que vous gardez.',
  'Encore une étape et tout est prêt.',
];

const useView = (d: Draft) => {
  const mode = SIZES.find((s) => s.key === d.size)?.mode;
  const offer = OFFERS.find((o) => o.key === (d.plan ?? recommendedPlan(d)))!;
  const trade = d.trade ? TRADE_BY_KEY[d.trade] : undefined;
  return { mode, offer, trade };
};

export function ApercuDesktop({ d, step }: { d: Draft; step: number }) {
  const { mode, offer } = useView(d);
  const f = FOCUS[Math.min(step, FOCUS.length - 1)];
  const spot = (k: (typeof FOCUS)[number]) => ({ 'data-on': String(f === k) });
  const hello = d.firstName.trim() ? `Bonjour ${d.firstName.trim()}` : 'Bonjour';
  return (
    <div className="ob-stage flex h-full flex-col p-8 xl:p-10" aria-label="Aperçu de votre Brix" role="img">
      <div className="relative z-[1] mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#5f5f70]"><span className="ob-dot-live" /> Aperçu en direct</div>
          <p key={step} className="ob-rise mt-1.5 max-w-[380px] text-[14px] leading-snug text-[#130f26]">{CAPTION[Math.min(step, 4)]}</p>
        </div>
        <div className="num shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[12px] font-medium text-[#5f5f70] backdrop-blur">{d.enabled.length} outils · {offer.name}</div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="ob-window flex h-full max-h-[620px] w-full max-w-[640px] flex-col overflow-hidden">
          <div {...spot('tete')} className="ob-spot m-1.5 flex h-11 shrink-0 items-center gap-2.5 px-2.5">
            <BrandTile size={22} />
            <span className="h-4 w-px bg-[#ececf1]" />
            <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">{d.companyName.trim() || 'Votre entreprise'}</span>
            {mode && <span key={mode} className="ob-rise rounded-full bg-[#f4f3fa] px-2 py-0.5 text-[10.5px] font-medium text-[#5f5f70]">Mode {mode}</span>}
            <span className="ml-auto" />
            <TeamDots d={d} />
          </div>
          <div className="flex min-h-0 flex-1 border-t border-[#ececf1]">
            <aside {...spot('menu')} className="ob-spot relative m-1.5 w-[34%] max-w-[200px] shrink-0 overflow-hidden p-1.5">
              <PreviewMenu d={d} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
            </aside>
            <main className="relative min-w-0 flex-1 overflow-hidden bg-[#fafafc] p-4">
              <div {...spot('tete')} className="ob-spot -m-1 mb-3 p-1">
                <div className="text-[16px] font-semibold tracking-[-0.03em]">{hello}</div>
                <div className="text-[11px] text-[#9898a8]">Voici votre journée, {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              </div>
              <div {...spot('kpis')} className="ob-spot -m-1 mb-3 p-1"><PreviewKpis d={d} /></div>
              <div {...spot('devis')} className="ob-spot -m-1 space-y-2.5 p-1">
                <PreviewDevis d={d} />
                <div>
                  <div className="mb-1.5 text-[10px] font-medium text-[#9898a8]">Brix comprend votre métier</div>
                  <PreviewVocab d={d} />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#fafafc] to-transparent" />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Téléphone : bandeau compact sous l'en-tête, qui se déplie pour voir l'app en cours de construction. */
export function ApercuMobile({ d }: { d: Draft }) {
  const [open, setOpen] = useState(false);
  const { offer, trade } = useView(d);
  return (
    <div className="rounded-[18px] bg-white shadow-[0_0_0_1px_#ececf1,0_8px_24px_-16px_rgba(45,20,90,.25)]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="ob-apercu" className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2 text-left">
        <BrandTile size={30} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-[-0.01em]">
            Votre Brix <span className="ob-dot-live" aria-hidden />
          </span>
          <span key={`${d.enabled.length}${trade?.key}`} className="ob-rise block truncate text-[12px] text-[#9898a8]">
            {d.enabled.length} outils · {offer.name} · {trade ? trade.name : 'choisissez un métier'}
          </span>
        </span>
        <span className="text-[12px] font-medium text-[#5f5f70]">{open ? 'Masquer' : 'Aperçu'}</span>
        <ChevronDown className="h-4 w-4 text-[#5f5f70] transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'none' }} strokeWidth={1.75} aria-hidden />
      </button>
      <div id="ob-apercu" className="ob-collapse" data-open={open}>
        <div>
          <div className="space-y-3 border-t border-[#ececf1] p-3.5">
            <PreviewDevis d={d} lines={3} compact />
            <PreviewVocab d={d} />
            <div>
              <div className="mb-1.5 text-[11px] font-medium text-[#9898a8]">Votre menu</div>
              <PreviewChips d={d} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
