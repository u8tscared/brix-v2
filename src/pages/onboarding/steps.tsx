import { useState } from 'react';
import { Check, FileUp, Loader2, Search } from 'lucide-react';
import { Badge, Field, Icon, Input, Switch, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES, OFFERS, PRIORITIES, SIZES, TRADES, sizeAtLeast, type ModuleKey, type Plan, type PriorityKey } from '@/lib/catalog';
import type { CompanySize, TradeKey } from '@/lib/types';

export interface Draft {
  trade?: TradeKey;
  secondary: TradeKey[];
  size?: CompanySize;
  companyName: string;
  siret: string;
  address: string;
  city: string;
  priorities: PriorityKey[];
  enabled: ModuleKey[];
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  withDemo: boolean;
  importFrom?: string;
}

export const StepTitle = ({ kicker, title, text }: { kicker: string; title: string; text: string }) => (
  <div className="mb-7">
    <div className="mb-2 text-[12px] font-semibold uppercase tracking-[.08em] text-vi-700">{kicker}</div>
    <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] md:text-[34px]">{title}</h1>
    <p className="mt-2.5 max-w-[520px] text-[15px] leading-relaxed text-ink-2">{text}</p>
  </div>
);

const Choice = ({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'relative rounded-2xl border bg-white text-left transition-all duration-150 active:scale-[.98]',
      on ? 'border-vi-500 shadow-[0_0_0_3px_#ebe2fe]' : 'border-line hover:border-line2 hover:shadow-card',
      className,
    )}
  >
    {on && (
      <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-vi-700 text-white">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    )}
    {children}
  </button>
);

export function StepTrade({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepTitle kicker="Étape 1 sur 5" title="Quel est votre métier ?" text="Brix installe vos outils de calcul, vos ouvrages, vos prix et vos modèles de devis. Vous pourrez ajouter un second métier." />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TRADES.map((t) => {
          const main = d.trade === t.key;
          const sec = d.secondary.includes(t.key);
          return (
            <Choice
              key={t.key}
              on={main || sec}
              onClick={() => {
                if (!d.trade || main) set({ trade: main ? undefined : t.key, secondary: d.secondary.filter((x) => x !== t.key) });
                else set({ secondary: sec ? d.secondary.filter((x) => x !== t.key) : [...d.secondary, t.key] });
              }}
              className="flex min-h-[92px] flex-col justify-between p-3.5"
            >
              <span className={cn('grid h-9 w-9 place-items-center rounded-xl', main || sec ? 'bg-vi-700 text-white' : 'bg-vi-50 text-vi-700')}>
                <Icon name={t.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-3 text-[13.5px] font-semibold leading-tight">{t.name}</span>
              {sec && <span className="text-[11px] font-medium text-vi-700">Second métier</span>}
            </Choice>
          );
        })}
      </div>
      {d.trade && <p className="mt-4 text-[13px] text-ink-2">Touchez un autre métier pour l'ajouter en second métier.</p>}
    </>
  );
}

const fakeSiret = (q: string) => ({
  companyName: q.replace(/\d/g, '').trim() ? q.trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Entreprise trouvée',
  siret: /\d{9}/.test(q.replace(/\s/g, '')) ? q.replace(/\s/g, '').slice(0, 14) : '9' + String(Math.floor(Math.random() * 1e13)).padStart(13, '0'),
  address: '8 rue de la République',
  city: '69001 Lyon',
});

export function StepCompany({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const [q, setQ] = useState(d.companyName);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(!!d.siret);
  const search = () => {
    if (!q.trim()) return;
    setLoading(true);
    setTimeout(() => {
      set(fakeSiret(q));
      setFound(true);
      setLoading(false);
    }, 700);
  };
  return (
    <>
      <StepTitle kicker="Étape 2 sur 5" title="Votre entreprise" text="Tapez son nom ou son SIRET : on remplit le reste (adresse, TVA, mentions des devis). Puis dites-nous combien vous êtes, l'interface s'adapte." />
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Nom de l'entreprise ou SIRET" icon={<Search />} className="flex-1" />
        <button onClick={search} className="h-11 shrink-0 rounded-[10px] bg-ink px-4 text-sm font-medium text-white">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Chercher'}</button>
      </div>
      {found && (
        <div className="mt-3 flex animate-fade-up items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ok-bg text-ok"><Check className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <input value={d.companyName} onChange={(e) => set({ companyName: e.target.value })} className="w-full bg-transparent text-[14px] font-semibold outline-none" />
            <div className="text-[12.5px] text-ink-2">SIRET {d.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')} · {d.address}, {d.city}</div>
          </div>
          <Badge tone="ok">INSEE</Badge>
        </div>
      )}
      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Combien êtes-vous ?</h3>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {SIZES.map((s) => (
          <Choice key={s.key} on={d.size === s.key} onClick={() => set({ size: s.key })} className="p-4">
            <div className="flex items-baseline gap-2 pr-6">
              <span className="text-[14px] font-semibold">{s.name}</span>
              <span className="text-[12px] text-ink-3">{s.range}</span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{s.hint}</p>
          </Choice>
        ))}
      </div>
    </>
  );
}

export function StepPriorities({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepTitle kicker="Étape 3 sur 5" title="Qu'est-ce qui compte le plus pour vous ?" text="Choisissez jusqu'à 3 priorités. Brix mettra ces outils en avant et Bob s'en occupera en premier." />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {PRIORITIES.filter((p) => p.key !== 'equipe' || (d.size && d.size !== 'solo')).map((p) => {
          const on = d.priorities.includes(p.key);
          return (
            <Choice
              key={p.key}
              on={on}
              onClick={() => set({ priorities: on ? d.priorities.filter((x) => x !== p.key) : d.priorities.length >= 3 ? [...d.priorities.slice(1), p.key] : [...d.priorities, p.key] })}
              className="flex items-center gap-3 p-4"
            >
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', on ? 'bg-vi-700 text-white' : 'bg-vi-50 text-vi-700')}>
                <Icon name={p.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="pr-6 text-[14px] font-semibold">{p.label}</span>
            </Choice>
          );
        })}
      </div>
    </>
  );
}

export function StepModules({ d, set, plan }: { d: Draft; set: (p: Partial<Draft>) => void; plan: Plan }) {
  const size = d.size ?? 'solo';
  const offer = OFFERS.find((o) => o.key === plan)!;
  // Seul : les outils pensés pour une équipe sont rangés à part, pour garder la liste courte.
  const [showTeam, setShowTeam] = useState(false);
  const hidden = MODULES.filter((m) => !sizeAtLeast(size, m.minSize) && !d.enabled.includes(m.key));
  return (
    <>
      <StepTitle kicker="Étape 4 sur 5" title="Votre Brix sur mesure" text="Voici ce qu'on vous propose, cochez ou décochez. Rien n'est définitif : vous ajoutez un outil en un clic quand vous en avez besoin." />
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-vi-100 bg-vi-50/60 p-3.5">
        <span className="font-display text-[26px] font-semibold text-vi-700">{d.enabled.length}</span>
        <p className="text-[13px] leading-snug text-ink-2">
          outils activés. Offre conseillée : <b className="text-ink">{offer.name}</b>
          {offer.price ? ` (${String(offer.price).replace('.', ',')} € ${offer.unit})` : ' (gratuit)'}, essai complet de 14 jours sans carte.
        </p>
      </div>
      <div className="space-y-5">
        {DEPARTMENTS.map((dep) => {
          const mods = MODULES.filter((m) => m.dept === dep.key && (showTeam || !hidden.includes(m)));
          if (!mods.length) return null;
          return (
            <div key={dep.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-[14px] font-semibold">{dep.name}</h3>
                <span className="text-[12px] text-ink-3">{dep.tagline}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                {mods.map((m) => {
                  const on = d.enabled.includes(m.key);
                  const fits = sizeAtLeast(size, m.minSize);
                  return (
                    <label key={m.key} className={cn('flex min-h-[58px] cursor-pointer items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0', !fits && 'opacity-60')}>
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', on ? 'bg-vi-50 text-vi-700' : 'bg-sub text-ink-3')}>
                        <Icon name={m.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                          {m.name}
                          {m.isNew && <Badge tone="violet" className="h-[18px] px-1.5 text-[10px]">Nouveau</Badge>}
                          {m.core && <span className="text-[11px] font-normal text-ink-3">inclus</span>}
                        </span>
                        <span className="block text-[12.5px] leading-snug text-ink-2">{fits ? m.short : 'Utile à partir de 2 personnes.'}</span>
                      </span>
                      <Switch checked={on} disabled={m.core} label={m.name} onChange={(v) => set({ enabled: v ? [...d.enabled, m.key] : d.enabled.filter((x) => x !== m.key) })} />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {hidden.length > 0 && (
          <button type="button" onClick={() => setShowTeam(!showTeam)} className="h-11 w-full rounded-xl border border-dashed border-line2 text-[13px] font-medium text-ink-2">
            {showTeam ? 'Masquer les outils pour les équipes' : `Voir aussi ${hidden.length} outils pour les équipes`}
          </button>
        )}
      </div>
    </>
  );
}

const IMPORTS = ['Obat', 'Tolteck', 'Batappli', 'Excel ou CSV', 'Autre logiciel'];

export function StepAccount({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <StepTitle kicker="Étape 5 sur 5" title="Dernière étape, et c'est prêt" text="Créez votre accès. Si vous venez d'un autre logiciel, déposez votre export : Bob récupère vos clients, vos prix et vos devis." />
      <div className="grid grid-cols-2 gap-2.5">
        <button className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line2 bg-white text-[13.5px] font-medium" onClick={() => set({ email: d.email || 'vous@gmail.com' })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" /><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14Z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4Z" /></svg>
          Google
        </button>
        <button className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-ink text-[13.5px] font-medium text-white" onClick={() => set({ email: d.email || 'vous@icloud.com' })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.4-.6 3.1-1.5Z" /></svg>
          Apple
        </button>
      </div>
      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3"><span className="h-px flex-1 bg-line2" />ou avec votre e-mail<span className="h-px flex-1 bg-line2" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom"><Input value={d.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="given-name" /></Field>
        <Field label="Nom"><Input value={d.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="family-name" /></Field>
        <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" inputMode="email" /></Field>
        <Field label="Mot de passe" hint="8 caractères minimum" className="sm:col-span-2"><Input type="password" value={d.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" /></Field>
      </div>

      <h3 className="mb-2.5 mt-8 text-[14px] font-semibold">Vous venez d'un autre logiciel ?</h3>
      <div className="flex flex-wrap gap-2">
        {IMPORTS.map((x) => (
          <button key={x} onClick={() => set({ importFrom: d.importFrom === x ? undefined : x })} className={cn('h-9 rounded-full border px-3.5 text-[13px] font-medium transition', d.importFrom === x ? 'border-vi-500 bg-vi-50 text-vi-700' : 'border-line2 bg-white text-ink-2')}>
            {x}
          </button>
        ))}
      </div>
      {d.importFrom && (
        <label className="mt-3 flex animate-fade-up cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-vi-300 bg-vi-50/50 p-4">
          <FileUp className="h-5 w-5 text-vi-700" />
          <span className="flex-1 text-[13px] text-ink-2"><b className="text-ink">Déposez votre export {d.importFrom}</b><br />Clients, bibliothèque de prix et devis. Bob s'occupe du reste, même si les colonnes sont différentes.</span>
          <input type="file" className="hidden" />
        </label>
      )}

      <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <span className="flex-1">
          <b className="block text-[13.5px]">Commencer avec des exemples</b>
          <span className="text-[12.5px] text-ink-2">Des clients, devis et chantiers fictifs pour tout essayer sans risque. Supprimables en un clic.</span>
        </span>
        <Switch checked={d.withDemo} onChange={(v) => set({ withDemo: v })} label="Exemples" />
      </label>
    </>
  );
}
