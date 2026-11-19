// Google Identity Services : chargé seulement quand le worker annonce un client Google (/api/auth/config).
// Bouton officiel rendu par Google (renderButton, mode popup : fonctionne sur iPad Safari sans redirection).

interface GoogleId {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  cancel?: () => void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT = 'https://accounts.google.com/gsi/client';
let chargement: Promise<GoogleId> | null = null;

export function chargerGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!chargement) {
    chargement = new Promise<GoogleId>((ok, ko) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.defer = true;
      s.onload = () => (window.google?.accounts?.id ? ok(window.google.accounts.id) : ko(new Error('Google indisponible')));
      s.onerror = () => {
        chargement = null;
        ko(new Error('Google indisponible'));
      };
      document.head.appendChild(s);
    });
  }
  return chargement;
}

/** Affiche le bouton « Continuer avec Google » dans `el` ; `surJeton` reçoit le jeton d'identité. */
export async function boutonGoogle(el: HTMLElement, clientId: string, surJeton: (credential: string) => void, texte: 'continue_with' | 'signup_with' | 'signin_with' = 'continue_with') {
  const id = await chargerGoogle();
  id.initialize({
    client_id: clientId,
    callback: (r: { credential?: string }) => r.credential && surJeton(r.credential),
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true, // Safari (prévention du pistage) : flux adapté
    use_fedcm_for_prompt: true,
  });
  el.innerHTML = '';
  id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: texte, logo_alignment: 'center', locale: 'fr', width: Math.min(400, Math.max(200, el.clientWidth || 320)) });
}
