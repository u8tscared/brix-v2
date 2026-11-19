// Brix AI › Connecter une IA (route app/bob/mcp) : relier Claude, ChatGPT, Le Chat… aux données de Brix.
import { Plug } from 'lucide-react';
import { Badge, Button, Card, IconTile, PageHeader, cn, toast } from '@/components/ui';
import { planIncludes } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { BobNav } from '@/modules/bob/components/BobNav';
import { useBobLocal } from '@/modules/bob/store';
import ConnecterIA from './ConnecterIA';

export default function BrixAiPage() {
  const plan = useBrix((s) => s.plan);
  const { mcp, setMcp } = useBobLocal();
  const inclus = planIncludes(plan, 'equipe') || mcp.mcpAddon;
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile icon={<Plug />} tone="violet" size="lg" />}
        kicker="Brix AI"
        title="Connecter une IA"
        subtitle="Posez vos questions à Claude, ChatGPT ou Le Chat : votre assistant lit vos chiffres dans Brix et peut préparer des brouillons. Vous décidez de ce qu’il peut faire."
        actions={<Badge tone="neutral">Compatible MCP</Badge>}
      />
      <BobNav />
      {!inclus && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Option Brix AI · 9 € HT par mois</div>
            <div className="text-[12.5px] text-ink-2">Incluse dans l’offre Équipe. Sur l’offre {plan === 'pro' ? 'Pro' : 'Start'}, ajoutez-la quand vous voulez, sans engagement.</div>
          </div>
          <Button variant="primary" onClick={() => { setMcp({ mcpAddon: true }); toast('Option activée (simulé en démo).'); }}>Ajouter l’option</Button>
        </Card>
      )}
      <div className={cn(!inclus && 'pointer-events-none opacity-50')}>
        <ConnecterIA embedded />
      </div>
    </div>
  );
}
