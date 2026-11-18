// Rapprochement facture : on tape le total HT de la facture, Brix le compare à la commande.
import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Receipt } from 'lucide-react';
import { Button, Field, Input, Sheet, cn, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { totalCommande, useAchats } from '../../data/store';
import type { Commande } from '../../data/types';
import { lireNombre } from './commun';

export default function RapprocherFacture({ commande, open, onClose }: { commande: Commande; open: boolean; onClose: () => void }) {
  const lierFacture = useAchats((s) => s.lierFacture);
  const [saisie, setSaisie] = useState('');
  useEffect(() => {
    if (open) setSaisie('');
  }, [open]);

  const livre = commande.lignes.reduce((s, l) => s + l.prix * Math.min(l.quantiteLivree, l.quantite), 0);
  const attendu = totalCommande(commande) + commande.port;
  const montant = lireNombre(saisie);
  const ecart = montant == null ? null : Math.round((montant - attendu) * 100) / 100;
  const alerte = ecart != null && Math.abs(ecart) > Math.max(1, attendu * 0.01);

  const valider = () => {
    if (montant == null) return;
    const r = lierFacture(commande.id, montant);
    toast(r.alerte ? `Facture enregistrée, écart de ${money(r.ecart)} à vérifier` : 'Facture conforme à la commande', r.alerte ? 'warn' : 'ok');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={460}
      title="Rapprocher la facture"
      subtitle="Saisissez le total hors taxes de la facture du fournisseur : Brix vérifie qu’il correspond à ce que vous avez commandé."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Annuler</Button>
          <Button variant="primary" size="lg" icon={<Receipt className="h-4 w-4" />} disabled={montant == null} onClick={valider} className="flex-1 justify-center sm:flex-none">
            Enregistrer la facture
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="divide-y divide-halo-line rounded-card-sm bg-white shadow-halo-sm text-[13.5px]">
          <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Articles commandés</dt><dd className="num">{money(totalCommande(commande))}</dd></div>
          <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Frais de port</dt><dd className="num">{commande.port ? money(commande.port) : 'Offerts'}</dd></div>
          {Math.abs(livre - totalCommande(commande)) > 0.01 && (
            <div className="flex justify-between px-3.5 py-2.5"><dt className="text-ink-2">Dont réellement livré</dt><dd className="num">{money(livre)}</dd></div>
          )}
          <div className="flex justify-between px-3.5 py-2.5 font-semibold"><dt>Attendu sur la facture</dt><dd className="num">{money(attendu)} HT</dd></div>
        </dl>

        <Field label="Total HT de la facture">
          <Input autoFocus inputMode="decimal" placeholder="0,00" value={saisie} onChange={(e) => setSaisie(e.target.value)} suffix="€ HT" className="num" />
        </Field>

        {ecart != null && (
          <div className={cn('flex gap-2.5 rounded-card-sm border px-4 py-3.5 text-[13px]', alerte ? 'border-[#fde3b5] bg-warn-bg text-[#92400e]' : 'border-[#c9f0d6] bg-ok-bg text-[#166534]')}>
            {alerte ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <div className="font-medium">{alerte ? `Écart de ${ecart > 0 ? '+' : ''}${money(ecart)}` : ecart === 0 ? 'Montant identique à la commande' : `Écart de ${money(ecart)}, dans la marge normale`}</div>
              {alerte && (
                <div className="mt-0.5 text-[12.5px]">
                  {ecart > 0 ? 'La facture est plus chère que la commande. ' : 'La facture est moins chère que la commande. '}
                  Vérifiez les prix unitaires, le port et les quantités facturées avant de la payer.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
