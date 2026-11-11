# Crown & Carat Chess

A polished, gemstone-inspired chess experience with a built-in computer opponent and real-time online multiplayer. Play on a richly animated board, choose a visual theme, review the move history, and challenge a friend with a shareable room code.

> **Project status:** The repository contains a runnable Vite/React client and a Node.js/Express multiplayer server. Online rooms are held in server memory, so the deployment requirements below are important.

## Features

### Chess gameplay
- Play against the computer with **Easy**, **Medium**, and **Hard** difficulty settings.
- Computer moves use **Stockfish 19** in a browser Web Worker when available.
- Automatic fallback to the built-in **Royal Minimax** engine if Stockfish cannot start or complete a search.
- Legal move validation, check and checkmate detection, stalemate and draw handling.
- Castling, en passant, pawn promotion, move history, captured-piece displays, and board flipping.
- Optional chess clocks, including untimed play.

### Online multiplayer
- Create a room and invite an opponent with a room code or shareable link.
- Join an existing room and play as White or Black; spectators are supported.
- Real-time synchronization over WebSockets, with periodic REST polling as a fallback.
- Player presence, clocks, resignations, draw offers, rematches, in-room chat, and emoji reactions.
- Reconnect support and locally saved room-session details.

### Visual experience
- Three gemstone-inspired board and piece themes: **Diamond & Ruby**, **Emerald & Pearl**, and **Sapphire & Topaz**.
- Animated piece movement, capture effects, particles, victory effects, and sound.
- Settings for sound, volume, animation intensity, board orientation, and optional 3D tilt.

## Tech stack

| Area | Technology |
|---|---|
| UI | React 19, TypeScript |
| Build and development | Vite 8 |
| Styling | Tailwind CSS 4 |
| Motion and effects | Motion, Canvas, canvas-confetti |
| Icons | Lucide React |
| Server | Node.js, Express 4 |
| Multiplayer transport | WebSocket (`ws`) with REST fallback |
| Chess engine | Stockfish 19 (Web Worker, WASM/ASM.js fallback) and a TypeScript Minimax engine |
| Tests | Node test runner through `tsx` |

## Requirements

- **Node.js 20 or newer**
- npm (included with Node.js)

No API key, database, or third-party account is required for local development.

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repository>.git
cd <your-repository>

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open the local URL printed by Vite/Express in your terminal (normally `http://localhost:3000`).

The development command runs the application in development mode. Use it for local work; use the production command for a deployment.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the application in development mode. |
| `npm run build` | Build the client into `dist/`. |
| `npm start` | Start the server in production mode. If `dist/index.html` is missing, the server builds the client first. |
| `npm run preview` | Run Vite's local preview server for the built client. |
| `npm run lint` | Run the TypeScript compiler without emitting files (`tsc --noEmit`). |
| `npm test` | Run the chess-engine and room-engine test files. |
| `npm run clean` | Remove generated build output and the generated server bundle (Unix-style `rm -rf`). |

Recommended local verification:

```bash
npm run lint
npm test
npm run build
```

## Production deployment

Build and start the application with:

```bash
npm install
npm run lint
npm test
npm run build
npm start
```

The production server serves the built client and applies production security headers, including a Content Security Policy. HTTPS should be terminated at your hosting platform or reverse proxy.

### Important multiplayer hosting constraint

**Run one application instance.** Room state is stored in the server process's memory; it is not persisted to a database or shared between instances. If two server instances receive requests for the same room, they will not share the same room state. A server restart also ends all active online rooms.

Choose a Node.js hosting environment that supports:
- A long-running Node.js process.
- WebSocket connections and HTTP requests to the same application.
- HTTPS/WSS in production.
- A single active application instance for this in-memory room implementation.

If you deploy behind a reverse proxy, configure `TRUST_PROXY` to match the number of trusted proxy hops. Do not scale horizontally unless room state is first moved to a shared, persistent store and the multiplayer architecture is updated accordingly.

## Optional environment configuration

Copy `.env.example` if you want a local reference for the optional settings. The application does not require environment variables or secrets to run.

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port. Defaults to `3000`. |
| `TRUST_PROXY` | Number of trusted reverse-proxy hops used when determining client IP addresses. Defaults to `0` in development and `1` in production. |
| `ALLOWED_ORIGINS` | Comma-separated additional origins allowed to connect to the multiplayer WebSocket. |
| `FRAME_ANCESTORS` | Overrides the production Content Security Policy `frame-ancestors` directive for sites allowed to embed the game. |

