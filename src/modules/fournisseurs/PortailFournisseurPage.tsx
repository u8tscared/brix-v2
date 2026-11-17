// Page publique /portail-fournisseur/:token : ce que voit le comptoir en ouvrant le lien reçu par e-mail.
// Pas de menu, pas de compte. Le lien vaut accès à une demande de prix ou à un bon de commande.
import '@/parcours/parcours.css';
import '@/modules/fournisseurs/fournisseurs.css';
import { useMemo } from 'react';
import { Link2Off, Lock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { BrandLogo, BrandTile } from '@/parcours/marque';
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
    <div className="bx-root relative min-h-dvh bg-[#f4f3fa] text-[#130f26]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden" aria-hidden>
        <div className="bx-sky opacity-60" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#ececf1]/80 bg-[#f4f3fa]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={24} />
            <span className="h-4 w-px bg-[#d9d7e3]" />
            <span className="text-[13px] font-medium text-[#5f5f70]">Espace fournisseur</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ececf1] bg-white/80 px-2.5 py-1 text-[12px] font-medium text-[#5f5f70]">
            <Lock className="h-3 w-3 text-[#16a34a]" strokeWidth={2.25} />
            <span className="hidden sm:inline">Lien</span> sécurisé
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        {!pret ? (
          <div className="space-y-4">
            <div className="bx-skel h-[260px] rounded-[20px]" />
            <div className="bx-skel h-[420px] rounded-[20px]" />
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

      <footer className="relative mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-4 pb-[calc(40px+env(safe-area-inset-bottom))] text-center text-[12px] text-[#9898a8] sm:px-6 lg:flex-row lg:justify-between">
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" strokeWidth={2} />Espace sécurisé · lien personnel, ne le transférez pas</span>
        <a href="https://brix-app.fr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-[#5f5f70] transition hover:text-[#130f26]">
          Propulsé par <BrandTile size={18} /> Brix
        </a>
      </footer>
    </div>
  );
}
