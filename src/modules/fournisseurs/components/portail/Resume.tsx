// Le total qui vit : colonne collante sur ordinateur, barre du bas sur téléphone. Porte l'action de l'étape.
import { ArrowRight, Check, Lock, Send } from 'lucide-react';
import { cn } from '@/components/ui';
import { money, num } from '@/lib/format';
import { useHorloge, useTween } from '@/modules/fournisseurs/components/portail/anim';
import type { totaux } from '@/modules/fournisseurs/components/portail/saisie';

type Totaux = ReturnType<typeof totaux>;

export interface ActionResume {
  libelle: string;
  envoi: boolean; // dernière étape : bouton Aube
  disabled?: boolean;
  onClick: () => void;
}

function Total({ v, className }: { v: number; className?: string }) {
  const t = useTween(v);
  return <span className={cn('num tabular-nums', className)}>{money(t)}</span>;
}

function Enregistre({ at }: { at: number | null }) {
  useHorloge(15000);
  if (!at) return <span className="text-ink-3">Enregistré automatiquement</span>;
  const s = Math.round((Date.now() - at) / 1000);
  return (
    <span key={at} className="bx-fade inline-flex items-center gap-1.5 text-ink-2">
      <Check className="h-3.5 w-3.5 text-deep-g" strokeWidth={2.25} />
      Brouillon enregistré{s > 20 ? ` il y a ${s < 60 ? `${s} s` : `${Math.round(s / 60)} min`}` : ''}
    </span>
  );
}

function Bouton({ a, className }: { a: ActionResume; className?: string }) {
  return (
    <button
      type="button"
      disabled={a.disabled}
      onClick={a.onClick}
      className={cn(
        'inline-flex h-[52px] items-center justify-center gap-2 rounded-pill px-6 text-[15px] font-semibold text-white transition duration-300 ease-spring active:scale-[.98] disabled:pointer-events-none disabled:opacity-40',
        a.envoi ? 'bg-dawn shadow-dawn hover:-translate-y-px hover:scale-[1.02] hover:shadow-dawn-lg' : 'bg-ink shadow-ink hover:-translate-y-px hover:bg-[#241f3f]',
        className,
      )}
    >
      {a.envoi && <Send className="h-[18px] w-[18px]" strokeWidth={2} />}
      {a.libelle}
      {!a.envoi && <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />}
    </button>
  );
}

export function ResumeColonne({ t, nb, action, enregistreA, artisan }: { t: Totaux; nb: number; action: ActionResume; enregistreA: number | null; artisan: string }) {
  return (
    <div className="rounded-card bg-white bg-dawn-mist p-6 shadow-halo-lg">
      <div className="label-halo">Votre offre pour {artisan}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <Total v={t.total} className="num-halo text-[44px] leading-none" />
        <span className="text-[13px] font-medium text-ink-3">HT</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-halo-track">
        <div className="h-full rounded-full bg-dawn transition-[width] duration-500 ease-out" style={{ width: `${(t.faites / Math.max(1, nb)) * 100}%` }} />
      </div>
      <div className="mt-2 text-[12.5px] text-ink-2">
        <span className="num font-semibold text-ink">{t.faites}</span> sur {nb} article{nb > 1 ? 's' : ''} renseigné{t.faites > 1 ? 's' : ''}
      </div>

      <dl className="mt-5 space-y-2 rounded-card-sm bg-halo-track/60 px-4 py-3.5 text-[13.5px]">
        <div className="flex justify-between"><dt className="text-ink-2">Articles</dt><dd className="num">{money(t.brut)}</dd></div>
        {t.remise > 0 && <div className="bx-fade flex justify-between"><dt className="text-ink-2">Remise {num(t.remise)} %</dt><dd className="num text-deep-g">−{money(t.montantRemise)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink-2">Port</dt><dd className="num">{t.port ? money(t.port) : <span className="text-deep-g">Offert</span>}</dd></div>
      </dl>

      <Bouton a={action} className="mt-6 w-full" />
      <div className="mt-3 flex flex-col items-center gap-1 text-[12px]">
        <Enregistre at={enregistreA} />
        <span className="inline-flex items-center gap-1.5 text-ink-3"><Lock className="h-3 w-3" strokeWidth={2} />Lien personnel, sans compte</span>
      </div>
    </div>
  );
}

export function ResumeBarre({ t, nb, action, enregistreA }: { t: Totaux; nb: number; action: ActionResume; enregistreA: number | null }) {
  return (
    <div className="glass-strong fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 rounded-[26px] px-4 pb-2.5 pt-3 lg:hidden">
      <div className="mx-auto flex max-w-[640px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            Total HT · <span className="num">{t.faites}/{nb}</span>
          </div>
          <Total v={t.total} className="num-halo block text-[24px] leading-tight" />
        </div>
        <Bouton a={action} className="shrink-0" />
      </div>
      <div className="mx-auto mt-1.5 max-w-[640px] text-[11.5px]"><Enregistre at={enregistreA} /></div>
    </div>
  );
}
