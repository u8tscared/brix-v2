import { cn } from '@/components/ui';

/** Signature visuelle de Brix AI : 4 barres d'onde. Elles bougent quand Brix AI a quelque chose à dire. */
export function BobWave({ active = false, className }: { active?: boolean; className?: string }) {
  const h = [8, 14, 10, 6];
  return (
    <span className={cn('flex h-4 items-center gap-[2px]', className)} aria-hidden>
      {h.map((v, i) => (
        <i key={i} className={cn('w-[2.5px] rounded-full bg-current', active && 'animate-wave')} style={{ height: v, animationDelay: `${i * 0.12}s`, animationDuration: `${0.9 + i * 0.1}s` }} />
      ))}
    </span>
  );
}
