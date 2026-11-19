// #/autoriser?req=… : un assistant (Claude, ChatGPT, Le Chat…) demande à lire Brix (OAuth, Brix AI MCP).
// Le gérant voit qui demande (nom, hôte, adresse de retour), choisit « Lecture seule » ou « Lecture et
// actions », puis « Autoriser » ou « Refuser » : le serveur renvoie l'adresse de retour de l'assistant.
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CircleAlert, Eye, FilePen, ShieldCheck } from 'lucide-react';
import { cn } from '@/components/ui';
import { cloudDisponible } from '@/lib/api';
import { useCloud } from '@/lib/cloud';
import { approuverDemande, lireDemande, refuserDemande, type DemandeAutorisation } from '@/modules/fournisseurs/mcp/api';
import { ACTIONS, LECTURES } from '@/modules/fournisseurs/mcp/contenu';
import { Cadre, Erreur } from '@/pages/connexion/Cadre';

type Etat = { t: 'chargement' } | { t: 'erreur'; message: string } | { t: 'pret'; d: DemandeAutorisation } | { t: 'retour'; nom: string };

function Choix({ actif, onClick, icone, titre, texte }: { actif: boolean; onClick: () => void; icone: ReactNode; titre: string; texte: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onClick}
      className={cn(
        'flex min-h-[64px] w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition duration-300 ease-spring',
        actif ? 'bg-white shadow-[0_0_0_2px_#7c3aed,0_8px_20px_-12px_rgba(60,30,120,.35)]' : 'bg-white/70 shadow-[0_0_0_1px_#ece8f6] hover:bg-white',
      )}
    >
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4', actif ? 'bg-pale-v text-deep-v' : 'bg-halo-track text-ink-2')}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold tracking-[-0.02em] text-ink">{titre}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{texte}</span>
      </span>
    </button>
  );
}

