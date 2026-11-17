import { lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronRight, CircleUser, CreditCard, LayoutGrid, Plug, Users, type LucideIcon } from 'lucide-react';
import { IconTile, PageHeader, cn } from '@/components/ui';
import { PageLoader } from '@/components/layout/AppShell';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useBrix } from '@/lib/store';
import { MODULES, OFFERS } from '@/lib/catalog';

const TABS = {
  entreprise: { label: 'Entreprise', hint: 'Identité, assurance, métier, prix', icon: Building2, C: lazy(() => import('./components/reglages/EntrepriseTab')) },
  modules: { label: 'Modules', hint: 'Ce qui apparaît dans votre menu', icon: LayoutGrid, C: lazy(() => import('./components/reglages/ModulesTab')) },
  offre: { label: 'Offre', hint: 'Votre abonnement Brix', icon: CreditCard, C: lazy(() => import('./components/reglages/OffreTab')) },
  equipe: { label: 'Équipe et droits', hint: 'Invitations et qui voit quoi', icon: Users, C: lazy(() => import('./components/reglages/EquipeTab')) },
  integrations: { label: 'Intégrations', hint: 'Banque, agenda, paiements', icon: Plug, C: lazy(() => import('./components/reglages/IntegrationsTab')) },
  compte: { label: 'Mon compte', hint: 'Profil, export, sécurité', icon: CircleUser, C: lazy(() => import('./components/reglages/CompteTab')) },
} as const;
type TabKey = keyof typeof TABS;
const KEYS = Object.keys(TABS) as TabKey[];

/** Réglages : menu vertical à gauche sur ordinateur ; sur téléphone, une liste puis une sous-page. */
export default function Reglages() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const phone = useMediaQuery('(max-width: 767px)');
  const valid = tab && tab in TABS ? (tab as TabKey) : null;
  const current: TabKey = valid ?? 'entreprise';
  const { C, label, hint } = TABS[current];
  const { short: meta, long: metaLong } = useMeta();

  if (phone && !valid) {
    return (
      <div className="space-y-5">
        <PageHeader icon={<IconTile name="Settings" dept="gestion" size="lg" />} title="Réglages" subtitle="Votre entreprise, vos outils, votre offre." />
        <nav className="stagger-fast overflow-hidden rounded-[18px] bg-white shadow-card">
          {KEYS.map((k) => {
            const t = TABS[k];
            return (
              <Link key={k} to={`/app/reglages/${k}`} className="flex min-h-[64px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 active:bg-sub">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#eef0fd] text-[#3730a3]"><t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">{t.label}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{metaLong[k] ?? t.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  if (phone) {
    return (
      <div className="space-y-5">
        <div className="animate-[page-in_.45s_var(--ease)_both]">
          <button onClick={() => navigate('/app/reglages')} className="-ml-1.5 inline-flex h-10 items-center gap-1.5 rounded-[9px] px-1.5 text-[13.5px] font-medium text-ink-2 active:bg-sub">
            <ArrowLeft className="h-4 w-4" /> Réglages
          </button>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.035em]">{label}</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">{hint}</p>
        </div>
        <Suspense fallback={<PageLoader />}>
          <div key={current} className="animate-[slide-left_.35s_var(--ease)_both]"><C /></div>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Settings" dept="gestion" size="lg" />} title="Réglages" subtitle="Votre entreprise, vos outils, votre offre." />
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-8">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none lg:sticky lg:top-4 lg:flex-col lg:overflow-visible" aria-label="Sections des réglages">
          {KEYS.map((k) => {
            const t = TABS[k];
            const on = k === current;
            return (
              <Link
                key={k}
                to={`/app/reglages/${k}`}
                className={cn(
                  'group relative flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] font-medium transition-[background,color,box-shadow] duration-200',
                  on ? 'bg-white text-ink shadow-card' : 'text-ink-2 hover:bg-[#efedf5] hover:text-ink',
                )}
              >
                <t.icon className={cn('h-4 w-4 transition-colors', on ? 'text-[#4f46e5]' : 'text-ink-3 group-hover:text-ink-2')} strokeWidth={1.75} />
                {t.label}
                {meta[k] && <span className={cn('num ml-auto hidden text-[11.5px] lg:inline', on ? 'text-ink-3' : 'text-ink-3/80')}>{meta[k]}</span>}
              </Link>
            );
          })}
        </nav>
        <section className="min-w-0">
          <div className="mb-5 hidden lg:block">
            <h2 className="text-[19px] font-semibold tracking-[-0.025em]">{label}</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">{hint}</p>
          </div>
          <Suspense fallback={<PageLoader />}>
            <div key={current} className="animate-[fade-up_.4s_var(--ease)_both]"><C /></div>
          </Suspense>
        </section>
      </div>
    </div>
  );
}

/** Petits compteurs affichés à côté des sections. */
function useMeta(): { short: Partial<Record<TabKey, string>>; long: Partial<Record<TabKey, string>> } {
  const enabled = useBrix((s) => s.enabled);
  const plan = useBrix((s) => s.plan);
  const employees = useBrix((s) => s.employees.length);
  const active = MODULES.filter((m) => m.core || enabled.includes(m.key)).length;
  const offer = OFFERS.find((o) => o.key === plan)?.name;
  return {
    short: { modules: `${active}/${MODULES.length}`, offre: offer, equipe: String(employees) },
    long: { modules: `${active} modules actifs sur ${MODULES.length}`, offre: `Offre ${offer}`, equipe: `${employees} personne${employees > 1 ? 's' : ''} dans l’équipe` },
  };
}
