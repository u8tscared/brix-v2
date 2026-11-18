// Liste des demandes de prix : en cours, commandées, toutes.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Scale } from 'lucide-react';
import { Button, cn, EmptyState, IconTile, PageHeader, Segmented } from '@/components/ui';
import { relative } from '@/lib/format';
import { comparatif, eur } from '../data/helpers';
import { useAchats } from '../data/store';
import type { Demande } from '../data/types';
import { BadgeDemande, FournisseurPastille, Montant } from '../components/ui';
import { pluriel } from '../components/demandes/commun';
import NouvelleDemande from '../components/NouvelleDemande';

type Filtre = 'en_cours' | 'commandees' | 'toutes';
const EN_COURS: Demande['statut'][] = ['brouillon', 'envoyee', 'reponses_partielles', 'complete'];

function Reponses({ n, sur }: { n: number; sur: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: sur }, (_, i) => (
          <i key={i} className={cn('h-1.5 w-3 rounded-full', i < n ? 'fx-pop bg-[#10b981]' : 'bg-halo-track')} style={{ animationDelay: `${0.2 + i * 0.08}s` }} />
        ))}
      </span>
      <span className="num text-[12.5px] text-ink-2">
        {n}/{sur} <span className="text-ink-3">{n > 1 ? 'réponses' : 'réponse'}</span>
      </span>
    </span>
  );
}

export default function Demandes() {
  const nav = useNavigate();
  const { demandes, fournisseurs } = useAchats();
  const [filtre, setFiltre] = useState<Filtre>('en_cours');
  const [ouvrir, setOuvrir] = useState(false);

  const lignes = useMemo(
    () =>
      demandes
        .map((d) => ({ d, comp: comparatif(d, fournisseurs) }))
        .sort((a, b) => b.d.createdAt.localeCompare(a.d.createdAt)),
    [demandes, fournisseurs],
  );
  const compte = {
    en_cours: lignes.filter((x) => EN_COURS.includes(x.d.statut)).length,
    commandees: lignes.filter((x) => x.d.statut === 'commandee').length,
    toutes: lignes.length,
  };
  const visibles = lignes.filter((x) => (filtre === 'toutes' ? true : filtre === 'commandees' ? x.d.statut === 'commandee' : EN_COURS.includes(x.d.statut)));

  return (
    <div className="bx-stagger space-y-5">
      <PageHeader
        icon={<IconTile icon={<Scale />} dept="achats" size="xl" />}
        title="Demandes de prix"
        titleMuted="compatibles avec tous vos fournisseurs."
        subtitle="Une liste, plusieurs fournisseurs, un comparatif clair. Vous commandez en un clic chez le moins cher."
        actions={
          <Button variant="dawn" className="h-11 w-full justify-center sm:h-10 sm:w-auto" icon={<Plus className="h-4 w-4" />} onClick={() => setOuvrir(true)}>
            Nouvelle demande
          </Button>
        }
      />

      {lignes.length > 0 && (
        <Segmented<Filtre>
          className="[&>button]:h-10 md:[&>button]:h-9"
          value={filtre}
          onChange={setFiltre}
          options={[
            { value: 'en_cours', label: 'En cours', count: compte.en_cours },
            { value: 'commandees', label: 'Commandées', count: compte.commandees },
            { value: 'toutes', label: 'Toutes', count: compte.toutes },
          ]}
        />
      )}

      {lignes.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="Comparez vos fournisseurs sans passer un coup de fil"
          text="Choisissez un devis signé : Brix prépare la liste du matériel et l'envoie à vos fournisseurs. Ils répondent depuis un simple lien, vous voyez le moins cher ligne par ligne."
          action={<Button variant="primary" onClick={() => setOuvrir(true)}>Faire ma première demande</Button>}
        />
      ) : visibles.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title={filtre === 'en_cours' ? 'Aucune demande en attente' : 'Aucune demande commandée'}
          text={filtre === 'en_cours' ? 'Toutes vos demandes ont été commandées ou annulées. Lancez-en une nouvelle depuis un devis signé.' : 'Quand vous commandez depuis un comparatif, la demande se range ici avec ses bons de commande.'}
        />
      ) : (
        <div className="bx-stagger space-y-2">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_150px_190px_16px] gap-4 px-4 pb-1 text-[12px] font-medium text-ink-3 lg:grid">
            <span>Demande</span>
            <span>Réponses</span>
            <span className="text-right">Meilleur total</span>
            <span>Statut</span>
            <span />
          </div>
          {visibles.map(({ d, comp }) => (
            <button
              key={d.id}
              type="button"
              onClick={() => nav(`/app/fournisseurs/demandes/${d.id}`)}
              className="row-card grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 text-left lg:grid-cols-[minmax(0,1fr)_170px_150px_190px_16px]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="hidden -space-x-2 sm:flex">
                  {d.destinataires.slice(0, 3).map((x) => (
                    <span key={x.id} className={cn('rounded-[10px] ring-2 ring-white', x.statut !== 'repondue' && 'opacity-45')}><FournisseurPastille f={fournisseurs.find((f) => f.id === x.fournisseurId)} size={30} /></span>
                  ))}
                </span>
                <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">{d.titre}</span>
                <span className="block truncate text-[12.5px] text-ink-3">
                  {d.numero} · {pluriel(d.lignes.length, 'article')} · créée {relative(d.createdAt)}
                </span>
                </span>
              </span>
              <span className="row-start-2 lg:row-start-auto">
                <Reponses n={comp.reponses} sur={comp.consultes} />
              </span>
              <span className="text-right">
                {comp.recommandation ? <Montant v={eur(comp.recommandation.total_cents)} className="text-[14px] font-semibold" /> : <span className="text-[12.5px] text-ink-3">En attente</span>}
              </span>
              <span className="row-start-2 justify-self-end lg:row-start-auto lg:justify-self-start">
                <BadgeDemande s={d.statut} />
              </span>
              <ChevronRight className="hidden h-4 w-4 text-ink-3 lg:block" />
            </button>
          ))}
        </div>
      )}

      <NouvelleDemande open={ouvrir} onClose={() => setOuvrir(false)} />
    </div>
  );
}