export default function Autoriser() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const req = params.get('req') ?? '';
  const session = useCloud((s) => s.session);
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [etat, setEtat] = useState<Etat>({ t: 'chargement' });
  const [ecriture, setEcriture] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string>();

  useEffect(() => {
    void cloudDisponible().then(setDispo);
  }, []);

  useEffect(() => {
    if (dispo !== true) return;
    if (!req) return setEtat({ t: 'erreur', message: 'Lien incomplet. Relancez la connexion depuis votre assistant.' });
    if (!session) {
      navigate(`/connexion?retour=${encodeURIComponent(`/autoriser?req=${req}`)}`, { replace: true });
      return;
    }
    lireDemande(req)
      .then((d) => {
        setEcriture(d.ecriture_demandee);
        setEtat({ t: 'pret', d });
      })
      .catch((e) => setEtat({ t: 'erreur', message: e instanceof Error ? e.message : 'Demande introuvable.' }));
  }, [dispo, req, session, navigate]);

  const repondre = async (autoriser: boolean) => {
    if (etat.t !== 'pret') return;
    setErreur(undefined);
    setOccupe(true);
    try {
      const { redirect } = autoriser ? await approuverDemande(req, ecriture) : await refuserDemande(req);
      setEtat({ t: 'retour', nom: etat.d.client.nom });
      location.href = redirect;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Réponse non enregistrée, réessayez.');
      setOccupe(false);
    }
  };

  if (dispo === false) {
    return (
      <Cadre titre="Relier une IA" sousTitre="Cette page fonctionne avec un compte Brix en ligne. Elle n’est pas disponible dans cet aperçu.">
        <p className="text-[13.5px] text-ink-2">Ouvrez app.brix-app.fr, connectez-vous, puis relancez la connexion depuis votre assistant.</p>
      </Cadre>
    );
  }
  if (etat.t === 'chargement') {
    return <Cadre titre="Un instant…"><div className="h-24 animate-pulse rounded-2xl bg-halo-track" aria-busy="true" /></Cadre>;
  }
  if (etat.t === 'erreur') {
    return (
      <Cadre titre="Lien expiré." sousTitre={etat.message}>
        <button type="button" className="ob-btn ob-btn-line h-12 w-full" onClick={() => navigate('/app/bob/mcp')}>Ouvrir Brix AI dans Brix</button>
      </Cadre>
    );
  }
  if (etat.t === 'retour') {
    return (
      <Cadre titre="C’est noté." sousTitre={`Retour vers ${etat.nom}…`}>
        <p className="text-[13.5px] text-ink-2">Si rien ne se passe, revenez dans votre assistant : la connexion s’y termine.</p>
      </Cadre>
    );
  }

  const d = etat.d;
  const hote = d.client.hote ?? d.redirection.hote;
  const avecActions = ecriture && d.ecriture_demandee;
  return (
    <Cadre
      titre={<>Relier {d.client.nom} à Brix&nbsp;?</>}
      sousTitre={<><b className="font-semibold text-ink">{d.client.nom}</b>{hote ? ` (${hote})` : ''} demande à accéder aux données de {d.entreprise ? <b className="font-semibold text-ink">{d.entreprise}</b> : 'votre entreprise'}.</>}
      pied="Vous pourrez couper cet accès à tout moment dans Brix AI › Connecter une IA."
    >
      <dl className="grid gap-2 rounded-2xl bg-halo-track/60 px-4 py-3 text-[13px]">
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Assistant</dt><dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{d.client.nom}{d.client.nom_declare !== d.client.nom ? ` · « ${d.client.nom_declare} »` : ''}</dd></div>
        {d.client.hote && <div className="flex justify-between gap-3"><dt className="text-ink-2">Publié par</dt><dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{d.client.hote}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Retour vers</dt><dd className="min-w-0 text-right font-mono text-[12.5px] [overflow-wrap:anywhere]">{d.redirection.hote}</dd></div>
      </dl>

      {(d.client.boucle_locale || !d.client.connu) && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-pale-a px-4 py-3 text-[12.5px] leading-snug text-deep-a">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {d.client.boucle_locale ? 'Cet assistant tourne sur cet ordinateur. Autorisez seulement si vous venez de lancer la connexion vous-même.' : 'Brix ne connaît pas encore cet assistant. Autorisez seulement si vous venez de lancer cette connexion.'}
        </p>
      )}

      {d.ecriture_demandee ? (
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Ce que l’assistant peut faire">
          <Choix actif={ecriture} onClick={() => setEcriture(true)} icone={<FilePen />} titre="Lecture et actions" texte="Lit vos données et prépare des brouillons. N’envoie rien à vos clients, aucun paiement." />
          <Choix actif={!ecriture} onClick={() => setEcriture(false)} icone={<Eye />} titre="Lecture seule" texte="Rien ne peut être modifié ni envoyé." />
        </div>
      ) : (
        <p className="mt-4 flex gap-2 text-[13px] text-ink-2"><Eye className="mt-0.5 h-4 w-4 shrink-0" />Lecture seule : rien ne peut être modifié ni envoyé.</p>
      )}

      <details className="mt-4 text-[13px]">
        <summary className="min-h-10 cursor-pointer py-2 font-medium text-ink">Ce que {d.client.nom} pourra {avecActions ? 'lire et préparer' : 'lire'}</summary>
        <p className="mt-1 leading-relaxed text-ink-2">{LECTURES.join(', ')}.</p>
        {avecActions && <p className="mt-2 leading-relaxed text-ink-2">Préparer : {ACTIONS.join(', ').toLowerCase()}.</p>}
      </details>

      {!d.peut_autoriser && <p className="mt-3 rounded-2xl bg-pale-r px-4 py-3 text-[13px] text-deep-r">Seul le gérant peut relier une IA à Brix. Demandez-lui de se connecter.</p>}
      {d.peut_autoriser && !d.relier_actif && <p className="mt-3 text-[12.5px] text-ink-2">« Relier votre IA » est coupé : en autorisant, vous le rallumez.</p>}

      <div className="mt-5 grid gap-2.5">
        <button type="button" disabled={!d.peut_autoriser || occupe} className="bx-btn-dawn ob-btn h-12 text-white" onClick={() => void repondre(true)}>
          <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Autoriser <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" disabled={occupe} className="ob-btn ob-btn-line h-12" onClick={() => void repondre(false)}>Refuser</button>
      </div>
      <Erreur>{erreur}</Erreur>
    </Cadre>
  );
}
