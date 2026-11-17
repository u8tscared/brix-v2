import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, X } from 'lucide-react';
import { Ring } from '@/components/motion';
import { cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';

const SETUP = [
  { key: 'profil', label: 'Compléter votre entreprise', sub: 'Logo, décennale, IBAN', to: '/app/reglages/entreprise' },
  { key: 'premier_devis', label: 'Faire votre premier devis', sub: 'À la voix : 2 minutes', to: '/app/devis/nouveau' },
  { key: 'efacture', label: 'Activer la facture électronique', sub: 'Obligatoire, on s’en occupe', to: '/app/facture-electronique' },
  { key: 'banque', label: 'Relier votre banque', sub: 'Paiements rapprochés seuls', to: '/app/tresorerie' },
  { key: 'equipe', label: 'Inviter votre équipe', sub: 'Par lien, SMS ou QR code', to: '/app/equipe' },
  { key: 'import', label: 'Importer vos clients', sub: 'Téléphone ou fichier', to: '/app/clients' },
];

/** « Bien démarrer » : une ligne discrète avec la prochaine étape, qui se déplie au besoin. */
export function SetupBar() {
  const s = useBrix();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const tasks = SETUP.filter((t) => t.key !== 'equipe' || s.company.size !== 'solo');
  // Une étape faite ailleurs dans l'app compte aussi.
  const isDone = (k: string) => !!s.setupTasks[k] || (k === 'premier_devis' && s.devis.length > 0) || (k === 'import' && s.clients.length > 2);
  const done = tasks.filter((t) => isDone(t.key)).length;
  if (s.prefs.checklistDismissed || done === tasks.length) return null;
  const next = tasks.find((t) => !isDone(t.key))!;
  const go = (t: (typeof SETUP)[number]) => {
    s.markTask(t.key);
    navigate(t.to);
  };

  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-card" aria-label="Bien démarrer">
      <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
        <Ring value={(done / tasks.length) * 100} size={38} stroke={3.5} tone="ok">{done}/{tasks.length}</Ring>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="block text-[13.5px] font-semibold tracking-[-0.01em]">Bien démarrer avec Brix</span>
          <span className="block truncate text-[12px] text-ink-3">Prochaine étape : {next.label.toLowerCase()}</span>
        </button>
        <button onClick={() => go(next)} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-white shadow-ink transition hover:bg-[#241f3f] active:scale-95 sm:flex">
          Continuer <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-sub hover:text-ink" aria-label={open ? 'Replier' : 'Déplier'}>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-300 ease-out-quint', open && 'rotate-180')} />
        </button>
        <button
          onClick={() => {
            s.setPrefs({ checklistDismissed: true });
            toast('Masqué. Vous le retrouvez dans Réglages.', 'info', { label: 'Annuler', run: () => s.setPrefs({ checklistDismissed: false }) });
          }}
          className="-ml-1 hidden h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-sub hover:text-ink md:grid"
          aria-label="Masquer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={cn('grid transition-[grid-template-rows] duration-500 ease-out-quint', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-1.5 border-t border-line p-2 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((t) => {
              const ok = isDone(t.key);
              return (
                <button key={t.key} onClick={() => go(t)} className={cn('flex min-h-[52px] items-center gap-3 rounded-[12px] px-3 text-left transition-colors', ok ? 'opacity-55' : 'hover:bg-sub')}>
                  <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', ok ? 'bg-ok text-white' : 'border-[1.5px] border-line2')}>{ok && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                  <span className="min-w-0">
                    <b className={cn('block truncate text-[13px] font-medium', ok && 'line-through')}>{t.label}</b>
                    <span className="block truncate text-[11.5px] text-ink-3">{t.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
