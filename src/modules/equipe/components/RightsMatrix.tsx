import { useState } from 'react';
import { Check, Eye, Minus, UserRound } from 'lucide-react';
import { Card, cn } from '@/components/ui';
import { PERMISSIONS, RIGHT_LABEL, ROLES, type RoleKey, type Right } from '../data';

function Cell({ r }: { r: Right }) {
  if (r === 'oui') return <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-ok-bg text-ok" title="Oui"><Check className="h-3.5 w-3.5" strokeWidth={2.4} /></span>;
  if (r === 'non') return <span className="inline-grid h-6 w-6 place-items-center text-line2" title="Non"><Minus className="h-4 w-4" /></span>;
  if (r === 'lecture') return <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-2" title="Peut voir sans modifier"><Eye className="h-3.5 w-3.5" />Lecture</span>;
  return <span className="inline-flex items-center gap-1 text-[11.5px] text-brand" title="Seulement ses chantiers"><UserRound className="h-3.5 w-3.5" />Les siens</span>;
}

export function RightsMatrix() {
  const [role, setRole] = useState<RoleKey>('compagnon');
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-2">Neuf rôles prêts à l’emploi. Un compagnon ne voit jamais vos prix d’achat ni la paie ; un sous-traitant ne voit que son chantier.</p>

      {/* Ordinateur : la matrice complète */}
      <Card className="hidden overflow-hidden xl:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-halo-line bg-halo-hover text-left text-[11.5px] text-ink-2">
              <th className="w-[230px] px-4 py-2.5 font-medium">Droit</th>
              {ROLES.map((r) => (
                <th key={r.key} className="px-1 py-2.5 text-center font-medium leading-tight">
                  <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key} className="border-b border-halo-line last:border-0 hover:bg-halo-hover">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[11.5px] text-ink-3">{p.help}</div>
                </td>
                {ROLES.map((r) => <td key={r.key} className="px-1 text-center"><Cell r={p.rights[r.key]} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Téléphone et tablette : un rôle à la fois */}
      <div className="xl:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          {ROLES.map((r) => (
            <button key={r.key} onClick={() => setRole(r.key)} className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition', role === r.key ? 'border-ink bg-ink text-white' : 'border-halo-line bg-white text-ink-2')}>
              <i className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>
        <Card className="mt-2">
          <div className="border-b border-halo-line px-4 py-3 text-[13px] text-ink-2"><span className="font-semibold text-ink">{ROLES.find((r) => r.key === role)?.name}</span> · {ROLES.find((r) => r.key === role)?.short}</div>
          {PERMISSIONS.map((p) => (
            <div key={p.key} className="flex min-h-[52px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{p.label}</div>
                <div className="text-[11.5px] text-ink-3">{p.help}</div>
              </div>
              <span className={cn('text-[12.5px] font-medium', p.rights[role] === 'non' ? 'text-ink-3' : p.rights[role] === 'oui' ? 'text-ok' : 'text-ink-2')}>{RIGHT_LABEL[p.rights[role]]}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
