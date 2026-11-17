/**
 * Tâche planifiée des parcours (à appeler depuis scheduled() de worker/src/index.ts, cron chaque minute) :
 * push différés après les heures calmes, purge des compteurs de limitation de débit.
 */
import type { Env } from '../../env';
import { purgerLimites } from '../documents/commun';
import { asParcours } from '../documents/env';
import { envoyerPushDifferes } from './notifier';

export async function cronParcours(env: Env): Promise<void> {
  const e = asParcours(env);
  try {
    await envoyerPushDifferes(e);
    // Une fois par heure suffit pour la purge.
    if (new Date().getUTCMinutes() === 0) await purgerLimites(e);
  } catch (err) {
    console.error('[parcours] cron', err);
  }
}
