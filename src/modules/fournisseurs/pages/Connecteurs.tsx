// « Connexions » : la vitrine honnête des extensions fournisseurs. Ce qui marche, ce qui dépend des enseignes.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cable, Check, Code2, FileSpreadsheet, FileText, Mail, MousePointerClick, Receipt, Reply, Send, Webhook } from 'lucide-react';
import { Badge, Button, Card, IconTile, PageHeader } from '@/components/ui';
import { CONNECTEURS, type ConnecteurDef } from '../../../../worker/src/modules/fournisseurs/connecteurs/registre';
import { useAchats } from '../data/store';
import { FournisseurPastille } from '../components/ui';
import { CAPACITES } from '../components/achats/commun';

const ICONES: Record<string, ReactNode> = { email: <Mail />, api_brix: <Webhook />, fichier_tarif: <FileSpreadsheet />, edi: <FileText />, factures_pdp: <Receipt /> };
const ACTIONS: Record<string, { label: string; to: string }> = {
  email: { label: 'Voir mes fournisseurs', to: '/app/fournisseurs/annuaire' },
  fichier_tarif: { label: 'Importer un tarif', to: '/app/fournisseurs/catalogue' },
};

// Textes affichés à l'artisan : le registre du serveur parle aux développeurs (EDI, GLN, webhook…), ici on parle simple.
const TEXTES: Record<string, { nom: string; description: string; condition?: string }> = {
  email: {
    nom: 'E-mail et lien de réponse',
    description: 'Marche avec tous les fournisseurs, dès aujourd’hui. Brix envoie la demande ou la commande par e-mail avec un lien personnel : le fournisseur répond, confirme ou indique l’expédition depuis son téléphone, sans compte ni installation.',
  },
  api_brix: {
    nom: 'Logiciel du fournisseur relié',
    description: 'Si votre fournisseur a un logiciel relié à Brix, vos demandes et commandes arrivent directement chez lui, et ses prix, confirmations, livraisons et factures reviennent tout seuls. Il vous suffit du code partenaire qu’il vous donne.',
  },
  fichier_tarif: {
    nom: 'Import de vos prix nets',
    description: 'Le fichier de prix envoyé par votre commercial (Excel ou CSV) : Brix reconnaît les colonnes tout seul, garde l’historique et vous prévient quand un prix augmente.',
  },
  edi: {
    nom: 'Commande automatique (EDI)',
    description: 'Le format d’échange des grands négoces. Brix le joint déjà à vos bons de commande ; l’envoi direct, sans e-mail, s’active quand le fournisseur ouvre son canal pour vous.',
    condition: 'un accord avec le service informatique du fournisseur, qui s’occupe des réglages.',
  },
  factures_pdp: {
    nom: 'Factures fournisseurs automatiques',
    description: 'Les factures de vos fournisseurs arrivent dans Brix par la facture électronique et sont comparées toutes seules à la commande et à la livraison.',
    condition: 'le branchement à la plateforme de facture électronique, déjà utilisée par Brix pour vos propres factures.',
  },
};
const texte = (c: ConnecteurDef) => ({ nom: TEXTES[c.cle]?.nom ?? c.nom, description: TEXTES[c.cle]?.description ?? c.description, condition: TEXTES[c.cle]?.condition ?? c.condition_reelle });

const Puces = ({ c }: { c: ConnecteurDef }) => (
  <div className="flex flex-wrap gap-1">
    {c.capacites.map((k) => <span key={k} className="rounded-full bg-pale-n px-2.5 py-1 text-[11.5px] font-medium text-ink-2">{CAPACITES[k]}</span>)}
  </div>
);

const Titre = ({ titre, texte }: { titre: string; texte: string }) => (
  <div className="mb-3">
    <h2 className="text-[19px] font-semibold tracking-[-0.03em]">{titre}</h2>
    <p className="mt-0.5 text-[13px] text-ink-2">{texte}</p>
  </div>
);

