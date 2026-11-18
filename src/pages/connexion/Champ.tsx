// Champs des écrans d'accès (style ob-input de l'inscription).
import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; aide?: string };

export function Champ({ id, label, aide, className, ...p }: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className="ob-label">{label}</label>
      <input id={id} className="ob-input" aria-describedby={aide ? `${id}-aide` : undefined} {...p} />
      {aide && <p id={`${id}-aide`} className="mt-1.5 text-[12.5px] text-ink-3">{aide}</p>}
    </div>
  );
}

export function ChampMotDePasse({ id, label, aide, className, ...p }: Props) {
  const [voir, setVoir] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={id} className="ob-label">{label}</label>
      <div className="relative">
        <input id={id} type={voir ? 'text' : 'password'} className="ob-input pr-12" aria-describedby={aide ? `${id}-aide` : undefined} {...p} />
        <button type="button" onClick={() => setVoir(!voir)} className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-xl text-ink-3 hover:text-ink" aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          {voir ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        </button>
      </div>
      {aide && <p id={`${id}-aide`} className="mt-1.5 text-[12.5px] text-ink-3">{aide}</p>}
    </div>
  );
}
