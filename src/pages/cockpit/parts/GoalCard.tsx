import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { AnimatedNumber, Ring } from '@/components/motion';
import { Card, Chip, cn } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { money } from '@/lib/format';
import type { CockpitData } from '../useCockpitData';

const eur = (n: number) => money(n, true);

/** Le chiffre qui compte : l'argent encaissé ce mois-ci, avec l'anneau d'objectif qui se ferme. */
export function GoalCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 640px)');
  const pct = Math.min(100, (data.paidThisMonth / data.goal) * 100);
  const reached = data.remaining <= 0;
  const covers = data.toCollect >= data.remaining;
  const ring = wide ? { size: 150, stroke: 12 } : { size: 104, stroke: 10 };

  return (
    <Card className={cn('relative overflow-hidden p-5 sm:p-7', className)} aria-label="Objectif du mois">
      <div className="flex items-center gap-5 sm:gap-8">
        <Ring value={pct} size={ring.size} stroke={ring.stroke} tone="dawn">
          <span className="flex flex-col items-center leading-none">
            <span className={cn('num-halo', wide ? 'text-[30px]' : 'text-[22px]')}>
              <AnimatedNumber value={Math.round(pct)} duration={1400} delay={200} /> %
            </span>
            <span className="mt-1 text-[11.5px] font-normal text-ink-3 sm:text-[12px]">de l’objectif</span>
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="label-halo">Encaissé en {data.monthLabel}</div>
          <AnimatedNumber value={data.paidThisMonth} format={eur} duration={1100} className="num-halo mt-1 block text-[34px] text-ink sm:text-[48px]" />
          <p className="mt-1.5 hidden text-[13.5px] leading-snug text-ink-2 sm:block">
            <Sentence data={data} reached={reached} covers={covers} />
          </p>
          <div className="mt-3.5 hidden flex-wrap gap-2 sm:flex">
            <Chips data={data} />
          </div>
        </div>
      </div>
      <p className="mt-4 text-[13.5px] leading-snug text-ink-2 sm:hidden">
        <Sentence data={data} reached={reached} covers={covers} />
      </p>
      <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
        <Chips data={data} />
      </div>
      <button onClick={() => navigate('/app/factures')} className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vi-300" aria-label="Voir les factures et paiements" />
    </Card>
  );
}

function Sentence({ data, reached, covers }: { data: CockpitData; reached: boolean; covers: boolean }) {
  if (reached)
    return (
      <>
        Objectif de <b className="num font-semibold text-ink">{eur(data.goal)}</b> atteint. Tout ce qui rentre maintenant, c’est du bonus.
      </>
    );
  const n = data.unpaidCount;
  return (
    <>
      Encore <b className="num font-semibold text-ink">{eur(data.remaining)}</b> pour atteindre {eur(data.goal)}.{' '}
      {n > 0 ? (covers ? `Les ${n} facture${n > 1 ? 's' : ''} en attente suffisent.` : `Les ${n} facture${n > 1 ? 's' : ''} en attente en couvrent une partie.`) : 'Pensez à facturer les chantiers terminés.'}
    </>
  );
}

function Chips({ data }: { data: CockpitData }) {
  const up = data.diff >= 0;
  return (
    <>
      {data.trend !== null && (
        <Chip tone={up ? 'ok' : 'warn'} icon={up ? <TrendingUp /> : <TrendingDown />}>
          {up ? '+' : '−'}
          {Math.abs(data.trend)} % vs {data.prevMonthLabel}
        </Chip>
      )}
      {data.bestOfYear ? (
        <Chip tone="violet" icon={<Trophy />}>
          Meilleur mois de l’année
        </Chip>
      ) : (
        <Chip tone="violet" icon={<Wallet />}>
          Trésorerie à 30 jours : {eur(data.cash30)}
        </Chip>
      )}
    </>
  );
}
