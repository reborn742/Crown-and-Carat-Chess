# Crown & Carat Chess

A gemstone chess game with local play, a Stockfish computer opponent and online rooms.
No API keys or secrets are required.

## Run locally

```
npm install
npm run dev        # development (Vite dev server)
```

## Run in production

```
npm start          # serves the built client with security headers (CSP, HSTS, ...)
```

`npm start` builds the client automatically the first time if `dist/` does not exist
(or run `npm run build` yourself during deployment). The server runs in secure
production mode whenever `NODE_ENV=production`, `--prod` is passed, or a build exists.
Use `npm run dev` for development.

See `.env.example` for the few optional settings (proxy hops, allowed origins, framing).

## Tests

```
npm test
```

## Security notes

- The server is authoritative: every online move is re-validated against the chess rules
  (`resolveLegalMove`), and the client's move object is never trusted.
- Player tokens are secret, 192-bit random values. They are sent only to their owner;
  other clients only ever see a public player `id`.
- Room codes are 6 random characters; lookups, joins, creation, chat and WebSocket
  connections are rate limited, and request/message sizes are capped.
- Chat accepts only text, emoji reactions and inline JPEG images; names are sanitised.
- The WebSocket only accepts same-origin browsers (or `ALLOWED_ORIGINS`).
- Rooms live in server memory: restarting the server ends all online games, and the
  service must run as a single instance (e.g. Cloud Run max instances = 1).
