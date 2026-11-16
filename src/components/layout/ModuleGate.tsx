import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Badge, Button, Icon } from '@/components/ui';
import { DEPARTMENTS, MODULE_BY_KEY, OFFERS, planIncludes, type ModuleKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';

/** Affiche la page si le module est activé, sinon propose de l'activer en un clic. */
export function ModuleGate({ module, children }: { module: ModuleKey | null; children: ReactNode }) {
  const enabled = useBrix((s) => (module ? s.enabled.includes(module) : true));
  const plan = useBrix((s) => s.plan);
  const toggle = useBrix((s) => s.toggleModule);
  const setPlan = useBrix((s) => s.setPlan);
  const navigate = useNavigate();
  if (!module || enabled) return <>{children}</>;
  const m = MODULE_BY_KEY[module];
  const dept = DEPARTMENTS.find((d) => d.key === m.dept)!;
  const allowed = planIncludes(plan, m.plan);
  const offer = OFFERS.find((o) => o.key === m.plan)!;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-[20px] bg-vi-50 text-vi-700">
        <Icon name={m.icon} className="h-7 w-7" />
        {!allowed && <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-white ring-4 ring-page"><Lock className="h-3 w-3" /></span>}
      </div>
      <Badge tone="violet">{dept.name}</Badge>
      <h1 className="mt-3 text-2xl font-semibold">{m.name}</h1>
      <p className="mt-2 text-[14px] text-ink-2">{m.short}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>Retour</Button>
        {allowed ? (
          <Button variant="dawn" onClick={() => toggle(module, true)}>Activer {m.name}</Button>
        ) : (
          <Button variant="dawn" onClick={() => { setPlan(m.plan); toggle(module, true); }}>Passer à {offer.name} et activer</Button>
        )}
      </div>
      {!allowed && <p className="mt-3 text-xs text-ink-3">Inclus dans l'offre {offer.name}{offer.price ? ` à ${String(offer.price).replace('.', ',')} € ${offer.unit}` : ''}. Essai gratuit 14 jours.</p>}
    </div>
  );
}
