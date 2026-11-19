# Brix MCP connector research: findings and upgrade plan (as of 2026-11-18)

I edited nothing. Every HTTP probe was an unauthenticated GET or OPTIONS with a generic User-Agent.

Two findings change the plan:
- **The MCP spec has moved on.** The current version is **2026-07-28**, not 2025-11-25. It is stateless: no `initialize`, no sessions, no GET stream, and it adds a required `server/discover`. It also deprecates DCR in favour of CIMD.
- **The worker drops `/.well-known/*` paths into the SPA fallback.** They return index.html with a 200 status. Every OAuth client would fail at the discovery step.

## 0. Current Brix state (files read)

**`/Users/marceau/Sites/brix-app/worker/src/modules/mcp/routes.ts`**
- `POST /api/mcp` takes a Bearer `brx_mcp_…` token; `POST /api/mcp/k/<token>` takes the token in the URL.
- Responses are JSON only. GET and DELETE return 405. CORS is `*`.
- The only versions accepted are `['2025-06-18','2025-03-26','2024-11-05']`. 2025-11-25 is missing.
- Unauthenticated requests get a 401 with `WWW-Authenticate: Bearer realm="brix-ai"`. It has no `resource_metadata`, so no client can start OAuth.
- Tool annotations are `readOnlyHint:true, openWorldHint:false`. `destructiveHint` is missing.
- `structuredContent` is returned, but there is no `outputSchema`.

**`jetons.ts` and `schema.sql`**
- Tokens are personal access tokens, stored as SHA-256 hashes in `mcp_jetons`.
- Limit of 20 per org. No expiry, no scope, no client identity.

**`/Users/marceau/Sites/brix-app/worker/src/index.ts`**
- Only `/api/*` reaches the handlers. Everything else goes to `env.ASSETS` with `not_found_handling = "single-page-application"` (in `/Users/marceau/Sites/brix-app/wrangler.toml`).

**`/Users/marceau/Sites/brix-app/src/modules/fournisseurs/mcp/ConnecterIA.tsx`**
- The connect flow is: create an access, copy `${location.origin}/api/mcp/k/<token>` once, paste it into Claude › Connecteurs.
- `creerJeton` comes from the local `useAchats` store and returns synchronously. Check that it really calls `POST /api/mcp/jetons`; it may be a mock.

## 1. Growth Gusto reference

The marketing site growthgusto.fr is static Firebase Hosting; every `/.well-known` path there returns 404. The MCP server and the authorization server are both on **app.growthgusto.fr** (Google Frontend).

**Protected resource metadata**
- `GET https://app.growthgusto.fr/.well-known/oauth-protected-resource` and `GET https://app.growthgusto.fr/.well-known/oauth-protected-resource/mcp` return the same document:
```json
{"resource":"https://app.growthgusto.fr/mcp","authorization_servers":["https://app.growthgusto.fr"],
 "bearer_methods_supported":["header"],"scopes_supported":["lecture"],"resource_name":"Growth Gusto",
 "resource_documentation":"https://growthgusto.fr/fonctionnalites/gusto-ai"}
```

**Authorization server metadata**
- `/.well-known/oauth-authorization-server` and `/.well-known/openid-configuration` return identical JSON:
```json
{"issuer":"https://app.growthgusto.fr","authorization_endpoint":"https://app.growthgusto.fr/mcp/authorize",
 "token_endpoint":"https://app.growthgusto.fr/mcp/token","registration_endpoint":"https://app.growthgusto.fr/mcp/register",
 "response_types_supported":["code"],"grant_types_supported":["authorization_code","refresh_token"],
 "code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["none"],
 "scopes_supported":["lecture"],"service_documentation":"https://growthgusto.fr/fonctionnalites/gusto-ai"}
```

