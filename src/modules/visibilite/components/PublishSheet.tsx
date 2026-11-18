import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Lock } from 'lucide-react';
import { Button, Sheet, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { publishSite } from '../service';

const CHECKS = ['Textes relus par Bob', 'Mentions légales et SIRET', 'Certificat de sécurité (cadenas)', 'Formulaire de devis relié à Demandes'];

/** Mise en ligne en trois temps : vérification, publication (progression), confirmation. */
export function PublishSheet({ open, onClose, url, onPublished }: { open: boolean; onClose: () => void; url: string; onPublished: () => void }) {
  const [phase, setPhase] = useState<'confirm' | 'busy' | 'done'>('confirm');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setTick(0);
    }
  }, [open]);
  useEffect(() => {
    if (phase !== 'busy') return;
    const t = setInterval(() => setTick((x) => Math.min(CHECKS.length, x + 1)), 280);
    return () => clearInterval(t);
  }, [phase]);

  const go = async () => {
    setPhase('busy');
    await publishSite();
    onPublished();
    setPhase('done');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="center"
      width={460}
      title={phase === 'done' ? undefined : 'Mettre votre site en ligne ?'}
      subtitle={phase === 'done' ? undefined : 'Il sera visible par tout le monde, et trouvable sur Google sous quelques jours.'}
      footer={
        phase === 'done' ? undefined : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={phase === 'busy'}>Pas encore</Button>
            <Button variant="dawn" icon={<Globe />} loading={phase === 'busy'} onClick={go}>{phase === 'busy' ? 'Mise en ligne' : 'Mettre en ligne'}</Button>
          </>
        )
      }
    >
      {phase === 'done' ? (
        <div className="flex flex-col items-center pb-2 pt-8 text-center">
          <SuccessDot size={56} />
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.025em]">Votre site est en ligne</h3>
          <p className="mt-1.5 text-[13.5px] text-ink-2">Partagez-le sur vos devis, votre camion, vos cartes de visite.</p>
          <div className="mt-5 flex w-full items-center gap-2 rounded-full bg-halo-track py-2 pl-4 pr-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-ok" />
            <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium">{url}</span>
            <button className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-white hover:text-ink" aria-label="Copier l’adresse" onClick={() => { navigator.clipboard?.writeText(`https://${url}`).catch(() => {}); toast('Adresse copiée'); }}><Copy className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 flex w-full gap-2">
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>Fermer</Button>
            <Button variant="primary" className="flex-1 justify-center" icon={<ExternalLink />} onClick={() => toast('En démo, le site n’est pas réellement publié', 'info')}>Voir mon site</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 rounded-full bg-halo-track px-4 py-3">
            <Lock className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">https://{url}</span>
          </div>
          <ul className="space-y-1 rounded-card-sm bg-white p-3 shadow-halo-sm">
            {CHECKS.map((c, i) => {
              const done = phase === 'confirm' || i < tick;
              return (
                <li key={c} className="flex min-h-[36px] items-center gap-2.5 text-[13.5px]">
                  <span className={`grid h-5 w-5 place-items-center rounded-full transition-colors duration-300 ${done ? 'bg-pale-g text-deep-g' : 'bg-pale-n text-ink-3'}`}><Check className="h-3 w-3" strokeWidth={2.6} /></span>
                  <span className={done ? 'text-ink' : 'text-ink-3'}>{c}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
