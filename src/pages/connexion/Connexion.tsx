import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ApiError, cloudDisponible, connexion, connexionGoogle, ouvrirSession, type Session } from '@/lib/api';
import { ouvrirCompte, seDeconnecter, useCloud } from '@/lib/cloud';
import { garderIdentiteGoogle } from './attente';
import { Cadre, Erreur, Separateur } from './Cadre';
import { Champ, ChampMotDePasse } from './Champ';
import { GoogleBouton } from './GoogleBouton';

/** /connexion : e-mail et mot de passe, ou Google quand il est configuré. */
export default function Connexion() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Retour après connexion : seulement vers l'écran d'autorisation d'une IA (jamais une adresse externe).
  const r = params.get('retour') ?? '';
  const retour = r.startsWith('/autoriser') ? r : '/app';
  const session = useCloud((s) => s.session);
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [google, setGoogle] = useState(false);
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    void cloudDisponible().then(setDispo);
  }, []);

  const entrer = async (fn: () => Promise<Session>) => {
    setErreur(undefined);
    setOccupe(true);
    try {
      await ouvrirCompte(await fn());
      navigate(retour, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'pas_de_compte') return;
      setErreur(e instanceof Error ? e.message : 'Connexion impossible, réessayez.');
    } finally {
      setOccupe(false);
    }
  };

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !mdp) return setErreur('Indiquez votre e-mail et votre mot de passe.');
    void entrer(async () => ouvrirSession(await connexion(email, mdp)));
  };

  const avecGoogle = (credential: string) =>
    void entrer(async () => {
      try {
        return ouvrirSession(await connexionGoogle(credential));
      } catch (e) {
        // Pas encore de Brix pour cette adresse : l'inscription reprend l'identité Google.
        if (e instanceof ApiError && e.code === 'pas_de_compte') {
          garderIdentiteGoogle(credential);
          navigate('/inscription');
        }
        throw e;
      }
    });

  if (dispo === false) {
    return (
      <Cadre titre="Connexion" sousTitre="La connexion à un compte n'est pas disponible dans cet aperçu. Vos données restent sur cet appareil.">
        <div className="grid gap-2.5">
          <button type="button" className="bx-btn-dawn ob-btn h-12" onClick={() => navigate('/inscription')}>Créer mon Brix <ArrowRight className="h-4 w-4" strokeWidth={2} /></button>
          <button type="button" className="ob-btn ob-btn-line h-12" onClick={() => navigate('/demo')}>Essayer la démo</button>
        </div>
      </Cadre>
    );
  }

  if (session) {
    return (
      <Cadre titre="Vous êtes connecté." sousTitre={<>Avec l'adresse <b className="font-semibold text-ink">{session.email}</b>.</>}>
        <div className="grid gap-2.5">
          <button type="button" disabled={occupe} className="bx-btn-dawn ob-btn h-12" onClick={() => void entrer(async () => session)}>
            Ouvrir mon Brix <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <button type="button" className="ob-btn ob-btn-ghost h-12" onClick={() => void seDeconnecter()}>Changer de compte</button>
        </div>
        <Erreur>{erreur}</Erreur>
      </Cadre>
    );
  }

  return (
    <Cadre
      titre="Bon retour."
      sousTitre="Connectez-vous pour retrouver votre Brix, sur cet appareil comme sur les autres."
      pied={<>Pas encore de compte ? <Link to="/inscription" className="font-semibold text-ink underline-offset-4 hover:underline">Créer mon Brix</Link></>}
    >
      <GoogleBouton onJeton={avecGoogle} onDispo={setGoogle} />
      {google && <Separateur>ou avec votre e-mail</Separateur>}
      <form onSubmit={soumettre} noValidate className="grid gap-4">
        <Champ id="cx-email" label="E-mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <div>
          <ChampMotDePasse id="cx-mdp" label="Mot de passe" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
          <Link to="/mot-de-passe" state={{ email: email.trim() }} className="mt-2 inline-flex min-h-[32px] items-center text-[13px] font-medium text-ink-2 hover:text-ink">
            Mot de passe oublié ?
          </Link>
        </div>
        <button type="submit" disabled={occupe || dispo === null} className="ob-btn ob-btn-ink h-12">
          {occupe ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <Erreur>{erreur}</Erreur>
    </Cadre>
  );
}
