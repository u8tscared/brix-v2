// Feuilles « Poser une question » et « Décliner le devis ».
import { useState } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/components/ui';
import { BoutonEncre, CocheAnimee, Feuille } from '../../ui/primitives';

const SUGGESTIONS = ['Peut-on décaler le début des travaux ?', 'Le matériel est-il garanti ?', 'Peut-on retirer une option ?', 'Combien de temps dure le chantier ?'];
const MOTIFS = ['Le budget est trop élevé', 'J’ai choisi une autre entreprise', 'Le projet est reporté', 'Autre raison'];

export function Question({ open, onClose, prenom, onEnvoyer }: { open: boolean; onClose: () => void; prenom: string; onEnvoyer: (t: string) => Promise<void> }) {
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const fermer = () => {
    onClose();
    setTimeout(() => {
      setOk(false);
      setTexte('');
    }, 350);
  };
  return (
    <Feuille open={open} onClose={fermer} titre={ok ? undefined : `Une question pour ${prenom} ?`} sousTitre={ok ? undefined : 'Il reçoit votre message tout de suite sur son téléphone.'}>
      {ok ? (
        <div className="py-6 text-center">
          <CocheAnimee taille={72} />
          <h3 className="mt-5 text-[20px] font-semibold">Message envoyé</h3>
          <p className="mt-1 text-[14px] text-ink-2">{prenom} vous répond par e-mail ou par téléphone, en général dans la journée.</p>
          <BoutonEncre className="mt-6 w-full" onClick={fermer}>Retour au devis</BoutonEncre>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setTexte(s)} className={cn('min-h-[36px] rounded-full px-3.5 text-[13px] transition duration-300 ease-spring', texte === s ? 'bg-ink text-white shadow-ink' : 'bg-white text-ink-2 shadow-[0_0_0_1px_#ece8f6] hover:-translate-y-px hover:text-ink')}>
                {s}
              </button>
            ))}
          </div>
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={4} placeholder="Votre question…" className="mt-4 w-full resize-none rounded-field bg-white px-4 py-3 text-[15px] shadow-[0_0_0_1px_#e6e1f1] outline-none transition focus:shadow-[0_0_0_1px_#c4b5fd,0_0_0_4px_rgba(167,139,250,.22)]" />
          <BoutonEncre className="mt-4 w-full" disabled={texte.trim().length < 3} chargement={busy} icone={<Send className="h-4 w-4" />} onClick={async () => {
            setBusy(true);
            await onEnvoyer(texte.trim());
            setBusy(false);
            setOk(true);
          }}>
            Envoyer
          </BoutonEncre>
        </div>
      )}
    </Feuille>
  );
}

export function Refus({ open, onClose, onRefuser }: { open: boolean; onClose: () => void; onRefuser: (motif: string) => Promise<void> }) {
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Feuille open={open} onClose={onClose} titre="Décliner ce devis" sousTitre="Votre réponse aide l’artisan. Vous pourrez toujours le recontacter.">
      <div className="space-y-2" role="radiogroup" aria-label="Motif">
        {MOTIFS.map((m) => (
          <button key={m} onClick={() => setMotif(m)} role="radio" aria-checked={motif === m} className={cn('flex min-h-[52px] w-full items-center gap-3 rounded-card-sm bg-white px-4 text-left text-[14px] transition duration-300 ease-spring', motif === m ? 'font-medium shadow-[0_0_0_1.5px_#15122a]' : 'shadow-halo-sm hover:-translate-y-px')}>
            <span className={cn('grid h-5 w-5 place-items-center rounded-full', motif === m ? 'bg-ink' : 'shadow-[inset_0_0_0_2px_#dcd6ea]')}>
              <span className={cn('h-2 w-2 rounded-full bg-white transition-transform duration-300 ease-spring', motif === m ? 'scale-100' : 'scale-0')} />
            </span>
            {m}
          </button>
        ))}
      </div>
      <textarea value={precision} onChange={(e) => setPrecision(e.target.value)} rows={2} placeholder="Une précision (facultatif)" className="mt-3 w-full resize-none rounded-field bg-white px-4 py-3 text-[14px] shadow-[0_0_0_1px_#e6e1f1] outline-none transition focus:shadow-[0_0_0_1px_#c4b5fd,0_0_0_4px_rgba(167,139,250,.22)]" />
      <BoutonEncre className="mt-4 w-full" disabled={!motif} chargement={busy} onClick={async () => {
        setBusy(true);
        await onRefuser([motif, precision.trim()].filter(Boolean).join(' : '));
        setBusy(false);
        onClose();
      }}>
        Décliner le devis
      </BoutonEncre>
    </Feuille>
  );
}
