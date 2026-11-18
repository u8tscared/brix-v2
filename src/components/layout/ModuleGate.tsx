import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Settings2 } from 'lucide-react';
import { Button, IconTile, DEPT_TONE, toast } from '@/components/ui';
import { DrawCheck } from '@/components/motion';
import { DEPARTMENTS, MODULE_BY_KEY, OFFERS, planIncludes, type ModuleKey } from '@/lib/catalog';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';

/** Affiche la page si le module est activé, sinon propose de l'activer en un clic (avec l'offre requise, clairement). */
export function ModuleGate({ module, children }: { module: ModuleKey | null; children: ReactNode }) {
  const enabled = useBrix((s) => (module ? s.enabled.includes(module) : true));
  const plan = useBrix((s) => s.plan);
  const toggle = useBrix((s) => s.toggleModule);
  const setPlan = useBrix((s) => s.setPlan);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!module || enabled) return <>{children}</>;

  const m = MODULE_BY_KEY[module];
  const dept = DEPARTMENTS.find((d) => d.key === m.dept)!;
  const tone = DEPT_TONE[m.dept];
  const allowed = planIncludes(plan, m.plan);
  const offer = OFFERS.find((o) => o.key === m.plan)!;
  const current = OFFERS.find((o) => o.key === plan);

  const activate = () => {
    setBusy(true);
    setTimeout(() => {
      if (!allowed) setPlan(m.plan);
      toggle(module, true);
      toast(allowed ? `${m.name} est maintenant dans votre menu` : `Offre ${offer.name} activée, 14 jours offerts. ${m.name} est dans votre menu.`);
    }, 650);
  };

  return (
    <div className="grid min-h-[calc(100dvh-220px)] place-items-center py-8">
      <div className="w-full max-w-[460px] animate-[fade-up_.45s_var(--ease)_both]">
        <div className="relative overflow-hidden rounded-[22px] bg-white px-6 pb-6 pt-9 text-center shadow-card sm:px-8">
          <div aria-hidden className="absolute inset-x-0 top-0 h-36" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${tone.bg}, transparent)` }} />
          <div className="relative mx-auto w-fit">
            <IconTile name={m.icon} dept={m.dept} size="xl" solid className={busy ? 'scale-105 transition-transform duration-300 ease-spring' : 'transition-transform duration-300'} />
            {busy ? (
              <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 animate-pop place-items-center rounded-full bg-ok text-white ring-4 ring-white"><DrawCheck className="h-3.5 w-3.5" /></span>
            ) : (
              !allowed && <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#15122a] text-white ring-4 ring-white"><Lock className="h-3 w-3" strokeWidth={2.2} /></span>
            )}
          </div>
          <div className="relative mt-5 text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: tone.fg }}>{dept.name}</div>
          <h1 className="relative mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.03em]">{m.name}</h1>
          <p className="relative mx-auto mt-2 max-w-[340px] text-[14px] leading-relaxed text-ink-2">{m.short}</p>

          {allowed ? (
            <p className="mt-5 rounded-[12px] bg-[#f7f6fb] px-4 py-3 text-[13px] text-ink-2">Compris dans votre offre {current?.name}. Il apparaîtra dans votre menu, vous pourrez le retirer à tout moment.</p>
          ) : (
            <div className="mt-5 rounded-[14px] bg-[#f7f6fb] p-4 text-left">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-semibold">Inclus dans l’offre {offer.name}</span>
                <span className="num shrink-0 text-[13.5px] font-semibold">{offer.price ? money(offer.price, offer.price % 1 === 0) : 'Sur devis'}<span className="ml-1 text-[11.5px] font-normal text-ink-3">{offer.price ? 'HT / mois' : ''}</span></span>
              </div>
              <ul className="stagger-fast mt-2.5 space-y-1.5">
                {offer.includes.slice(0, 3).map((i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-ink-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={2.2} />{i}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] text-ink-3">Vous êtes en offre {current?.name}. 14 jours offerts, sans engagement.</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" size="lg" icon={<ArrowLeft />} className="justify-center sm:flex-none" onClick={() => navigate(-1)}>Retour</Button>
            <Button variant="dawn" size="lg" className="justify-center sm:flex-1" loading={busy} onClick={activate}>
              {allowed ? 'Activer ce module' : `Essayer ${offer.name} et activer`}
            </Button>
          </div>
        </div>
        <Link to="/app/reglages/modules" className="mx-auto mt-4 flex min-h-[44px] w-fit items-center gap-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink">
          <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />Voir tous les modules
        </Link>
      </div>
    </div>
  );
}
