import { useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';

/** Bloc de réglages façon formulaire pro : titre et explication à gauche, champs à droite. */
export function SettingsSection({ title, text, children, className }: { title: ReactNode; text?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('grid gap-4 p-4 md:p-6 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-8', className)}>
      <div>
        <h3 className="text-[16px] font-semibold tracking-[-0.025em]">{title}</h3>
        {text && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{text}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

/**
 * Barre d'enregistrement collée en bas : apparaît dès qu'il y a une modification,
 * puis confirme avec une pastille validée avant de disparaître.
 */
export function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saved]);
  if (!dirty && !saved && !saving) return null;
  const save = () => {
    setSaving(true);
    setTimeout(() => {
      onSave();
      setSaving(false);
      setSaved(true);
    }, 450);
  };
  return (
    <div className="sticky bottom-[calc(90px+var(--safe-b))] z-20 flex animate-[toast-in_.4s_var(--spring)_both] items-center gap-2 glass-strong rounded-full p-1.5 pl-5 text-ink shadow-pop md:bottom-4">
      {saved ? (
        <span className="flex min-h-[40px] flex-1 items-center gap-2.5 text-[13.5px] font-medium">
          <SuccessDot size={20} className="bg-[#10b981]" /> Enregistré. Vos prochains documents l’utilisent.
        </span>
      ) : (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13.5px]">
            <i className="h-2 w-2 shrink-0 rounded-full bg-[#fb923c] shadow-[0_0_0_4px_#fff0e4]" />
            <span className="truncate">Modifications non enregistrées</span>
          </span>
          <Button variant="ghost" onClick={onReset} disabled={saving}>Annuler</Button>
          <Button variant="primary" icon={<Check />} loading={saving} onClick={save}>Enregistrer</Button>
        </>
      )}
    </div>
  );
}
