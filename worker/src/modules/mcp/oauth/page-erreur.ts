/**
 * Page d'erreur HTML de /authorize : affichée quand le client ou l'adresse de retour n'est pas
 * vérifiable (on ne redirige jamais vers une adresse non validée). Interdite en iframe.
 */

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function pageErreur(titre: string, detail: string, status = 400) {
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Brix · ${echapper(titre)}</title>
<style>
  :root{color-scheme:light}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f5fc;color:#15122a;font:15px/1.5 Geist,system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px;box-sizing:border-box}
  main{max-width:440px;width:100%;background:#fff;border-radius:22px;box-shadow:0 1px 0 #ece8f6,0 12px 32px -12px rgba(60,40,120,.18);padding:28px}
  .b{width:40px;height:40px;border-radius:12px;background:#15122a;color:#fff;display:grid;place-items:center;font-weight:700;font-size:20px}
  h1{font-size:22px;letter-spacing:-.03em;margin:18px 0 6px}
  p{color:#5d5a72;margin:0 0 10px}
  .d{font-size:13px;color:#9794aa;word-break:break-word}
</style></head>
<body><main>
  <div class="b" aria-hidden="true">B</div>
  <h1>${echapper(titre)}</h1>
  <p>Retournez dans votre assistant et relancez la connexion à Brix. Si le problème continue, écrivez-nous à support@brix-app.fr.</p>
  <p class="d">${echapper(detail)}</p>
</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-frame-options': 'DENY',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    },
  });
}
