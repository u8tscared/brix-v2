import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
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

/** Étape 5 : l'accès du gérant. Google et Apple préremplissent l'e-mail (simulé en démo). */
export function AccesStep({ d, set }: StepProps) {
  const [show, setShow] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const s = strength(d.password);
  const badMail = blurred && d.email.length > 0 && !emailOk(d.email);
  return (
    <>
      <StepHeader kicker="Étape 5 sur 5" title="Dernière étape, votre accès" lead="Vous l'utiliserez sur ordinateur et sur téléphone. Rien à payer aujourd'hui." />

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="ob-btn ob-btn-line h-12 text-[14px]" onClick={() => set({ email: d.email || `${(d.firstName || 'vous').toLowerCase()}@gmail.com` })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" /><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14Z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4Z" /></svg>
          Google
        </button>
        <button type="button" className="ob-btn ob-btn-line h-12 text-[14px]" onClick={() => set({ email: d.email || `${(d.firstName || 'vous').toLowerCase()}@icloud.com` })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.4-.6 3.1-1.5Z" /></svg>
          Apple
        </button>
      </div>
      <div className="my-6 flex items-center gap-3 text-[12.5px] text-[#9898a8]"><span className="h-px flex-1 bg-[#e4e2ee]" />ou avec votre e-mail<span className="h-px flex-1 bg-[#e4e2ee]" /></div>

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
            onBlur={() => setBlurred(true)}
            autoComplete="email"
            aria-invalid={badMail}
            aria-describedby="ob-em-h"
            style={badMail ? { boxShadow: '0 0 0 1.5px #dc2626' } : undefined}
          />
          <p id="ob-em-h" className={`mt-1.5 text-[12.5px] ${badMail ? 'text-[#dc2626]' : 'text-[#9898a8]'}`}>
            {badMail ? 'Cette adresse semble incomplète.' : 'Vos devis signés et paiements y arrivent.'}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ob-pw" className="ob-label">Mot de passe</label>
          <div className="relative">
            <input id="ob-pw" type={show ? 'text' : 'password'} className="ob-input pr-12" value={d.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" aria-describedby="ob-pw-h" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-xl text-[#9898a8] hover:text-[#130f26]" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-3" id="ob-pw-h">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((k) => (
                <span key={k} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: s >= k ? (s >= 3 ? '#16a34a' : '#130f26') : '#e4e2ee' }} />
              ))}
            </div>
            <span className="w-[120px] text-right text-[12.5px] text-[#9898a8]">{d.password.length < 8 ? `${Math.max(0, 8 - d.password.length)} caractères encore` : LABEL[s]}</span>
          </div>
        </div>
      </div>

      <p className="mt-7 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[#9898a8]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5f5f70]" strokeWidth={1.75} aria-hidden />
        Données hébergées en France. En créant votre compte, vous acceptez les conditions d'utilisation et la politique de confidentialité de Brix.
      </p>
    </>
  );
}
