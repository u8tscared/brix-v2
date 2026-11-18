import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, FileSignature, HardHat, Hourglass } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';
import { Card, IconTile, cn, type HaloTone } from '@/components/ui';
import { money } from '@/lib/format';
import type { CockpitData } from '../useCockpitData';

const eur = (n: number) => money(n, true);

/** Trois cartes chiffrées avec pastille : devis à signer, à encaisser, chantiers. Défilent au pouce sur téléphone. */
export function KpiCards({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const site = data.agenda.find((e) => e.chantierId);
  const siteName = site ? data.activeChantiers.find((c) => c.id === site.chantierId)?.name.split('·')[0].trim() : undefined;
  const cards: { tone: HaloTone; icon: JSX.Element; label: string; value: number; sub: React.ReactNode; to: string }[] = [
    { tone: 'violet', icon: <FileSignature />, label: 'Devis à signer', value: data.pending.length, sub: `${eur(data.pendingTotal)} en jeu`, to: '/app/devis' },
    {
      tone: 'peach',
      icon: <Hourglass />,
      label: 'À encaisser',
      value: data.unpaidCount,
      sub: (
        <>
          {eur(data.toCollect)}
          {data.late.length > 0 && <span className="text-deep-r">, dont {data.late.length} en retard</span>}
        </>
      ),
      to: '/app/factures',
    },
    { tone: 'green', icon: <HardHat />, label: 'Chantiers en cours', value: data.activeChantiers.length, sub: siteName ? `${siteName} aujourd’hui à ${site!.start.replace(':', ' h ').replace(/ 00$/, '')}` : 'Rien de prévu aujourd’hui', to: '/app/chantiers' },
  ];
  return (
    <div className={cn('-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0', className)}>
      {cards.map((c, i) => (
        <Card key={c.label} interactive onClick={() => navigate(c.to)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(c.to)} className="group w-[62%] shrink-0 snap-start p-5 sm:w-auto">
          <div className="flex items-start justify-between">
            <IconTile icon={c.icon} tone={c.tone} className="transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:-rotate-6" />
            <ArrowUpRight className="h-[18px] w-[18px] text-[#b7b3c7] transition duration-300 ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
          </div>
          <div className="label-halo mt-4">{c.label}</div>
          <AnimatedNumber value={c.value} delay={150 + i * 90} className="num-halo mt-0.5 block text-[30px] text-ink" />
          <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{c.sub}</div>
        </Card>
      ))}
    </div>
  );
}
