import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hammer } from 'lucide-react';
import { Button, IconTile, PageHeader } from '@/components/ui';
import { MODULES } from '@/lib/catalog';

/** Écran temporaire d'un module en cours de construction : on dit ce qui arrive et on propose une sortie. */
export default function Placeholder({ title }: { title?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const m = MODULES.find((x) => pathname.includes('/app/' + x.path));
  return (
    <div className="space-y-6">
      <PageHeader icon={m ? <IconTile name={m.icon} dept={m.dept} size="lg" /> : undefined} title={title ?? m?.name ?? 'Bientôt'} subtitle={m?.short} />
      <div className="grid place-items-center rounded-[20px] bg-white px-6 py-14 text-center shadow-card animate-[fade-up_.4s_var(--ease)_both]">
        <IconTile icon={<Hammer strokeWidth={1.75} />} dept={m?.dept ?? 'bob'} size="xl" />
        <h2 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Cet écran arrive bientôt</h2>
        <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-2">Nous le terminons en ce moment. Vous serez prévenu dans Brix dès qu’il sera prêt, sans rien à faire de votre côté.</p>
        <Button className="mt-6" icon={<ArrowLeft />} onClick={() => navigate('/app')}>Retour à l’accueil</Button>
      </div>
    </div>
  );
}
