import { useNavigate } from 'react-router-dom';
import { Eye, Send } from 'lucide-react';
import { AnimatedNumber, useInView } from '@/components/motion';
import { Card, IconTile, cn } from '@/components/ui';
import { money, relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { CockpitData } from '../useCockpitData';
import { CardTitle } from './CardTitle';

const eur = (n: number) => money(n, true);

/** Devis en cours : une barre en 4 étapes qui se remplit, puis les devis chauds. */
export function PipelineCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const [ref, seen] = useInView<HTMLDivElement>();
  const stages = [
    { label: 'Brouillons', n: data.drafts.length, v: data.draftsTotal, c: '#ddd8ea' },
    { label: 'Envoyés', n: data.sent.length, v: data.sentTotal, c: '#a78bfa' },
    { label: 'Vus', n: data.seen.length, v: data.seenTotal, c: '#e879f9' },
    { label: 'Signés', n: data.signed.length, v: data.signedTotal, c: '#34d399' },
  ];
  const total = stages.reduce((a, s) => a + s.v, 0) || 1;
  const hot = data.pending.slice(0, 3);
  return (
    <Card className={cn('flex flex-col p-5', className)} aria-label="Devis en cours">
      <CardTitle title="Devis en cours" meta={`${Math.round(data.signRate)} % signés d’habitude`} action="Tous" onAction={() => navigate('/app/devis')} />
      <div ref={ref} className="mt-3">
        <div className="flex items-baseline gap-2">
          <AnimatedNumber value={data.pendingTotal} format={eur} className="num-halo text-[30px] text-ink" />
          <span className="text-[12.5px] text-ink-3">à signer</span>
        </div>
        <div className="mt-3 flex h-2 gap-[3px]">
          {stages.map((s, i) => (
            <i key={s.label} className="h-full rounded-full transition-[width] duration-[900ms] ease-out-quint" style={{ background: s.c, width: seen ? `${Math.max(s.v ? 4 : 0, (s.v / total) * 100)}%` : '0%', transitionDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {stages.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.c }} />
                <span className="truncate">{s.label}</span>
              </div>
              <div className="num mt-0.5 truncate text-[13px] font-semibold">{s.n}</div>
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-3 border-t border-[#f2eff8] pt-1">
        {hot.map(({ d, t }) => (
          <li key={d.id}>
            <button onClick={() => navigate(`/app/devis/${d.id}`)} className="group -mx-2 flex min-h-[54px] w-[calc(100%+16px)] items-center gap-3 rounded-[14px] px-2 text-left transition-colors hover:bg-halo-hover">
              <IconTile icon={d.status === 'vu' ? <Eye /> : <Send />} tone={d.status === 'vu' ? 'mag' : 'violet'} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{clients.find((c) => c.id === d.clientId)?.name}</span>
                <span className="block truncate text-[12px] text-ink-3">{d.status === 'vu' ? `Ouvert ${d.views ?? 1} fois` : `Envoyé ${relative(d.sentAt ?? d.createdAt)}, pas encore ouvert`}</span>
              </span>
              <span className="num shrink-0 text-[13.5px] font-semibold">{eur(t.ttc)}</span>
            </button>
          </li>
        ))}
        {hot.length === 0 && <li className="py-5 text-center text-[13px] text-ink-3">Aucun devis en attente de signature.</li>}
      </ul>
    </Card>
  );
}
