# Security review: Crown & Carat Chess

This version re-applies and extends the first review on top of your latest AI Studio export
(only `App.tsx` had changed; your menu/cleanup improvements are kept).

## Critical (fixed)
| # | Problem | Fix |
|---|---------|-----|
| 1 | **Secret player tokens were sent to everyone** (room state, WebSocket broadcasts, every chat message), so anyone with a room code could take over either seat. | Tokens go only to their owner. Everyone else sees a public `id`. |
| 2 | **Moves were never checked.** A modified client could teleport pieces, capture the king or forge pieces. | `resolveLegalMove()` rebuilds every move from the engine's legal moves. |
| 3 | **Rematch needed no real token**: two made-up strings reset a game in progress. | Only seated players, only after the game has ended. |
| 4 | **A player could force a draw alone.** | Accepting requires an offer from the opponent. |

## High (fixed)
- Weak `Math.random()` tokens and 4-character room codes → 192-bit crypto tokens, 6-character codes, constant-time comparison, throttled lookups.
- Chat `imageUrl` accepted any URL (tracking pixels, `javascript:`) → inline JPEG data URLs only, size-capped and checked on server and client.
- No size/rate limits (10 MB bodies, 100 MB WebSocket frames, unlimited rooms/chat) → caps and rate limits everywhere, WebSocket connection limits and heartbeat.
- WebSocket accepted any origin and let any socket act on any room → same-origin check, each socket acts only on the room it joined; anonymous sockets are refused.
- `npm start` ran the Vite dev server in production → secure mode is now the default whenever a build exists or `--prod`/`NODE_ENV=production` is set; it builds the client automatically if `dist/` is missing.

## Medium / low (fixed)
- Clock could be stalled by polling; moves were accepted after the game ended, after a flag fall, or before an opponent joined.
- Duplicate submissions (the client sends actions over WebSocket and REST) are idempotent.
- Names/chat sanitised (control, bidi and zero-width characters); reactions must be real emoji; theme and clock values whitelisted.
- Polling no longer downloads the whole chat (images) every 2.5 s.
- Security headers: CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, frame-ancestors (your AI Studio domains are allowed by default).
- Generic error responses, JSON 404 for `/api`, slow-client timeouts, a crash guard around WebSocket handling and process-level error handlers.
- Browser storage failures (private mode, sandboxed iframes) can no longer break the app.
- Room codes from the URL and pasted text are validated; saved sessions are shape-checked; share links open with `noopener,noreferrer`.
- Unused `@google/genai`, `dotenv` and the conflicting `esbuild` dev dependency removed; Gemini capability removed from `metadata.json`; `tsx` and `tailwindcss` moved to `dependencies` because `npm start` / the build need them.

## How it was tested
- 89 automated server checks (security abuse cases, clock/timeout, checkmate, rematch colour swap, draws, spectators, rate limits) and 16 engine tests, all passing.
- A real headless Chromium played a full two-player online game (moves both ways, chat with an HTML-injection attempt, resign, rematch) and a game against the Stockfish computer under the production security headers, with no console or CSP errors.
- The type check is clean in both strict and non-strict mode.

## Deployment checklist
1. `npm install`, then `npm run lint` and `npm test`.
2. Cloud Run: **max instances = 1** (rooms live in memory, so several instances would split players).
3. Behind more than one proxy (for example Cloudflare plus a load balancer)? Set `TRUST_PROXY` to the number of hops. Using your own domain? Add it to `ALLOWED_ORIGINS`.
4. Run `npm audit` after installing.
5. Optional: self-host the Google Fonts (they send visitor IPs to Google).
