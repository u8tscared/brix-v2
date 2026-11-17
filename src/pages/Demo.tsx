import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import type { TradeKey } from '@/lib/types';

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
  return null;
}