Example:

```env
PORT=3000
TRUST_PROXY=1
ALLOWED_ORIGINS=https://chess.example.com
FRAME_ANCESTORS='self' https://chess.example.com
```

Only set `TRUST_PROXY` to a value that matches infrastructure you control. Incorrect proxy trust configuration can undermine IP-based rate limiting.

## Multiplayer API

The Express server exposes these room endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/rooms/create` | Create a room. |
| `POST` | `/api/rooms/:roomId/join` | Join a room. |
| `GET` | `/api/rooms/:roomId` | Retrieve room state. |
| `POST` | `/api/rooms/:roomId/move` | Submit a move. |
| `POST` | `/api/rooms/:roomId/rematch` | Request a rematch. |
| `POST` | `/api/rooms/:roomId/resign` | Resign from a game. |
| `POST` | `/api/rooms/:roomId/draw-offer` | Offer a draw. |
| `POST` | `/api/rooms/:roomId/draw-accept` | Accept a draw offer. |
| `POST` | `/api/rooms/:roomId/draw-decline` | Decline a draw offer. |
| `POST` | `/api/rooms/:roomId/chat` | Send a room chat message. |

The WebSocket endpoint is `/ws`. The client uses it for live room events and falls back to polling and REST actions when necessary.

## Security

Online multiplayer actions are validated by the server rather than trusted from the browser. The current implementation includes:

- Cryptographically generated 192-bit player tokens; a player's secret token is only returned to that player.
- Server-side legal-move resolution against the chess engine.
- Room-code validation and rate limits for room creation, joining, probing, actions, chat, and WebSocket connections.
- WebSocket origin checks and room-scoped socket authorization.
- Request and WebSocket payload size limits.
- Sanitization of player names and chat content; chat images are restricted to size-limited inline JPEG data URLs.
- Production security headers, including CSP, HSTS on HTTPS requests, `X-Content-Type-Options`, and `Referrer-Policy`.
- Validation of room actions against game status, player authorization, and clock state.

See [`SECURITY-FIXES.md`](./SECURITY-FIXES.md) for the implementation review and its documented verification notes.

## Tests

Run:

```bash
npm test
```

The test command executes:

- `src/game/chessEngine.test.ts`
- `src/game/roomEngine.test.ts`

For a fuller pre-deployment check, also run `npm run lint` and `npm run build`. The security review document records additional checks performed on the reviewed build; those results should not be interpreted as a guarantee for every future change or deployment.

## Project structure

```text
.
├── public/
│   └── stockfish/              # Stockfish worker scripts and WASM binary
├── src/
│   ├── components/             # Board, pieces, dialogs, controls, chat, effects
│   ├── engine/                  # Stockfish worker and engine fallback controller
│   ├── game/
│   │   ├── ai.ts                # Built-in Minimax computer opponent
│   │   ├── chessEngine.ts       # Chess rules, legal moves, game state
│   │   ├── roomClient.ts        # Multiplayer API and WebSocket client
│   │   ├── themes.ts            # Gemstone theme definitions
│   │   └── *.test.ts            # Chess and room-engine tests
│   ├── App.tsx                  # Main application and game orchestration
│   ├── index.css                # Global styles
│   └── main.tsx                 # Client entry point
├── server.ts                    # Express API, WebSocket server, room authority
├── SECURITY-FIXES.md            # Security review and deployment notes
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Known limitations

- Online room state is in memory. Active rooms are lost when the server restarts, and this version must run as a single instance.
- This project does not currently provide accounts, persistent match history, matchmaking, or a database-backed leaderboard.
- The computer opponent's strength and response time depend on the available engine path and selected difficulty. If Stockfish is unavailable, the application uses the built-in Minimax fallback.
- Chat image attachments are limited to inline JPEG data URLs and are subject to server-side size and rate limits.

## Contributing

1. Fork the repository.
2. Create a focused feature branch.
3. Make the change and add or update tests where appropriate.
4. Run `npm run lint`, `npm test`, and `npm run build`.
5. Open a pull request describing the change and the verification performed.

## License

No project-level license file was included in this source archive. Add a `LICENSE` file and select a license before presenting the repository as open source. Also review the license terms for bundled third-party assets, including Stockfish, before redistributing the project.
