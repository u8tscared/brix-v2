import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AudioLines, Bot, Camera, ChevronRight, ClipboardCheck, FileSignature, FileText, MessageSquare, Mic, Package, Receipt, Send, ShieldCheck, Truck, User } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong, dateShort, money, totals, uid } from '@/lib/format';
import { DEVIS_STATUS, FACTURE_STATUS } from '@/lib/status';
import type { ChantierView } from '../../lib/useChantier';
import { useChantiersLocal, type JournalKind } from '../../store';

/* ---------------------------------- Documents ---------------------------------- */

export function DocumentsTab({ v }: { v: ChantierView }) {
  const { devis, factures, company } = useBrix();
  const pvs = useChantiersLocal((s) => s.pvs).filter((p) => p.chantierId === v.ch.id);
  const linkedDevis = devis.filter((d) => d.chantierId === v.ch.id || d.id === v.ch.devisId);
  const linkedFactures = factures.filter((f) => f.chantierId === v.ch.id);
  const invoiced = linkedFactures.reduce((s, f) => s + totals(f.lines).ht, 0);
  const attest = [
    { label: 'Attestation d’assurance décennale', meta: company.decennale || 'À ajouter dans Documents', ok: !!company.decennale },
    ...(linkedDevis.some((d) => d.lines.some((l) => l.vatRate === 10)) ? [{ label: 'Attestation TVA à taux réduit (10 %)', meta: v.client?.kind === 'particulier' ? 'Signée par le client avec le devis' : 'Non requise pour un professionnel', ok: true }] : []),
    ...(company.trade === 'electricien' ? [{ label: 'Attestation de conformité Consuel', meta: v.ch.status === 'termine' ? 'Visée' : 'À demander avant la mise en service', ok: v.ch.status === 'termine' }] : []),
  ];

  const Row = ({ to, icon, title, meta, right }: { to?: string; icon: React.ReactNode; title: string; meta: string; right: React.ReactNode }) => {
    const inner = (
      <>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sub text-ink-2 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{title}</span>
          <span className="block truncate text-xs text-ink-3">{meta}</span>
        </span>
        {right}
        {to && <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />}
      </>
    );
    const cls = 'flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0';
    return to ? <Link to={to} className={cn(cls, 'transition hover:bg-[#fafafc]')}>{inner}</Link> : <div className={cls}>{inner}</div>;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <Card>
        <CardHeader title="Devis et avenants" meta={String(linkedDevis.length)} />
        {linkedDevis.length === 0 && <p className="p-4 text-[13px] text-ink-3">Aucun devis lié.</p>}
        {linkedDevis.map((d) => (
          <Row key={d.id} to={`/app/devis/${d.id}`} icon={<FileText />} title={`${d.number} · ${d.title}`} meta={`${money(totals(d.lines).ht)} HT · ${dateShort(d.createdAt)}`} right={<Badge tone={DEVIS_STATUS[d.status].tone}>{DEVIS_STATUS[d.status].label}</Badge>} />
        ))}
      </Card>
      <Card>
        <CardHeader title="Factures" meta={`${money(invoiced, true)} HT facturés sur ${money(v.ch.budgetHt, true)}`} />
        {linkedFactures.length === 0 && <p className="p-4 text-[13px] text-ink-3">Aucune facture pour l’instant.</p>}
        {linkedFactures.map((f) => (
          <Row key={f.id} to={`/app/factures/${f.id}`} icon={<Receipt />} title={`${f.number} · ${f.title}`} meta={`${money(totals(f.lines).ttc)} TTC · échéance ${dateShort(f.dueDate)}`} right={<Badge tone={FACTURE_STATUS[f.status].tone}>{FACTURE_STATUS[f.status].label}</Badge>} />
        ))}
      </Card>
      <Card>
        <CardHeader title="Procès-verbal de réception" />
        {pvs.length === 0 ? (
          <Row to={`/app/pv-reception?chantier=${v.ch.id}`} icon={<ClipboardCheck />} title="Pas encore de PV" meta="À signer avec le client en fin de chantier" right={<span className="text-xs font-medium text-vi-700">Préparer</span>} />
        ) : (
          pvs.map((p) => (
            <Row key={p.id} to={`/app/pv-reception?chantier=${v.ch.id}`} icon={<FileSignature />} title={`PV du ${dateShort(p.date)}`} meta={p.withReserves ? `${p.reserves.filter((r) => !r.done).length} réserve(s) à lever` : 'Sans réserve'} right={<Badge tone={p.signedAt ? 'ok' : 'warn'}>{p.signedAt ? 'Signé' : 'À signer'}</Badge>} />
          ))
        )}
      </Card>
      <Card>
        <CardHeader title="Attestations" />
        {attest.map((a) => (
          <Row key={a.label} icon={<ShieldCheck />} title={a.label} meta={a.meta} right={<Badge tone={a.ok ? 'ok' : 'warn'}>{a.ok ? 'OK' : 'À faire'}</Badge>} />
        ))}
      </Card>
    </div>
  );
}

/* ----------------------------------- Journal ----------------------------------- */

const J_ICON: Record<JournalKind, React.ReactNode> = {
  vocal: <AudioLines />,
  note: <MessageSquare />,
  evenement: <ClipboardCheck />,
  photo: <Camera />,
  rapport: <Send />,
  avenant: <FileSignature />,
  achat: <Package />,
};

