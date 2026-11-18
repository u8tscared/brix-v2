// Page publique /portail-fournisseur/:token : ce que voit le comptoir en ouvrant le lien reçu par e-mail.
// Pas de menu, pas de compte. Le lien vaut accès à une demande de prix ou à un bon de commande.
import '@/parcours/parcours.css';
import '@/modules/fournisseurs/fournisseurs.css';
import { useMemo } from 'react';
import { Link2Off, Lock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { BrandLogo, BrandTile } from '@/parcours/marque';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { useSyncOnglets } from '@/parcours/sync';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { useAchatsPrets } from '@/modules/fournisseurs/data/useAchatsPrets';
import PortailCommande from '@/modules/fournisseurs/components/demandes/PortailCommande';
import PortailDemande from '@/modules/fournisseurs/components/demandes/PortailDemande';
import { Message } from '@/modules/fournisseurs/components/portail/Fin';

export default function PortailFournisseurPage() {
  const { token = '' } = useParams();
  const pret = useAchatsPrets();
  useSyncOnglets([useAchats]);
  const commande = useAchats((s) => s.commandes.find((c) => c.token === token));
  const demandes = useAchats((s) => s.demandes);
  const demande = useMemo(() => {
    for (const d of demandes) {
      const dest = d.destinataires.find((x) => x.token === token);
      if (dest) return { d, dest };
    }
    return null;
  }, [demandes, token]);

  return (
    <div className="bx-root relative isolate min-h-dvh text-ink">
      <HaloBackdrop />

      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-3 rounded-pill pl-5 pr-2">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size={24} />
            <span className="h-4 w-px bg-[#ddd6ee]" />
            <span className="truncate text-[13px] font-medium text-ink-2">Espace fournisseur</span>
          </div>
          <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill bg-white px-3.5 text-[12.5px] font-medium text-ink-2 shadow-pill">
            <Lock className="h-3.5 w-3.5 text-deep-g" strokeWidth={2.25} />
            <span className="hidden sm:inline">Lien</span> sécurisé
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        {!pret ? (
          <div className="space-y-4">
            <div className="bx-skel h-[260px] rounded-card" />
            <div className="bx-skel h-[420px] rounded-card" />
          </div>
        ) : commande ? (
          <PortailCommande c={commande} />
        ) : demande ? (
          <PortailDemande d={demande.d} dest={demande.dest} />
        ) : (
          <div className="pt-6">
            <Message icon={<Link2Off />} titre="Ce lien ne fonctionne plus" texte="Il a peut-être expiré ou été mal copié. Ouvrez à nouveau l’e-mail reçu, ou appelez l’artisan qui vous l’a envoyé." />
          </div>
        )}
      </main>

      <footer className="relative mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-4 pb-[calc(40px+env(safe-area-inset-bottom))] text-center text-[12px] text-ink-3 sm:px-6 lg:flex-row lg:justify-between">
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" strokeWidth={2} />Espace sécurisé · lien personnel, ne le transférez pas</span>
        <a href="https://brix-app.fr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-ink-2 transition hover:text-ink">
          Propulsé par <BrandTile size={18} /> Brix
        </a>
      </footer>
    </div>
  );
}
