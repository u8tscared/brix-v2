// Réglages › Compte : le compte cloud (e-mail, dernier enregistrement, déconnexion).
// Rien ne s'affiche en preview statique (pas de worker) : tout reste local, comme avant.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, CloudOff, LogOut, MonitorSmartphone } from 'lucide-react';
import { Button, Card, IconTile, Sheet, toast } from '@/components/ui';
import { aDesModifsEnAttente, seDeconnecter, useCloud, type EtatSync } from '@/lib/cloud';
import { useBrix } from '@/lib/store';

function depuis(iso: string | null, maintenant: number) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 1000));
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

const LIBELLE: Record<EtatSync, string> = {
  idle: 'Enregistré dans le cloud',
  syncing: 'Enregistrement…',
  offline: 'Hors ligne : vos modifications partiront au retour du réseau',
  error: 'Enregistrement en attente, nouvel essai bientôt',
};

export function CloudCompte() {
  const navigate = useNavigate();
  const { dispo, session, etat, derniereSync } = useCloud();
  const compte = useBrix((s) => s.compte);
  const [maintenant, setMaintenant] = useState(Date.now());
  const [confirmer, setConfirmer] = useState<null | 'ici' | 'partout'>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!dispo) return null;

  if (!session) {
    return (
      <Card className="p-4 md:p-5 xl:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <IconTile tone="neutral" size="row" icon={<CloudOff />} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold tracking-[-0.02em]">Données sur cet appareil seulement</div>
            <p className="text-[12.5px] text-ink-2">Connectez-vous pour les retrouver sur votre téléphone et votre ordinateur.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/connexion')}>Se connecter</Button>
        </div>
      </Card>
    );
  }

  const lie = compte === session.orgId;
  const quand = depuis(derniereSync, maintenant);
  const sortir = async (partout: boolean) => {
    setOccupe(true);
    try {
      await seDeconnecter(partout);
      navigate('/connexion', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Déconnexion impossible, réessayez.', 'warn');
    } finally {
      setOccupe(false);
      setConfirmer(null);
    }
  };
  const demander = (q: 'ici' | 'partout') => (q === 'ici' && !aDesModifsEnAttente() ? void sortir(false) : setConfirmer(q));

  return (
    <Card className="p-4 md:p-5 xl:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <IconTile tone="violet" size="row" icon={<Cloud />} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">Compte Brix</div>
          <div className="truncate text-[13px] text-ink-2">{session.email}</div>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-ink-2" aria-live="polite">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${etat === 'idle' ? 'bg-ok' : etat === 'syncing' ? 'bg-[#7c3aed]' : 'bg-warn'}`} aria-hidden />
          {lie ? (etat === 'idle' && quand ? `${LIBELLE.idle} ${quand}` : LIBELLE[etat]) : 'Démo ouverte : vos données restent dans votre compte'}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" icon={<LogOut className="h-4 w-4" />} disabled={occupe} onClick={() => demander('ici')}>Se déconnecter</Button>
        <Button size="sm" variant="ghost" icon={<MonitorSmartphone className="h-4 w-4" />} disabled={occupe} onClick={() => demander('partout')}>Déconnecter tous les appareils</Button>
      </div>

      <Sheet
        open={!!confirmer}
        onClose={() => setConfirmer(null)}
        side="center"
        width={420}
        title={confirmer === 'partout' ? 'Déconnecter tous les appareils ?' : 'Se déconnecter maintenant ?'}
        subtitle={confirmer === 'partout' ? 'Téléphones, tablettes et ordinateurs devront se reconnecter, celui-ci compris.' : 'Des modifications ne sont pas encore arrivées dans le cloud.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmer(null)}>Annuler</Button>
            <Button variant="danger" loading={occupe} onClick={() => void sortir(confirmer === 'partout')}>Déconnecter</Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">
          {aDesModifsEnAttente() ? 'Si vous vous déconnectez hors ligne, les dernières modifications de cet appareil seront perdues.' : 'Vos données restent enregistrées dans votre compte.'}
        </p>
      </Sheet>
    </Card>
  );
}