**Endpoint behaviour**
- `GET /mcp` returns 401 with `www-authenticate: Bearer resource_metadata="https://app.growthgusto.fr/.well-known/oauth-protected-resource/mcp", scope="lecture"` and a body of `{"error":"invalid_token",...}`.
- `OPTIONS /mcp` returns 204. CORS is `*`, methods `GET, POST, OPTIONS`, and `WWW-Authenticate` is exposed.
- `GET /mcp/authorize` with no parameters returns 400 "client_id inconnu".
- `GET /mcp/register` returns 405 (POST only).

**What the auth model is**
- OAuth 2.1 with PKCE S256 and public clients (`none`).
- Dynamic Client Registration (RFC 7591), one `lecture` scope, refresh tokens.
- No CIMD (`client_id_metadata_document_supported` is absent) and no RFC 9207 `iss` flag.
- Without the `iss` flag, ChatGPT uses its per-connector callback URI instead of its stable one.

**Connect UX** (https://growthgusto.fr/connecteur-ia)
- The pitch is "Une adresse à coller. C'est tout. Pas de code, pas de clé à créer."
- In the app: Gusto AI › Paramètres › turn on "Relier votre IA" › copy `https://app.growthgusto.fr/mcp`. It is the same URL for every customer and contains no secret.
- Then paste it into the AI, which opens Growth Gusto; the user signs in with the manager account and taps « Autoriser ». Only the manager can connect, and one switch cuts access instantly.
- Steps are given per assistant:
  - **Claude:** Personnaliser › Connecteurs › Ajouter un connecteur personnalisé › coller › Ajouter › Connecter.
  - **ChatGPT:** Réglages › Applications et connecteurs › Paramètres avancés › Mode développeur › Créer › nom, URL, OAuth › accept the warning › Connecter. Paid plans, desktop only.
  - **Le Chat:** left panel › Intelligence › Connecteurs › Ajouter un connecteur › onglet Connecteur MCP personnalisé. The name must have no spaces (`growthgusto`).
  - **Perplexity:** Plugins, or Personnaliser › Connecteurs › Ajouter › Connecteur MCP › Distant.
  - **Grok:** grok.com/connectors › New Connector › Custom.
- Only Claude is marked "tested end to end". The page says Gemini and Copilot are "not yet" available for this in France.
- The doc page is https://growthgusto.fr/fonctionnalites/gusto-ai.

## 2. Client matrix

| Client | Transport / auth | Callback / client identity | User steps / config |
|---|---|---|---|
| **Claude** (claude.ai web, Desktop, mobile, Cowork) | Streamable HTTP (SSE still usable). OAuth with DCR or CIMD by default; authless allowed; static request headers in beta for some orgs. Sign-in starts only on a **401** (a `WWW-Authenticate` on a 200 is ignored). Only the first `authorization_servers` entry is used. 10 s limit on discovery, registration and token endpoints, 30 s on refresh. Proactive refresh up to 5 min before expiry. `/token` must accept form-urlencoded. Egress range `160.79.104.0/21`. | `https://claude.ai/api/mcp/auth_callback`. An older support article warned it may move to `https://claude.com/api/mcp/auth_callback`, so allow both. CIMD is used only if AS metadata has `client_id_metadata_document_supported:true` **and** `"none"` in `token_endpoint_auth_methods_supported`; otherwise Claude falls back to DCR. | Customize › Connectors › Add › Add custom connector › name + URL › Continue › keep the **Detected** options › Add › Connect. Free plan allows 1 custom connector. On Team/Enterprise an Owner adds it under Organization settings › Connectors › Add › Custom › Web, then members click Connect. |
| **Claude Code** | Same OAuth stack. | CIMD `https://claude.ai/oauth/claude-code-client-metadata` (public client), with redirects `http://localhost/callback` and `http://127.0.0.1/callback` on an **ephemeral port**. The match must ignore the port for both hosts. | `claude mcp add --transport http brix https://app.brix-app.fr/api/mcp`, then `/mcp` to authenticate. |
| **ChatGPT** (now labelled "Plugins" / custom MCP server, developer mode) | SSE and Streamable HTTP. Auth options: OAuth (static client, CIMD or DCR), No auth, or mixed. No API keys or custom headers in the portal flow. Write tools need confirmation by default; any tool **without `readOnlyHint`** is treated as a write. `search`/`fetch` are not needed for developer mode but **should** exist for deep research and company knowledge. | Stable `https://chatgpt.com/connector_platform_oauth_redirect`, used only if AS metadata has `authorization_response_iss_parameter_supported:true`, `issuer` equals the `authorization_servers` entry, and `iss` is returned on every authorization response including errors. Otherwise `https://chatgpt.com/connector/oauth/{callback_id}`. CIMD `client_id` is `https://chatgpt.com/oauth/client.json`; its default auth is `private_key_jwt` (JWKS `https://chatgpt.com/oauth/jwks.json`), and it also accepts `none`. It sends `resource=` on both the authorize and token calls. It can present an mTLS client cert (SAN `mtls.prod.connectors.openai.com`). | chatgpt.com › Plugins › + › "Add custom MCP server" › name + URL › auth OAuth › accept the risk warning › "Create as a plugin" › install. Workspaces need an admin to enable developer mode. Plan eligibility is reported inconsistently (Plus/Pro vs Business/Enterprise/Edu), so check before promising it. |
| **Mistral Le Chat / "Work"** | Streamable HTTP over HTTPS. Auth is auto-detected: none, Bearer/Basic, or OAuth 2.1 with DCR. Its doc still says the server must answer `initialize`. | Not documented officially. A third-party page reports `https://callback.mistral.ai/v1/integrations_auth/oauth2_callback` (unverified). | Connectors › + Add Connector › Custom MCP Connector tab › name with no spaces, Server URL › Connect. An admin is required; on Free/Pro the account owner is the admin. |
| **Perplexity** | Remote MCP with OAuth discovery (DCR); paid tiers. | Not documented officially. | Settings › Connectors › + Custom connector › Remote › name + URL › Add › click the card to authorize. In enterprises an admin must allow custom connectors first. |
| **Grok (xAI)** | Custom connectors on paid plans, using DCR. Forum reports of strict redirect handling. | Unverified report: `console.x.ai/connectors-oauth-exchange-code/`. | grok.com/connectors › New Connector › Custom › paste the URL. |
| **Gemini app** | Custom MCP "Connected Apps" exist, but availability is restricted (web, English, some accounts or countries). Treat as unavailable in France until verified. | Unknown. | n/a |
| **Gemini CLI / Antigravity CLI** | `httpUrl` means Streamable HTTP; OAuth discovery with DCR; `/mcp auth brix`. | Loopback redirect, port-agnostic. | `~/.gemini/settings.json`: `{"mcpServers":{"brix":{"httpUrl":"https://app.brix-app.fr/api/mcp"}}}`. Since 18 June 2026, Antigravity CLI replaces Gemini CLI for some tiers; it uses `~/.gemini/config/mcp_config.json` with `serverUrl`. |
| **Microsoft Copilot Studio** | Streamable HTTP (SSE deprecated). OAuth "Dynamic discovery" means DCR plus metadata; Manual mode is also possible. Consumer Copilot has no custom MCP. | A redirect is generated per connector and changes if the connector is recreated, so DCR is the only scalable option. | Agent › Tools › Add tool › Model Context Protocol › URL › OAuth 2.0 › Dynamic discovery. |
| **Cursor** | Streamable HTTP plus OAuth with DCR. Forum reports say its DCR omits `application_type`. | `cursor://anysphere.cursor-mcp/oauth/callback`, `http://localhost:8787/callback`, and `https://www.cursor.com/agents/mcp/oauth/callback` for cloud agents. Accept custom schemes. | `~/.cursor/mcp.json`: `{"mcpServers":{"brix":{"url":"https://app.brix-app.fr/api/mcp"}}}`. |
| **VS Code / GitHub Copilot** | HTTP plus OAuth with CIMD or DCR. | CIMD `https://vscode.dev/oauth/client-metadata.json` (`none`, `application_type:"native"`), with redirects `http://127.0.0.1:33418/` and `https://vscode.dev/redirect`. | `.vscode/mcp.json`: `{"servers":{"brix":{"type":"http","url":"https://app.brix-app.fr/api/mcp"}}}`. |
| **Windsurf** | Streamable HTTP or SSE plus OAuth (leave headers out). | Loopback. | `~/.codeium/windsurf/mcp_config.json`: `{"mcpServers":{"brix":{"serverUrl":"https://app.brix-app.fr/api/mcp"}}}`. |
| **Raycast** | Remote MCP; "Dynamic" OAuth is DCR plus PKCE. | Raycast's own redirect. | "Install MCP Server" command › URL › OAuth Dynamic › Sign In. |
| **LM Studio** | Remote `url` with OAuth (browser), or headers. | `http://127.0.0.1:33389/mcp-oauth-callback` for a self-supplied client. | `~/.lmstudio/mcp.json`: `{"mcpServers":{"brix":{"url":"https://app.brix-app.fr/api/mcp"}}}`. |
| **n8n / Zapier-style automations** | n8n's MCP Client Tool node uses Streamable HTTP with Bearer or header credentials; OAuth2 there needs a manually entered client. | n/a | Keep `brx_mcp_` personal tokens for these: header `Authorization: Bearer brx_mcp_…`. Zapier as an MCP client was not verified. |

**Consequence for Brix:** Brix will be its own authorization server and identifies clients through DCR or CIMD, so it does **not** need a hard-coded redirect allowlist. It must:
- Validate redirects exactly against the client's registered or CIMD `redirect_uris`.
- Ignore the port on `127.0.0.1`, `[::1]` and `localhost`.
- Accept https and private-use schemes (`cursor://`) at registration.
- Optionally keep a "trusted client" list for a nicer consent screen: claude.ai, chatgpt.com, vscode.dev, cursor.

## 3. Implementation checklist for the Brix worker

**A. Routing**

The worker currently sends unknown paths to the SPA, which answers HTML with a 200. Handle these in the worker **before** `env.ASSETS`:
- `GET /.well-known/oauth-protected-resource/api/mcp` and `/.well-known/oauth-protected-resource`, returning the PRM document.
- `GET /.well-known/oauth-authorization-server` and `/.well-known/openid-configuration`, returning the AS metadata. Only include `jwks_uri` or `userinfo` if you implement them.
- `POST /api/mcp/oauth/register` (DCR).
- `GET` and `POST /api/mcp/oauth/authorize` (consent page).
- `POST /api/mcp/oauth/token`, which must accept `application/x-www-form-urlencoded`.
- `POST /api/mcp/oauth/revoke` (RFC 7009, optional).
- Any other `/.well-known/*` should return a 404 in JSON.

**B. Metadata documents**

Issuer: `https://app.brix-app.fr`. Resource: `https://app.brix-app.fr/api/mcp`, with no trailing slash, exactly the URL users paste.

Protected resource metadata:
```json
{"resource":"https://app.brix-app.fr/api/mcp","authorization_servers":["https://app.brix-app.fr"],
 "bearer_methods_supported":["header"],"scopes_supported":["brix.lecture"],
 "resource_name":"Brix AI","resource_documentation":"https://brix-app.fr/connecteur-ia"}
```

Authorization server metadata:
```json
{"issuer":"https://app.brix-app.fr",
 "authorization_endpoint":"https://app.brix-app.fr/api/mcp/oauth/authorize",
 "token_endpoint":"https://app.brix-app.fr/api/mcp/oauth/token",
 "registration_endpoint":"https://app.brix-app.fr/api/mcp/oauth/register",
 "revocation_endpoint":"https://app.brix-app.fr/api/mcp/oauth/revoke",
 "response_types_supported":["code"],"response_modes_supported":["query"],
 "grant_types_supported":["authorization_code","refresh_token"],
 "code_challenge_methods_supported":["S256"],
 "token_endpoint_auth_methods_supported":["none"],
 "client_id_metadata_document_supported":true,
 "authorization_response_iss_parameter_supported":true,
 "scopes_supported":["brix.lecture"],
 "service_documentation":"https://brix-app.fr/connecteur-ia"}
```
- Do **not** list `offline_access`. If you do, Claude appends it to the scope request.
- Always issue refresh tokens.
- Add `private_key_jwt` later only if you verify assertions against the client's `jwks_uri`.
- Serve both documents with `cache-control: max-age=300`, CORS `*`, and JSON content type. Claude caches discovery for about 5 minutes.

**C. 401 challenge on `/api/mcp`**
- Response: `401`, `WWW-Authenticate: Bearer error="invalid_token", resource_metadata="https://app.brix-app.fr/.well-known/oauth-protected-resource/api/mcp", scope="brix.lecture"`, and `access-control-expose-headers: WWW-Authenticate`.
- The 401 must come from the HTTP layer, never as a 200 with `isError`.
- Expired or invalid tokens also get a 401. A wrong scope gets a 403 with `error="insufficient_scope"`.

**D. DCR (RFC 7591), kept for Cursor, Raycast, Copilot Studio, Le Chat, Perplexity, Grok and Growth Gusto parity**
- Accept JSON with `redirect_uris` (required: https, loopback http, or a private-use scheme), `client_name`, `client_uri`, `logo_uri`, `grant_types`, `token_endpoint_auth_method:"none"` and `application_type`.
- Return 201 with `client_id`, `client_id_issued_at`, echoed metadata, and no secret.
- Rate-limit per IP.
- Garbage-collect clients that never completed an authorization within 30 days. DCR produces many clients because Claude registers on every fresh connection.
- DCR is deprecated in 2026-07-28 but still widely used; keep it.

**E. CIMD (Claude, Claude Code, ChatGPT, VS Code)**
- When `client_id` is an https URL with a path, fetch it with SSRF protection: https only, no private or reserved IPs, short timeout, size cap around 5 KB, no redirects. Cache it per HTTP headers in KV or D1.
- Require `doc.client_id === url`, check required fields, and match `redirect_uri` exactly (loopback port ignored).
- On the consent page, show the **hostname of the client_id URL and of the redirect_uri**, not just the self-asserted `client_name`.
- Show an extra warning when the only redirects are loopback.

**F. /authorize and consent page (French, mobile-first)**
- Required parameters: `response_type=code`, `client_id`, `redirect_uri`, `code_challenge` plus `code_challenge_method=S256` (reject `plain` or a missing challenge), `state`, `resource`, `scope`.
- `resource` must equal `https://app.brix-app.fr/api/mcp` (tolerate uppercase host and a trailing slash). Otherwise return `invalid_target`.
- Never redirect to an unvalidated `redirect_uri`. Show an error page instead.
- If the user has no Brix session, send them to the login page and return them to the consent page.
- Who can approve: reuse Growth Gusto's rule and allow only the patron/admin role. Store the user and the organization.
- The page must show:
  - the Brix logo and the account or organization name;
  - "**<Claude | ChatGPT | client_name>** (client host) veut lire vos données Brix";
  - a list of what is readable (reuse `LECTURES` from ConnecterIA);
  - "Lecture seule : rien ne peut être modifié ni envoyé";
  - the redirect host;
  - the « Autoriser » and « Refuser » buttons;
  - a line on how to revoke: Bob › Brix AI MCP.
- Protect the form with a CSRF token, `X-Frame-Options: DENY`, and `frame-ancestors 'none'`.
- Redirect with `code`, `state` and **`iss=https://app.brix-app.fr`**. Errors (`access_denied` and others) also carry `state` and `iss`. RFC 9207 is required for ChatGPT's stable redirect.

**G. /token**
- `grant_type=authorization_code`: check the code is single-use, PKCE S256 (`code_verifier`), that `client_id` and `redirect_uri` equal the authorize values, and that `resource` matches.
- `grant_type=refresh_token`: **rotate** on every use (required for public clients), revoke the old token, and detect reuse (reuse revokes the whole grant).
- Errors use RFC 6749 codes; a dead refresh token gets `invalid_grant`.
- Response: `{"access_token","token_type":"Bearer","expires_in":3600,"refresh_token","scope":"brix.lecture"}`. Respond well under 10 s.
- Suggested lifetimes:
  - authorization code: 60 s (at most 10 min), single use;
  - access token: 1 h;
  - refresh token: 30-day sliding window with rotation, 90 days absolute, or until revoked.

**H. Token format and storage (D1)**
- New tables:
  - `mcp_oauth_clients(id, kind dcr|cimd, metadata_json, created_at, last_used)`
  - `mcp_oauth_codes(hash, client_id, org, user, redirect_uri, challenge, resource, scope, exp)`
  - `mcp_oauth_grants(id, org, user, client_id, client_label, scope, resource, created_at, revoked_at)`
  - `mcp_oauth_tokens(hash, grant_id, kind access|refresh, exp, revoked_at)`
- Tokens are opaque, for example `brx_oat_…` and `brx_ort_…`, stored as SHA-256 hashes like today.
- `verifierJeton` should accept both PAT `brx_mcp_` and OAuth access tokens. For OAuth tokens it checks the stored `resource` equals the MCP URL (audience binding, RFC 8707), plus expiry, revocation and scope.
- Never accept tokens issued for another resource, and never pass tokens through to other services.
- Show OAuth grants in "Vos accès" next to PATs, labelled with the client name and host, with the same « Couper » button. Revoking a grant kills its access and refresh tokens immediately.
- Keep an org-level kill switch, like Growth Gusto's "Relier votre IA".

**I. Keep `/api/mcp/k/<token>` and PATs as the fallback**

Use these for n8n, scripts, and clients without OAuth. Do **not** present them as the main path:
- Anthropic's directory doc says not to accept credentials in the URL.
- The spec forbids tokens in the query string, and URL tokens leak into logs.

Switch ConnecterIA's main flow to Growth Gusto's model: one fixed URL, `https://app.brix-app.fr/api/mcp`, then « Autoriser ». Move token creation to an "Avancé" section.

**J. Transport and protocol**
- POST only, JSON responses are fine, and SSE is **not** required by any version.
- GET and DELETE return 405. Notifications return 202 with no body.
- Legacy era (what Claude, ChatGPT, Le Chat and most clients still send):
  - Keep `initialize`.
  - Add **`2025-11-25`** to `VERSIONS` and prefer it.
  - Echo the requested version if supported, otherwise return the latest.
  - Accept and ignore `Mcp-Session-Id`. Statelessness is fine.
  - Honour the `MCP-Protocol-Version` header and treat a missing header as `2025-03-26`.
  - Keep `ping`.
- Modern era (2026-07-28), to be dual-era:
  - Implement `server/discover`, returning `supportedVersions`, capabilities and serverInfo.
  - Accept requests carrying `_meta["io.modelcontextprotocol/protocolVersion"]` without `initialize`.
  - Validate the `Mcp-Method` and `Mcp-Name` headers against the body (400 with `-32020` on mismatch).
  - For unknown versions, return 400 with `-32022` `{supported, requested}`. Unknown methods return 404 with `-32601`.
  - Add `resultType:"complete"` to results, `ttlMs` and `cacheScope:"private"` to `tools/list`, and `_meta["io.modelcontextprotocol/serverInfo"]`.
  - The current error code `-32001` sits in the implementation-defined range, which is fine for the 401 body.
- JSON-RPC batch arrays were removed in 2025-06-18. Keeping them is harmless.
- **Origin:** the spec says servers MUST validate `Origin` and return 403 if it is present and invalid. Since every call needs a bearer token, either allowlist known browser origins (claude.ai, chatgpt.com, vscode-webview, localhost for MCP Inspector) or accept any origin while requiring a token. Document the choice.
- **CORS:** keep `*`. Allow headers `authorization, content-type, mcp-protocol-version, mcp-session-id, mcp-method, mcp-name, accept, last-event-id`. Expose `WWW-Authenticate`. Allow methods `GET, POST, DELETE, OPTIONS`. The `/.well-known` documents and `/token` also need CORS for browser-based clients.

**K. Tools**
- Annotations on every tool: `title`, `readOnlyHint:true`, `destructiveHint:false`, `idempotentHint:true`, `openWorldHint:false`, all explicit booleans. OpenAI requires all three hints; Anthropic requires `title` plus a read or destructive hint.
- Tool names: 64 characters or fewer, unique and verb-like. OpenAI prefers names like `lister_devis` or `get_…`; the current names (`devis`, `entreprise`) are nouns. Renaming is optional, but it improves the chance of OpenAI approval.
- Descriptions must say what the tool does without steering the model. "Commence ici" in `entreprise` and the server INSTRUCTIONS read as behavioural steering; reviewers might flag it, so keep it soft.
- Add an `outputSchema` per tool. When one is declared, `structuredContent` MUST conform. Keep the text `content` mirror.
- Add `search(query)` and `fetch(id)` tools for ChatGPT deep research and company knowledge:
  - `search` returns `{results:[{id,title,url}]}`.
  - `fetch` returns `{id,title,text,url,metadata}`.
  - Both go in `structuredContent` and as JSON text in `content[0].text`.
  - `url` must be a non-empty deep link into Brix for citations to appear.
- Keep responses small and paginated, with actionable French error messages. Avoid generic 500 errors.
- Strip trace and request IDs from responses (an OpenAI guideline). `donnees_du` is useful and fine.

**L. Testing**
- Use MCP Inspector.
- Run `curl -i` on every `/.well-known` document, and check that an unauthenticated POST returns 401 with `resource_metadata`.
- Then test as a Claude custom connector, Claude Code (`claude mcp add --transport http`), ChatGPT developer mode, VS Code (CIMD path) and Cursor (DCR plus `cursor://`).

## 4. Directory submission requirements

**Anthropic Connectors Directory**
- Portal: https://claude.ai/directory/manage › Submit new › MCP connector. Any paid Claude plan can submit.
- Prerequisites:
  - remote HTTPS server;
  - OAuth 2.0 for authenticated services;
  - every tool has `title` plus `readOnlyHint` or `destructiveHint`;
  - names of 64 characters or fewer;
  - read and write tools kept separate;
  - no prompt-injection-style descriptions;
  - useful, non-generic errors and reasonable response sizes;
  - first-party API with the domain matching the service;
  - no money movement and no AI media generation.
- Listing material: name (100 characters), one-liner (200), description (2,000), 1–5 categories, docs URL, privacy policy URL, support contact, icon, and a permanent slug.
- Other portal steps: use cases, company, authentication (DCR, CIMD, or Anthropic-held client ID and secret registered with `https://claude.ai/api/mcp/auth_callback`), data handling, test confirmation, and **7 compliance acknowledgments**.
- Review: an automatic scan, then a **Community** listing by default. It can be escalated to **Verified**, in which case a reviewer emails asking for a test account.
- Terms: https://support.claude.com/en/articles/13145338 and https://support.claude.com/en/articles/13145358. Escalations: mcp-review@anthropic.com.
- For high traffic, prefer CIMD over DCR.
- Docs: https://claude.com/docs/connectors/building/submission and https://claude.com/docs/connectors/building/review-criteria.

**OpenAI (ChatGPT / Codex plugin directory)**
- Account: org owner, or a member with Apps Management Write. Individual or business **verification** is required.
- MCP server: stable public HTTPS endpoint. Domain verification by serving a token at `https://<host>/.well-known/openai-apps-challenge` (the worker must route this path too).
- Auth: None, OAuth (registered client, DCR or CIMD), or mixed. No API keys or custom headers.
- Package: a ZIP with `name`, `version`, `description`, `author` and an `interface` block.
  - `displayName` and `shortDescription` are 30 characters or fewer; `longDescription` is 4,000 or fewer.
  - Category, logo (square, at least 48 px), and up to 3 default prompts of 128 characters or fewer.
  - HTTPS website, support, privacy and ToS URLs from the same publisher.
- Review info:
  - a reviewer test account with sample data, no MFA or magic links (create a demo Brix org);
  - **5 positive and 3 negative test cases**;
  - a **demo video URL**;
  - a commerce declaration;
  - policy attestations.
- Publication: one active review at a time. Choose the release date and target countries after approval.
- Guidelines:
  - explicit `readOnlyHint`, `destructiveHint` and `openWorldHint` booleans;
  - verb-based names;
  - no requests for chat history or extra PII;
  - the privacy policy covers data categories, purposes, recipients, retention and user controls;
  - test on desktop and mobile.
- Docs: https://developers.openai.com/apps-sdk/deploy/submission and https://developers.openai.com/apps-sdk/app-submission-guidelines.

**Not verified**
- Exact OAuth callbacks for Le Chat, Perplexity, Grok, Gemini and Copilot Studio. They are not needed if Brix validates against DCR or CIMD-registered redirects.
- ChatGPT plan eligibility.
- Gemini app availability in France.
- Zapier as an MCP client.

## Sources

- MCP spec:
  - https://modelcontextprotocol.io/specification/versioning
  - https://modelcontextprotocol.io/specification/2026-07-28/changelog
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- Claude:
  - https://claude.com/docs/connectors/building/authentication
  - https://claude.com/docs/connectors/building/lazy-authentication
  - https://claude.com/docs/connectors/custom
  - https://support.anthropic.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers (claude.com callback note)
- OpenAI:
  - https://developers.openai.com/apps-sdk/build/auth
  - https://developers.openai.com/api/docs/guides/developer-mode.md
  - https://developers.openai.com/api/docs/mcp
- Mistral: https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors
- xAI: https://docs.x.ai/grok/connectors
- Microsoft: https://learn.microsoft.com/en-za/microsoft-Copilot-studio/mcp-add-existing-server-to-agent
- VS Code: https://code.visualstudio.com/api/extension-guides/mcp
- Cursor (community reports): https://forum.cursor.com/t/oauth-redirect-uri-changed-from-cursor-to-http-localhost-for-streamable-http-mcp/165019
- Windsurf: https://docs.windsurf.com/plugins/cascade/mcp
- LM Studio: https://lmstudio.ai/docs/integrations/mcp-remote
- Raycast: https://manual.raycast.com/ai/model-context-protocol
- Gemini CLI (third-party guide): https://www.tembo.io/blog/gemini-cli-mcp
- Live client metadata documents fetched:
  - https://claude.ai/oauth/claude-code-client-metadata
  - https://chatgpt.com/oauth/client.json
  - https://vscode.dev/oauth/client-metadata.json
- Growth Gusto:
  - https://app.growthgusto.fr/.well-known/oauth-protected-resource
  - https://app.growthgusto.fr/.well-known/oauth-authorization-server
  - https://growthgusto.fr/connecteur-ia
  - https://growthgusto.fr/fonctionnalites/gusto-ai
