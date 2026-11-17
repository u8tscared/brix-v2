import { useState } from 'react';
import { Building2, ChevronRight, KeyRound, Mail, Plus, Scale } from 'lucide-react';
import { Button, EmptyState, Field, IconTile, Input, PageHeader, Sheet, cn, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { dayOffset, money, uid } from '@/lib/format';
import type { SubContractor } from './data';
import { useAchats } from './store';
import { requestSubDocuments } from './service';
import { SubSheet } from './components/SubSheet';
import { subDocs, subStatus } from './components/subs';
import { BigMoney, DaysRing, Label, SectionHead, SplitBar } from '@/modules/finance/components/kit';

const DOC_SHORT: Record<string, string> = { urssaf: 'URSSAF', kbis: 'Kbis', decennale: 'Décennale', rcpro: 'RC pro' };
const LEVEL = [
  { label: 'Conformes', color: '#16a34a', text: 'text-ok' },
  { label: 'À renouveler', color: '#f59e0b', text: 'text-[#b45309]' },
  { label: 'Bloqués', color: '#dc2626', text: 'text-bad' },
];

function AddSub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const upsertSub = useAchats((s) => s.upsertSub);
  const [f, setF] = useState({ name: '', trade: '', siret: '', contact: '', phone: '', email: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau sous-traitant" subtitle="Brix lui demande ensuite ses documents par e-mail." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!f.name} onClick={() => {
        upsertSub({ id: uid('s'), ...f, urssafAt: dayOffset(-200), kbisAt: dayOffset(-200), decennale: { insurer: 'À fournir', expires: dayOffset(-1) }, rcproExpires: dayOffset(-1), contracts: [] });
        toast(`${f.name} ajouté. Demande de documents envoyée.`);
        setF({ name: '', trade: '', siret: '', contact: '', phone: '', email: '' });
        onClose();
      }}>Ajouter</Button></>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Entreprise" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Ex. Rhône Plâtrerie" autoFocus /></Field>
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
  const [asked, setAsked] = useState<Record<string, 'busy' | 'done'>>({});
  const open = subs.find((s) => s.id === openId) ?? null;
  const counts = [0, 1, 2].map((l) => subs.filter((s) => subStatus(s).level === l).length);
  const engaged = subs.reduce((s, x) => s + x.contracts.reduce((a, c) => a + c.amountHt, 0), 0);
  const sorted = [...subs].sort((a, b) => subStatus(b).level - subStatus(a).level);
  const todo = sorted.filter((s) => subStatus(s).level > 0);

  const ask = async (s: SubContractor) => {
    const docs = subDocs(s).filter((d) => d.level > 0);
    setAsked((x) => ({ ...x, [s.id]: 'busy' }));
    await requestSubDocuments(s.id, docs.map((d) => d.key));
    setAsked((x) => ({ ...x, [s.id]: 'done' }));
    toast(`${s.contact} a reçu un lien pour déposer ${docs.length > 1 ? 'ses documents' : 'son document'}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Handshake" dept="achats" size="lg" />} title="Sous-traitants" subtitle="Documents à jour, contrats, TVA. Brix fait la vigilance à votre place."
        actions={<Button variant="primary" icon={<Plus />} onClick={() => setAdd(true)} className="max-sm:w-full">Ajouter</Button>} />

      {subs.length === 0 ? (
        <EmptyState icon={<IconTile name="Handshake" dept="achats" size="xl" />} title="Aucun sous-traitant pour l’instant" text="Ajoutez-en un : Brix lui demande ses documents et vous prévient avant qu’ils expirent." action={<Button variant="primary" icon={<Plus />} onClick={() => setAdd(true)}>Ajouter un sous-traitant</Button>} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-[16px] bg-white p-5 shadow-card">
              <Label>Travaux confiés en ce moment</Label>
              <BigMoney value={engaged} dawn className="mt-2 block text-[40px]" />
              <div className="mt-1 text-[12.5px] text-ink-3">HT, chez {subs.length} sous-traitant{subs.length > 1 ? 's' : ''}</div>
              <SplitBar className="mt-5 h-2.5" parts={LEVEL.map((l, i) => ({ value: counts[i], color: l.color, label: l.label }))} />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-2">
                {LEVEL.map((l, i) => <span key={l.label} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}<span className={cn('num font-semibold', counts[i] ? l.text : 'text-ink-3')}>{counts[i]}</span></span>)}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[16px] bg-white/60 p-5 shadow-[0_0_0_1px_var(--line)]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2"><Scale className="h-4 w-4" /></span>
              <div>
                <div className="text-[13.5px] font-semibold">Ce que dit la loi, en clair</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">Dès 5 000 € HT de travaux, vous devez vérifier l’attestation URSSAF de votre sous-traitant <span className="font-medium text-ink">tous les 6 mois</span>. Sinon, vous pouvez devoir payer ses dettes. Brix la redemande tout seul un mois avant.</p>
              </div>
            </div>
          </div>

          {todo.length > 0 && (
            <section>
              <SectionHead title="À régulariser" meta={`${todo.length} sous-traitant${todo.length > 1 ? 's' : ''}`} />
              <div className="stagger mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {todo.map((s) => {
                  const docs = subDocs(s).filter((d) => d.level > 0).sort((a, b) => b.level - a.level || Number(a.key === 'kbis') - Number(b.key === 'kbis') || a.days - b.days);
                  const worst = docs[0];
                  const st = asked[s.id];
                  return (
                    <div key={s.id} className="relative flex flex-col gap-3 overflow-hidden rounded-[16px] bg-white p-4 shadow-card sm:flex-row sm:items-center">
                      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', worst.level === 2 ? 'bg-bad' : 'bg-[#f59e0b]')} />
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <DaysRing days={worst.days} horizon={45} size={52} />
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold">{s.name}</div>
                          <div className="text-[12.5px] text-ink-2">{docs.map((d) => `${DOC_SHORT[d.key]} ${d.status.toLowerCase()}`).join(' · ')}</div>
                          {worst.level === 2 && <div className="mt-0.5 text-[12px] text-ink-3">Mettez ses paiements en attente jusqu’à réception.</div>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                        {st === 'done' ? (
                          <span className="flex h-10 items-center gap-1.5 px-1 text-[12.5px] font-medium text-ok"><SuccessDot size={18} />Demande envoyée</span>
                        ) : (
                          <Button size="sm" variant="secondary" loading={st === 'busy'} icon={<Mail />} onClick={() => ask(s)} className="max-sm:flex-1">Redemander</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setOpenId(s.id)}>Voir</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <SectionHead title="Tous vos sous-traitants" />
            <div className="stagger mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sorted.map((s) => {
                const st = subStatus(s);
                const docs = subDocs(s);
                const amount = s.contracts.reduce((a, c) => a + c.amountHt, 0);
                const access = chantiers.find((c) => c.id === s.accessChantierId);
                return (
                  <button key={s.id} onClick={() => setOpenId(s.id)} className="lift flex w-full flex-col rounded-[18px] bg-white p-4 text-left shadow-card">
                    <div className="flex items-start gap-3">
                      <IconTile icon={<Building2 />} dept="achats" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold tracking-[-0.015em]">{s.name}</div>
                        <div className="truncate text-[12.5px] text-ink-2">{s.trade} · {s.contact}</div>
                      </div>
                      <span className={cn('flex shrink-0 items-center gap-1.5 text-[12px] font-medium', LEVEL[st.level].text)}><i className="h-2 w-2 rounded-full" style={{ background: LEVEL[st.level].color }} />{st.label}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {docs.map((d) => (
                        <span key={d.key} title={`${d.label} : ${d.status}`} className="flex flex-col items-center gap-1.5 rounded-[10px] bg-sub px-1 py-2 text-center">
                          <i className="h-1.5 w-6 rounded-full" style={{ background: LEVEL[d.level].color, opacity: d.level ? 1 : 0.55 }} />
                          <span className="text-[11px] font-medium text-ink-2">{DOC_SHORT[d.key]}</span>
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 border-t border-dashed border-line pt-3 text-[12.5px] text-ink-2">
                      <span className="num"><span className="font-semibold text-ink">{money(amount, true)}</span> HT · {s.contracts.length} contrat{s.contracts.length > 1 ? 's' : ''}</span>
                      {access && <span className="flex min-w-0 items-center gap-1 truncate"><KeyRound className="h-3 w-3 shrink-0" />{access.name.split(' · ')[0]}</span>}
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <SubSheet sub={open} onClose={() => setOpenId(null)} />
      <AddSub open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
