import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { Badge, Button, Card, CardHeader, IconTile, PageHeader, Segmented, cn, toast } from '@/components/ui';
import type { DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { planIncludes } from '@/lib/catalog';
import ConnecterIA from '@/modules/fournisseurs/mcp/ConnecterIA';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { MCP_TOOLS, useBobLocal, type McpPerm } from './store';
import { BobNav } from './components/BobNav';

/*
 * Brix AI MCP. La création des accès (jetons) vient de l'espace fournisseurs
 * (ConnecterIA, branché sur worker/src/modules/mcp). Ici : le tableau de bord,
 * c'est-à-dire les outils exposés, leurs permissions et le journal des appels.
 * Les outils qui modifient restent verrouillés tant que le serveur est en lecture seule.
 */

const LOG = [
  { at: '08:12', client: 'Claude', tool: 'invoice_status', detail: 'Factures en retard', ok: true },
  { at: '08:12', client: 'Claude', tool: 'send_reminder', detail: 'F-2026-199 · Michel Roux', ok: false, why: 'Lecture seule' },
  { at: 'hier 19:40', client: 'ChatGPT', tool: 'list_devis', detail: 'Devis envoyés ce mois', ok: true },
  { at: 'hier 19:41', client: 'ChatGPT', tool: 'get_client', detail: 'Thomas Garnier', ok: true },
  { at: 'hier 07:05', client: 'Claude', tool: 'planning', detail: 'Semaine en cours', ok: true },
];

type Tab = 'connecter' | 'outils';

const TOOL_ICON: Record<string, [string, DepartmentKey]> = {
  list_clients: ['Contact', 'vendre'], get_client: ['Contact', 'vendre'], create_client: ['Contact', 'vendre'],
  list_devis: ['FileText', 'vendre'], create_devis: ['FileText', 'vendre'], invoice_status: ['Receipt', 'facturer'],
  send_reminder: ['BellRing', 'facturer'], planning: ['CalendarRange', 'equipe'], add_event: ['CalendarRange', 'equipe'],
  chantier_status: ['HardHat', 'chantiers'], cash: ['Landmark', 'gestion'],
};

export default function Mcp() {
  const plan = useBrix((s) => s.plan);
  const { mcp, setMcp, setPerm } = useBobLocal();
  const nbAcces = useAchats((s) => s.jetons.length);
  const [tab, setTab] = useState<Tab>('connecter');
  const included = planIncludes(plan, 'equipe') || mcp.mcpAddon;
  const active = MCP_TOOLS.filter((t) => !t.write && (mcp.perms[t.key] ?? 'off') !== 'off').length;

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Plug" tone="violet" size="lg" />} kicker="Bob" title="Brix AI MCP" subtitle="Interrogez Brix depuis Claude, ChatGPT ou tout assistant compatible MCP. Vous gardez la main sur ce qu’il peut lire." actions={<Badge tone={nbAcces ? 'ok' : 'neutral'} dot>{nbAcces ? `${nbAcces} accès actif${nbAcces > 1 ? 's' : ''}` : 'Pas encore connecté'}</Badge>} />
      <BobNav />

      {!included && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Option Brix AI MCP · 9 € HT par mois</div>
            <div className="text-[12.5px] text-ink-2">Incluse dans l’offre Équipe. Sur l’offre {plan === 'pro' ? 'Pro' : 'Start'}, ajoutez-la quand vous voulez, sans engagement.</div>
          </div>
          <Button variant="primary" onClick={() => { setMcp({ mcpAddon: true }); toast('Option activée (simulé en démo).'); }}>Ajouter l’option</Button>
        </Card>
      )}

      <div className={cn('space-y-6', !included && 'pointer-events-none opacity-50')}>
        <Segmented value={tab} onChange={(v: Tab) => setTab(v)} options={[{ value: 'connecter', label: 'Connecter une IA' }, { value: 'outils', label: 'Outils et journal' }]} />

        {tab === 'connecter' ? <ConnecterIA embedded /> : (
          <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader title="Ce que l’assistant peut faire" meta={`${active} outils actifs`} />
              <div className="stagger-fast">
              {MCP_TOOLS.map((t) => (
                <div key={t.key} className={cn('flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center', t.write && 'opacity-70')}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                  <IconTile name={TOOL_ICON[t.key]?.[0] ?? 'Plug'} dept={TOOL_ICON[t.key]?.[1] ?? 'bob'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13.5px] font-medium">{t.name} {t.write && <Badge tone="neutral" icon={<Lock />}>Bientôt</Badge>}</div>
                    <div className="text-[12px] text-ink-3">{t.desc} · <code className="font-mono">{t.key}</code></div>
                  </div>
                  </div>
                  {t.write ? (
                    <span className="text-[12px] text-ink-3 sm:text-right">Modifie vos données : verrouillé, accès en lecture seule</span>
                  ) : (
                    <Segmented
                      size="sm"
                      value={mcp.perms[t.key] ?? 'off'}
                      onChange={(v: McpPerm) => setPerm(t.key, v)}
                      options={[{ value: 'off', label: 'Coupé' }, { value: 'read', label: 'Lecture' }]}
                    />
                  )}
                </div>
              ))}
              </div>
            </Card>

            <Card className="self-start">
              <CardHeader title="Journal des appels" meta="7 derniers jours" />
              <div className="stagger-fast">
              {LOG.map((l, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                  <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', l.ok ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad')}>
                    {l.ok ? <Check className="h-3.5 w-3.5" /> : <span className="text-[13px] font-bold leading-none">!</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]"><span className="font-medium">{l.client}</span> · <code className="font-mono text-[12px]">{l.tool}</code></div>
                    <div className="truncate text-[12px] text-ink-3">{l.detail}{l.why ? ` · refusé : ${l.why.toLowerCase()}` : ''}</div>
                  </div>
                  <span className="num shrink-0 text-[11.5px] text-ink-3">{l.at.replace(':', ' h ')}</span>
                </div>
              ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
