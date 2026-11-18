import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import type { TradeKey } from '@/lib/types';
import { BrandTile } from '@/components/brand/Logo';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';

/** /demo?metier=plombier : charge l'entreprise de démonstration du métier et ouvre l'accueil. */
export default function Demo() {
  const loadDemo = useBrix((s) => s.loadDemo);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    const m = params.get('metier') as TradeKey | null;
    loadDemo(m && TRADE_BY_KEY[m] ? m : 'electricien');
    navigate('/app', { replace: true });
  }, []);
  // Le temps d'un battement : la tuile Brix sur le halo, puis l'accueil de la démo.
  return (
    <div className="relative isolate grid min-h-dvh place-items-center" role="status" aria-label="Ouverture de la démo">
      <HaloBackdrop />
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <BrandTile size={56} />
        <span className="text-[13px] font-medium text-ink-2">Ouverture de la démo…</span>
      </div>
    </div>
  );
}
