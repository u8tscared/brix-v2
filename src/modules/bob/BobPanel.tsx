import { useUI } from '@/lib/ui';
import { Sheet } from '@/components/ui';

/** Panneau de conversation avec Bob (version minimale, remplacée par le module Bob). */
export default function BobPanel() {
  const ui = useUI();
  return (
    <Sheet open={ui.bob} onClose={() => ui.set({ bob: false })} title="Bob" subtitle="Ton assistant">
      <p className="text-sm text-ink-2">{ui.bobPrompt || 'Demande-moi ce que tu veux.'}</p>
    </Sheet>
  );
}