export default function Connecteurs() {
  const nav = useNavigate();
  const fournisseurs = useAchats((s) => s.fournisseurs);
  const utilisees = new Set(fournisseurs.map((f) => f.enseigne).filter(Boolean));
  const dispo = CONNECTEURS.filter((c) => c.etat === 'disponible');
  const formats = CONNECTEURS.filter((c) => c.etat === 'sur_accord' && !c.champs.some((ch) => ch.cle === 'numero_compte_client'));
  const enseignes = CONNECTEURS.filter((c) => c.etat === 'sur_accord' && c.champs.some((ch) => ch.cle === 'numero_compte_client'))
    .sort((a, b) => Number(utilisees.has(b.cle)) - Number(utilisees.has(a.cle)));
  const bientot = CONNECTEURS.filter((c) => c.etat === 'bientot');

  return (
    <div className="bx-stagger space-y-8">
      <PageHeader icon={<IconTile icon={<Cable />} dept="achats" size="xl" />} title="Connexions" titleMuted="compatible avec tous vos fournisseurs." subtitle="Brix marche dès aujourd’hui avec tous vos fournisseurs, par e-mail et lien sécurisé. Les connexions directes arrivent enseigne par enseigne." />

      <Card className="halo-bg halo-clip relative overflow-hidden p-6 md:p-7">
        <div className="label-halo">Comment ça marche, aujourd’hui, avec n’importe quel fournisseur</div>
        <ol className="mt-4 grid gap-4 md:grid-cols-3 md:gap-6">
          {[
            { icon: <Send />, t: 'Brix envoie un e-mail', d: 'Votre demande de prix ou votre commande part au comptoir, avec un lien personnel et sécurisé.' },
            { icon: <MousePointerClick />, t: 'Le fournisseur répond en ligne', d: 'Depuis son téléphone ou son ordinateur, sans compte ni installation : prix, confirmation, expédition.' },
            { icon: <Reply />, t: 'Tout revient dans Brix', d: 'Comparatif des prix, suivi de livraison et historique se mettent à jour tout seuls.' },
          ].map((e, i) => (
            <li key={i} className="flex gap-3">
              <IconTile icon={e.icon} tone={(['violet', 'mag', 'green'] as const)[i]} />
              <div>
                <div className="text-[14px] font-semibold"><span className="num mr-1 text-ink-3">{i + 1}.</span>{e.t}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{e.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <section>
        <Titre titre="Disponible maintenant" texte="Rien à demander à personne : c’est déjà actif sur votre compte." />
        <div className="grid gap-3 lg:grid-cols-3">
          {dispo.map((c) => (
            <Card key={c.cle} className="flex min-w-0 flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <IconTile icon={ICONES[c.cle] ?? <Code2 />} tone={c.cle === 'email' ? 'violet' : c.cle === 'fichier_tarif' ? 'peach' : 'blue'} />
                <Badge tone="ok" dot>Disponible</Badge>
              </div>
              <div className="mt-4 text-[15px] font-semibold tracking-[-0.02em]">{texte(c).nom}</div>
              <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-2">{texte(c).description}</p>
              <div className="mt-3"><Puces c={c} /></div>
              {ACTIONS[c.cle] && (
                <Button size="sm" variant="secondary" className="mt-4 self-start max-md:h-10" onClick={() => nav(ACTIONS[c.cle].to)}>{ACTIONS[c.cle].label}</Button>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Titre titre="Connexions directes aux enseignes" texte="Prix nets en temps réel, commande en un clic, suivi automatique. Elles s’ouvrent quand chaque enseigne donne son accord ; en attendant, tout fonctionne par e-mail." />
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          {formats.map((c) => (
            <Card key={c.cle} className="flex min-w-0 gap-3.5 p-5">
              <IconTile icon={ICONES[c.cle] ?? <Code2 />} tone="neutral" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{texte(c).nom}</span>
                  <Badge>Sur accord</Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{texte(c).description}</p>
                {texte(c).condition && <p className="mt-1.5 text-[11.5px] text-ink-3">Il faut {texte(c).condition}</p>}
              </div>
            </Card>
          ))}
        </div>
        <div className="mb-3 flex items-start gap-2.5 rounded-card-sm bg-pale-g px-4 py-3.5 text-[13px] text-deep-g">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-medium">Déjà possible avec toutes ces enseignes :</span> demandes de prix et commandes par e-mail au comptoir de votre agence, import de vos prix nets.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {enseignes.map((c) => {
            const court = c.description.split(' Dès aujourd')[0];
            return (
              <Card key={c.cle} className="flex min-w-0 flex-col p-5">
                <div className="flex items-center gap-3">
                  <FournisseurPastille f={{ nom: c.nom, enseigne: c.cle }} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{c.nom}</div>
                    <div className="truncate text-[12px] text-ink-3">{court}</div>
                  </div>
                  {utilisees.has(c.cle) && <Badge tone="violet" className="shrink-0">Le vôtre</Badge>}
                </div>
                <div className="mt-3 flex-1"><Puces c={c} /></div>
                <p className="mt-3 border-t border-halo-line pt-2.5 text-[11.5px] leading-snug text-ink-3">
                  <span className="font-medium text-ink-2">Sur accord de l’enseigne.</span> Une convention reste à signer avec {c.nom} ; en attendant, tout passe par e-mail.
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {bientot.length > 0 && (
        <section>
          <Titre titre="Bientôt" texte="Prévu, pas encore construit." />
          <div className="grid gap-3 md:grid-cols-2">
            {bientot.map((c) => <Card key={c.cle} className="p-4"><div className="text-[14px] font-semibold">{c.nom}</div><p className="mt-1 text-[12.5px] text-ink-2">{c.description}</p></Card>)}
          </div>
        </section>
      )}

      <Card tone="dawn" className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-8">
          <div>
            <div className="label-halo">Vous êtes fournisseur ?</div>
            <h2 className="mt-1.5 text-[24px] font-semibold leading-[1.1] tracking-[-0.035em]">Recevez les demandes des artisans directement dans votre logiciel</h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
              Brix envoie demandes de prix et commandes à votre logiciel, en temps réel. Il répond tout seul : prix, confirmation, expédition, tarifs et factures. Transmettez cette page à votre service informatique.
            </p>
            <a href="/api/public/v1/openapi.json" target="_blank" rel="noreferrer" className="mt-5 inline-flex h-[42px] items-center gap-2 rounded-pill bg-ink px-5 text-[13.5px] font-semibold text-white shadow-ink transition hover:-translate-y-px">
              Lire la documentation <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <ul className="space-y-3 text-[13px]">
            {[
              { t: 'Documentation publique', d: 'Votre service informatique la lit et fait un essai en quelques minutes (API REST, description OpenAPI).' },
              { t: 'Envois sécurisés', d: 'Chaque envoi est signé : vous vérifiez qu’il vient bien de Brix.' },
              { t: 'Code partenaire', d: 'Vous donnez un code BRX-XXXX-XXXX à vos clients artisans : leurs demandes arrivent chez vous, sans ressaisie.' },
            ].map((x) => (
              <li key={x.t} className="flex gap-3 rounded-card-sm bg-white/80 p-4 shadow-halo-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pale-g text-deep-g"><Check className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
                <div><div className="font-medium">{x.t}</div><div className="mt-0.5 text-[12.5px] text-ink-2">{x.d}</div></div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
