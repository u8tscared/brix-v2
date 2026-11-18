import { useNavigate } from 'react-router-dom';
import { Check, MoonStar, Play } from 'lucide-react';
import { SuccessDot } from '@/components/motion';
import { Button, Card, Icon, IconTile, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useBobLocal } from '@/modules/bob/store';

/** Ce que Bob a fait cette nuit : carte calme, chaque action se valide en un geste. */
export function NightShift({ className, compact }: { className?: string; compact?: boolean }) {
  const bob = useBrix((s) => s.bob);
  const updateBob = useBrix((s) => s.updateBob);
  const decideNight = useBobLocal((s) => s.decideNight);
  const navigate = useNavigate();
  const list = bob.slice(0, compact ? 3 : 4);
  const pending = list.filter((b) => !b.done);

  const validate = (id: string) => {
    updateBob(id, { done: true });
    decideNight(id, 'validee');
    toast('Validé. Bob s’en occupe.', 'ok', { label: 'Annuler', run: () => { updateBob(id, { done: false }); decideNight(id, null); } });
  };
  const validateAll = () => {
    pending.forEach((b) => { updateBob(b.id, { done: true }); decideNight(b.id, 'validee'); });
    toast(`${pending.length} actions validées.`);
  };

  return (
    <Card className={cn('flex flex-col p-5 pb-3', className)} aria-label="Cette nuit, Bob a travaillé">
      <header className="flex items-center gap-3">
        <IconTile icon={<MoonStar />} tone="indigo" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Cette nuit, Bob a travaillé</h2>
          <p className="truncate text-[12.5px] text-ink-3">
            {pending.length ? `${pending.length} chose${pending.length > 1 ? 's' : ''} à valider` : 'Tout est validé'} <span className="max-sm:hidden">· de 2 h à 6 h</span>
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={<Play className="!h-3 !w-3 fill-current" />} onClick={() => navigate('/app/bob/brief')} aria-label="Écouter le brief d’une minute">
          1 min
        </Button>
      </header>

      <ul className="stagger-fast mt-2 flex-1">
        {list.map((b) => (
          <li key={b.id} className="flex min-h-[60px] items-center gap-3 border-b border-[#f2eff8] py-2.5 last:border-b-0">
            <IconTile icon={<Icon name={b.icon} />} tone="neutral" size="row" className={cn('transition-opacity', b.done && 'opacity-60')} />
            <button onClick={() => b.to && navigate(b.to)} className="min-w-0 flex-1 text-left">
              <span className={cn('block truncate text-[13.5px] font-medium leading-snug', b.done && 'text-ink-3')}>{b.text}</span>
              <span className="block truncate text-[12px] text-ink-3">
                <span className="num">{b.at.replace(':', ' h ')}</span>
                {b.detail && ` · ${b.detail}`}
              </span>
            </button>
            {b.done ? (
              <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-deep-g">
                <SuccessDot size={18} /> <span className="max-sm:hidden">Fait</span>
              </span>
            ) : (
              <Button size="sm" variant="soft" icon={<Check strokeWidth={2.4} />} onClick={() => validate(b.id)}>
                Valider
              </Button>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-[13px] text-ink-3">Bob n’a rien eu à faire cette nuit.</li>}
      </ul>

      <footer className="mt-1 flex items-center gap-2 pt-1">
        <span className="flex-1 truncate text-[12.5px] italic text-ink-3">« Je relance, je range, je prépare. Toi, tu valides. »</span>
        {pending.length > 1 ? (
          <Button size="xs" variant="ghost" onClick={validateAll}>
            Tout valider
          </Button>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => navigate('/app/bob/nuit')}>
            Réglages
          </Button>
        )}
      </footer>
    </Card>
  );
}
