import { toast } from '@/components/ui';

/** Copie dans le presse-papiers, avec un message clair si le navigateur refuse. */
export async function copier(texte: string, ok: string) {
  try {
    await navigator.clipboard.writeText(texte);
    toast(ok);
    return true;
  } catch {
    toast('Copie impossible : sélectionnez le texte et copiez-le à la main', 'warn');
    return false;
  }
}