export function JournalTab({ v, onVoice }: { v: ChantierView; onVoice: () => void }) {
  const entries = useChantiersLocal((s) => s.journal).filter((j) => j.chantierId === v.ch.id).sort((a, b) => b.at.localeCompare(a.at));
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const employees = useBrix((s) => s.employees);
  const [note, setNote] = useState('');
  const days = [...new Set(entries.map((e) => e.at.slice(0, 10)))];

  const add = () => {
    if (!note.trim()) return;
    addJournal({ id: uid('j'), chantierId: v.ch.id, at: new Date().toISOString(), kind: 'note', author: employees[0]?.id ?? 'moi', text: note.trim() });
    setNote('');
    toast('Note ajoutée au journal');
  };

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-2 p-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Écrire une note pour l’équipe ou pour vous" className="flex-1 border-0 focus:ring-0" />
        <Button variant="ghost" size="icon" aria-label="Note vocale" onClick={onVoice}>
          <Mic className="h-4 w-4" />
        </Button>
        <Button variant="primary" onClick={add} disabled={!note.trim()}>Ajouter</Button>
      </Card>
      {entries.length === 0 && <EmptyState icon={<MessageSquare />} title="Le journal est vide" text="Notes vocales, photos, rapports et événements du chantier s’afficheront ici." />}
      {days.map((d) => (
        <section key={d}>
          <h3 className="mb-2 text-xs font-medium text-ink-3">{capitalize(dateLong(d))}</h3>
          <Card>
            {entries.filter((e) => e.at.startsWith(d)).map((e) => {
              const emp = employees.find((x) => x.id === e.author);
              return (
                <div key={e.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  {emp ? (
                    <Avatar initials={emp.initials} color={emp.color} size={32} />
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sub text-ink-2 [&_svg]:h-4 [&_svg]:w-4">{e.author === 'bob' ? <Bot /> : <User />}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span className="font-medium text-ink-2">{emp ? emp.firstName : e.author === 'bob' ? 'Bob' : 'Client'}</span>
                      <span className="[&_svg]:h-3 [&_svg]:w-3">{J_ICON[e.kind]}</span>
                      <span className="num">{e.at.slice(11, 16)}</span>
                    </div>
                    {e.kind === 'vocal' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="flex h-5 items-center gap-[2px]">
                          {Array.from({ length: 22 }, (_, i) => (
                            <i key={i} className="w-[2px] rounded bg-vi-300" style={{ height: `${30 + Math.abs(Math.sin(i * 1.7 + e.id.length)) * 70}%` }} />
                          ))}
                        </span>
                        <span className="num text-xs text-ink-3">{Math.floor((e.duration ?? 0) / 60)}:{String((e.duration ?? 0) % 60).padStart(2, '0')} · transcrit</span>
                      </div>
                    )}
                    <p className="mt-1 text-[13.5px] leading-relaxed">{e.text}</p>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------ Achats ----------------------------------- */

export function AchatsTab({ v }: { v: ChantierView }) {
  const navigate = useNavigate();
  const expenses = useBrix((s) => s.expenses).filter((x) => x.chantierId === v.ch.id);
  const lines = (v.devis?.lines ?? []).filter((l) => l.kind === 'fourniture');
  const bySupplier = new Map<string, typeof lines>();
  lines.forEach((l) => bySupplier.set(l.supplier ?? 'À choisir', [...(bySupplier.get(l.supplier ?? 'À choisir') ?? []), l]));
  const statusFor = (i: number) => (v.ch.progress >= 60 || v.ch.status === 'termine' ? 'Livrée' : i === 0 && v.ch.progress > 15 ? 'Livrée' : i === 0 ? 'Commandée' : 'À commander');

  return (
    <div className="space-y-4">
      {lines.length === 0 ? (
        <EmptyState icon={<Truck />} title="Pas de fourniture au devis" text="Les fournitures du devis apparaîtront ici, prêtes à commander chez vos fournisseurs." />
      ) : (
        [...bySupplier.entries()].map(([sup, ls], i) => {
          const st = statusFor(i);
          return (
            <Card key={sup}>
              <CardHeader
                title={sup}
                meta={`${ls.length} article${ls.length > 1 ? 's' : ''} · ${money(ls.reduce((s, l) => s + l.quantity * l.unitCostHt, 0))} HT d’achat`}
                action={
                  st === 'À commander' ? (
                    <Button size="sm" variant="primary" icon={<Truck className="h-3.5 w-3.5" />} onClick={() => navigate('/app/fournisseurs')}>Commander</Button>
                  ) : (
                    <Badge tone={st === 'Livrée' ? 'ok' : 'info'}>{st}</Badge>
                  )
                }
              />
              {ls.map((l) => (
                <div key={l.id} className="flex min-h-[48px] items-center gap-3 border-b border-line px-4 py-2 text-[13px] last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.designation}</span>
                    {l.supplierRef && <span className="block truncate text-xs text-ink-3">{l.supplierRef}</span>}
                  </span>
                  <span className="num shrink-0 text-ink-2">{l.quantity} {l.unit}</span>
                  <span className="num hidden w-24 shrink-0 text-right sm:block">{money(l.quantity * l.unitCostHt)}</span>
                </div>
              ))}
            </Card>
          );
        })
      )}
      {expenses.length > 0 && (
        <Card>
          <CardHeader title="Dépenses imputées" meta="notes de frais et achats au comptoir" />
          {expenses.map((x) => (
            <div key={x.id} className="flex min-h-[48px] items-center gap-3 border-b border-line px-4 py-2 text-[13px] last:border-b-0">
              <span className="flex-1">{x.supplier} · {x.category}</span>
              <span className="text-xs text-ink-3">{dateShort(x.date)}</span>
              <span className="num w-20 text-right">{money(x.amountTtc)}</span>
            </div>
          ))}
        </Card>
      )}
      <div className="flex justify-end">
        <Button icon={<Truck className="h-4 w-4" />} onClick={() => navigate('/app/fournisseurs')}>Voir l’espace fournisseurs</Button>
      </div>
    </div>
  );
}
