// Panneau de lecture : en-tête du message (sujet, expéditeur, destinataire), réglages d'aperçu et rendu.

import { useState } from 'react';
import { AlignLeft, ArrowLeft, Monitor, Moon, Smartphone, Sun } from 'lucide-react';
import type { ModeleEmail, RenduEmail } from '@/emails';
import { NOM_MODELE } from '@/emails';
import { BrandTile } from '@/parcours/marque';
import { ApercuEmail, type Appareil } from './ApercuEmail';
import { ICONE_MODELE, LIBELLE_PUBLIC, TON_PUBLIC, type Expediteur, type Public } from './outils';

export interface Message {
  cle: string;
  rendu: RenduEmail;
  modele: ModeleEmail;
  pour: Public;
  de: Expediteur;
  aNom: string;
  aEmail: string;
  date?: string; // libellé complet
}

function Bascule<T extends string>({ valeur, options, onChange, label }: { valeur: T; options: { id: T; icone: typeof Sun; libelle: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="relative inline-flex rounded-xl bg-[#ecebf3] p-0.5">
      {options.map((o) => {
        const actif = o.id === valeur;
        const I = o.icone;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={actif}
            title={o.libelle}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium transition-all duration-200 max-md:h-11 max-md:px-3 ${actif ? 'bg-white text-[#130f26] shadow-[0_1px_2px_rgba(19,15,38,.08),0_0_0_1px_rgba(19,15,38,.04)]' : 'text-ink-3 hover:text-ink-2'}`}
          >
            <I size={16} strokeWidth={1.75} />
            <span className="max-lg:sr-only">{o.libelle}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Lecteur({ msg, onRetour, telephoneSeul }: { msg: Message; onRetour?: () => void; telephoneSeul?: boolean }) {
  const [appareil, setAppareil] = useState<Appareil>('ordinateur');
  const [sombre, setSombre] = useState(false);
  const [texte, setTexte] = useState(false);
  const Icone = ICONE_MODELE[msg.modele];
  const ton = TON_PUBLIC[msg.pour];
  const vue: Appareil = telephoneSeul ? 'ordinateur' : appareil;

  return (
    <article className="flex min-h-full flex-col" aria-labelledby={`sujet-${msg.cle}`}>
      <header className="boite-entete sticky top-0 z-10 border-b border-line bg-white/85 px-4 pb-4 pt-3 backdrop-blur-xl md:px-8 md:pt-6">
        {onRetour && (
          <button type="button" onClick={onRetour} className="-ml-2 mb-2 inline-flex h-11 items-center gap-1 rounded-xl px-2 text-[15px] font-medium text-[#6d28d9] active:bg-vi-50 md:hidden">
            <ArrowLeft size={18} strokeWidth={1.75} /> Boîte
          </button>
        )}
        <div key={msg.cle} className="bx-rise">
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: ton.fond, color: ton.texte }}>
              <Icone size={13} strokeWidth={1.75} /> {NOM_MODELE[msg.modele]}
            </span>
            <span>{LIBELLE_PUBLIC[msg.pour]}</span>
          </div>
          <h1 id={`sujet-${msg.cle}`} className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[#130f26] md:text-[24px]">
            {msg.rendu.sujet}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            {msg.de.nom === 'Brix' ? (
              <BrandTile size={36} className="shrink-0" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#130f26] text-[12px] font-semibold text-white">{msg.de.initiales}</span>
            )}
            <div className="min-w-0 flex-1 text-[13px] leading-snug">
              <div className="truncate">
                <span className="font-semibold text-[#130f26]">{msg.de.nom}</span>
                {msg.de.detail && <span className="text-ink-3"> · {msg.de.detail}</span>}
              </div>
              <div className="truncate text-ink-3">
                à {msg.aNom} <span className="max-sm:hidden">&lt;{msg.aEmail}&gt;</span>
              </div>
            </div>
            {msg.date && <div className="shrink-0 text-right text-[12px] text-ink-3 max-lg:hidden">{msg.date}</div>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!telephoneSeul && (
            <Bascule
              label="Appareil"
              valeur={appareil}
              onChange={setAppareil}
              options={[
                { id: 'ordinateur', icone: Monitor, libelle: 'Ordinateur' },
                { id: 'telephone', icone: Smartphone, libelle: 'Téléphone' },
              ]}
            />
          )}
          <Bascule
            label="Thème"
            valeur={sombre ? 'sombre' : 'clair'}
            onChange={(v) => setSombre(v === 'sombre')}
            options={[
              { id: 'clair', icone: Sun, libelle: 'Clair' },
              { id: 'sombre', icone: Moon, libelle: 'Sombre' },
            ]}
          />
          <button
            type="button"
            aria-pressed={texte}
            onClick={() => setTexte((t) => !t)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors max-md:h-11 ${texte ? 'bg-[#130f26] text-white' : 'bg-[#ecebf3] text-ink-2 hover:text-[#130f26]'}`}
          >
            <AlignLeft size={16} strokeWidth={1.75} /> Texte brut
          </button>
        </div>
      </header>

      <div key={`${msg.cle}-${vue}-${texte}`} className={`boite-scene flex-1 md:px-8 md:py-10 ${texte ? 'px-3 py-6' : ''}`}>
        {texte ? (
          <div className="mx-auto max-w-[680px] rounded-2xl bg-white p-5 shadow-card md:p-8">
            <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Version texte, pour les messageries sans HTML</p>
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[#130f26]">{msg.rendu.texte}</pre>
          </div>
        ) : (
          <ApercuEmail html={msg.rendu.html} titre={msg.rendu.sujet} appareil={vue} sombre={sombre} />
        )}
      </div>
    </article>
  );
}
