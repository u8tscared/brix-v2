// Recherche dans l'annuaire de la facturation électronique : ce client peut-il recevoir mes factures ?

import { useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { Button, Card, CardHeader, IconTile, Input, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { sirenOf } from '../../lib/model';
import { lookupDirectory, type DirectoryResult } from '../../service';

const fmtSiren = (s: string) => s.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

export function Annuaire() {
  const clients = useBrix((s) => s.clients.filter((c) => c.kind === 'pro'));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<DirectoryResult | null | undefined>(undefined);

  const search = async (value = q) => {
    setQ(value);
    if (value.replace(/\D/g, '').length !== 9) {
      setRes(null);
      return;
    }
    setBusy(true);
    setRes(await lookupDirectory(value));
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader title="Annuaire" meta="Votre client peut-il recevoir des factures électroniques ?" />
      <div className="space-y-4 p-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input icon={<Search />} inputMode="numeric" placeholder="SIREN (9 chiffres)" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
          <Button variant="primary" type="submit" loading={busy} className="h-11">
            Vérifier
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {clients.map((c) => (
            <button key={c.id} onClick={() => search(sirenOf(c.siret))} className="h-9 rounded-full bg-white px-3.5 text-[12.5px] font-medium text-ink-2 shadow-[0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px hover:text-ink">
              {c.name}
            </button>
          ))}
        </div>

        {res === null && <p className="text-[13px] text-ink-2">Saisissez un SIREN de 9 chiffres (il figure sur le Kbis ou les factures du client).</p>}
        {res && (
          <div className={cn('animate-fade-up rounded-card-sm p-4', res.reachable ? 'bg-pale-g' : 'bg-pale-a')}>
            <div className="flex items-start gap-3">
              {res.reachable ? <IconTile icon={<CheckCircle2 />} tone="green" solid size="sm" /> : <IconTile icon={<XCircle />} tone="amber" solid size="sm" />}
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{res.name}</div>
                <div className="text-[12.5px] text-ink-2">
                  SIREN {fmtSiren(res.siren)} · {res.city}
                </div>
                <div className="mt-2 text-[13px]">
                  {res.reachable ? (
                    <>
                      Joignable. Ses factures arrivent sur <b className="font-semibold">{res.platform}</b>, adresse <span className="font-mono text-[12.5px]">{res.address}</span>. Brix enverra vos factures au bon endroit.
                    </>
                  ) : (
                    <>Pas encore de plateforme choisie. Envoyez-lui la facture en PDF pour l’instant : Brix la déposera automatiquement dès qu’il sera inscrit.</>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <p className="text-[11.5px] text-ink-3">En démo, l’annuaire est simulé. En production, Brix interroge l’annuaire officiel via votre plateforme agréée.</p>
      </div>
    </Card>
  );
}
