import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, FileText, Mail, MessageCircle, Phone, XCircle } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Badge, Button, cn, IconTile, Sheet } from '@/components/ui';
import { capitalize, dateLong, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Lead } from '@/lib/types';
import { LEAD_SOURCE, LEAD_STATUS, readLead, telHref, URGENCY, waHref } from '../lib';
import { freeSlots, qualifyLead } from '../service';
import { ScoreDot } from './LeadCard';
import { useLeadActions } from './useLeadActions';

const ACTION = 'flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-card-sm bg-white text-[12.5px] font-medium shadow-halo-sm transition-[box-shadow,transform] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-halo active:scale-[.97]';
const hm = (t: string) => { const [h, m] = t.split(':'); return `${Number(h)} h${m !== '00' ? ' ' + m : ''}`; };

export function LeadSheet({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const events = useBrix((s) => s.events);
  const employees = useBrix((s) => s.employees);
  const upsertLead = useBrix((s) => s.upsertLead);
  const { prepareDevis, proposeSlot, markLost, setStatus } = useLeadActions();
  const [qualifying, setQualifying] = useState(false);
  const [pickSlot, setPickSlot] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const me = employees.find((e) => e.role === 'patron') ?? employees[0];
  const slots = useMemo(() => freeSlots(events, me?.id ?? '', 4), [events, me?.id]);

  useEffect(() => {
    setPickSlot(false);
    if (lead && lead.score === undefined) {
      setQualifying(true);
      qualifyLead(lead).then((q) => {
        upsertLead({ ...lead, ...q, status: lead.status === 'nouveau' ? 'qualifie' : lead.status });
        setQualifying(false);
      });
    }
  }, [lead?.id]);

  if (!lead) return null;
  const r = readLead(lead);
  const src = LEAD_SOURCE[lead.source];
  const closed = lead.status === 'perdu' || lead.status === 'gagne';

  return (
    <Sheet
      open={!!lead}
      onClose={onClose}
      title={lead.name}
      subtitle={`${src.label} · ${lead.city} · ${lead.phone}`}
      footer={
        closed ? (
          <Button onClick={() => setStatus(lead, 'nouveau')}>Rouvrir la demande</Button>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto text-bad" icon={<XCircle className="h-4 w-4" />} onClick={() => { markLost(lead); onClose(); }}>
              Perdue
            </Button>
            <Button variant="dawn" icon={<FileText className="h-4 w-4" />} onClick={() => prepareDevis(lead)}>
              Préparer le devis
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="rounded-card-sm bg-halo-track p-4">
          <div className="mb-1 text-[12.5px] font-medium text-ink-3">La demande</div>
          <p className="text-[14px] leading-relaxed">« {lead.request} »</p>
        </div>

        <div className="relative overflow-hidden rounded-card-sm bg-dawn-mist p-4 shadow-halo-sm">
          <div className="flex items-center gap-2.5">
            <BrandTile size={28} className="rounded-[9px]" />
            <span className="text-[13px] font-semibold">Ce que Brix AI en pense</span>
            <div className="flex-1" />
            {qualifying ? <span className="text-xs text-ink-3">Brix AI lit la demande…</span> : <ScoreDot score={lead.score} />}
          </div>
          {qualifying ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
          ) : (
            <>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                {r.kind}, {URGENCY[r.urgency].label.toLowerCase()}. Je l'estime autour de <b className="num text-ink">{money(lead.estimate ?? 0, true)} HT</b>.{' '}
                {(lead.score ?? 0) >= 80 ? 'Très bonne demande : rappelle dans l\'heure, les clients signent avec le premier qui répond.' : (lead.score ?? 0) >= 60 ? 'Demande sérieuse, une visite permettra de chiffrer juste.' : 'Petit montant : un devis rapide par SMS suffit.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={URGENCY[r.urgency].tone}>{URGENCY[r.urgency].label}</Badge>
                <Badge tone={LEAD_STATUS[lead.status].tone}>{LEAD_STATUS[lead.status].label.replace(/s$/, '')}</Badge>
                {lead.email && <Badge icon={<Mail />}>{lead.email}</Badge>}
              </div>
            </>
          )}
        </div>

        {!closed && (
          <div className="grid grid-cols-3 gap-2">
            <a href={telHref(lead.phone)} className={ACTION}>
              <IconTile icon={<Phone />} tone="violet" size="sm" className="rounded-full" /> Appeler
            </a>
            <a href={waHref(lead.phone, `Bonjour ${lead.name.split(' ')[0]}, ici Karim de Benali Électricité suite à votre demande.`)} target="_blank" rel="noreferrer" className={ACTION}>
              <IconTile icon={<MessageCircle />} tone="green" size="sm" className="rounded-full" /> WhatsApp
            </a>
            <button onClick={() => setPickSlot((v) => !v)} aria-pressed={pickSlot} className={cn(ACTION, pickSlot && '!shadow-[0_0_0_1.5px_#c4b5fd,0_10px_24px_-12px_rgba(109,40,217,.35)]')}>
              <IconTile icon={<CalendarCheck />} tone="peach" size="sm" className="rounded-full" /> Visite
            </button>
          </div>
        )}

        {pickSlot && !closed && (
          <div className="animate-fade-up rounded-card-sm bg-white p-4 shadow-halo-sm">
            <div className="text-[13px] font-semibold">Créneaux libres dans votre agenda</div>
            <p className="mt-0.5 text-xs text-ink-3">Le client reçoit un SMS et confirme en un clic.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {slots.map((sl) => {
                const k = sl.date + sl.start;
                return (
                  <button
                    key={k}
                    disabled={!!sending}
                    onClick={async () => {
                      setSending(k);
                      await proposeSlot(lead, sl);
                      setSending(null);
                      setPickSlot(false);
                    }}
                    className="flex min-h-[52px] items-center gap-2 rounded-card-sm bg-halo-track px-3.5 text-left text-[13px] transition-[background,box-shadow] duration-300 hover:bg-white hover:shadow-[0_0_0_1.5px_#d9c6fb]"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{capitalize(dateLong(sl.date))}</span>
                      <span className="num text-ink-3">{hm(sl.start)} – {hm(sl.end)}</span>
                    </span>
                    {sending === k ? <span className="text-xs text-ink-3">Envoi…</span> : <Check className="h-4 w-4 text-ink-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2.5 text-[12.5px] font-medium text-ink-3">Étape</div>
          <div className="flex flex-wrap gap-x-1 gap-y-1.5">
            {(['nouveau', 'qualifie', 'rdv', 'devis', 'gagne'] as Lead['status'][]).map((st, i, all) => {
              const cur = all.indexOf(lead.status);
              const state = lead.status === st ? 'on' : cur > i ? 'done' : undefined;
              return (
                <button key={st} onClick={() => setStatus(lead, st)} aria-pressed={lead.status === st} className={cn('step-halo h-9 rounded-full pl-1.5 pr-3 transition-colors hover:bg-white', lead.status === st && 'bg-white shadow-pill')} data-state={state}>
                  <b>{state === 'done' ? <Check className="h-3 w-3" strokeWidth={2.6} /> : i + 1}</b>
                  {LEAD_STATUS[st].label.replace(/s$/, '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
