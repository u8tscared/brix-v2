import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Send } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Button, Card, cn, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { remindClient } from '@/modules/devis/service';
import { defaultMeta, useDevisMeta } from '@/modules/devis/store';
import { relancerDevis } from '@/parcours/signature';
import type { CockpitData } from '../useCockpitData';

const tel = (phone?: string) => phone && window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');

/**
 * « À ne pas oublier » : un seul rappel, le plus utile du moment, signé du logo B.
 * Un client qui relit son devis, sinon une facture en retard, sinon une demande à rappeler.
 */
export function ReminderCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const ui = useUI();
  const clients = useBrix((s) => s.clients);
  const [busy, setBusy] = useState(false);
  const hot = data.hotSeen;
  const late = data.late[0];
  const lead = data.newLeads[0];

  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;
  if (hot) {
    const c = clients.find((x) => x.id === hot.d.clientId);
    const views = hot.d.views ?? 1;
    const sms = async () => {
      setBusy(true);
      const st = useDevisMeta.getState();
      const meta = st.meta[hot.d.id] ?? defaultMeta();
      await remindClient(hot.d, c, 'sms');
      st.patch(hot.d.id, { reminders: meta.reminders + 1, lastReminderAt: new Date().toISOString() });
      st.log(hot.d.id, 'Relance envoyée par SMS', 'me');
      relancerDevis(hot.d.id, meta.reminders + 1);
      setBusy(false);
      toast(`Relance envoyée à ${c?.name ?? 'votre client'}`);
    };
    body = (
      <>
        {c?.name ?? 'Votre client'} a ouvert votre devis <b className="font-semibold text-ink">{views} fois</b>
        {hot.d.viewedAt?.slice(0, 10) === data.today ? ', dont aujourd’hui' : ' ces derniers jours'}. C’est souvent le bon moment pour l’appeler.
      </>
    );
    actions = (
      <>
        <Button size="sm" icon={<Phone />} onClick={() => tel(c?.phone)} disabled={!c?.phone}>
          Appeler
        </Button>
        <Button size="sm" icon={<Send />} loading={busy} onClick={sms}>
          Relancer par SMS
        </Button>
      </>
    );
  } else if (late) {
    const c = clients.find((x) => x.id === late.f.clientId);
    body = (
      <>
        {c?.name ?? 'Un client'} vous doit encore <b className="num font-semibold text-ink">{money(late.a.remaining, true)}</b>. L’échéance est passée : une relance polie suffit souvent.
      </>
    );
    actions = (
      <>
        <Button size="sm" icon={<Phone />} onClick={() => tel(c?.phone)} disabled={!c?.phone}>
          Appeler
        </Button>
        <Button size="sm" icon={<Send />} onClick={() => ui.askBob('Relance les factures en retard')}>
          Relancer
        </Button>
      </>
    );
  } else if (lead) {
    body = (
      <>
        <b className="font-semibold text-ink">{lead.name}</b> attend votre appel : « {lead.request} ».
      </>
    );
    actions = (
      <Button size="sm" icon={<Phone />} onClick={() => tel(lead.phone)}>
        Rappeler
      </Button>
    );
  } else return null;

  return (
    <Card tone="mist" className={cn('p-5', className)} aria-label="À ne pas oublier">
      <div className="flex items-center gap-2.5">
        <BrandTile size={30} />
        <b className="text-[15px] font-semibold tracking-[-0.02em]">À ne pas oublier</b>
        {hot && (
          <button onClick={() => navigate(`/app/devis/${hot.d.id}`)} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-white hover:text-ink" aria-label="Ouvrir le devis">
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mb-4 mt-3 text-[14px] leading-relaxed text-ink-2">{body}</p>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </Card>
  );
}
