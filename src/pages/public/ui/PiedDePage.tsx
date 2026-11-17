import { Lock } from 'lucide-react';
import type { Company } from '@/lib/types';
import { BrandTile } from '@/parcours/marque';

export function PiedDePage({ company }: { company: Company }) {
  return (
    <footer className="mx-auto mt-14 max-w-[1160px] px-4 pb-[calc(110px+var(--safe-b))] text-center text-[12px] text-ink-3 sm:px-6 lg:pb-12">
      <div className="mx-auto mb-5 h-px max-w-[220px] bg-line" />
      <div>
        {company.legalName || company.name} · SIRET {company.siret} · {company.address}, {company.city}
      </div>
      {company.decennale && <div className="mt-1">Assurance décennale : {company.decennale}</div>}
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-[0_0_0_1px_#ebe9f2]">
        <Lock className="h-3.5 w-3.5" />
        Lien personnel et sécurisé · propulsé par
        <BrandTile size={16} />
        <span className="font-semibold text-ink">Brix</span>
      </div>
    </footer>
  );
}
