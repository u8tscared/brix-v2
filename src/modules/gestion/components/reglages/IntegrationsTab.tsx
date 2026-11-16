import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge, Button, Card, toast } from '@/components/ui';
import { INTEGRATIONS, useIntegrations } from './integrationsStore';

export default function IntegrationsTab() {
  const { connected, connect, disconnect } = useIntegrations();
  const [busy, setBusy] = useState<string | null>(null);
  const cats = [...new Set(INTEGRATIONS.map((i) => i.category))];

  const onConnect = (k: string, name: string) => {
    setBusy(k);
    // Simulation de l'autorisation (OAuth) : en production, une fenêtre du service s'ouvre.
    setTimeout(() => {
      connect(k);
      setBusy(null);
      toast(`${name} est connecté (simulé en démo).`);
    }, 1100);
  };

  return (
    <div className="space-y-6">
      {cats.map((cat) => (
        <section key={cat}>
          <h3 className="mb-2 text-[14px] font-semibold">{cat}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((i) => {
              const on = connected[i.key];
              return (
                <Card key={i.key} className="flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-[13px] font-bold text-white" style={{ background: i.color }}>{i.initials}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{i.name}</span>
                        {on && <Badge tone="ok" dot>Connecté</Badge>}
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{i.what}</p>
                      {on && <p className="mt-1 truncate text-[12px] text-ink-3">{on}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    {on ? (
                      <Button size="sm" variant="ghost" onClick={() => { disconnect(i.key); toast(`${i.name} est déconnecté.`, 'info'); }}>Déconnecter</Button>
                    ) : (
                      <Button size="sm" variant="secondary" loading={busy === i.key} onClick={() => onConnect(i.key, i.name)}>Connecter</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      <Card className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Assistants IA (Claude, ChatGPT)</div>
          <p className="text-[12.5px] text-ink-2">Connectez-les à Brix avec Brix AI MCP.</p>
        </div>
        <Link to="/app/bob/mcp" className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-line2 px-3 text-[13px] font-medium hover:bg-sub">Configurer <ArrowRight className="h-4 w-4" /></Link>
      </Card>
    </div>
  );
}
