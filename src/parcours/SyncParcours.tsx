import { useBrix } from '@/lib/store';
import { useBoite } from '@/emails/boite';
import { useDevisMeta } from '@/modules/devis/store';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { useNotifs } from '@/modules/notifications/store';
import { useParcours } from './signature';
import { useSyncOnglets } from './sync';

export function SyncParcours() {
  useSyncOnglets([useBrix, useDevisMeta, useParcours, useNotifs, useBoite, useAchats]);
  return null;
}
