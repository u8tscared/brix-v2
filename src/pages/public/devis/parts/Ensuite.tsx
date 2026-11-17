// « Et après ? » : les étapes qui suivent la signature, et l'artisan qui s'engage.
import { BadgeCheck, CalendarCheck2, CreditCard, HardHat, PenLine, ShieldCheck } from 'lucide-react';
import { cn } from '@/components/ui';
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
            {i < etapes.length - 1 && <span className={cn('absolute left-[19px] top-11 h-[calc(100%-36px)] w-0.5 rounded-full transition-colors duration-700', fait ? 'bg-[#16a34a]' : 'bg-line')} />}
            <span className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-all duration-500', fait ? 'bg-[#16a34a] text-white' : actif ? 'bg-ink text-white shadow-[0_8px_20px_-10px_rgba(21,18,42,.8)]' : 'bg-page text-ink-3')}>
              {fait ? <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <e.I className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              {actif && <span className="bx-ring absolute inset-0 rounded-2xl bg-ink/20" />}
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
    <div className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_#ebe9f2]">
      <div className="flex items-center gap-3.5">
        <PastilleArtisan initiales={`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`} taille={52} />
        <div className="min-w-0">
          <div className="text-[16px] font-semibold">
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
            <ShieldCheck className="h-4 w-4 text-[#16a34a]" strokeWidth={1.9} />
            {g}
          </li>
        ))}
      </ul>
    </div>
  );
}
