// Briques visuelles du portail fournisseur : qui demande, les faits clés, la coche de succès, l'encart API.
import type { ReactNode } from 'react';
import { ArrowUpRight, CalendarClock, Check, HardHat, MapPin, Phone, Quote, Truck } from 'lucide-react';
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
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-dawn-diag text-[15px] font-semibold tracking-[-0.02em] text-white shadow-[0_8px_20px_-8px_rgba(217,70,239,.55),inset_0_1px_0_rgba(255,255,255,.25)]">
        {e.initiales}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-[#10b981]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold leading-tight tracking-[-0.02em]">{e.entreprise}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-2">
          {nom && <span>{nom}</span>}
          {e.ville && <><span className="text-ink-3">·</span><span>{e.ville}</span></>}
          {chantier && <><span className="text-ink-3">·</span><span className="inline-flex items-center gap-1"><HardHat className="h-3.5 w-3.5" {...I} />{chantier}</span></>}
        </div>
      </div>
      {e.telephone && (
        <a href={`tel:${e.telephone.replace(/\s/g, '')}`} aria-label={`Appeler ${nom || e.entreprise}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pale-g text-deep-g transition duration-300 ease-spring hover:-translate-y-px active:scale-95">
          <Phone className="h-[18px] w-[18px]" {...I} />
        </a>
      )}
    </div>
  );
}

/** Une ligne « fait clé » : icône dans une pastille, libellé discret, valeur lisible. */
const TONS_FAIT = { neutre: 'bg-pale-n text-deep-n', violet: 'bg-pale-v text-deep-v', mag: 'bg-pale-m text-deep-m', peche: 'bg-pale-p text-deep-p', bleu: 'bg-pale-b text-deep-b', vert: 'bg-pale-g text-deep-g' } as const;
export function Fait({ icon, label, children, accent, ton = 'neutre' }: { icon: ReactNode; label: string; children: ReactNode; accent?: ReactNode; ton?: keyof typeof TONS_FAIT }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-tile [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.9]', TONS_FAIT[ton])}>{icon}</span>
      <div className="min-w-0 pt-px">
        <div className="text-[12.5px] text-ink-3">{label}</div>
        <div className="text-[14px] font-medium leading-snug text-ink first-letter:uppercase">{children}</div>
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
        ton="mag"
        label="Réponse souhaitée"
        accent={ech && (
          <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium', ech.urgent ? 'bg-pale-v text-deep-v' : 'bg-pale-n text-ink-2')}>
            <i className={cn('h-1.5 w-1.5 rounded-full', ech.urgent ? 'bg-vi-600 fx-ping' : 'bg-ink-3')} />
            {ech.texte}
          </span>
        )}
      >
        {dateLimite ? `${dateLong(dateLimite)}, 18 h` : 'Dès que possible'}
      </Fait>
      <Fait icon={<Truck {...I} />} ton="peche" label="Livraison souhaitée">{livraison ? dateLong(livraison) : 'À convenir'}</Fait>
      <Fait icon={<MapPin {...I} />} ton="bleu" label={adresse ? 'Livrer au' : 'Retrait'}>{adresse ?? 'Au comptoir de votre agence'}</Fait>
    </div>
  );
}

/** Mot de l'artisan, en citation. */
export function Mot({ texte, auteur }: { texte: string; auteur: string }) {
  return (
    <figure className="relative rounded-card-sm bg-dawn-pale px-4 py-4 pl-12">
      <Quote className="absolute left-4 top-4 h-4 w-4 text-[#c4a8f8]" strokeWidth={1.9} />
      <blockquote className="text-[14px] leading-relaxed text-ink">{texte}</blockquote>
      <figcaption className="mt-1 text-[12px] text-ink-3">{auteur}</figcaption>
    </figure>
  );
}

/** Coche de succès qui se dessine, avec un anneau qui s'éloigne. */
export function CocheSucces({ size = 72 }: { size?: number }) {
  return (
    <span className="relative mx-auto grid place-items-center" style={{ width: size, height: size }}>
      <span className="bx-pop absolute -inset-5 rounded-full border border-[#bfe8d5]" style={{ animationDelay: '.25s' }} aria-hidden />
      <span className="bx-pop absolute -inset-10 rounded-full border border-[#e3f5ec]" style={{ animationDelay: '.4s' }} aria-hidden />
      <span className="bx-ring absolute inset-0 rounded-full bg-[#10b981]/25" aria-hidden />
      <span className="bx-pop relative grid h-full w-full place-items-center rounded-full bg-[linear-gradient(160deg,#34d399,#0f8a5f)] shadow-[0_14px_30px_-12px_rgba(16,185,129,.7),inset_0_1px_0_rgba(255,255,255,.3)]">
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
      className={cn('group flex items-start gap-3 rounded-card bg-white/75 p-5 shadow-halo-sm transition duration-300 hover:-translate-y-px hover:bg-white hover:shadow-halo', className)}
    >
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-pale-v">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#6d28d9" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h10M4 12h16M4 17h7" />
          <circle cx="18" cy="7" r="2" />
          <circle cx="15" cy="17" r="2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold tracking-[-0.01em] text-ink">Vous êtes fournisseur ?</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-2">
          Recevez les demandes de prix de vos clients artisans dans un seul espace, ou directement dans votre logiciel : <span className="font-medium text-ink">API Brix Fournisseurs</span>, ouverte et gratuite.
        </span>
      </span>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.75} />
    </a>
  );
}

/** Étapes en pastilles (faite = vert, en cours = dégradé Aube) ; un rail fin suit la saisie de l'étape en cours. */
export function Progression({ etape, libelles, avancement, onAller }: { etape: number; libelles: string[]; avancement: number; onAller?: (n: number) => void }) {
  return (
    <nav aria-label={`Étape ${etape} sur ${libelles.length}`} className="glass rounded-card px-4 py-3.5 sm:px-5">
      <ol className="flex items-center gap-2">
        {libelles.map((l, i) => {
          const n = i + 1;
          const cliquable = !!onAller && n < etape;
          return (
            <li key={l} className={cn('flex min-w-0 items-center gap-2', i < libelles.length - 1 && 'flex-1')}>
              <button type="button" disabled={!cliquable} onClick={() => onAller?.(n)} aria-current={n === etape ? 'step' : undefined} className="step-halo min-w-0 transition-opacity disabled:cursor-default enabled:hover:opacity-80" data-state={n < etape ? 'done' : n === etape ? 'on' : undefined}>
                <b>{n < etape ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : n}</b>
                <span className={cn('truncate', n !== etape && 'max-sm:hidden')}>{l}</span>
              </button>
              {i < libelles.length - 1 && <span aria-hidden className={cn('h-px min-w-3 flex-1 transition-colors duration-500', n < etape ? 'bg-[#bfe8d5]' : 'bg-[#e3ddf0]')} />}
            </li>
          );
        })}
      </ol>
      <span className="mt-3 block h-1 overflow-hidden rounded-full bg-halo-track" aria-hidden>
        <span className="block h-full rounded-full bg-dawn transition-[width] duration-500 ease-out-quint" style={{ width: `${((etape - 1 + Math.max(0.04, Math.min(1, avancement))) / libelles.length) * 100}%` }} />
      </span>
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
        'inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-medium transition duration-300 ease-spring active:scale-[.97]',
        on ? 'border-transparent bg-ink text-white shadow-ink' : 'border-transparent bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6] hover:-translate-y-px hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Carte blanche du portail. */
export function Bloc({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-card bg-white shadow-halo', className)}>{children}</section>;
}
