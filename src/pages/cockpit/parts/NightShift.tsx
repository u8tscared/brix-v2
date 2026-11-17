import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, MoonStar, Play } from 'lucide-react';
import { SuccessDot } from '@/components/motion';
import { Icon, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useBobLocal } from '@/modules/bob/store';
import { BobMark } from '@/modules/bob/components/VoiceOrb';

/** Ce que Bob a fait cette nuit : carte « nuit » sombre, chaque action se valide en un geste. */
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
    <section className={cn('relative flex flex-col overflow-hidden rounded-[20px] bg-night text-white shadow-pop', className)} aria-label="Cette nuit, Bob a travaillé">
      {/* Ciel de nuit discret : deux lueurs et quelques étoiles fixes. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#6d28d9] opacity-40 blur-[70px]" />
        <div className="absolute -bottom-24 left-10 h-48 w-72 rounded-full bg-[#d946ef] opacity-[.14] blur-[80px]" />
        {[[12, 18], [78, 12], [64, 30], [90, 46], [30, 8], [46, 22]].map(([x, y], i) => (
          <i key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white/50" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
      </div>

      <header className="relative flex items-center gap-3 px-5 pb-3 pt-4">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/10 ring-1 ring-white/10"><MoonStar className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Cette nuit, Bob a travaillé</h2>
          <p className="text-[12px] text-white/55">{pending.length ? `${pending.length} chose${pending.length > 1 ? 's' : ''} à valider` : 'Tout est validé'} <span className="max-sm:hidden">· de 2 h à 6 h</span></p>
        </div>
        <button onClick={() => navigate('/app/bob/brief')} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12.5px] font-medium ring-1 ring-white/10 transition hover:bg-white/15 active:scale-95">
          <Play className="h-3 w-3 fill-current" /> <span className="max-sm:hidden">Brief</span> 1 min
        </button>
      </header>

      <ul className="stagger-fast relative flex-1 px-2">
        {list.map((b) => (
          <li key={b.id} className="flex min-h-[58px] items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-white/[.05]">
            <span className="num w-10 shrink-0 text-[11.5px] text-white/40 max-sm:hidden">{b.at.replace(':', ' h ')}</span>
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/[.08] text-white/85">
              <Icon name={b.icon} className="h-4 w-4" />
            </span>
            <button onClick={() => b.to && navigate(b.to)} className="min-w-0 flex-1 text-left">
              <span className={cn('block truncate text-[13.5px] font-medium leading-snug transition-colors', b.done && 'text-white/60')}>{b.text}</span>
              {b.detail && <span className="block truncate text-[12px] text-white/50">{b.detail}</span>}
            </button>
            {b.done ? (
              <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#86efac]"><SuccessDot size={18} /> <span className="max-sm:hidden">Fait</span></span>
            ) : (
              <button onClick={() => validate(b.id)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink transition hover:bg-white/90 active:scale-95">
                <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> Valider
              </button>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-white/60">Bob n’a rien eu à faire cette nuit.</li>}
      </ul>

      <footer className="relative mt-1 flex items-center gap-2 border-t border-white/10 px-5 py-3">
        <BobMark size={22} className="bg-white/10" />
        <span className="flex-1 truncate text-[12.5px] text-white/55">« Je relance, je range, je prépare. Toi, tu valides. »</span>
        {pending.length > 1 ? (
          <button onClick={validateAll} className="shrink-0 text-[12.5px] font-semibold text-white hover:underline">Tout valider</button>
        ) : (
          <button onClick={() => navigate('/app/bob/nuit')} className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-white/70 hover:text-white">Réglages <ArrowRight className="h-3.5 w-3.5" /></button>
        )}
      </footer>
    </section>
  );
}
