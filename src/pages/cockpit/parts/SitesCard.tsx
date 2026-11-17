import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CornerDownRight } from 'lucide-react';
import { Ring } from '@/components/motion';
import { Avatar, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { Chantier } from '@/lib/types';
import type { CockpitData } from '../useCockpitData';

const marginOf = (c: Chantier) => {
  if (!c.budgetHt) return 0;
  const projected = c.costHt / Math.max(0.1, c.progress / 100);
  return Math.max(-20, Math.min(60, Math.round(((c.budgetHt - projected) / c.budgetHt) * 100)));
};

/** Chantiers en cours : une tuile par chantier, avec son anneau d'avancement. Défile au pouce sur téléphone. */
export function SitesCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const employees = useBrix((s) => s.employees);
  const list = [...data.activeChantiers].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.progress - a.progress).slice(0, 4);
  return (
    <section className={cn('min-w-0', className)} aria-label="Chantiers en cours">
      <div className="mb-2.5 flex items-end justify-between px-1">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.025em]">Chantiers en cours</h2>
          <p className="text-[12.5px] text-ink-3">{data.activeChantiers.length} actifs</p>
        </div>
        <button onClick={() => navigate('/app/chantiers')} className="-my-2 flex items-center gap-1 py-2 text-[12.5px] text-ink-2 transition hover:text-ink">Tous <ArrowUpRight className="h-3.5 w-3.5" /></button>
      </div>
      {list.length === 0 ? (
        <div className="rounded-[18px] bg-white px-5 py-8 text-center text-[13px] text-ink-3 shadow-card">Pas encore de chantier. Il se crée tout seul quand un devis est signé.</div>
      ) : (
        <div className="stagger-fast -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4 md:px-0 md:pb-0">
          {list.map((c) => {
            const m = marginOf(c);
            const [title, place] = c.name.split('·').map((x) => x.trim());
            return (
              <button key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}`)} className="lift flex w-[78%] shrink-0 snap-start flex-col rounded-[18px] bg-white p-4 text-left shadow-card md:w-auto">
                <div className="flex items-start gap-3">
                  <Ring value={c.progress} size={48} stroke={4} tone={c.progress >= 80 ? 'ok' : 'vi'}>{c.progress}%</Ring>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[14px] font-semibold tracking-[-0.01em]">{title}</b>
                    <span className="block truncate text-[12px] text-ink-3">{place ? `${place} · ` : ''}{c.city}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-2">
                  <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <span className="line-clamp-1">{c.nextStep}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="flex -space-x-1.5">
                    {c.team.map((id) => {
                      const e = employees.find((x) => x.id === id);
                      return e ? <Avatar key={id} initials={e.initials} color={e.color} size={24} ring /> : null;
                    })}
                  </span>
                  <span className={cn('num rounded-full px-2 py-0.5 text-[11.5px] font-semibold', m >= 30 ? 'bg-ok-bg text-ok' : m >= 15 ? 'bg-warn-bg text-warn' : 'bg-bad-bg text-bad')}>marge {m} %</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
