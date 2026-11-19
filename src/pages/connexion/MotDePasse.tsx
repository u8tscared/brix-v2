import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { IconTile } from '@/components/ui';
import { choisirMotDePasse, demanderNouveauMotDePasse, ouvrirSession } from '@/lib/api';
import { ouvrirCompte } from '@/lib/cloud';
import { Cadre, Erreur } from './Cadre';
import { Champ, ChampMotDePasse } from './Champ';

const retour = <Link to="/connexion" className="font-semibold text-ink underline-offset-4 hover:underline">Retour à la connexion</Link>;

/** /mot-de-passe : demander un lien par e-mail ; /mot-de-passe?jeton=… : choisir le nouveau mot de passe. */
export default function MotDePasse() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  return jeton ? <Nouveau jeton={jeton} /> : <Demande />;
}

function Demande() {
  const { state } = useLocation() as { state?: { email?: string } };
  const [email, setEmail] = useState(state?.email ?? '');
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErreur('Indiquez une adresse e-mail valide.');
    setErreur(undefined);
    setOccupe(true);
    try {
      await demanderNouveauMotDePasse(email.trim());
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Envoi impossible, réessayez.');
    } finally {
      setOccupe(false);
    }
  };

  if (envoye) {
    return (
      <Cadre titre="Regardez vos e-mails." pied={retour}>
        <div className="flex items-start gap-3">
          <IconTile tone="green" icon={<MailCheck strokeWidth={1.9} />} />
          <p className="text-[14px] leading-relaxed text-ink-2">
            Si un compte Brix existe pour <b className="font-semibold text-ink">{email.trim()}</b>, un lien vient de partir. Il est valable une heure. Pensez à regarder dans les indésirables.
          </p>
        </div>
      </Cadre>
    );
  }

  return (
    <Cadre titre="Mot de passe oublié ?" sousTitre="Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau." pied={retour}>
      <form onSubmit={soumettre} noValidate className="grid gap-4">
        <Champ id="mdp-email" label="E-mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <button type="submit" disabled={occupe} className="ob-btn ob-btn-ink h-12">{occupe ? 'Envoi…' : 'Recevoir le lien'}</button>
      </form>
      <Erreur>{erreur}</Erreur>
    </Cadre>
  );
}

function Nouveau({ jeton }: { jeton: string }) {
  const navigate = useNavigate();
  const [mdp, setMdp] = useState('');
  const [confirm, setConfirm] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [occupe, setOccupe] = useState(false);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (mdp.length < 8) return setErreur('Choisissez un mot de passe de 8 caractères minimum.');
    if (mdp !== confirm) return setErreur('Les deux mots de passe ne sont pas identiques.');
    setErreur(undefined);
    setOccupe(true);
    try {
      const s = ouvrirSession(await choisirMotDePasse(jeton, mdp));
      await ouvrirCompte(s);
      navigate('/app', { replace: true });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible, réessayez.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Cadre titre="Nouveau mot de passe." sousTitre="Vos autres appareils seront déconnectés par sécurité." pied={retour}>
      <form onSubmit={soumettre} noValidate className="grid gap-4">
        <ChampMotDePasse id="mdp-nouveau" label="Nouveau mot de passe" autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} aide="8 caractères minimum." autoFocus />
        <ChampMotDePasse id="mdp-confirm" label="Confirmez-le" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button type="submit" disabled={occupe} className="bx-btn-dawn ob-btn h-12">{occupe ? 'Enregistrement…' : 'Enregistrer et ouvrir Brix'}</button>
      </form>
      <Erreur>{erreur}</Erreur>
    </Cadre>
  );
}
