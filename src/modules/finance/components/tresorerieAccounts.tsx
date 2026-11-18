import { useState } from 'react';
import { Check, Lock, Plus, RefreshCw } from 'lucide-react';
import { Card, cn, Input, Sheet, toast } from '@/components/ui';
import { LiveDot } from '@/components/motion';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { BANK_COLOR, BANKS, connectBank, useTreso } from './tresorerieService';

export function BankLogo({ bank, size = 32 }: { bank: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[11px] font-display font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2)]" style={{ width: size, height: size, background: BANK_COLOR[bank] ?? '#5f5f70', fontSize: size * 0.4 }}>
      {bank.replace(/^(La|Crédit|Caisse d'|Banque) ?/i, '').charAt(0)}
    </span>
  );
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`;
};

export function AccountsCard({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  const cash = useBrix((s) => s.cashBalance);
  const { accounts, addAccount } = useTreso();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const connect = async (bank: string) => {
    setBusy(bank);
    const acc = await connectBank(bank);
    addAccount(acc);
    setBusy(null);
    setOpen(false);
    toast(`${bank} relié : ${money(acc.balance ?? 0, true)} ajoutés à votre trésorerie (démo)`);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-halo-line px-4 py-3">
        <h4 className="text-[15px] font-semibold tracking-[-0.02em]">Comptes reliés</h4>
        <div className="flex-1" />
        <button onClick={onSync} disabled={syncing} className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-ink-2 transition hover:bg-halo-hover hover:text-ink">
          {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LiveDot />}
          {syncing ? 'Synchronisation…' : 'Synchronisé'}
        </button>
      </div>
      {accounts.map((a) => (
        <div key={a.id} className="flex min-h-[60px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-b-0 animate-[fade-up_.4s_var(--ease)_both]">
          <BankLogo bank={a.bank} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium">{a.bank} · {a.label}</div>
            <div className="truncate text-[12px] text-ink-3">{a.iban} · {ago(a.syncedAt)}</div>
          </div>
          <div className="num text-[14px] font-semibold">{money(a.main ? cash : a.balance ?? 0, true)}</div>
        </div>
      ))}
      <button onClick={() => setOpen(true)} className="flex h-12 w-full items-center gap-2 border-t border-halo-line px-4 text-[13px] font-medium text-ink-2 hover:bg-halo-hover hover:text-ink">
        <Plus className="h-4 w-4" /> Relier une autre banque
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Relier une banque" subtitle="Lecture seule : Brix voit vos opérations, ne peut jamais faire de virement.">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher votre banque" className="mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {BANKS.filter((b) => b.toLowerCase().includes(q.toLowerCase())).map((b) => {
            const has = accounts.some((a) => a.bank === b);
            return (
              <button key={b} disabled={!!busy || has} onClick={() => connect(b)} className="row-card min-h-[56px] gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium disabled:opacity-60">
                <BankLogo bank={b} size={28} />
                <span className="min-w-0 flex-1 truncate">{b}</span>
                {busy === b ? <RefreshCw className="h-4 w-4 animate-spin text-ink-3" /> : has ? <Check className="h-4 w-4 text-deep-g" /> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-field bg-pale-n p-3.5 text-[12px] text-ink-2">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Connexion sécurisée par un agrégateur agréé par la Banque de France (norme européenne DSP2). Vos identifiants ne passent jamais par Brix.
        </div>
      </Sheet>
    </Card>
  );
}
