// Tout ce qu'il faut pour afficher et vérifier une facture : pages A4, données e-facture, contrôles.
// Partagé par la fiche facture et l'aperçu depuis la liste.

import { useMemo } from 'react';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { checkFacture } from '../lib/checks';
import type { FactureExtra } from '../lib/model';
import { fromFacture, validateEInvoice } from '../lib/einvoice-input';
import { useFactures } from '../store';
import { invoiceDoc } from './invoiceDoc';

const NO_EXTRA: FactureExtra = {};

export function useInvoiceModel(f: Facture | undefined) {
  const company = useBrix((s) => s.company);
  const clients = useBrix((s) => s.clients);
  const allDevis = useBrix((s) => s.devis);
  const chantiers = useBrix((s) => s.chantiers);
  const factures = useBrix((s) => s.factures);
  const extras = useFactures((s) => s.extras);
  const extra = (f && extras[f.id]) || NO_EXTRA;
  const client = clients.find((c) => c.id === f?.clientId);
  const devis = allDevis.find((d) => d.id === f?.devisId);
  const chantier = chantiers.find((c) => c.id === f?.chantierId);
  const original = extra.creditOf ? factures.find((x) => x.id === extra.creditOf) : undefined;
  const pro = client?.kind === 'pro';

  const input = useMemo(() => (f ? fromFacture(f, company, client, extra, { devisNumber: devis?.number, original }) : null), [f, company, client, extra, devis, original]);
  const missing = useMemo(() => {
    if (!input || !f) return [];
    const m = validateEInvoice(input, { b2b: pro });
    if (!f.clientId) m.unshift('Client');
    return [...new Set(m)];
  }, [input, pro, f]);
  const spec = useMemo(() => (f ? invoiceDoc({ f, company, client, extra, devis, chantier, original }) : null), [f, company, client, extra, devis, chantier, original]);
  const checks = useMemo(() => (f ? checkFacture(f, client, company, extra, missing) : []), [f, client, company, extra, missing]);

  return { client, devis, chantier, original, extra, input, missing, spec, checks, pro };
}
