// Cloche des notifications (barre du haut de l'app) : compteur, panneau, réglages, et bannière en direct
// quand un client signe ou paie dans un autre onglet (démo) ou sur son téléphone (réel).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, CheckCheck, Inbox, Settings2, X } from 'lucide-react';
import { cn } from '@/components/ui';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useBoite } from '@/emails/boite';
import { useDevisMeta } from '@/modules/devis/store';
import { useParcours } from '@/parcours/signature';
import { useSyncOnglets } from '@/parcours/sync';
import { lienPublic } from '@/parcours/liens';
import { APPARENCE, groupes, heure } from './meta';
import { Reglages } from './Reglages';
import { amorcerDemo, useNotifs, type Notif } from './store';
import '@/parcours/parcours.css';

function Icone({ n, taille = 40 }: { n: Notif; taille?: number }) {
  const a = APPARENCE[n.type];
  return (
    <span className="grid shrink-0 place-items-center rounded-[12px]" style={{ width: taille, height: taille, background: a.fond, color: a.encre }}>
      <a.I className="h-[18px] w-[18px]" strokeWidth={1.9} />
    </span>
  );
}

function Ligne({ n, onClick }: { n: Notif; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group relative flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-page">
      <Icone n={n} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn('min-w-0 flex-1 text-[13.5px] leading-snug', n.lu ? 'text-ink-2' : 'font-semibold text-ink')}>{n.titre}</span>
          <span className="shrink-0 pt-0.5 text-[11.5px] text-ink-3">{heure(n.at)}</span>
        </span>
        {n.texte && <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{n.texte}</span>}
      </span>
      {!n.lu && <span className="absolute right-3 top-[38px] h-2 w-2 rounded-full bg-[#d946ef]" />}
    </button>
  );
}

