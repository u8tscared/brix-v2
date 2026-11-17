// Briques visuelles du portail fournisseur : qui demande, les faits clés, la coche de succès, l'encart API.
import type { ReactNode } from 'react';
import { ArrowUpRight, CalendarClock, HardHat, MapPin, Phone, Quote, Truck } from 'lucide-react';
import { cn } from '@/components/ui';
import { dateLong } from '@/lib/format';
import type { Emetteur } from '@/emails/types';
import { echeance, useHorloge } from './anim';

const I = { strokeWidth: 1.75 } as const;

/** Bloc « qui vous écrit » : pastille de l'artisan, entreprise, ville, téléphone. */
export function Artisan({ e, chantier }: { e: Emetteur; chantier?: string }) {
  const nom = `${e.prenom} ${e.nom}`.trim();
  return (
    <div className="flex items-center gap-3.5">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#130f26] text-[15px] font-semibold tracking-[-0.02em] text-white shadow-[0_6px_16px_-8px_rgba(19,15,38,.6)]">
        {e.initiales}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-[#16a34a]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold leading-tight tracking-[-0.02em]">{e.entreprise}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#5f5f70]">
          {nom && <span>{nom}</span>}
          {e.ville && <><span className="text-[#c9c8d4]">·</span><span>{e.ville}</span></>}
          {chantier && <><span className="text-[#c9c8d4]">·</span><span className="inline-flex items-center gap-1"><HardHat className="h-3.5 w-3.5" {...I} />{chantier}</span></>}
        </div>
      </div>
      {e.telephone && (
        <a href={`tel:${e.telephone.replace(/\s/g, '')}`} aria-label={`Appeler ${nom || e.entreprise}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#ececf1] bg-white text-[#130f26] transition hover:bg-[#f6f6f9] active:scale-95">
          <Phone className="h-[18px] w-[18px]" {...I} />
        </a>
      )}
    </div>
  );
}

/** Une ligne « fait clé » : icône dans une pastille, libellé discret, valeur lisible. */
export function Fait({ icon, label, children, accent }: { icon: ReactNode; label: string; children: ReactNode; accent?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#f4f3fa] text-[#5f5f70] [&_svg]:h-[17px] [&_svg]:w-[17px]">{icon}</span>
      <div className="min-w-0 pt-px">
        <div className="text-[12px] text-[#9898a8]">{label}</div>
        <div className="text-[14px] font-medium leading-snug text-[#130f26] first-letter:uppercase">{children}</div>
        {accent}
      </div>
    </div>
  );
}

/** Les trois faits d'une demande : répondre avant, livrer quand, livrer où. */
export function FaitsDemande({ dateLimite, livraison, adresse, className }: { dateLimite?: string; livraison?: string; adresse?: string; className?: string }) {
  useHorloge(60000);
  const ech = echeance(dateLimite);
  return (
    <div className={cn('grid gap-4', className)}>
      <Fait
        icon={<CalendarClock {...I} />}
        label="Réponse souhaitée"
        accent={ech && (
          <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium', ech.urgent ? 'bg-[#f5f0ff] text-[#6d28d9]' : 'bg-[#f4f3fa] text-[#5f5f70]')}>
            <i className={cn('h-1.5 w-1.5 rounded-full', ech.urgent ? 'bg-[#6d28d9] fx-ping' : 'bg-[#9898a8]')} />
            {ech.texte}
          </span>
        )}
      >
        {dateLimite ? `${dateLong(dateLimite)}, 18 h` : 'Dès que possible'}
      </Fait>
      <Fait icon={<Truck {...I} />} label="Livraison souhaitée">{livraison ? dateLong(livraison) : 'À convenir'}</Fait>
      <Fait icon={<MapPin {...I} />} label={adresse ? 'Livrer au' : 'Retrait'}>{adresse ?? 'Au comptoir de votre agence'}</Fait>
    </div>
  );
}

/** Mot de l'artisan, en citation. */
export function Mot({ texte, auteur }: { texte: string; auteur: string }) {
  return (
    <figure className="relative rounded-[14px] bg-[#f4f3fa] px-4 py-3.5 pl-11">
      <Quote className="absolute left-4 top-4 h-4 w-4 text-[#b9a2f5]" strokeWidth={1.75} />
      <blockquote className="text-[14px] leading-relaxed text-[#130f26]">{texte}</blockquote>
      <figcaption className="mt-1 text-[12px] text-[#9898a8]">{auteur}</figcaption>
    </figure>
  );
}

/** Coche de succès qui se dessine, avec un anneau qui s'éloigne. */
export function CocheSucces({ size = 72 }: { size?: number }) {
  return (
    <span className="relative mx-auto grid place-items-center" style={{ width: size, height: size }}>
      <span className="bx-ring absolute inset-0 rounded-full bg-[#16a34a]/25" aria-hidden />
      <span className="bx-pop relative grid h-full w-full place-items-center rounded-full bg-[#16a34a] shadow-[0_14px_30px_-12px_rgba(22,163,74,.7)]">
        <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.2 4.2L19 7" className="bx-draw" style={{ ['--len' as string]: 22 }} />
        </svg>
      </span>
    </span>
  );
}

/** Encart discret d'acquisition : l'API Brix Fournisseurs pour les négoces. */
export function Acquisition({ className }: { className?: string }) {
  return (
    <a
      href="/api/public/v1/openapi.json"
      target="_blank"
      rel="noreferrer"
      className={cn('group flex items-start gap-3 rounded-[16px] border border-[#ececf1] bg-white/70 p-4 transition hover:border-[#d9c9fd] hover:bg-white', className)}
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[#ececf1] bg-white">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#5f5f70" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h10M4 12h16M4 17h7" />
          <circle cx="18" cy="7" r="2" />
          <circle cx="15" cy="17" r="2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold tracking-[-0.01em] text-[#130f26]">Vous êtes fournisseur ?</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#5f5f70]">
          Recevez les demandes de prix de vos clients artisans dans un seul espace, ou directement dans votre logiciel : <span className="font-medium text-[#130f26]">API Brix Fournisseurs</span>, ouverte et gratuite.
        </span>
      </span>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#9898a8] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#130f26]" strokeWidth={1.75} />
    </a>
  );
}

/** Barre d'étapes : segments qui se remplissent, le premier suit la saisie ligne par ligne. */
export function Progression({ etape, libelles, avancement, onAller }: { etape: number; libelles: string[]; avancement: number; onAller?: (n: number) => void }) {
  return (
    <nav aria-label={`Étape ${etape} sur ${libelles.length}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${libelles.length}, minmax(0, 1fr))` }}>
      {libelles.map((l, i) => {
        const n = i + 1;
        const rempli = n < etape ? 1 : n === etape ? Math.max(0.08, avancement) : 0;
        const cliquable = !!onAller && n < etape;
        return (
          <button key={l} type="button" disabled={!cliquable} onClick={() => onAller?.(n)} className="group min-w-0 text-left disabled:cursor-default">
            <span className="block h-[5px] overflow-hidden rounded-full bg-[#e7e5f0]">
              <span className="block h-full rounded-full bg-[#130f26] transition-[width] duration-500 ease-out" style={{ width: `${rempli * 100}%` }} />
            </span>
            <span className={cn('mt-2 flex items-center gap-1.5 truncate text-[12px] font-medium', n === etape ? 'text-[#130f26]' : n < etape ? 'text-[#5f5f70] group-hover:text-[#130f26]' : 'text-[#9898a8]')}>
              <span className="bx-mono text-[11px] text-[#9898a8]">0{n}</span>
              {l}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Puce sélectionnable (conditions, motifs). */
export function Puce({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-medium transition active:scale-[.97]',
        on ? 'border-[#130f26] bg-[#130f26] text-white shadow-[0_6px_14px_-8px_rgba(19,15,38,.7)]' : 'border-[#e2e2ea] bg-white text-[#5f5f70] hover:border-[#c9c8d4] hover:text-[#130f26]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Carte blanche du portail. */
export function Bloc({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-[20px] border border-[#ececf1] bg-white shadow-[0_1px_2px_rgba(19,15,38,.04),0_12px_32px_-20px_rgba(45,20,90,.18)]', className)}>{children}</section>;
}
