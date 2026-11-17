import { useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';

/** Bloc de réglages façon formulaire pro : titre et explication à gauche, champs à droite. */
export function SettingsSection({ title, text, children, className }: { title: ReactNode; text?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('grid gap-4 p-4 md:p-6 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-8', className)}>
      <div>
        <h3 className="text-[14.5px] font-semibold tracking-[-0.015em]">{title}</h3>
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
    <div className="sticky bottom-[calc(90px+var(--safe-b))] z-20 flex animate-[toast-in_.4s_var(--spring)_both] items-center gap-2 rounded-[16px] bg-[#15122a] p-2 pl-4 text-white shadow-pop md:bottom-4">
      {saved ? (
        <span className="flex min-h-[40px] flex-1 items-center gap-2.5 text-[13.5px] font-medium">
          <SuccessDot size={20} className="bg-[#22c55e]" /> Enregistré. Vos prochains documents l’utilisent.
        </span>
      ) : (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13.5px]">
            <i className="h-2 w-2 shrink-0 rounded-full bg-peach" />
            <span className="truncate">Modifications non enregistrées</span>
          </span>
          <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={onReset} disabled={saving}>Annuler</Button>
          <Button variant="secondary" icon={<Check />} loading={saving} onClick={save}>Enregistrer</Button>
        </>
      )}
    </div>
  );
}
