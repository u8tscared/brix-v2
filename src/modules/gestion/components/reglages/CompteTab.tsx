import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Database, Download, RotateCcw } from 'lucide-react';
import { Avatar, Badge, Button, Card, Sheet, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { ROLE_LABEL } from '@/lib/catalog';

export default function CompteTab() {
  const navigate = useNavigate();
  const s = useBrix();
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const { clients, chantiers, devis, factures, employees, events, leads, expenses, bank, company } = useBrix.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), company, clients, chantiers, devis, factures, employees, events, leads, expenses, bank }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `brix-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Export téléchargé.');
  };

  return (
    <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1fr_1fr]">
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-3">
          <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}`} color="#1F389D" size={48} />
          <div className="min-w-0">
            <div className="text-[16px] font-semibold">{s.user.firstName} {s.user.lastName}</div>
            <div className="truncate text-[13px] text-ink-2">{s.user.email}</div>
            <div className="mt-1 flex gap-1.5"><Badge>{ROLE_LABEL[s.user.role]}</Badge>{s.isDemo && <Badge tone="violet">Compte de démonstration</Badge>}</div>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <Action icon={<Compass className="h-4 w-4" />} title="Revoir la visite guidée" text="Les 5 écrans clés de Brix en une minute." onClick={() => { s.setPrefs({ tourDone: false }); navigate('/app'); }} label="Lancer" />
          <Action icon={<Download className="h-4 w-4" />} title="Exporter mes données" text="Tous vos clients, devis et factures dans un fichier. Vos données vous appartiennent." onClick={exportData} label="Exporter" />
          <Action icon={<Database className="h-4 w-4" />} title="Charger la démo" text="Remplace vos données par celles de Benali Électricité pour essayer." onClick={() => { s.loadDemo(); toast('Démo chargée.'); navigate('/app'); }} label="Charger" />
        </div>
      </Card>

      <Card className="p-4 md:p-5">
        <div className="text-[15px] font-semibold">Sécurité</div>
        <div className="mt-3 space-y-2 text-[13px] text-ink-2">
          <p>Connexion sans mot de passe : un lien ou un code arrive sur votre téléphone.</p>
          <p>Données hébergées en France, sauvegardées chaque nuit. Factures conservées 10 ans comme l’exige la loi.</p>
        </div>
        <div className="mt-6 rounded-[12px] border border-[#fbd1d1] bg-bad-bg/50 p-4">
          <div className="text-[14px] font-semibold text-bad">Recommencer l’inscription</div>
          <p className="mt-0.5 text-[12.5px] text-ink-2">Efface toutes les données de ce navigateur et repart du questionnaire d’accueil.</p>
          <Button className="mt-3" variant="danger" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>Recommencer</Button>
        </div>
      </Card>

      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        side="center"
        width={420}
        title="Tout effacer et recommencer ?"
        subtitle="Clients, devis, factures et réglages de ce navigateur seront supprimés."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Garder mes données</Button>
            <Button variant="danger" onClick={() => { setConfirmReset(false); s.reset(); navigate('/bienvenue', { replace: true }); }}>Tout effacer</Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">Conseil : exportez vos données avant, au cas où.</p>
      </Sheet>
    </div>
  );
}

function Action({ icon, title, text, onClick, label }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-line p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[12px] text-ink-3">{text}</div>
      </div>
      <Button size="sm" onClick={onClick}>{label}</Button>
    </div>
  );
}
