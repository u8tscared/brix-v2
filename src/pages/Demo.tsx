import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrix } from '@/lib/store';

/** /demo : charge l'entreprise de démonstration et ouvre le cockpit. */
export default function Demo() {
  const loadDemo = useBrix((s) => s.loadDemo);
  const navigate = useNavigate();
  useEffect(() => {
    loadDemo();
    navigate('/app', { replace: true });
  }, []);
  return null;
}