function Panneau({ onClose, onAller }: { onClose: () => void; onAller: (n: Notif) => void }) {
  const { items, toutLire } = useNotifs();
  const [filtre, setFiltre] = useState<'tout' | 'non_lu'>('tout');
  const [vue, setVue] = useState<'liste' | 'reglages'>('liste');
  const liste = filtre === 'tout' ? items : items.filter((n) => !n.lu);
  const nonLues = items.filter((n) => !n.lu).length;
  return (
    <div className="bx-root flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-4">
        {vue === 'reglages' && (
          <button onClick={() => setVue('liste')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-page" aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h2 className="flex-1 text-[17px] font-semibold tracking-[-0.02em]">{vue === 'liste' ? 'Notifications' : 'Réglages'}</h2>
        {vue === 'liste' && nonLues > 0 && (
          <button onClick={toutLire} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-2 hover:bg-page hover:text-ink">
            <CheckCheck className="h-4 w-4" /> Tout lu
          </button>
        )}
        {vue === 'liste' && (
          <button onClick={() => setVue('reglages')} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-page hover:text-ink" aria-label="Réglages des notifications">
            <Settings2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-page hover:text-ink md:hidden" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
      {vue === 'reglages' ? (
        <div className="bx-fade min-h-0 flex-1 overflow-y-auto px-4 pb-5">
          <Reglages />
        </div>
      ) : (
        <>
          <div className="flex gap-1 px-4 pb-2">
            {(
              [
                ['tout', 'Toutes'],
                ['non_lu', `Non lues${nonLues ? ` · ${nonLues}` : ''}`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => setFiltre(k)} className={cn('h-8 rounded-full px-3 text-[12.5px] font-medium transition', filtre === k ? 'bg-ink text-white' : 'text-ink-2 hover:bg-page')}>
                {l}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            {liste.length === 0 ? (
              <div className="grid place-items-center px-6 py-14 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-page">
                  <BellOff className="h-5 w-5 text-ink-3" strokeWidth={1.75} />
                </span>
                <div className="mt-3 text-[14px] font-semibold">Tout est calme</div>
                <p className="mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-ink-3">Vous serez prévenu dès qu’un client ouvre, signe ou paie, ou qu’un fournisseur répond.</p>
              </div>
            ) : (
              groupes(liste).map((g) => (
                <div key={g.titre} className="bx-stagger">
                  <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.08em] text-ink-3">{g.titre}</div>
                  {g.items.map((n) => (
                    <Ligne key={n.id} n={n} onClick={() => onAller(n)} />
                  ))}
                </div>
              ))
            )}
          </div>
          <a href={lienPublic('boite')} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 border-t border-line text-[12.5px] font-medium text-ink-2 hover:bg-page hover:text-ink">
            <Inbox className="h-4 w-4" strokeWidth={1.75} /> Voir les e-mails envoyés par Brix
          </a>
        </>
      )}
    </div>
  );
}

/** Bannière qui glisse du haut quand un événement important arrive (signature, paiement…). */
function Banniere({ n, onAller, onFermer }: { n: Notif; onAller: () => void; onFermer: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFermer, 7000);
    return () => clearTimeout(t);
  }, [n.id, onFermer]);
  const fort = n.type === 'devis_signe' || n.type === 'paiement_recu';
  return createPortal(
    <div className="bx-root pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-[calc(10px+var(--safe-t))]">
      <div role="status" className="bx-banner pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[22px] bg-[#15122a]/95 p-2.5 pr-3 text-white shadow-[0_24px_60px_-20px_rgba(21,18,42,.7)] backdrop-blur-xl">
        <button onClick={onAller} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={cn('relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px]', fort ? 'bx-dawn' : 'bg-white/10')}>
            {(() => {
              const I = APPARENCE[n.type].I;
              return <I className="h-5 w-5" strokeWidth={1.9} />;
            })()}
            {fort && <span className="bx-ring absolute inset-0 rounded-[14px] bg-[#d946ef]/30" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{n.titre}</span>
            <span className="block truncate text-[12.5px] text-white/65">{n.montant ? `${money(n.montant)} · ` : ''}{n.texte}</span>
          </span>
        </button>
        <button onClick={onFermer} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function NotificationBell({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const navigate = useNavigate();
  const isDemo = useBrix((s) => s.isDemo);
  useState(() => isDemo && amorcerDemo());
  const items = useNotifs((s) => s.items);
  const nonLues = items.filter((n) => !n.lu).length;
  const [open, setOpen] = useState(false);
  const [banniere, setBanniere] = useState<Notif | null>(null);
  const [secoue, setSecoue] = useState(false);
  const vus = useRef(new Set(items.map((n) => n.id)));
  const ref = useRef<HTMLDivElement>(null);

  // Les pages publiques (client, fournisseur) écrivent dans un autre onglet : on suit.
  useSyncOnglets([useNotifs, useBrix, useDevisMeta, useParcours, useBoite]);

  useEffect(() => {
    const nouvelles = items.filter((n) => !vus.current.has(n.id));
    nouvelles.forEach((n) => vus.current.add(n.id));
    if (!nouvelles.length) return;
    setSecoue(true);
    const t = setTimeout(() => setSecoue(false), 900);
    const imp = nouvelles.find((n) => n.type === 'devis_signe' || n.type === 'paiement_recu' || n.type === 'devis_question' || n.type === 'fournisseur_reponse') ?? nouvelles[0];
    if (imp) setBanniere(imp);
    return () => clearTimeout(t);
  }, [items]);

  useEffect(() => {
    if (!open || variant === 'mobile') return;
    const clic = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', clic);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', clic);
      window.removeEventListener('keydown', esc);
    };
  }, [open, variant]);

  const aller = (n: Notif) => {
    useNotifs.getState().lire(n.id);
    setOpen(false);
    setBanniere(null);
    if (n.vers) navigate(n.vers);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group relative grid place-items-center text-ink-2 transition hover:text-ink',
          variant === 'desktop' ? 'h-9 w-9 rounded-[10px] bg-white shadow-card hover:shadow-raise' : 'h-11 w-11 rounded-full',
        )}
        aria-label={`Notifications${nonLues ? `, ${nonLues} non lues` : ''}`}
        aria-expanded={open}
      >
        <Bell className={cn(variant === 'desktop' ? 'h-4 w-4' : 'h-[18px] w-[18px]', secoue && 'bx-bell')} strokeWidth={1.75} />
        {nonLues > 0 && (
          <span key={nonLues} className="bx-pop absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d946ef] px-1 text-[10.5px] font-semibold text-white ring-2 ring-white">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {open && variant === 'desktop' && (
        <div className="bx-pop absolute right-0 top-11 z-50 h-[560px] max-h-[calc(100dvh-90px)] w-[400px] origin-top-right overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_rgba(21,18,42,.06),0_30px_70px_-24px_rgba(30,15,70,.4)]">
          <Panneau onClose={() => setOpen(false)} onAller={aller} />
        </div>
      )}
      {open &&
        variant === 'mobile' &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col bg-white pt-safe">
            <div className="bx-rise min-h-0 flex-1">
              <Panneau onClose={() => setOpen(false)} onAller={aller} />
            </div>
          </div>,
          document.body,
        )}
      {banniere && <Banniere n={banniere} onAller={() => aller(banniere)} onFermer={() => setBanniere(null)} />}
    </div>
  );
}

export default NotificationBell;
