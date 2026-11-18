// Import du fichier de prix nets d'un fournisseur (CSV, ou onglet FAB-DIS enregistré en CSV).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, FileSpreadsheet, Upload } from 'lucide-react';
import { Badge, Button, Field, Select, Sheet, Textarea, cn, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { analyserTarif, parseCsv, type ChampCatalogue } from '../../../../../worker/src/modules/fournisseurs/catalogue-import';
import { useAchats } from '../../data/store';

const CHAMPS: { cle: ChampCatalogue; label: string; essentiel?: boolean }[] = [
  { cle: 'reference', label: 'Référence', essentiel: true },
  { cle: 'designation', label: 'Désignation', essentiel: true },
  { cle: 'prix_net', label: 'Prix net', essentiel: true },
  { cle: 'prix_public', label: 'Prix public' },
  { cle: 'remise', label: 'Remise' },
  { cle: 'ean', label: 'Code EAN' },
  { cle: 'marque', label: 'Marque' },
  { cle: 'unite', label: 'Unité' },
  { cle: 'famille', label: 'Famille' },
];

const EXEMPLE = `Référence;Désignation;Marque;EAN;Unité;Prix public HT;Prix net HT
Legrand 406774;Disjoncteur DX³ 16 A courbe C;Legrand;3245064067744;u;10,96;6,59
Legrand 411650;Interrupteur différentiel 40 A 30 mA type A;Legrand;3245064116503;u;68,16;43,10
Legrand 067111;Prise 2P+T Céliane blanc;Legrand;3245060671112;u;19,84;12,95
Hager MFN716;Disjoncteur 16 A courbe C 1P+N;Hager;3250615541717;u;14,20;7,80
;Ligne sans référence;;;u;;3,00`;

/** Les fichiers enregistrés depuis Excel sous Windows sont souvent en Windows-1252, pas en UTF-8. */
async function lireTexte(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export default function ImportTarif({ open, onClose, fournisseurInitial }: { open: boolean; onClose: () => void; fournisseurInitial?: string }) {
  const { fournisseurs, importerTarif } = useAchats();
  const [fid, setFid] = useState('');
  const [texte, setTexte] = useState('');
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [coller, setColler] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFid(fournisseurInitial ?? fournisseurs[0]?.id ?? '');
    setTexte('');
    setNomFichier(null);
    setColler(false);
    setErreur(null);
  }, [open, fournisseurInitial, fournisseurs]);

  const analyse = useMemo(() => (texte.trim() ? analyserTarif(parseCsv(texte)) : null), [texte]);
  const manquants = analyse ? CHAMPS.filter((c) => c.essentiel && analyse.colonnes[c.cle] == null && !(c.cle === 'prix_net' && analyse.colonnes.prix_public != null)) : [];
  const f = fournisseurs.find((x) => x.id === fid);

  const charger = async (file?: File) => {
    if (!file) return;
    setErreur(null);
    if (/\.(xlsx?|ods)$/i.test(file.name)) {
      setErreur('Ce fichier est au format Excel. Ouvrez-le, puis Fichier › Enregistrer sous › CSV, et déposez le fichier CSV ici.');
      return;
    }
    setNomFichier(file.name);
    setTexte(await lireTexte(file));
  };

  const importer = () => {
    if (!f || !analyse?.lignes.length) return;
    const r = importerTarif(f.id, analyse.lignes);
    const morceaux = [r.crees && `${r.crees} nouveau${r.crees > 1 ? 'x' : ''}`, r.maj && `${r.maj} prix mis à jour`].filter(Boolean).join(', ') || 'aucun changement';
    toast(`${f.nom} : ${morceaux}${r.hausses ? `. ${r.hausses} hausse${r.hausses > 1 ? 's' : ''} de prix` : ''}`, r.hausses ? 'warn' : 'ok');
    onClose();
  };

  const n = analyse?.lignes.length ?? 0;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={640}
      title="Importer un tarif"
      subtitle="Le fichier de prix envoyé par votre commercial. Brix reconnaît les colonnes tout seul et garde l’historique de chaque prix."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Annuler</Button>
          <Button variant="primary" size="lg" disabled={!f || n === 0 || manquants.length > 0} onClick={importer} className="flex-1 justify-center sm:flex-none">
            {n ? `Importer ${n} article${n > 1 ? 's' : ''}` : 'Importer'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="De quel fournisseur vient ce tarif ?">
          <Select value={fid} onChange={(e) => setFid(e.target.value)}>
            {fournisseurs.length === 0 && <option value="">Ajoutez d’abord un fournisseur</option>}
            {fournisseurs.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </Select>
        </Field>

        {!coller ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => { e.preventDefault(); setSurvol(false); void charger(e.dataTransfer.files[0]); }}
            className={cn('flex cursor-pointer flex-col items-center rounded-field border-2 border-dashed px-5 py-7 text-center transition', survol ? 'border-vi-300 bg-vi-50' : 'border-[#e3ddf0] bg-[#fbfbfd] hover:border-ink-3')}
          >
            <input ref={input} type="file" accept=".csv,.txt,text/csv,.xlsx,.xls" className="sr-only" onChange={(e) => void charger(e.target.files?.[0])} />
            <span className="grid h-11 w-11 place-items-center rounded-tile bg-white text-ink-2 shadow-halo">{nomFichier ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
            <span className="mt-3 text-[14px] font-medium">{nomFichier ?? 'Déposez votre fichier CSV ici'}</span>
            <span className="mt-0.5 text-[12.5px] text-ink-3">{nomFichier ? 'Touchez pour en choisir un autre' : 'ou touchez pour le choisir'}</span>
          </label>
        ) : (
          <Field label="Contenu du fichier" hint="Copiez les cellules dans Excel (ligne des titres comprise), puis collez-les ici.">
            <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} className="h-36 font-mono !text-[12px]" placeholder={'Référence;Désignation;Prix net\n…'} />
          </Field>
        )}
        <div className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
          <button className="min-h-10 font-medium sm:min-h-0 text-vi-700 hover:underline" onClick={() => setColler((v) => !v)}>{coller ? 'Déposer un fichier' : 'Coller le contenu à la place'}</button>
          <button className="min-h-10 font-medium sm:min-h-0 text-ink-2 hover:underline" onClick={() => { setColler(true); setTexte(EXEMPLE); setNomFichier(null); }}>Essayer avec un exemple</button>
        </div>

        {erreur && <div className="flex gap-2 rounded-card-sm bg-pale-a px-4 py-3.5 text-[13px] text-deep-a"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{erreur}</div>}

        {!analyse && !erreur && (
          <p className="rounded-card-sm bg-halo-track/70 px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Votre tarif est un fichier Excel ?</span> Ouvrez-le, puis <span className="font-medium">Fichier › Enregistrer sous</span>, choisissez le type <span className="font-medium">CSV</span>. L’import direct des fichiers Excel arrive bientôt.
          </p>
        )}

        {analyse && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-ink-2">Colonnes reconnues</div>
              <div className="flex flex-wrap gap-1.5">
                {CHAMPS.map((c) => {
                  const idx = analyse.colonnes[c.cle];
                  if (idx == null) return manquants.includes(c) ? <Badge key={c.cle} tone="bad">{c.label} introuvable</Badge> : null;
                  return <Badge key={c.cle} tone="ok" className="max-w-full"><span className="truncate">{c.label} ← « {analyse.entetes[idx]} »</span></Badge>;
                })}
              </div>
              {manquants.length > 0 && <p className="mt-2 text-xs text-bad">Ajoutez une ligne de titres avec ces colonnes en haut du fichier, puis réessayez.</p>}
            </div>

            {n > 0 && (
              <div className="overflow-hidden rounded-card-sm bg-white shadow-halo-sm">
                <div className="flex items-center justify-between border-b border-halo-line bg-[#fbfbfd] px-3.5 py-2 text-[12px] text-ink-3">
                  <span>Aperçu {Math.min(8, n)} sur {n}</span>
                  {analyse.format === 'fabdis' && <Badge tone="info">Format FAB-DIS</Badge>}
                </div>
                {analyse.lignes.slice(0, 8).map((l) => (
                  <div key={l.reference} className="flex items-center gap-3 border-b border-halo-line px-3.5 py-2 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{l.designation}</div>
                      <div className="truncate text-[11.5px] text-ink-3">{l.reference}{l.marque ? ` · ${l.marque}` : ''} · {l.unite}</div>
                    </div>
                    <span className="num shrink-0 text-[13px] font-medium">{money((l.prix_net_cents ?? 0) / 100)}</span>
                  </div>
                ))}
              </div>
            )}

            {analyse.rejets.length > 0 && (
              <details className="rounded-card-sm bg-white shadow-halo-sm px-3.5 py-2.5 text-[12.5px]">
                <summary className="cursor-pointer font-medium text-warn">{analyse.rejets.length} ligne{analyse.rejets.length > 1 ? 's' : ''} ignorée{analyse.rejets.length > 1 ? 's' : ''}</summary>
                <ul className="mt-2 space-y-1 text-ink-2">
                  {analyse.rejets.slice(0, 12).map((r) => <li key={r.ligne}>Ligne {r.ligne} : {r.raison}</li>)}
                  {analyse.rejets.length > 12 && <li className="text-ink-3">… et {analyse.rejets.length - 12} autres</li>}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
