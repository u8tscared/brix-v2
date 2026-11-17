// Portail fournisseur, bon de commande : lire la commande, la confirmer (ou proposer une modification), suivre.
import { useMemo } from 'react';
import { CalendarClock, Hash, MapPin, Undo2 } from 'lucide-react';
import { dateLong } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { emetteurArtisan } from '@/modules/fournisseurs/data/evenements';
import { useAchats } from '@/modules/fournisseurs/data/store';
import type { Commande } from '@/modules/fournisseurs/data/types';
import { pluriel } from '@/modules/fournisseurs/components/demandes/commun';
import { Acquisition, Artisan, Bloc, Fait, Mot } from '@/modules/fournisseurs/components/portail/commun';
import BonCommande from '@/modules/fournisseurs/components/portail/BonCommande';
import ActionsCommande from '@/modules/fournisseurs/components/portail/ActionsCommande';
import { Message } from '@/modules/fournisseurs/components/portail/Fin';

const I = { strokeWidth: 1.75 } as const;

export default function PortailCommande({ c }: { c: Commande }) {
  const e = useMemo(emetteurArtisan, []);
  const company = useBrix((s) => s.company);
  const chantier = useBrix((s) => s.chantiers.find((x) => x.id === c.chantierId)?.name);
  const f = useAchats((s) => s.fournisseurs.find((x) => x.id === c.fournisseurId));
  const prenom = e.prenom || e.entreprise;

  if (c.statut === 'annulee') return <Message icon={<Undo2 />} titre="Commande annulée" texte={`${e.entreprise} a annulé cette commande. Vous n’avez rien à préparer.`} />;

  return (
    <div className="space-y-5 lg:space-y-7">
      <Bloc className="bx-rise relative overflow-hidden">
        <div className="fx-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <div className="min-w-0 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#9898a8]">
                <span className="inline-flex h-6 items-center rounded-full bg-[#130f26] px-2.5 text-[11.5px] font-semibold text-white">Bon de commande</span>
                <span className="bx-mono">{c.numero}</span>
              </div>
              <h1 className="mt-3 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[32px]">
                {pluriel(c.lignes.length, 'article commandé', 'articles commandés')}
                <span className="block text-[#9898a8]">par {e.entreprise}</span>
              </h1>
            </div>
            <Artisan e={e} chantier={chantier} />
            {c.message && <Mot texte={c.message} auteur={prenom} />}
          </div>
          <div className="grid content-start gap-4 border-t border-[#ececf1] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
            <Fait icon={<CalendarClock {...I} />} label={c.statut === 'envoyee' ? 'Livraison souhaitée' : 'Livraison prévue'}>{c.livraisonPrevue ? dateLong(c.livraisonPrevue) : 'Dès que possible'}</Fait>
            <Fait icon={<MapPin {...I} />} label={c.mode === 'retrait_agence' ? 'Retrait' : 'Livrer au'}>{c.mode === 'retrait_agence' ? 'Au comptoir de votre agence' : c.adresse ?? 'Adresse à confirmer'}</Fait>
            {c.referenceFournisseur && <Fait icon={<Hash {...I} />} label="Votre référence"><span className="bx-mono">{c.referenceFournisseur}</span></Fait>}
          </div>
        </div>
      </Bloc>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="min-w-0 pb-2">
          <BonCommande c={c} f={f} e={e} adresseArtisan={[company.address, company.city].filter(Boolean).join(', ')} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20">
          <ActionsCommande c={c} prenom={prenom} />
          <Acquisition />
        </aside>
      </div>
    </div>
  );
}
