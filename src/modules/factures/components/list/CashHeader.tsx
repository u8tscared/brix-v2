import { ArrowRight, ArrowUpRight, Hourglass, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Chip, IconTile, cn } from '@/components/ui';
import { AnimatedNumber, Ring } from '@/components/motion';
import { money, monthName } from '@/lib/format';

export type CashFilter = 'a_encaisser' | 'en_retard' | 'payees';

interface Props {
  cashed: number;
  cashedCount: number;
  onTime: number;
  onTimeCount: number;
  late: number;
  lateCount: number;
  active: string;
  onPick: (f: CashFilter) => void;
}

/**
 * En-tête de trésorerie Halo : carte héros avec l'anneau Aube (part encaissée) et le grand chiffre du mois,
 * puis deux cartes KPI cliquables (à encaisser, en retard) qui filtrent la liste.
 */
export function CashHeader({ cashed, cashedCount, onTime, onTimeCount, late, lateCount, active, onPick }: Props) {
  const total = cashed + onTime + late || 1;
  const pct = (v: number) => Math.round((v / total) * 100);
  const month = monthName().split(' ')[0];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="col-span-2 flex items-center gap-5 p-5 sm:gap-8 sm:p-7 lg:col-span-1">
        <button onClick={() => onPick('payees')} aria-label={`Encaissé : ${pct(cashed)} % de ce qui est facturé`} className="shrink-0 rounded-full">
          <Ring value={pct(cashed)} size={112} stroke={10} tone="dawn" className="sm:hidden">
            <span className="flex flex-col items-center leading-none">
              <b className="num-halo text-[22px]">{pct(cashed)} %</b>
              <span className="mt-1 text-[10.5px] font-normal text-ink-3">encaissé</span>
            </span>
          </Ring>
          <Ring value={pct(cashed)} size={140} stroke={12} tone="dawn" className="hidden sm:inline-grid">
            <span className="flex flex-col items-center leading-none">
              <b className="num-halo text-[28px]">{pct(cashed)} %</b>
              <span className="mt-1.5 text-[11.5px] font-normal text-ink-3">encaissé</span>
            </span>
          </Ring>
        </button>
        <div className="min-w-0 flex-1">
          <div className="label-halo">Encaissé en {month}</div>
          <div className="num-halo mt-1 text-[34px] md:text-[48px]">
            <AnimatedNumber value={cashed} format={(n) => money(n, true)} />
          </div>
          <div className="mt-1 text-[13px] text-ink-2">
            {cashedCount ? `${cashedCount} paiement${cashedCount > 1 ? 's' : ''} reçu${cashedCount > 1 ? 's' : ''}` : 'Aucun paiement reçu ce mois-ci'}
          </div>
          <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
            <Chip tone="violet">Dans les temps {pct(onTime)} %</Chip>
            {late > 0 && <Chip tone="bad">En retard {pct(late)} %</Chip>}
          </div>
        </div>
      </Card>
      <Kpi
        icon={<IconTile icon={<Hourglass />} tone="violet" />}
        label="À encaisser"
        value={onTime}
        hint={onTimeCount ? `${onTimeCount} facture${onTimeCount > 1 ? 's' : ''} dans les temps` : 'Rien en attente'}
        active={active === 'a_encaisser'}
        onClick={() => onPick('a_encaisser')}
      />
      <Kpi
        icon={<IconTile icon={<TriangleAlert />} tone={lateCount ? 'rose' : 'neutral'} />}
        label="En retard"
        value={late}
        tone={lateCount ? 'bad' : undefined}
        hint={
          lateCount ? (
            <Link to="/app/relances" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-medium text-deep-v hover:underline">
              {lateCount} à relancer <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            'Tous vos clients sont à jour'
          )
        }
        active={active === 'en_retard'}
        onClick={() => onPick('en_retard')}
      />
    </div>
  );
}

function Kpi({ icon, label, value, hint, tone, active, onClick }: { icon: React.ReactNode; label: string; value: number; hint: React.ReactNode; tone?: 'bad'; active: boolean; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      aria-pressed={active}
      className={cn(
        'lift group relative flex min-w-0 cursor-pointer flex-col rounded-card bg-white p-4 text-left shadow-halo md:p-5',
        active && 'shadow-[0_0_0_1.5px_#d9c9fb,0_12px_36px_-14px_rgba(109,40,217,.28)]',
      )}
    >
      <div className="flex items-start">
        {icon}
        <ArrowUpRight className="ml-auto h-4 w-4 text-[#b7b3c7] transition duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <div className="label-halo mt-4">{label}</div>
      <div className={cn('num-halo mt-1 text-[24px] md:text-[30px]', tone === 'bad' && 'text-deep-r')}>
        <AnimatedNumber value={value} format={(n) => money(n, true)} delay={120} />
      </div>
      <div className="mt-1 text-[12.5px] text-ink-3">{hint}</div>
    </div>
  );
}
