import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Card, IconTile, cn, toast } from '@/components/ui';
import { DrawCheck, LiveDot } from '@/components/motion';
import { INTEGRATIONS, useIntegrations } from './integrationsStore';

export default function IntegrationsTab() {
  const { connected, connect, disconnect } = useIntegrations();
  const [busy, setBusy] = useState<string | null>(null);
  const [just, setJust] = useState<string | null>(null);
  const cats = [...new Set(INTEGRATIONS.map((i) => i.category))];
  const count = Object.keys(connected).length;

  const onConnect = (k: string, name: string) => {
    setBusy(k);
    // Simulation de l'autorisation (OAuth) : en production, une fenêtre du service s'ouvre.
    setTimeout(() => {
      connect(k);
      setBusy(null);
      setJust(k);
      setTimeout(() => setJust((j) => (j === k ? null : j)), 2200);
      toast(`${name} est connecté (simulé en démo).`);
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-[13px] text-ink-2">
        <LiveDot /> {count} service{count > 1 ? 's' : ''} relié{count > 1 ? 's' : ''} à Brix. Les données circulent toutes seules, chiffrées.
      </p>
      {cats.map((cat) => (
        <section key={cat}>
          <h3 className="mb-2.5 px-1 text-[14.5px] font-semibold tracking-[-0.02em]">{cat}</h3>
          <Card className="overflow-hidden">
            {INTEGRATIONS.filter((i) => i.category === cat).map((i) => {
              const on = connected[i.key];
              return (
                <div key={i.key} className="flex items-center gap-3.5 border-b border-halo-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-halo-hover md:px-5">
                  <span className={cn('relative grid h-10 w-10 shrink-0 place-items-center rounded-tile text-[13px] font-bold text-white transition-[filter,opacity] duration-300', !on && 'opacity-90 saturate-[.7]')} style={{ background: i.color, boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 4px 10px -5px ${i.color}` }}>
                    {i.initials}
                    {on && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pop rounded-full bg-[#10b981] ring-2 ring-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold tracking-[-0.01em]">{i.name}</div>
                    <p className="text-[12.5px] leading-snug text-ink-2">{i.what}</p>
                    {on && <p className="mt-0.5 truncate text-[12px] font-medium text-ok">{just === i.key ? <span className="inline-flex items-center gap-1"><DrawCheck className="h-3.5 w-3.5" />Connecté à l’instant</span> : on}</p>}
                  </div>
                  {on ? (
                    <Button size="sm" variant="ghost" onClick={() => { disconnect(i.key); toast(`${i.name} est déconnecté.`, 'info'); }}>Déconnecter</Button>
                  ) : (
                    <Button size="sm" variant="secondary" loading={busy === i.key} onClick={() => onConnect(i.key, i.name)}>{busy === i.key ? 'Connexion' : 'Connecter'}</Button>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      ))}
      <Link to="/app/bob/mcp" className="lift group flex items-center gap-3.5 rounded-card bg-white p-4 shadow-halo md:px-5">
        <IconTile name="Plug" dept="bob" size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Assistants IA (Claude, ChatGPT)</div>
          <p className="text-[12.5px] text-ink-2">Interrogez Brix depuis votre assistant et préparez des brouillons avec Brix AI MCP.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    </div>
  );
}
