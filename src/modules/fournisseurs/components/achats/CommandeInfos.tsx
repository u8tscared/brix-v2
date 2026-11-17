// Colonne d'informations d'une commande : le fournisseur (joignable en un geste) et la livraison.
import type { ReactNode } from 'react';
import { CalendarDays, Hash, HardHat, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui';
import { dateLong } from '@/lib/format';
import type { Chantier } from '@/lib/types';
import type { Commande, Fournisseur } from '../../data/types';
import { FournisseurPastille } from '../ui';
import { MODES } from './commun';

function Ligne({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <span className="mt-0.5 text-ink-3 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] text-ink-3">{label}</div>
        <div className="break-words text-[13.5px]">{children}</div>
      </div>
    </div>
  );
}

const lien = 'flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-line2 bg-white text-[13.5px] font-medium text-ink transition hover:bg-sub';

export default function CommandeInfos({ c, f, chantier }: { c: Commande; f?: Fournisseur; chantier?: Chantier }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 p-4">
          <FournisseurPastille f={f} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{f?.nom ?? 'Fournisseur supprimé'}</div>
            <div className="truncate text-xs text-ink-3">{[f?.agence, f?.contact].filter(Boolean).join(' · ') || 'Fournisseur'}</div>
          </div>
        </div>
        {(f?.telephone || f?.email) && (
          <div className="flex gap-2 px-4 pb-4">
            {f.telephone && <a className={lien} href={`tel:${f.telephone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" />Appeler</a>}
            {f.email && <a className={lien} href={`mailto:${f.email}?subject=${encodeURIComponent(`Commande ${c.numero}`)}`}><Mail className="h-4 w-4" />E-mail</a>}
          </div>
        )}
        {f?.numeroCompte && <div className="border-t border-line px-4 py-2.5 text-xs text-ink-3">Votre compte client : <span className="num text-ink-2">{f.numeroCompte}</span></div>}
      </Card>

      <Card>
        <CardHeader title="Livraison" icon={<Truck className="h-4 w-4 text-ink-3" />} />
        <div className="py-1.5">
          <Ligne icon={<MapPin />} label={MODES[c.mode].label}>
            {c.mode === 'retrait_agence' ? f?.agence ?? 'Au comptoir de l’agence' : c.adresse || (chantier ? `${chantier.address}, ${chantier.city}` : 'Adresse à préciser')}
          </Ligne>
          <Ligne icon={<CalendarDays />} label="Date prévue">
            <span className="first-letter:uppercase">{c.livraisonPrevue ? dateLong(c.livraisonPrevue) : 'Pas encore confirmée'}</span>
          </Ligne>
          {chantier && <Ligne icon={<HardHat />} label="Chantier">{chantier.name}</Ligne>}
          <Ligne icon={<Hash />} label="N° de commande chez le fournisseur">
            {c.referenceFournisseur ? <span className="num">{c.referenceFournisseur}</span> : <span className="text-ink-3">Donné à la confirmation</span>}
          </Ligne>
          {c.suivi && <Ligne icon={<Truck />} label="Suivi transporteur"><span className="num">{c.suivi}</span></Ligne>}
        </div>
      </Card>
    </div>
  );
}
