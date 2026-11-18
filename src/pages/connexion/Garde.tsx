// Démarrage du cloud, garde de /app et aiguillage de l'accueil.
// Sans worker (preview statique), tout se comporte comme avant : données locales, aucune connexion.
import { useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui';
import { demarrerCloud, quandExpire, useCloud } from '@/lib/cloud';
import { useBrix } from '@/lib/store';

/** Monté une fois : lance la synchronisation et gère la session expirée. */
export function DemarrageCloud() {
  const navigate = useNavigate();
  useEffect(() => {
    quandExpire(() => {
      toast('Votre session a expiré, reconnectez-vous', 'warn');
      navigate('/connexion', { replace: true });
    });
    void demarrerCloud();
  }, [navigate]);
  return null;
}

/** Démo ouverte sans compte (#/demo, ou « Charger la démo ») : utilisable sans connexion. */
const demoLibre = (s: { isDemo: boolean; compte?: string }) => s.isDemo && !s.compte;

/** /app : avec le cloud, il faut une session, sauf pour la démo. */
export function GardeCompte({ children }: { children: ReactNode }) {
  const dispo = useCloud((s) => s.dispo);
  const session = useCloud((s) => s.session);
  const isDemo = useBrix((s) => s.isDemo);
  const compte = useBrix((s) => s.compte);
  if (dispo === null) return <Attente />;
  if (dispo && !session && !demoLibre({ isDemo, compte })) return <Navigate to="/connexion" replace />;
  // Connecté, mais ce navigateur montre les données d'un autre compte : on propose d'ouvrir le bon.
  if (dispo && session && compte !== session.orgId && !isDemo) return <Navigate to="/connexion" replace />;
  return <>{children}</>;
}

/** Accueil : session → /app ; Brix local déjà créé → /app ; sinon /bienvenue. */
export function Accueil() {
  const dispo = useCloud((s) => s.dispo);
  const session = useCloud((s) => s.session);
  const onboarded = useBrix((s) => s.onboarded);
  const compte = useBrix((s) => s.compte);
  const isDemo = useBrix((s) => s.isDemo);
  if (dispo === null) return <Attente />;
  if (session) return <Navigate to={compte === session.orgId || isDemo ? '/app' : '/connexion'} replace />;
  if (dispo && onboarded && !demoLibre({ isDemo, compte })) return <Navigate to="/connexion" replace />;
  return <Navigate to={onboarded ? '/app' : '/bienvenue'} replace />;
}

function Attente() {
  return <div className="min-h-dvh" aria-busy="true" />;
}
