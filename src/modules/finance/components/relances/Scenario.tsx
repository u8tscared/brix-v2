// Scénario de relance automatique : étapes, délais, canal et ton des messages de Bob.

import { useState } from 'react';
import { Mail, MessageSquareText, Stamp } from 'lucide-react';
import { Card, CardHeader, Segmented, Switch, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { reminderText } from '@/modules/factures/service';
import { useFactures, type RelanceTone } from '@/modules/factures/store';

const CH_ICON = { email: <Mail className="h-4 w-4" />, sms: <MessageSquareText className="h-4 w-4" />, courrier: <Stamp className="h-4 w-4" /> };
const CH_LABEL = { email: 'Mail', sms: 'SMS', courrier: 'Courrier' };

export function ScenarioCard({ sample }: { sample?: Facture }) {
  const fx = useFactures();
  const s = useBrix();
  const [preview, setPreview] = useState(fx.steps[0]?.id ?? 's1');
  const step = fx.steps.find((x) => x.id === preview) ?? fx.steps[0];
  const level = (fx.steps.indexOf(step) + 1) as 1 | 2 | 3;
  const client = s.clients.find((c) => c.id === sample?.clientId);

  return (
    <Card>
      <CardHeader title="Relance automatique" meta={fx.relanceAuto ? 'Bob s’en occupe' : 'désactivée'} action={<Switch checked={fx.relanceAuto} onChange={(v) => fx.set({ relanceAuto: v })} label="Relance automatique" />} />
      <div className={cn('space-y-4 p-4 transition', !fx.relanceAuto && 'opacity-50')}>
        <ol className="space-y-2">
          {fx.steps.map((st, i) => (
            <li key={st.id} className={cn('flex items-center gap-3 rounded-xl border p-3 transition', preview === st.id ? 'border-vi-200 bg-vi-50/50' : 'border-line')}>
              <button onClick={() => setPreview(st.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-2 ring-1 ring-line">{CH_ICON[st.channel]}</span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium">{st.label}</div>
                  <div className="text-[12px] text-ink-3">
                    {CH_LABEL[st.channel]} · étape {i + 1}
                  </div>
                </div>
              </button>
              <label className="flex items-center gap-1 text-[12.5px] text-ink-2">
                J+
                <input type="number" min={0} max={90} value={st.day} onChange={(e) => fx.setStep(st.id, { day: Math.max(0, Number(e.target.value) || 0) })} className="num h-10 w-14 rounded-lg border border-line2 bg-white px-2 text-center text-[13.5px] focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100" aria-label={`Délai ${st.label}`} />
              </label>
              <Switch checked={st.enabled} onChange={(v) => fx.setStep(st.id, { enabled: v })} label={st.label} />
            </li>
          ))}
        </ol>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-ink-2">Ton de Bob</span>
            <Segmented<RelanceTone>
              size="sm"
              value={fx.relanceTone}
              onChange={(v) => fx.set({ relanceTone: v })}
              options={[
                { value: 'cordial', label: 'Cordial' },
                { value: 'direct', label: 'Direct' },
                { value: 'ferme', label: 'Ferme' },
              ]}
            />
          </div>
          {sample ? (
            <div className="rounded-xl bg-sub p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-[11.5px] text-ink-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[9px] font-bold text-white">B</span>
                Aperçu · {step.label} pour {client?.name}
              </div>
              <p className="line-clamp-[9] whitespace-pre-line text-[12.5px] leading-relaxed text-ink">{reminderText(sample, client, s.company, level, fx.relanceTone, s.user.firstName || 'Karim')}</p>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-3">L’aperçu apparaîtra quand une facture sera en retard.</p>
          )}
        </div>
        <p className="text-[12px] text-ink-3">Bob n’envoie jamais de relance à un client qui a payé ou qui a un litige en cours. La mise en demeure reste à valider par vous.</p>
      </div>
    </Card>
  );
}
