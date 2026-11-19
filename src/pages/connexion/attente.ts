// Identité Google en attente : « Continuer avec Google » sans compte → l'inscription la reprend.
// Gardée en mémoire seulement (le jeton n'est jamais écrit dans le navigateur).
import { lireJetonGoogle } from '@/lib/api';

export interface IdentiteGoogle {
  credential: string;
  email: string;
  prenom: string;
  nom: string;
}

let attente: IdentiteGoogle | null = null;

export function garderIdentiteGoogle(credential: string): IdentiteGoogle | null {
  const id = lireJetonGoogle(credential);
  attente = id ? { credential, ...id } : null;
  return attente;
}

/** Lit l'identité en attente et l'oublie. */
export function reprendreIdentiteGoogle(): IdentiteGoogle | null {
  const a = attente;
  attente = null;
  return a;
}
