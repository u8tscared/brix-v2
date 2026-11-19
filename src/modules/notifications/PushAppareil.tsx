// Notifications sur cet appareil (Web Push) : n'apparaît que si le navigateur sait faire et que le serveur
// sert une clé VAPID (GET /api/notifications/push/cle). Sur iPhone et iPad, il faut d'abord ajouter Brix à l'écran d'accueil.
import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { IconTile, Switch, toast } from '@/components/ui';
import { abonnementPushActuel, activerPush, cleVapid, desactiverPush, estInstallee, pushSupporte } from '@/lib/pwa';

const IOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent + (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent) ? 'iPad' : ''));

export function PushAppareil() {
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!pushSupporte() && !IOS) return setDispo(false);
    let vivant = true;
    void cleVapid().then(async (cle) => {
      if (!vivant) return;
      setDispo(!!cle);
      if (cle) setOn(!!(await abonnementPushActuel()));
    });
    return () => {
      vivant = false;
    };
  }, []);
  if (!dispo) return null;
  const aInstaller = IOS && !estInstallee();
  const basculer = async (v: boolean) => {
    setBusy(true);
    try {
      if (v) {
        const r = await activerPush();
        if (r === 'ok') setOn(true);
        else toast(r === 'refuse' ? 'Notifications refusées. Autorisez-les dans les réglages de l’appareil.' : 'Notifications indisponibles sur cet appareil.', 'warn');
      } else {
        await desactiverPush();
        setOn(false);
      }
    } catch {
      toast('Impossible de modifier les notifications. Réessayez.', 'warn');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-card-sm bg-white p-3.5 shadow-halo">
      <IconTile icon={<Smartphone />} tone="violet" />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">Notifications sur cet appareil</div>
        <div className="text-[12.5px] leading-snug text-ink-3">
          {aInstaller ? 'Ajoutez d’abord Brix à l’écran d’accueil (Partager, puis « Sur l’écran d’accueil »).' : 'Signatures, paiements et messages, même appli fermée.'}
        </div>
      </div>
      <Switch checked={on} onChange={(v) => void basculer(v)} label="Notifications sur cet appareil" disabled={busy || aInstaller} />
    </div>
  );
}
