// Vue d'ensemble de la facture électronique : calendrier de la réforme et conformité de l'entreprise.

import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Progress, cn, toast } from '@/components/ui';
import { daysBetween, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { sirenOf } from '../../lib/model';
import { PLATFORMS } from '../../service';
import { useFactures } from '../../store';

const RECEPTION = '2026-09-01';
const EMISSION = '2027-09-01';
const START = '2026-01-01';
const END = '2027-12-31';

const pos = (iso: string) => Math.max(0, Math.min(100, (daysBetween(START, iso) / daysBetween(START, END)) * 100));

export function Countdown() {
  const today = todayISO();
  const toReception = daysBetween(today, RECEPTION);
  const toEmission = daysBetween(today, EMISSION);
  const receptionDone = toReception <= 0;
  const emissionDone = toEmission <= 0;
  const months = Math.floor(Math.max(0, toEmission) / 30.4);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_1fr] md:p-6">
        <div>
          <Badge tone="ok" icon={<ShieldCheck />}>Vous êtes en règle</Badge>
          <h2 className="mt-3 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] md:text-[26px]">Vous n’avez rien à faire, Brix s’en occupe.</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Vos factures partent au bon format, arrivent chez vos clients pros par une plateforme agréée par l’État, et celles de vos fournisseurs arrivent ici toutes seules.
          </p>
        </div>
        <div className="rounded-xl bg-sub p-4">
          {emissionDone ? (
            <div className="text-[13.5px]">Toutes les obligations sont en vigueur. Brix les applique déjà.</div>
          ) : (
            <>
              <div className="text-[12.5px] font-medium text-ink-2">Envoi obligatoire de vos factures aux pros</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num font-display text-[44px] font-semibold leading-none tracking-[-0.03em] dawn-text">{toEmission}</span>
                <span className="text-[14px] text-ink-2">jours</span>
              </div>
              <div className="mt-1 text-[12.5px] text-ink-3">le 1er septembre 2027, dans {months} mois · vous êtes déjà prêt</div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-line px-5 pb-5 pt-6 md:px-6">
        <div className="relative mx-2 h-1.5 rounded-full bg-line">
          <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${pos(today)}%` }} />
          <Mark at={pos(RECEPTION)} done={receptionDone} />
          <Mark at={pos(EMISSION)} done={emissionDone} />
          <div className="absolute -top-[22px] -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10.5px] font-medium text-white" style={{ left: `${pos(today)}%` }}>
            Aujourd’hui
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Milestone done={receptionDone} date="1er septembre 2026" title="Réception obligatoire pour toutes les entreprises" text={receptionDone ? 'En place : vos factures fournisseurs arrivent dans Brix.' : `Dans ${toReception} jours.`} />
          <Milestone done={emissionDone} date="1er septembre 2027" title="Émission obligatoire pour les TPE et PME, et e-reporting" text={emissionDone ? 'En place.' : 'Brix envoie déjà vos factures au bon format : rien ne changera pour vous.'} />
        </div>
      </div>
    </Card>
  );
}

function Mark({ at, done }: { at: number; done: boolean }) {
  return <span className={cn('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white', done ? 'bg-ok' : 'bg-line2')} style={{ left: `${at}%` }} />;
}

function Milestone({ done, date, title, text }: { done: boolean; date: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line p-3.5">
      {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />}
      <div>
        <div className="text-[12px] text-ink-3">{date}</div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-2">{text}</div>
      </div>
    </div>
  );
}

export function Checklist() {
  const navigate = useNavigate();
  const s = useBrix();
  const fx = useFactures();
  const prosWithoutSiren = s.clients.filter((c) => c.kind === 'pro' && sirenOf(c.siret).length !== 9);
  const items = [
    { ok: sirenOf(s.company.siret).length === 9, title: 'SIREN de l’entreprise', text: s.company.siret || 'À renseigner', cta: 'Compléter', to: '/app/reglages' },
    { ok: !!s.company.vatNumber, title: 'Numéro de TVA intracommunautaire', text: s.company.vatNumber || 'À renseigner', cta: 'Compléter', to: '/app/reglages' },
    { ok: !!fx.electronicAddress, title: 'Adresse de facturation électronique', text: fx.electronicAddress ? `${fx.electronicAddress} · inscrite à l’annuaire` : 'À créer', cta: 'Créer', run: () => { fx.set({ electronicAddress: sirenOf(s.company.siret) }); toast('Adresse créée et inscrite à l’annuaire'); } },
    { ok: !!fx.platform, title: 'Plateforme agréée', text: fx.platform ? `${PLATFORMS[fx.platform].name} · ${PLATFORMS[fx.platform].note}` : 'À choisir', cta: 'Choisir SuperPDP', run: () => fx.set({ platform: 'superpdp' }) },
    { ok: true, title: 'Nouvelles mentions sur vos factures', text: 'SIREN client, adresse de livraison, catégorie d’opération, option TVA : ajoutées automatiquement.' },
    { ok: prosWithoutSiren.length === 0, title: 'SIREN de vos clients professionnels', text: prosWithoutSiren.length ? `${prosWithoutSiren.length} client${prosWithoutSiren.length > 1 ? 's' : ''} sans SIREN : ${prosWithoutSiren.map((c) => c.name).join(', ')}` : `${s.clients.filter((c) => c.kind === 'pro').length} clients pros, tous identifiés`, cta: 'Compléter', to: '/app/clients' },
    { ok: !!s.setupTasks.banque, title: 'Banque connectée', text: s.setupTasks.banque ? 'Les encaissements sont déclarés tout seuls.' : 'Pour déclarer vos encaissements sans saisie (facultatif).', cta: 'Connecter', to: '/app/tresorerie', optional: true },
  ];
  const done = items.filter((i) => i.ok).length;
  return (
    <Card>
      <CardHeader title="Votre conformité" meta={`${done} sur ${items.length}`} action={<span className="num text-[13px] font-semibold">{Math.round((done / items.length) * 100)} %</span>} />
      <div className="px-4 pt-3">
        <Progress value={(done / items.length) * 100} tone={done === items.length ? 'ok' : 'ink'} />
      </div>
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.title} className="flex min-h-[60px] items-center gap-3 px-4 py-3">
            {i.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" /> : <Circle className={cn('h-5 w-5 shrink-0', i.optional ? 'text-ink-3' : 'text-warn')} />}
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">
                {i.title}
                {i.optional && !i.ok && <span className="ml-1.5 text-[11.5px] font-normal text-ink-3">facultatif</span>}
              </div>
              <div className="text-[12.5px] text-ink-2">{i.text}</div>
            </div>
            {!i.ok && i.cta && (
              <Button size="sm" variant="secondary" onClick={() => (i.run ? i.run() : i.to && navigate(i.to))}>
                {i.cta}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PlatformCard() {
  const fx = useFactures();
  return (
    <Card>
      <CardHeader title="Plateforme agréée" meta="immatriculée par la DGFiP" />
      <div className="space-y-2 p-4">
        {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map((k) => (
          <button key={k} onClick={() => { fx.set({ platform: k }); toast(`${PLATFORMS[k].name} sélectionnée`); }} className={cn('flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition', fx.platform === k ? 'border-ink bg-white ring-1 ring-ink' : 'border-line hover:bg-sub')}>
            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', fx.platform === k ? 'border-ink' : 'border-line2')}>{fx.platform === k && <i className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
            <div>
              <div className="flex items-center gap-2 text-[14px] font-semibold">
                {PLATFORMS[k].name}
                {k === 'superpdp' && <Badge tone="ok">Recommandée</Badge>}
              </div>
              <div className="text-[12.5px] text-ink-2">{PLATFORMS[k].note}</div>
            </div>
          </button>
        ))}
        <p className="pt-1 text-[12px] text-ink-3">Vous pouvez changer à tout moment : votre adresse de facturation électronique vous suit.</p>
      </div>
    </Card>
  );
}
