import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Eye, Send } from 'lucide-react';
import { useInView } from '@/components/motion';
import { cn } from '@/components/ui';
import { money, relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { CockpitData } from '../useCockpitData';

/** Devis en cours : une barre en 4 étapes qui se remplit, puis les devis chauds. */
export function PipelineCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const [ref, seen] = useInView<HTMLDivElement>();
  const stages = [
    { label: 'Brouillons', n: data.drafts.length, v: data.draftsTotal, c: 'bg-line2' },
    { label: 'Envoyés', n: data.sent.length, v: data.sentTotal, c: 'bg-vi-200' },
    { label: 'Vus', n: data.seen.length, v: data.seenTotal, c: 'bg-vi-400' },
    { label: 'Signés', n: data.signed.length, v: data.signedTotal, c: 'bg-vi-700' },
  ];
  const total = stages.reduce((a, s) => a + s.v, 0) || 1;
  const hot = data.pending.slice(0, 3);
  return (
    <section className={cn('flex flex-col overflow-hidden rounded-[20px] bg-white shadow-card', className)} aria-label="Devis en cours">
      <header className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Devis en cours</h2>
        <button onClick={() => navigate('/app/devis')} className="flex items-center gap-1 text-[12.5px] text-ink-2 transition hover:text-ink">Tous les devis <ArrowUpRight className="h-3.5 w-3.5" /></button>
      </header>
      <div ref={ref} className="px-5 pb-4 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="num text-[26px] font-semibold tracking-[-0.035em]">{money(data.pendingTotal, true)}</span>
          <span className="text-[12px] text-ink-3">à signer · {Math.round(data.signRate)} % signés d’habitude</span>
        </div>
        <div className="mt-3 flex h-2.5 gap-[3px]">
          {stages.map((s, i) => (
            <i key={s.label} className={cn('h-full rounded-full transition-[width] duration-[900ms] ease-out-quint', s.c)} style={{ width: seen ? `${Math.max(s.v ? 4 : 0, (s.v / total) * 100)}%` : '0%', transitionDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {stages.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3"><i className={cn('h-2 w-2 shrink-0 rounded-[3px]', s.c)} /><span className="truncate">{s.label}</span></div>
              <div className="num mt-0.5 truncate text-[13px] font-semibold">{s.n} <span className="font-normal text-ink-3">· {money(s.v, true)}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto border-t border-line">
        {hot.map(({ d, t }) => (
          <button key={d.id} onClick={() => navigate(`/app/devis/${d.id}`)} className="group flex min-h-[52px] w-full items-center gap-3 border-b border-line px-5 text-left transition-colors last:border-0 hover:bg-[#fbfaff]">
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', d.status === 'vu' ? 'bg-vi-50 text-vi-700' : 'bg-sub text-ink-3')}>
              {d.status === 'vu' ? <Eye className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{clients.find((c) => c.id === d.clientId)?.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{d.status === 'vu' ? `Ouvert ${d.views ?? 1} fois` : `Envoyé ${relative(d.sentAt ?? d.createdAt)}, pas encore ouvert`}</span>
            </span>
            <span className="num shrink-0 text-[13px] font-semibold">{money(t.ttc, true)}</span>
          </button>
        ))}
        {hot.length === 0 && <div className="px-5 py-6 text-center text-[13px] text-ink-3">Aucun devis en attente de signature.</div>}
      </div>
    </section>
  );
}
