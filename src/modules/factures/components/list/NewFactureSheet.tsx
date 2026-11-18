import { ChevronRight, FilePlus2, FileSignature } from 'lucide-react';
import { IconTile, Sheet } from '@/components/ui';

/** Choix de départ d'une nouvelle facture : depuis un devis signé (le plus courant) ou vierge. */
export function NewFactureSheet({ open, onClose, signedCount, onFromDevis, onBlank }: { open: boolean; onClose: () => void; signedCount: number; onFromDevis: () => void; onBlank: () => void }) {
  const options = [
    {
      key: 'devis',
      icon: <FileSignature />,
      title: 'Depuis un devis signé',
      text: signedCount ? `Acompte, situation ou solde : les lignes, le client et le chantier sont repris. ${signedCount} devis prêt${signedCount > 1 ? 's' : ''} à facturer.` : 'Aucun devis signé pour l’instant. Dès qu’un client signe, vous le facturez ici en deux clics.',
      disabled: !signedCount,
      run: onFromDevis,
    },
    { key: 'blank', icon: <FilePlus2 />, title: 'Facture vierge', text: 'Pour un dépannage ou une petite intervention sans devis. Vous ajoutez les lignes vous-même.', run: onBlank },
  ];
  return (
    <Sheet open={open} onClose={onClose} side="center" width={480} title="Nouvelle facture" subtitle="Par où voulez-vous commencer ?">
      <div className="stagger-fast space-y-2.5">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={o.disabled}
            onClick={o.run}
            className="row-card group w-full !items-start p-4 text-left disabled:pointer-events-none disabled:opacity-55"
          >
            <IconTile icon={o.icon} tone={o.key === 'devis' ? 'violet' : 'mag'} />
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold tracking-[-0.01em]">{o.title}</div>
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{o.text}</div>
            </div>
            <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
