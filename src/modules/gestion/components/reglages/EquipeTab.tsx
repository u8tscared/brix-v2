import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, Send } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Select, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/catalog';
import type { Role } from '@/lib/types';

const RIGHTS: { label: string; roles: Partial<Record<Role, boolean>> }[] = [
  { label: 'Voir les chantiers et le planning', roles: { patron: true, conducteur: true, chef_equipe: true, ouvrier: true, secretaire: true, apprenti: true } },
  { label: 'Pointer et envoyer des photos', roles: { patron: true, conducteur: true, chef_equipe: true, ouvrier: true, apprenti: true } },
  { label: 'Faire des devis', roles: { patron: true, conducteur: true, secretaire: true } },
  { label: 'Voir les prix d’achat et les marges', roles: { patron: true, conducteur: true, comptable: true } },
  { label: 'Facturer et encaisser', roles: { patron: true, secretaire: true, comptable: true } },
  { label: 'Voir la banque et la paie', roles: { patron: true, comptable: true } },
];
const COLS: Role[] = ['patron', 'conducteur', 'chef_equipe', 'ouvrier', 'secretaire', 'comptable'];

export default function EquipeTab() {
  const navigate = useNavigate();
  const employees = useBrix((s) => s.employees);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('ouvrier');
  const [sent, setSent] = useState<{ email: string; role: Role }[]>([]);

  const invite = () => {
    if (!/\S+@\S+\.\S+/.test(email)) return toast('Adresse e-mail incomplète.', 'warn');
    setSent((s) => [{ email, role }, ...s]);
    setEmail('');
    toast(`Invitation envoyée à ${email} (simulé en démo).`);
  };

  return (
    <div className="grid gap-5 [&>*]:min-w-0 min-[1700px]:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Personnes" meta={`${employees.length} dans l’équipe`} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/equipe')}>Gérer l’équipe</Button>} />
          {employees.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <Avatar initials={e.initials} color={e.color} size={34} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{e.firstName} {e.lastName}</div>
                <div className="truncate text-[12px] text-ink-3">{e.email || e.phone}</div>
              </div>
              <Badge tone={e.role === 'patron' ? 'dark' : 'neutral'}>{ROLE_LABEL[e.role]}</Badge>
            </div>
          ))}
          {sent.map((s) => (
            <div key={s.email} className="flex items-center gap-3 border-t border-line px-4 py-3">
              <Avatar initials={s.email[0].toUpperCase()} size={34} />
              <div className="min-w-0 flex-1 truncate text-[13.5px]">{s.email}</div>
              <Badge tone="warn">Invitation envoyée</Badge>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <div className="text-[14px] font-semibold">Inviter quelqu’un</div>
          <p className="text-[12.5px] text-ink-2">Il reçoit un lien pour installer Brix sur son téléphone. Pas de mot de passe à retenir.</p>
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); invite(); }}>
            <Field label="E-mail ou téléphone"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.fr" /></Field>
            <Field label="Rôle">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {(Object.keys(ROLE_LABEL) as Role[]).filter((r) => r !== 'patron').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
            <Button type="submit" variant="primary" icon={<Send className="h-4 w-4" />}>Inviter</Button>
          </form>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Qui voit quoi" meta="réglé par rôle" />
        <div className="md:hidden">
          {RIGHTS.map((r) => (
            <div key={r.label} className="border-b border-line px-4 py-3">
              <div className="text-[13px] font-medium">{r.label}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">{COLS.filter((c) => r.roles[c]).map((c) => <Badge key={c}>{ROLE_LABEL[c]}</Badge>)}</div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-3">
                <th className="px-4 py-2 text-left font-medium" />
                {COLS.map((c) => <th key={c} className="px-1 py-2 text-center font-medium">{ROLE_LABEL[c].split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {RIGHTS.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="px-4 py-2.5">{r.label}</td>
                  {COLS.map((c) => <td key={c} className="text-center">{r.roles[c] ? <Check className="mx-auto h-4 w-4 text-ok" /> : <Minus className="mx-auto h-4 w-4 text-line2" />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-[12px] text-ink-3">Les compagnons ne voient jamais vos prix d’achat ni vos marges.</p>
      </Card>
    </div>
  );
}
