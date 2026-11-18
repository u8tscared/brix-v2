// « Et après ? » : les étapes qui suivent la signature, et l'artisan qui s'engage.
import { BadgeCheck, CalendarCheck2, CreditCard, HardHat, PenLine, ShieldCheck } from 'lucide-react';
import { Card, cn } from '@/components/ui';
import type { Company, User } from '@/lib/types';
import { PastilleArtisan } from '../../ui/primitives';

const METIER: Record<string, string> = { electricien: 'Électricien', plombier: 'Plombier chauffagiste', peintre: 'Peintre', carreleur: 'Carreleur', plaquiste: 'Plaquiste', menuisier: 'Menuisier', couvreur: 'Couvreur', macon: 'Maçon', paysagiste: 'Paysagiste', climaticien: 'Climaticien', serrurier: 'Serrurier', cuisiniste: 'Cuisiniste', renovation: 'Rénovation tous corps d’état', autre: 'Artisan' };

export function Ensuite({ acompte, etape }: { acompte: number; etape: number }) {
  const etapes = [
    { I: PenLine, t: 'Vous signez en ligne', s: 'Une minute, avec un code reçu par e-mail.' },
    ...(acompte ? [{ I: CreditCard, t: 'Vous réglez l’acompte', s: 'Par carte, Apple Pay, virement ou en 3 fois.' }] : []),
    { I: CalendarCheck2, t: 'On fixe la date ensemble', s: 'Vous recevez la date de démarrage et l’équipe.' },
    { I: HardHat, t: 'Suivi du chantier en direct', s: 'Photos du soir, avancement, messages, factures.' },
  ];
  return (
    <ol className="relative space-y-1">
      {etapes.map((e, i) => {
        const fait = i < etape;
        const actif = i === etape;
        return (
          <li key={e.t} className="relative flex gap-4 pb-4 last:pb-0">
            {i < etapes.length - 1 && <span className={cn('absolute left-[19px] top-11 h-[calc(100%-36px)] w-[1.5px] rounded-full transition-colors duration-700', fait ? 'bg-[#bfe8d6]' : 'bg-[#ece8f6]')} />}
            <span className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-tile transition-all duration-500 ease-spring', fait ? 'bg-pale-g text-deep-g' : actif ? 'bg-dawn-diag text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,.6),inset_0_1px_0_rgba(255,255,255,.25)]' : 'bg-[#f3f1f8] text-ink-3')}>
              {fait ? <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <e.I className="h-[18px] w-[18px]" strokeWidth={1.9} />}
              {actif && <span className="bx-ring absolute inset-0 rounded-tile bg-[#d946ef]/20" />}
            </span>
            <span className="pt-1.5">
              <span className={cn('block text-[14.5px] font-semibold', !fait && !actif && 'text-ink-2')}>{e.t}</span>
              <span className="block text-[13px] leading-snug text-ink-3">{e.s}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function CarteArtisan({ company, user }: { company: Company; user: User }) {
  const garanties = [company.rge && 'Qualifié RGE', company.decennale && 'Garantie décennale', 'Devis détaillé et chiffré'].filter(Boolean) as string[];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3.5">
        <PastilleArtisan initiales={`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`} taille={52} />
        <div className="min-w-0">
          <div className="text-[16px] font-semibold tracking-[-0.02em]">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-[13px] text-ink-3">
            {METIER[company.trade] ?? 'Artisan'} · {company.city.replace(/^\d+\s*/, '')}
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {garanties.map((g) => (
          <li key={g} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
            <span className="grid h-6 w-6 place-items-center rounded-[8px] bg-pale-g text-deep-g"><ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} /></span>
            {g}
          </li>
        ))}
      </ul>
    </Card>
  );
}
