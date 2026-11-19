import { useState } from 'react';
import { BadgeCheck, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { IconTile } from '@/components/ui';
import { lireJetonGoogle } from '@/lib/api';
import { GoogleBouton } from '@/pages/connexion/GoogleBouton';
import { emailOk } from '@/pages/onboarding/draft';
import { StepHeader } from '@/pages/onboarding/ui';
import type { StepProps } from './types';

const strength = (p: string) => {
  if (!p) return 0;
  let s = p.length >= 8 ? 1 : 0;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.max(p.length >= 8 ? 1 : 0, s);
};
const LABEL = ['', 'Correct', 'Bon', 'Solide', 'Excellent'];

/** Étape 5 : l'accès du gérant. « Continuer avec Google » seulement s'il est configuré côté serveur (jamais simulé). */
export function AccesStep({ d, set }: StepProps) {
  const [show, setShow] = useState(false);
  const [googleDispo, setGoogleDispo] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const s = strength(d.password);
  const badMail = blurred && d.email.length > 0 && !emailOk(d.email);
  return (
    <>
      <StepHeader kicker="Étape 5 sur 5" title="Dernière étape, votre accès" lead="Vous l'utiliserez sur ordinateur et sur téléphone. Rien à payer aujourd'hui." />

      {d.google ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_#ece8f6]">
          <IconTile tone="green" size="sm" icon={<BadgeCheck strokeWidth={1.9} />} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Compte Google relié</div>
            <div className="truncate text-[12.5px] text-ink-3">{d.google.email}</div>
          </div>
          <button type="button" className="ob-btn ob-btn-ghost h-10 px-3 text-[13px]" onClick={() => set({ google: undefined })}>Utiliser un mot de passe</button>
        </div>
      ) : (
        <>
          <GoogleBouton texte="signup_with" onDispo={setGoogleDispo} onJeton={(credential) => {
            const id = lireJetonGoogle(credential);
            if (!id) return;
            set({ google: { credential, email: id.email }, email: id.email, firstName: d.firstName || id.prenom, lastName: d.lastName || id.nom, password: '' });
          }} />
          {googleDispo && <div className="my-6 flex items-center gap-3 text-[12.5px] text-ink-3"><span className="h-px flex-1 bg-[#e4e2ee]" />ou avec votre e-mail<span className="h-px flex-1 bg-[#e4e2ee]" /></div>}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ob-fn" className="ob-label">Prénom</label>
          <input id="ob-fn" className="ob-input" value={d.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" />
        </div>
        <div>
          <label htmlFor="ob-ln" className="ob-label">Nom</label>
          <input id="ob-ln" className="ob-input" value={d.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ob-em" className="ob-label">E-mail professionnel</label>
          <input
            id="ob-em"
            type="email"
            inputMode="email"
            className="ob-input"
            value={d.email}
            onChange={(e) => set({ email: e.target.value })}
            readOnly={!!d.google}
            onBlur={() => setBlurred(true)}
            autoComplete="email"
            aria-invalid={badMail}
            aria-describedby="ob-em-h"
            style={badMail ? { boxShadow: '0 0 0 1.5px #dc2626' } : undefined}
          />
          <p id="ob-em-h" className={`mt-1.5 text-[12.5px] ${badMail ? 'text-[#dc2626]' : 'text-ink-3'}`}>
            {badMail ? 'Cette adresse semble incomplète.' : 'Vos devis signés et paiements y arrivent.'}
          </p>
        </div>
        {!d.google && <div className="sm:col-span-2">
          <label htmlFor="ob-pw" className="ob-label">Mot de passe</label>
          <div className="relative">
            <input id="ob-pw" type={show ? 'text' : 'password'} className="ob-input pr-12" value={d.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" aria-describedby="ob-pw-h" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-xl text-ink-3 hover:text-ink" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-3" id="ob-pw-h">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((k) => (
                <span key={k} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: s >= k ? (s >= 3 ? '#10b981' : '#d946ef') : '#ece8f6' }} />
              ))}
            </div>
            <span className="w-[120px] text-right text-[12.5px] text-ink-3">{d.password.length < 8 ? `${Math.max(0, 8 - d.password.length)} caractères encore` : LABEL[s]}</span>
          </div>
        </div>}
      </div>

      <p className="mt-7 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
        Données hébergées en France. En créant votre compte, vous acceptez les conditions d'utilisation et la politique de confidentialité de Brix.
      </p>
    </>
  );
}
