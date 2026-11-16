// Page publique /portail-fournisseur/:token : ce que voit le comptoir en ouvrant le lien reçu par e-mail.
// Pas de menu, pas de compte. Le lien vaut accès à une demande de prix ou à un bon de commande.
import { Link2Off } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Wordmark } from '@/components/brand/Logo';
import { Card } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useAchats } from './data/store';
import { useAchatsPrets } from './data/useAchatsPrets';
import type { Demande, Destinataire } from './data/types';
import PortailCommande from './components/demandes/PortailCommande';
import PortailDemande from './components/demandes/PortailDemande';

export default function PortailFournisseurPage() {
  const { token = '' } = useParams();
  useAchatsPrets();
  const entreprise = useBrix((s) => s.company.name) || 'Votre client';
  const demandes = useAchats((s) => s.demandes);
  const commandes = useAchats((s) => s.commandes);

  const commande = commandes.find((c) => c.token === token);
  let demande: { d: Demande; dest: Destinataire } | null = null;
  for (const d of demandes) {
    const dest = d.destinataires.find((x) => x.token === token);
    if (dest) demande = { d, dest };
  }

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-4">
          <Wordmark className="h-[22px]" />
          <span className="text-[12px] text-ink-3">Espace fournisseur</span>
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 py-5 sm:py-8">
        {commande ? (
          <PortailCommande c={commande} entreprise={entreprise} />
        ) : demande ? (
          <PortailDemande d={demande.d} dest={demande.dest} entreprise={entreprise} />
        ) : (
          <Card className="px-6 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sub text-ink-2">
              <Link2Off className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h1 className="mt-4 font-display text-[19px] font-semibold">Ce lien ne fonctionne plus</h1>
            <p className="mx-auto mt-2 max-w-sm text-[14px] text-ink-2">
              Il a peut-être expiré ou été mal copié. Ouvrez à nouveau l’e-mail reçu, ou appelez directement l’artisan qui vous l’a envoyé.
            </p>
          </Card>
        )}
      </main>

      <footer className="mx-auto max-w-[680px] px-4 pb-10 text-center text-[12px] text-ink-3">
        Envoyé avec Brix. Pas besoin de compte pour répondre.
      </footer>
    </div>
  );
}
