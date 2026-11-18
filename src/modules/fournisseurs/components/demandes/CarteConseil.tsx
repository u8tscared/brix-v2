// La carte qui dit quoi faire : chez qui commander, combien, combien on économise.
import { ArrowRight, Clock, Scale, ShoppingCart, Truck } from 'lucide-react';
import { Badge, Button, Card, IconTile, Progress } from '@/components/ui';
import { money } from '@/lib/format';
import type { Comparatif, Recommandation } from '../../../../../worker/src/modules/fournisseurs/comparateur';
import { eur } from '../../data/helpers';
import type { Demande, Fournisseur } from '../../data/types';
import { FournisseurPastille } from '../ui';
import { pluriel } from './commun';

const nomCourt = (n: string) => n.split(/\s+/)[0];

export function libelleCommande(r: Recommandation) {
  return r.repartition.length === 1 ? `Commander chez ${nomCourt(r.repartition[0].fournisseur_nom)}` : `Commander en ${r.repartition.length} fois`;
}

function Ecart({ cents, label }: { cents: number; label: string }) {
  const gain = cents >= 0;
  return (
    <div className="min-w-0">
      <div className={`num-halo text-[22px] ${gain ? 'text-deep-g' : 'text-deep-a'}`}>
        {gain ? '−' : '+'}
        {money(Math.abs(cents) / 100)}
      </div>
      <div className="text-[12px] text-ink-2">{gain ? label : label.replace('moins', 'plus')}</div>
    </div>
  );
}

export function CarteAttente({ d, comp }: { d: Demande; comp: Comparatif }) {
  const ouvertes = d.destinataires.filter((x) => x.statut === 'vue').length;
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <IconTile icon={<Clock />} tone="violet" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.025em]">En attente des premières réponses</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {pluriel(comp.consultes, 'fournisseur a', 'fournisseurs ont')} reçu votre liste{ouvertes ? `, ${ouvertes} l’${ouvertes > 1 ? 'ont' : 'a'} déjà ouverte` : ''}. Le comparatif se remplit tout seul dès qu’un prix arrive.
          </p>
          <Progress value={(comp.reponses / Math.max(1, comp.consultes)) * 100} tone="dawn" className="mt-4" />
        </div>
      </div>
    </Card>
  );
}

export default function CarteConseil({ comp, fournisseurs, d, onCommander }: { comp: Comparatif; fournisseurs: Fournisseur[]; d: Demande; onCommander: (r: Recommandation) => void }) {
  const r = comp.recommandation!;
  const alt = comp.alternative;
  const complets = comp.totaux.filter((t) => t.complet);
  const vsCher = complets.length >= 2 ? complets[complets.length - 1].total_cents - r.total_cents : 0;
  const attente = d.destinataires.filter((x) => x.statut === 'envoyee' || x.statut === 'vue');
  const f = (destId: string) => fournisseurs.find((x) => x.id === comp.totaux.find((t) => t.destinataire_id === destId)?.fournisseur_id);
  const delai = Math.max(...r.repartition.map((g) => comp.totaux.find((t) => t.destinataire_id === g.destinataire_id)?.delai_livraison_jours ?? 0));

  return (
    <Card className="halo-bg halo-clip relative overflow-hidden">
      <div className="relative p-6 md:p-7">
        <Badge tone="violet" size="md" icon={<Scale />}>Notre conseil</Badge>
        <h2 className="mt-3 text-[22px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[26px]">
          {r.repartition.length === 1 ? `Tout commander chez ${r.repartition[0].fournisseur_nom}` : `Commander en ${r.repartition.length} fois pour payer moins cher`}
        </h2>
        <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-ink-2">{r.explication}</p>

        {r.repartition.length > 1 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {r.repartition.map((g) => (
              <li key={g.destinataire_id} className="row-card gap-3 px-3.5 py-3">
                <FournisseurPastille f={f(g.destinataire_id)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{g.fournisseur_nom}</div>
                  <div className="text-[12px] text-ink-3">{pluriel(g.ligne_ids.length, 'article')}</div>
                </div>
                <span className="num text-[13.5px] font-medium">{money(g.total_cents / 100)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 rounded-card-sm bg-dawn-pale p-5 sm:grid-cols-[auto_auto_auto_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <div className="num-halo text-[38px] leading-none">
              {money(r.total_cents / 100)}
              <span className="ml-1 text-[13px] font-medium tracking-normal text-ink-3">HT</span>
            </div>
            <div className="mt-1 text-[12px] text-ink-2">port compris</div>
          </div>
          {r.economie_vs_cible_cents != null && <Ecart cents={r.economie_vs_cible_cents} label="de moins que prévu au devis" />}
          {vsCher > 0 && <Ecart cents={vsCher} label="vs l’offre la plus chère" />}
          {delai > 0 && (
            <div className="hidden items-end justify-end gap-1.5 text-[12.5px] text-ink-2 sm:flex">
              <Truck className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
              livré sous {pluriel(delai, 'jour')}
            </div>
          )}
        </div>

        {attente.length > 0 && (
          <p className="mt-4 rounded-card-sm bg-halo-track/70 px-4 py-2.5 text-[12.5px] text-ink-2">
            {attente.length === 1 ? `${fournisseurs.find((x) => x.id === attente[0].fournisseurId)?.nom ?? 'Un fournisseur'} n’a pas encore répondu.` : `${attente.length} fournisseurs n’ont pas encore répondu.`} Vous pouvez attendre ou commander dès maintenant.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="dawn" size="lg" className="w-full justify-center sm:w-auto" icon={<ShoppingCart className="h-[18px] w-[18px]" />} onClick={() => onCommander(r)}>
            {libelleCommande(r)}
          </Button>
          {alt && (
            <button type="button" onClick={() => onCommander(alt)} className="group flex min-h-[44px] items-center justify-center gap-1.5 rounded-pill px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-white/70 hover:text-ink">
              {alt.repartition.length === 1 ? `Ou tout chez ${alt.repartition[0].fournisseur_nom}` : `Ou répartir en ${alt.repartition.length} commandes`}
              <span className="num text-ink-3">
                ({alt.total_cents >= r.total_cents ? '+' : '−'}
                {money(Math.abs(alt.total_cents - r.total_cents) / 100)})
              </span>
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export const portDe = (comp: Comparatif, destId: string) => eur(comp.totaux.find((t) => t.destinataire_id === destId)?.port_cents) ?? 0;
