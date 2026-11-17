import { useState } from 'react';
import { Copy, FileSignature, KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Badge, Button, Select, Sheet, Switch, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, money } from '@/lib/format';
import type { SubContractor } from '../data';
import { grantChantierAccess, requestSubDocuments, verifyUrssaf } from '../service';
import { useAchats } from '../store';
import { AUTOLIQ_MENTION, subDocs, subStatus } from './subs';

const CONTRACT_STATUS = { brouillon: { label: 'À signer', tone: 'warn' as const }, signe: { label: 'Signé', tone: 'ok' as const }, termine: { label: 'Terminé', tone: 'neutral' as const } };

export function SubSheet({ sub, onClose }: { sub: SubContractor | null; onClose: () => void }) {
  const chantiers = useBrix((s) => s.chantiers);
  const upsertSub = useAchats((s) => s.upsertSub);
  const [busy, setBusy] = useState<string | null>(null);
  if (!sub) return null;
  const docs = subDocs(sub);
  const st = subStatus(sub);
  const todo = docs.filter((d) => d.level > 0);

  const ask = async () => {
    setBusy('ask');
    await requestSubDocuments(sub.id, todo.map((d) => d.key));
    setBusy(null);
    toast(`Demande envoyée à ${sub.contact} avec un lien pour déposer ${todo.length > 1 ? 'les documents' : 'le document'} (démo).`);
  };
  const verify = async () => {
    setBusy('verify');
    await verifyUrssaf(sub.siret);
    setBusy(null);
    toast('Attestation authentique d’après l’URSSAF (vérification simulée).');
  };
  const setAccess = async (chantierId?: string) => {
    upsertSub({ ...sub, accessChantierId: chantierId });
    await grantChantierAccess(sub.id, chantierId);
    toast(chantierId ? `${sub.name} voit uniquement ${chantiers.find((c) => c.id === chantierId)?.name}.` : 'Accès retiré.');
  };

  return (
    <Sheet open onClose={onClose} width={560} title={sub.name} subtitle={`${sub.trade} · SIRET ${sub.siret}`}
      footer={<>
        <a href={`tel:${sub.phone.replace(/\s/g, '')}`} className="mr-auto inline-flex h-10 min-w-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium text-ink-2 hover:bg-sub"><Phone className="h-4 w-4 shrink-0" /><span className="truncate">{sub.contact}</span></a>
        {todo.length > 0 && <Button variant="primary" loading={busy === 'ask'} icon={<Mail className="h-4 w-4" />} onClick={ask}>Demander les documents</Button>}
      </>}
    >
      <div className="space-y-5">
        {st.level === 2 && (
          <div className="rounded-xl border border-[#fbd1d1] bg-bad-bg px-3 py-2.5 text-[12.5px] text-bad">
            Document expiré : en cas de travail dissimulé, vous seriez solidaire de ses dettes sociales et fiscales. Suspendez les paiements tant qu’il n’est pas à jour.
          </div>
        )}

        <section>
          <h4 className="mb-2 text-[12.5px] font-medium text-ink-2">Documents obligatoires</h4>
          <div className="divide-y divide-line rounded-xl border border-line">
            {docs.map((d) => (
              <div key={d.key} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{d.label}</div>
                  <div className="text-[11.5px] text-ink-3">{d.detail}</div>
                </div>
                <Badge tone={d.tone} dot={d.level > 0}>{d.status}</Badge>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" loading={busy === 'verify'} icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={verify}>Vérifier l’attestation sur le site de l’URSSAF</Button>
        </section>

        <section>
          <h4 className="mb-2 text-[12.5px] font-medium text-ink-2">Contrats de sous-traitance</h4>
          <div className="space-y-2">
            {sub.contracts.map((c) => {
              const ch = chantiers.find((x) => x.id === c.chantierId);
              return (
                <div key={c.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{c.object}</div>
                      <div className="text-[11.5px] text-ink-3">{ch?.name ?? 'Chantier'} · {c.status === 'brouillon' ? 'préparé' : 'signé'} le {dateFull(c.signedAt)}</div>
                    </div>
                    <Badge tone={CONTRACT_STATUS[c.status].tone}>{CONTRACT_STATUS[c.status].label}</Badge>
                  </div>
                  <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
                    <span>Montant <span className="font-medium text-ink">{money(c.amountHt)} HT</span></span>
                    <span>Facturé {money(c.invoiced)}</span>
                    <span>TVA à autoliquider {money(c.amountHt * 0.2)}</span>
                  </div>
                  {c.status === 'brouillon' && <Button size="sm" variant="secondary" className="mt-2" icon={<FileSignature className="h-3.5 w-3.5" />} onClick={() => { upsertSub({ ...sub, contracts: sub.contracts.map((x) => (x.id === c.id ? { ...x, status: 'signe' } : x)) }); toast('Contrat envoyé en signature électronique (démo).'); }}>Envoyer en signature</Button>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">Le contrat reprend la loi de 1975 : acceptation par le client final et garantie de paiement (caution bancaire ou délégation de paiement).</p>
        </section>

        <section className="rounded-xl bg-sub p-3">
          <div className="text-[12.5px] font-medium">Autoliquidation de la TVA</div>
          <p className="mt-1 text-[12px] text-ink-2">Le sous-traitant facture hors taxe et c’est vous qui déclarez la TVA. Brix ajoute la mention au contrat et la vérifie sur ses factures :</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <span className="min-w-0 flex-1 text-[12.5px] font-medium">« {AUTOLIQ_MENTION} »</span>
            <button aria-label="Copier la mention" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-ink" onClick={async () => { try { await navigator.clipboard.writeText(AUTOLIQ_MENTION); } catch { /* indisponible */ } toast('Mention copiée.'); }}><Copy className="h-4 w-4" /></button>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-ink-3" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">Accès à Brix</div>
              <div className="text-[11.5px] text-ink-3">Un seul chantier, sans aucun prix : planning, plans, photos, réserves.</div>
            </div>
            <Switch checked={!!sub.accessChantierId} onChange={(v) => setAccess(v ? sub.contracts[0]?.chantierId ?? chantiers[0]?.id : undefined)} label="Accès" />
          </div>
          {sub.accessChantierId && (
            <Select className="mt-2" value={sub.accessChantierId} onChange={(e) => setAccess(e.target.value)}>
              {chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </section>
      </div>
    </Sheet>
  );
}
