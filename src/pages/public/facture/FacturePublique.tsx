// Page publique d'une facture (/f/:jeton) : la lire, la télécharger, la régler en ligne ou par virement.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Copy, FileText, Landmark, Link2Off, ReceiptText } from 'lucide-react';
import { cn, toast, Toaster } from '@/components/ui';
import { dateFull, money, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useBoite } from '@/emails/boite';
import { InvoicePaper } from '@/modules/factures/components/InvoicePaper';
import { useFactures } from '@/modules/factures/store';
import { useNotifs } from '@/modules/notifications/store';
import { civilite, useFacturePublique } from '@/parcours/documents';
import { lienPublic } from '@/parcours/liens';
import { assurerDonnees, payerFacture } from '@/parcours/signature';
import { useSyncOnglets } from '@/parcours/sync';
import '@/parcours/parcours.css';
import { EnTete } from '../ui/EnTete';
import { useImpression, ZoneImpression } from '../ui/Impression';
import { Paiement } from '../ui/Paiement';
import { PiedDePage } from '../ui/PiedDePage';
import { BoutonAube, MontantAnime } from '../ui/primitives';
import { ApercuPapier, PleinEcran } from '../ui/Visionneuse';

assurerDonnees();

const TYPE: Record<string, string> = { facture: 'Facture', acompte: 'Facture d’acompte', situation: 'Situation de travaux', solde: 'Facture de solde', avoir: 'Avoir' };

export default function FacturePublique() {
  const { token = '' } = useParams();
  useSyncOnglets([useBrix, useNotifs, useBoite]);
  const data = useFacturePublique(token);
  const extras = useFactures((s) => s.extras);
  const factures = useBrix((s) => s.factures);
  const [plein, setPlein] = useState(false);
  const [payer, setPayer] = useState(false);
  const { imprimer } = useImpression();

  useEffect(() => {
    if (!data || data.facture.status === 'payee') return;
    const k = `brix-vu-${data.facture.id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
    useNotifs.getState().ajouter({ type: 'facture_ouverte', titre: `${data.client?.name ?? 'Votre client'} consulte la facture`, texte: `${data.facture.number} · ${money(data.reste)} à régler`, qui: data.client?.name, vers: `/app/factures/${data.facture.id}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.facture.id]);

  if (!data) return <Introuvable />;
  const { facture: f, company, client, devis, chantier } = data;
  const payee = f.status === 'payee' || data.reste <= 0;
  const retard = !payee && f.dueDate < new Date().toISOString().slice(0, 10);
  const papier = (
    <div className="min-h-[1123px] w-[794px] bg-white px-[52px] py-[48px]">
      <InvoicePaper f={f} company={company} client={client} extra={extras[f.id] ?? {}} devis={devis} chantier={chantier} />
    </div>
  );
  const devisTtc = devis ? totals(devis.lines).ttc : 0;
  const dejaRegle = devis ? factures.filter((x) => x.devisId === devis.id && x.id !== f.id && x.kind !== 'avoir').reduce((s, x) => s + x.paidAmount, 0) : 0;

  return (
    <div className="bx-root relative min-h-dvh overflow-x-clip bg-page">
      <div className="bx-sky bx-sky-top" />
      <EnTete company={company} sous={`${TYPE[f.kind] ?? 'Facture'} ${f.number}`} onPdf={imprimer} />
      <main className="relative mx-auto max-w-[1160px] px-4 sm:px-6">
        <section className="bx-stagger max-w-[680px] pb-6 pt-8 sm:pt-12">
          <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium shadow-[0_0_0_1px_#ebe9f2]', payee ? 'bg-[#ecfdf3] text-[#15803d]' : retard ? 'bg-[#fff7ed] text-[#c2410c]' : 'bg-white/80 text-ink-2')}>
            <span className={cn('h-2 w-2 rounded-full', payee ? 'bg-[#16a34a]' : retard ? 'bg-[#ea580c]' : 'bx-live bg-[#16a34a]')} />
            {payee ? 'Réglée, merci' : retard ? `Échéance dépassée depuis le ${dateFull(f.dueDate)}` : `À régler avant le ${dateFull(f.dueDate)}`}
          </div>
          <h1 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[48px]">
            {payee ? `Merci ${civilite(client)}.` : `Bonjour ${civilite(client)},`}
            <br />
            <span className="text-ink-2">{payee ? 'Cette facture est réglée.' : `voici votre ${(TYPE[f.kind] ?? 'facture').toLowerCase()}.`}</span>
          </h1>
          <p className="mt-3 text-[15px] text-ink-2">{f.title}</p>
        </section>

        <div className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <aside className="lg:order-2">
            <div className="space-y-4 lg:sticky lg:top-[92px]">
              <div className="rounded-[26px] bg-white p-5 shadow-[0_0_0_1px_#ebe9f2,0_24px_60px_-34px_rgba(45,20,90,.35)] sm:p-6">
                <div className="text-[12.5px] font-medium text-ink-3">{payee ? 'Montant réglé' : 'Reste à régler'}</div>
                <div className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.04em]">
                  <MontantAnime valeur={payee ? data.ttc : data.reste} format={(n) => money(n)} />
                </div>
                <div className="mt-2 text-[12.5px] text-ink-3">
                  {f.number} · émise le {dateFull(f.issueDate)}
                </div>
                {devis && (
                  <div className="mt-5 space-y-2 border-t border-line pt-5 text-[13.5px]">
                    <Ligne l={`Devis ${devis.number}`} v={money(devisTtc)} />
                    <Ligne l="Déjà réglé" v={money(dejaRegle)} />
                    <Ligne l="Cette facture" v={money(data.ttc)} fort />
                    <div className="pt-1">
                      <div className="h-2 overflow-hidden rounded-full bg-page">
                        <div className="h-full rounded-full bg-[#16a34a] transition-[width] duration-1000" style={{ width: `${Math.min(100, ((dejaRegle + (payee ? data.ttc : 0)) / (devisTtc || 1)) * 100)}%` }} />
                      </div>
                      <div className="mt-1.5 text-[11.5px] text-ink-3">{Math.round(((dejaRegle + (payee ? data.ttc : 0)) / (devisTtc || 1)) * 100)} % du chantier réglé</div>
                    </div>
                  </div>
                )}
                {!payee && (
                  <>
                    <BoutonAube className="mt-6 w-full" onClick={() => setPayer(true)}>
                      Payer {money(data.reste)}
                    </BoutonAube>
                    <div className="mt-2 text-center text-[12.5px] text-ink-3">Carte, Apple Pay, virement instantané ou 3 fois</div>
                  </>
                )}
              </div>
              {!payee && company.iban && <Virement iban={company.iban} titulaire={company.legalName || company.name} reference={f.number} />}
              {devis && (
                <a href={lienPublic('devis', devis.id)} className="flex min-h-[56px] items-center gap-3 rounded-[22px] bg-white px-5 shadow-[0_0_0_1px_#ebe9f2] transition hover:shadow-[0_0_0_1px_#d9d5ea]">
                  <FileText className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.75} />
                  <span className="flex-1 text-[14px] font-medium">Revoir le devis signé {devis.number}</span>
                </a>
              )}
            </div>
          </aside>
          <div className="min-w-0 lg:order-1">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.025em]">
                <ReceiptText className="h-[18px] w-[18px]" strokeWidth={1.75} /> {TYPE[f.kind] ?? 'Facture'}
              </h2>
              <span className="text-[12.5px] text-ink-3">{f.einvoice.format === 'factur-x' ? 'Facture électronique Factur-X' : 'PDF conforme'}</span>
            </div>
            <ApercuPapier onOuvrir={() => setPlein(true)} legende="Lire la facture en grand">
              {papier}
            </ApercuPapier>
          </div>
        </div>
      </main>
      <PiedDePage company={company} />
      <PleinEcran open={plein} onClose={() => setPlein(false)} titre={`${TYPE[f.kind] ?? 'Facture'} ${f.number}`} onImprimer={imprimer}>
        {papier}
      </PleinEcran>
      <Paiement open={payer} onClose={() => setPayer(false)} montant={data.reste} titre={f.number} beneficiaire={company.name} onPayer={(m) => payerFacture(f.id, m)} />
      <ZoneImpression>{papier}</ZoneImpression>
      <Toaster />
    </div>
  );
}

