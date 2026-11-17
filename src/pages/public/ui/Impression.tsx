// Impression / « Enregistrer en PDF » d'un document : seul le papier est imprimé, au format A4.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const CSS = `@media print {
  @page { size: A4; margin: 0; }
  body > *:not(.bx-print) { display: none !important; }
  .bx-print { display: block !important; }
  .bx-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.bx-print { display: none; }`;

export function useImpression() {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    if (!actif) return;
    const t = setTimeout(() => {
      window.print();
      setActif(false);
    }, 80);
    return () => clearTimeout(t);
  }, [actif]);
  return { imprimer: () => setActif(true), actif };
}

export function ZoneImpression({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="bx-print">
      <style>{CSS}</style>
      {children}
    </div>,
    document.body,
  );
}
