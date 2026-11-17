import wordmark from '@/assets/brix-wordmark.svg';
import icon from '@/assets/brix-icon.svg';

// Logo officiel Brix : fichiers d'origine, jamais redessinés ni recolorés.
export function Wordmark({ className = 'h-6' }: { className?: string }) {
  return <img src={wordmark} alt="Brix" className={className} draggable={false} />;
}

export function LogoIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return <img src={icon} alt="Brix" className={className} draggable={false} />;
}
