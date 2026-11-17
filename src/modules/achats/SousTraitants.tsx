import { useState } from 'react';
import { Building2, ChevronRight, KeyRound, Plus, Scale } from 'lucide-react';
import { Badge, Button, Card, Field, Input, PageHeader, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dayOffset, money, uid } from '@/lib/format';
import type { SubContractor } from './data';
import { useAchats } from './store';
import { SubSheet } from './components/SubSheet';
import { subDocs, subStatus } from './components/subs';

function AddSub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const upsertSub = useAchats((s) => s.upsertSub);
  const [f, setF] = useState({ name: '', trade: '', siret: '', contact: '', phone: '', email: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau sous-traitant" subtitle="Brix lui demande ensuite ses documents par e-mail." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!f.name} onClick={() => {
        upsertSub({ id: uid('s'), ...f, urssafAt: dayOffset(-200), kbisAt: dayOffset(-200), decennale: { insurer: 'À fournir', expires: dayOffset(-1) }, rcproExpires: dayOffset(-1), contracts: [] });
        toast(`${f.name} ajouté. Demande de documents envoyée (démo).`);
        onClose();
      }}>Ajouter</Button></>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Entreprise" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Ex. Rhône Plâtrerie" /></Field>
        <Field label="Métier"><Input value={f.trade} onChange={set('trade')} placeholder="Plaquiste" /></Field>
        <Field label="SIRET" hint="Brix remplit le reste depuis l’annuaire des entreprises."><Input value={f.siret} onChange={set('siret')} inputMode="numeric" /></Field>
        <Field label="Contact"><Input value={f.contact} onChange={set('contact')} /></Field>
        <Field label="Téléphone"><Input value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
        <Field label="E-mail" className="sm:col-span-2"><Input value={f.email} onChange={set('email')} type="email" /></Field>
      </div>
    </Sheet>
  );
}

export default function SousTraitants() {
  const subs = useAchats((s) => s.subs);
  const chantiers = useBrix((s) => s.chantiers);
  const [openId, setOpenId] = useState<string | null>(null);
  const [add, setAdd] = useState(false);
  const open = subs.find((s) => s.id === openId) ?? null;
  const counts = [0, 1, 2].map((l) => subs.filter((s) => subStatus(s).level === l).length);
  const engaged = subs.reduce((s, x) => s + x.contracts.reduce((a, c) => a + c.amountHt, 0), 0);

  const card = (s: SubContractor) => {
    const st = subStatus(s);
    const docs = subDocs(s);
    const amount = s.contracts.reduce((a, c) => a + c.amountHt, 0);
    const access = chantiers.find((c) => c.id === s.accessChantierId);
    return (
      <button key={s.id} onClick={() => setOpenId(s.id)} className={cn('flex w-full flex-col rounded-[14px] border bg-white p-4 text-left transition hover:shadow-card', st.level === 2 ? 'border-[#fbd1d1]' : 'border-line')}>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sub text-ink-2"><Building2 className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold">{s.name}</div>
            <div className="truncate text-[12.5px] text-ink-2">{s.trade} · {s.contact}</div>
          </div>
          <Badge tone={st.tone} dot>{st.label}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {docs.map((d) => <span key={d.key} className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium', d.level === 2 ? 'bg-bad-bg text-bad' : d.level === 1 ? 'bg-warn-bg text-warn' : 'bg-sub text-ink-2')}>{d.key === 'urssaf' ? 'URSSAF' : d.key === 'kbis' ? 'Kbis' : d.key === 'decennale' ? 'Décennale' : 'RC pro'}{d.level ? ` · ${d.status.toLowerCase()}` : ''}</span>)}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[12.5px] text-ink-2">
          <span className="num"><span className="font-medium text-ink">{money(amount, true)}</span> HT · {s.contracts.length} contrat{s.contracts.length > 1 ? 's' : ''}</span>
          {access && <span className="flex min-w-0 items-center gap-1 truncate"><KeyRound className="h-3 w-3 shrink-0" />{access.name.split(' · ')[0]}</span>}
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink-3" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Sous-traitants" subtitle="Documents à jour, contrats, autoliquidation. Brix fait la vigilance à votre place."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdd(true)}>Ajouter</Button>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="grid grid-cols-3">
          <div className="border-r border-line p-4"><div className="text-xs font-medium text-ink-2">Conformes</div><div className="num mt-1 text-[22px] font-semibold text-ok">{counts[0]}</div></div>
          <div className="border-r border-line p-4"><div className="text-xs font-medium text-ink-2">À renouveler</div><div className="num mt-1 text-[22px] font-semibold text-warn">{counts[1]}</div></div>
          <div className="p-4"><div className="text-xs font-medium text-ink-2">Bloqués</div><div className="num mt-1 text-[22px] font-semibold text-bad">{counts[2]}</div></div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">Dès 5 000 € HT de travaux, la loi vous oblige à vérifier l’attestation URSSAF de votre sous-traitant <span className="font-medium text-ink">tous les 6 mois</span>. Brix la redemande tout seul un mois avant. <span className="num">{money(engaged, true)}</span> HT engagés en ce moment.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{[...subs].sort((a, b) => subStatus(b).level - subStatus(a).level).map(card)}</div>

      <SubSheet sub={open} onClose={() => setOpenId(null)} />
      <AddSub open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