function Ligne({ l, v, fort }: { l: string; v: string; fort?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-2">{l}</span>
      <span className={cn('num', fort ? 'font-semibold' : 'text-ink-2')}>{v}</span>
    </div>
  );
}

function Virement({ iban, titulaire, reference }: { iban: string; titulaire: string; reference: string }) {
  const [copie, setCopie] = useState('');
  const copier = async (k: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v.replace(/\s/g, k === 'iban' ? '' : ' '));
    } catch {
      /* presse-papiers indisponible */
    }
    setCopie(k);
    toast(`${k === 'iban' ? 'IBAN' : 'Référence'} copié`);
    setTimeout(() => setCopie(''), 1600);
  };
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_#ebe9f2]">
      <div className="flex items-center gap-2 text-[14px] font-semibold">
        <Landmark className="h-4 w-4" strokeWidth={1.75} /> Ou par virement classique
      </div>
      <div className="mt-3 space-y-2">
        {(
          [
            ['iban', 'IBAN', iban],
            ['ref', 'Référence à indiquer', reference],
          ] as const
        ).map(([k, l, v]) => (
          <button key={k} onClick={() => copier(k, v)} className="flex w-full items-center gap-3 rounded-2xl bg-page px-4 py-2.5 text-left transition hover:bg-[#efedf7]">
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] text-ink-3">{l}</span>
              <span className="bx-mono block truncate text-[13.5px] font-medium">{v}</span>
            </span>
            {copie === k ? <Check className="h-4 w-4 text-[#16a34a]" /> : <Copy className="h-4 w-4 text-ink-3" />}
          </button>
        ))}
        <div className="px-1 text-[12px] text-ink-3">Bénéficiaire : {titulaire}</div>
      </div>
    </div>
  );
}

function Introuvable() {
  return (
    <div className="bx-root grid min-h-dvh place-items-center bg-page px-6 text-center">
      <div className="bx-rise max-w-[380px]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-[0_0_0_1px_#ebe9f2]">
          <Link2Off className="h-6 w-6 text-ink-2" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">Ce lien n’est plus valable</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">Demandez à votre artisan de vous renvoyer la facture.</p>
      </div>
    </div>
  );
}
