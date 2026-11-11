import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { getInitialGameState, makeMove, resolveLegalMove } from './src/game/chessEngine.ts';
import { GameState, PieceColor } from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// "--dev" / "--prod" work on every OS (inline NODE_ENV=... does not work in Windows shells).
// Secure (production) mode is the default whenever a client build exists, so a deployment can
// never accidentally expose the Vite dev server.
const DIST_DIR = path.resolve(__dirname, 'dist');
const hasBuild = () => fs.existsSync(path.join(DIST_DIR, 'index.html'));
const FORCE_DEV = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const IS_PROD =
  !FORCE_DEV &&
  (process.env.NODE_ENV === 'production' || process.argv.includes('--prod') || hasBuild());
const PORT = Number(process.env.PORT) || 3000;

// How many reverse-proxy hops sit in front of this server (Cloud Run = 1).
// 0 means "none": X-Forwarded-For is ignored so clients cannot spoof their IP.
const TRUST_PROXY_HOPS = process.env.TRUST_PROXY
  ? Math.max(0, Number(process.env.TRUST_PROXY) || 0)
  : IS_PROD
  ? 1
  : 0;

// Extra origins (comma separated) allowed to open the WebSocket, e.g. a custom domain.
const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// Who may embed the game in an <iframe> (production CSP only).
const FRAME_ANCESTORS =
  process.env.FRAME_ANCESTORS ||
  "'self' https://aistudio.google.com https://ai.studio https://*.google.com https://*.googleusercontent.com";

const ROOM_CODE_PREFIX = 'ROYAL-';
const ROOM_CODE_LEN = 6; // 32^6 ≈ 1 billion codes
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_RE = /^ROYAL-[2-9A-HJ-NP-Z]{6}$/;

const MAX_ROOMS = 500;
const MAX_SPECTATORS = 30;
const MAX_MESSAGES = 100;
const MAX_IMAGES_PER_ROOM = 8;
const MAX_TEXT_LEN = 1000;
const MAX_NAME_LEN = 24;
const MAX_IMAGE_CHARS = 450_000; // ~330 KB JPEG as a base64 data URL
const MAX_WS_PAYLOAD = MAX_IMAGE_CHARS + 8 * 1024;

const ALLOWED_THEMES = ['diamond-ruby', 'emerald-pearl', 'sapphire-topaz'];
const ALLOWED_CLOCKS = [0, 1, 3, 5, 10, 15, 30, 60];

// ---------------------------------------------------------------------------
// App / server
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY_HOPS);

function clientIp(req: http.IncomingMessage): string {
  if (TRUST_PROXY_HOPS > 0) {
    const xff = String(req.headers['x-forwarded-for'] || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const ip = xff[xff.length - TRUST_PROXY_HOPS];
    if (ip) return ip;
  }
  return req.socket.remoteAddress || 'unknown';
}

// --- Security headers -------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '');
  const isHttps = req.secure || (TRUST_PROXY_HOPS > 0 && forwardedProto.split(',')[0].trim() === 'https');
  if (IS_PROD && isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  // A strict CSP is only applied in production: the Vite dev server needs inline/eval scripts.
  if (IS_PROD) {
    const host = String(req.headers.host || '').replace(/[^a-zA-Z0-9.:-]/g, '');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'", // Stockfish WebAssembly
        "worker-src 'self' blob:", // Stockfish + confetti workers
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        `connect-src 'self' wss://${host} ws://${host}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        `frame-ancestors ${FRAME_ANCESTORS}`,
      ].join('; ')
    );
  }
  next();
});

// --- Body parsing: small by default, larger only for chat (image attachments) ---
const jsonSmall = express.json({ limit: '4kb' });
const jsonChat = express.json({ limit: '600kb' });
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  (/\/chat\/?$/.test(req.path) ? jsonChat : jsonSmall)(req, res, next);
});

// ---------------------------------------------------------------------------
// Rate limiting (in-memory fixed window; no extra dependencies)
// ---------------------------------------------------------------------------
class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private max: number, private windowMs: number) {}

  /** Returns true if the action is allowed, false if the limit is exceeded. */
  take(key: string): boolean {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.max;
  }

  sweep() {
    const now = Date.now();
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

const MIN = 60_000;
const limiters = {
  api: new RateLimiter(1200, 5 * MIN), // every /api request, per IP
  create: new RateLimiter(8, 10 * MIN), // room creation, per IP
  join: new RateLimiter(60, 5 * MIN), // joins, per IP
  probe: new RateLimiter(20, 10 * MIN), // lookups of non-existent rooms (anti-enumeration), per IP
  action: new RateLimiter(120, MIN), // moves / resign / draw / rematch, per participant
  chat: new RateLimiter(10, 10_000), // chat messages, per participant
  chatImage: new RateLimiter(4, MIN), // chat images, per participant
  wsConnect: new RateLimiter(40, MIN), // new WebSocket connections, per IP
};
setInterval(() => Object.values(limiters).forEach(l => l.sweep()), MIN).unref();

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (!limiters.api.take(clientIp(req))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
});

// ---------------------------------------------------------------------------
// Room data
// ---------------------------------------------------------------------------
interface RoomPlayer {
  id: string; // PUBLIC identifier, safe to show to other participants
  token: string; // SECRET credential, never leaves the server except to its owner
  name: string;
  color: PieceColor;
  connected: boolean;
  lastSeen: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PieceColor | 'spectator';
  text?: string;
  imageUrl?: string;
  timestamp: number;
  isReaction?: boolean;
}

interface RoomData {
  id: string;
  createdAt: number;
  lastActivityAt: number;
  status: 'waiting' | 'active' | 'finished';
  themeId: string;
  clockMinutes: number;
  whiteTime: number;
  blackTime: number;
  lastClockTick: number | null;
  whitePlayer: RoomPlayer | null;
  blackPlayer: RoomPlayer | null;
  spectators: RoomPlayer[];
  gameState: GameState;
  rematchRequestedBy: string | null; // player id
  drawOfferBy: string | null; // player id
  resignedById: string | null; // player id
  messages: ChatMessage[];
}

const rooms = new Map<string, RoomData>();
const roomSockets = new Map<string, Set<WebSocket>>();

interface ClientMeta {
  ip: string;
  roomId: string | null;
  token: string | null;
  alive: boolean;
  msgCount: number;
  msgWindowStart: number;
}
const clients = new Map<WebSocket, ClientMeta>();
const wsPerIp = new Map<string, number>();
const MAX_WS_PER_IP = 15;

// ---------------------------------------------------------------------------
// Helpers: ids, tokens, validation, sanitising
// ---------------------------------------------------------------------------
function generateRoomCode(): string | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = '';
    for (let i = 0; i < ROOM_CODE_LEN; i++) suffix += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    const code = `${ROOM_CODE_PREFIX}${suffix}`;
    if (!rooms.has(code)) return code;
  }
  return null;
}

const generateToken = () => crypto.randomBytes(24).toString('base64url'); // 192 bits
const generatePlayerId = () => crypto.randomBytes(6).toString('hex');

function sha256(s: string): Buffer {
  return crypto.createHash('sha256').update(s).digest();
}

/** Constant-time token comparison. */
function sameToken(candidate: unknown, secret: string): boolean {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 128) return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(secret));
}

function normalizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 32) return null;
  let id = raw.trim().toUpperCase();
  if (!id.startsWith(ROOM_CODE_PREFIX)) id = `${ROOM_CODE_PREFIX}${id}`;
  return ROOM_CODE_RE.test(id) ? id : null;
}

// control chars, bidi overrides and zero-width characters (used for spoofing)
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = Array.from(value.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim())
    .slice(0, MAX_NAME_LEN)
    .join('');
  return cleaned || fallback;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = Array.from(
    value
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  )
    .slice(0, MAX_TEXT_LEN)
    .join('');
  return cleaned || undefined;
}

const REACTION_RE = /^[\p{Extended_Pictographic}\u200D\uFE0F]{1,8}$/u;

function isValidChatImage(value: unknown): value is string {
  const PREFIX = 'data:image/jpeg;base64,/9j/'; // JPEG magic bytes FF D8 FF
  return (
    typeof value === 'string' &&
    value.length <= MAX_IMAGE_CHARS &&
    value.startsWith(PREFIX) &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value.slice('data:image/jpeg;base64,'.length))
  );
}

type Role =
  | { kind: 'player'; color: PieceColor; player: RoomPlayer }
  | { kind: 'spectator'; player: RoomPlayer }
  | null;

function roleOf(room: RoomData, token: unknown): Role {
  if (room.whitePlayer && sameToken(token, room.whitePlayer.token)) {
    return { kind: 'player', color: 'w', player: room.whitePlayer };
  }
  if (room.blackPlayer && sameToken(token, room.blackPlayer.token)) {
    return { kind: 'player', color: 'b', player: room.blackPlayer };
  }
  for (const s of room.spectators) {
    if (sameToken(token, s.token)) return { kind: 'spectator', player: s };
  }
  return null;
}

// --- What clients are allowed to see: NEVER includes secret tokens ----------
function publicPlayer(p: RoomPlayer | null) {
  return p ? { id: p.id, name: p.name, color: p.color, connected: p.connected, lastSeen: p.lastSeen } : null;
}

function publicRoom(room: RoomData, includeMessages = false) {
  return {
    id: room.id,
    createdAt: room.createdAt,
    lastActivityAt: room.lastActivityAt,
    status: room.status,
    themeId: room.themeId,
    clockMinutes: room.clockMinutes,
    whiteTime: room.whiteTime,
    blackTime: room.blackTime,
    lastClockTick: room.lastClockTick,
    whitePlayer: publicPlayer(room.whitePlayer),
    blackPlayer: publicPlayer(room.blackPlayer),
    spectators: room.spectators.map(publicPlayer),
    gameState: room.gameState,
    rematchRequestedBy: room.rematchRequestedBy,
    drawOfferBy: room.drawOfferBy,
    resignedById: room.resignedById,
    messages: includeMessages ? room.messages : [],
  };
}

// ---------------------------------------------------------------------------
// Realtime helpers
// ---------------------------------------------------------------------------
function broadcastToRoom(roomId: string, message: unknown, exclude?: WebSocket) {
  const sockets = roomSockets.get(roomId);
  if (!sockets) return;
  const payload = JSON.stringify(message);
  for (const client of sockets) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error(`Error sending to client in room ${roomId}`);
      }
    }
  }
}

function presenceMessage(room: RoomData) {
  return {
    type: 'presence_update',
    whiteConnected: Boolean(room.whitePlayer?.connected),
    blackConnected: Boolean(room.blackPlayer?.connected),
  };
}

/** Deduct elapsed time from the side to move. Whole seconds only, remainder is carried over. */
function settleClocks(room: RoomData) {
  if (room.status !== 'active' || room.clockMinutes === 0 || !room.lastClockTick) return;
  const elapsed = Math.floor((Date.now() - room.lastClockTick) / 1000);
  if (elapsed <= 0) return;

  room.lastClockTick += elapsed * 1000; // keep the sub-second remainder (prevents clock stalling)
  if (room.gameState.turn === 'w') {
    room.whiteTime = Math.max(0, room.whiteTime - elapsed);
    if (room.whiteTime === 0) room.status = 'finished';
  } else {
    room.blackTime = Math.max(0, room.blackTime - elapsed);
    if (room.blackTime === 0) room.status = 'finished';
  }
}

// ---------------------------------------------------------------------------
// Game actions (shared by REST and WebSocket so rules are enforced in one place)
// ---------------------------------------------------------------------------
type ActionFail = { ok: false; status: number; error: string };
type ActionResult = { ok: true; data?: Record<string, unknown> } | ActionFail;
// Explicit type guard: narrows correctly whether or not "strict" is enabled in tsconfig.
const isFail = (r: ActionResult): r is ActionFail => r.ok === false;
const fail = (status: number, error: string): ActionResult => ({ ok: false, status, error });
const ok = (data?: Record<string, unknown>): ActionResult => ({ ok: true, data });

const statusOf = (room: RoomData): RoomData['status'] => room.status;

function touch(room: RoomData) {
  room.lastActivityAt = Date.now();
}

function actionMove(room: RoomData, token: unknown, rawMove: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Only seated players can move.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');

  settleClocks(room);
  if (room.status !== 'active') return fail(409, 'The match is not in progress.');
  if (room.gameState.turn !== role.color) return fail(409, 'It is not your turn to strike.');

  // SECURITY: never trust the client's move object; rebuild it from the engine's legal moves.
  const legalMove = resolveLegalMove(room.gameState, rawMove);
  if (!legalMove) return fail(400, 'Illegal move.');

  const next = makeMove(room.gameState, legalMove);
  room.gameState = next;
  room.drawOfferBy = null; // a pending draw offer lapses when a move is played
  room.lastClockTick = Date.now();
  touch(room);

  if (next.isCheckmate || next.isStalemate || next.isDraw) room.status = 'finished';

  const playedMove = next.history[next.history.length - 1];
  broadcastToRoom(room.id, {
    type: 'move_made',
    move: playedMove,
    gameState: room.gameState,
    whiteTime: room.whiteTime,
    blackTime: room.blackTime,
  });
  return ok();
}

function actionResign(room: RoomData, token: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Spectators cannot yield the match.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');
  if (room.status === 'finished') return ok();
  if (room.status !== 'active') return fail(409, 'The match has not started yet.');

  const resignedColor: PieceColor = role.color;
  const winnerColor: PieceColor = role.color === 'w' ? 'b' : 'w';

  settleClocks(room);
  if (statusOf(room) === 'finished') return ok();
  room.status = 'finished';
  room.resignedById = role.player.id;
  room.gameState = { ...room.gameState, winner: winnerColor, resignedBy: resignedColor };
  room.drawOfferBy = null;
  touch(room);

  broadcastToRoom(room.id, {
    type: 'match_resigned',
    resignedById: role.player.id,
    resignedColor,
    winner: winnerColor,
    room: publicRoom(room),
  });
  return ok();
}

function finishAsDraw(room: RoomData) {
  settleClocks(room);
  room.status = 'finished';
  room.gameState = { ...room.gameState, isDraw: true, drawReason: 'mutual-agreement', winner: 'draw' };
  room.drawOfferBy = null;
  touch(room);
  broadcastToRoom(room.id, { type: 'draw_accepted', room: publicRoom(room) });
}

function actionOfferDraw(room: RoomData, token: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Spectators cannot propose a draw.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');
  if (room.status === 'finished') return ok();
  if (room.status !== 'active') return fail(409, 'The match has not started yet.');

  // If the opponent already offered, offering back is an acceptance.
  if (room.drawOfferBy && room.drawOfferBy !== role.player.id) {
    finishAsDraw(room);
    return ok({ accepted: true });
  }

  if (room.drawOfferBy === role.player.id) return ok({ waitingForOther: true });
  room.drawOfferBy = role.player.id;
  touch(room);
  broadcastToRoom(room.id, { type: 'draw_offered', byId: role.player.id, byColor: role.color });
  return ok({ waitingForOther: true });
}

function actionAcceptDraw(room: RoomData, token: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Spectators cannot accept a draw.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');
  if (room.status === 'finished') return ok();
  if (room.status !== 'active') return fail(409, 'The match has not started yet.');

  // SECURITY: a draw can only be accepted if the OPPONENT actually offered one.
  if (!room.drawOfferBy || room.drawOfferBy === role.player.id) return fail(409, 'There is no draw offer to accept.');

  finishAsDraw(room);
  return ok();
}

function actionDeclineDraw(room: RoomData, token: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Spectators cannot decline a draw.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');
  if (!room.drawOfferBy || room.drawOfferBy === role.player.id) return fail(409, 'There is no draw offer to decline.');

  const offeringId = room.drawOfferBy;
  room.drawOfferBy = null;
  touch(room);
  broadcastToRoom(room.id, { type: 'draw_declined', byId: role.player.id, offeringId });
  return ok();
}

function actionRematch(room: RoomData, token: unknown): ActionResult {
  const role = roleOf(room, token);
  if (!role || role.kind !== 'player') return fail(403, 'Only seated players can request a rematch.');
  if (!limiters.action.take(`act:${role.player.id}`)) return fail(429, 'Too many actions.');
  settleClocks(room);
  if (room.status !== 'finished') return fail(409, 'A rematch can only be requested after the match ends.');
  if (!room.whitePlayer || !room.blackPlayer) return fail(409, 'Both players must be seated for a rematch.');

  if (room.rematchRequestedBy && room.rematchRequestedBy !== role.player.id) {
    // Both agreed: swap colours and reset the board.
    const oldWhite = room.whitePlayer;
    const oldBlack = room.blackPlayer;
    oldWhite.color = 'b';
    oldBlack.color = 'w';
    room.whitePlayer = oldBlack;
    room.blackPlayer = oldWhite;

    room.gameState = getInitialGameState();
    room.status = 'active';
    room.whiteTime = room.clockMinutes > 0 ? room.clockMinutes * 60 : -1;
    room.blackTime = room.clockMinutes > 0 ? room.clockMinutes * 60 : -1;
    room.lastClockTick = Date.now();
    room.rematchRequestedBy = null;
    room.drawOfferBy = null;
    room.resignedById = null;
    touch(room);

    broadcastToRoom(room.id, { type: 'rematch_started', room: publicRoom(room) });
    return ok({ restarted: true });
  }

  if (room.rematchRequestedBy === role.player.id) return ok({ waitingForOther: true }); // duplicate submit
  room.rematchRequestedBy = role.player.id;
  touch(room);
  broadcastToRoom(room.id, { type: 'rematch_offered', byId: role.player.id });
  return ok({ waitingForOther: true });
}

function actionChat(
  room: RoomData,
  token: unknown,
  payload: { text?: unknown; imageUrl?: unknown; isReaction?: unknown }
): ActionResult {
  const role = roleOf(room, token);
  if (!role) return fail(403, 'Unauthorized to chat in this chamber.');
  const pid = role.player.id;
  if (!limiters.chat.take(`chat:${pid}`)) return fail(429, 'You are sending messages too quickly.');

  const isReaction = payload.isReaction === true;
  let text = cleanText(payload.text);
  let imageUrl: string | undefined;

  if (isReaction) {
    if (!text || !REACTION_RE.test(text)) return fail(400, 'Invalid reaction.');
  } else if (payload.imageUrl !== undefined && payload.imageUrl !== null && payload.imageUrl !== '') {
    if (!isValidChatImage(payload.imageUrl)) return fail(400, 'Unsupported or oversized image.');
    if (!limiters.chatImage.take(`img:${pid}`)) return fail(429, 'You are sharing images too quickly.');
    imageUrl = payload.imageUrl;
  }
  if (!text && !imageUrl) return fail(400, 'Empty message.');

  const chatMsg: ChatMessage = {
    id: crypto.randomUUID(),
    senderId: pid,
    senderName: role.player.name,
    senderColor: role.kind === 'player' ? role.color : 'spectator',
    text,
    imageUrl,
    timestamp: Date.now(),
    isReaction,
  };

  room.messages.push(chatMsg);
  while (room.messages.length > MAX_MESSAGES) room.messages.shift();

  // Bound memory: keep image data for the most recent images only.
  let withImages = room.messages.filter(m => m.imageUrl);
  while (withImages.length > MAX_IMAGES_PER_ROOM) {
    withImages[0].imageUrl = undefined;
    withImages = withImages.slice(1);
  }
  touch(room);

  broadcastToRoom(room.id, { type: 'chat_message', message: chatMsg });
  return ok({ message: chatMsg });
}

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------
function deleteRoom(id: string) {
  const sockets = roomSockets.get(id);
  if (sockets) for (const ws of sockets) ws.close(1001, 'Room closed');
  roomSockets.delete(id);
  rooms.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    const idleFor = now - room.lastActivityAt;
    const stale = idleFor > 4 * 60 * 60 * 1000;
    const finishedLongAgo = room.status === 'finished' && idleFor > 60 * MIN;
    const abandoned =
      room.status === 'waiting' &&
      !room.whitePlayer?.connected &&
      !room.blackPlayer?.connected &&
      now - room.createdAt > 30 * MIN;
    if (stale || finishedLongAgo || abandoned) deleteRoom(id);
  }
}, 5 * MIN).unref();

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------
function getRoomOr404(req: Request, res: Response): RoomData | null {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = roomId ? rooms.get(roomId) : undefined;
  if (!room) {
    // Throttle repeated misses so room codes cannot be enumerated.
    if (!limiters.probe.take(clientIp(req))) {
      res.setHeader('Retry-After', '600');
      res.status(429).json({ error: 'Too many failed lookups. Try again later.' });
      return null;
    }
    res.status(404).json({ error: 'Royal Chamber not found. Check the room code.' });
    return null;
  }
  return room;
}

const bodyOf = (req: Request): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

function sendResult(res: Response, room: RoomData, result: ActionResult) {
  if (isFail(result)) return res.status(result.status).json({ error: result.error });
  return res.json({ success: true, ...(result.data || {}), room: publicRoom(room) });
}

// Create room
app.post('/api/rooms/create', (req: Request, res: Response) => {
  const ip = clientIp(req);
  if (!limiters.create.take(ip)) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ error: 'You are creating chambers too quickly. Try again later.' });
  }
  if (rooms.size >= MAX_ROOMS) {
    return res.status(503).json({ error: 'The kingdom is full right now. Please try again later.' });
  }

  const body = bodyOf(req);
  const themeId = typeof body.themeId === 'string' && ALLOWED_THEMES.includes(body.themeId) ? body.themeId : 'diamond-ruby';
  const clockMinutes =
    typeof body.clockMinutes === 'number' && ALLOWED_CLOCKS.includes(body.clockMinutes) ? body.clockMinutes : 10;

  let hostColor: PieceColor = 'w';
  if (body.preferredColor === 'b') hostColor = 'b';
  else if (body.preferredColor === 'random') hostColor = crypto.randomInt(2) === 0 ? 'w' : 'b';

  const roomId = generateRoomCode();
  if (!roomId) return res.status(503).json({ error: 'Could not allocate a chamber. Try again.' });

  const hostPlayer: RoomPlayer = {
    id: generatePlayerId(),
    token: generateToken(),
    name: cleanName(body.hostName, hostColor === 'w' ? 'White Monarch' : 'Dark Monarch'),
    color: hostColor,
    connected: false,
    lastSeen: Date.now(),
  };

  const seconds = clockMinutes > 0 ? clockMinutes * 60 : -1;
  const room: RoomData = {
    id: roomId,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    status: 'waiting',
    themeId,
    clockMinutes,
    whiteTime: seconds,
    blackTime: seconds,
    lastClockTick: null,
    whitePlayer: hostColor === 'w' ? hostPlayer : null,
    blackPlayer: hostColor === 'b' ? hostPlayer : null,
    spectators: [],
    gameState: getInitialGameState(),
    rematchRequestedBy: null,
    drawOfferBy: null,
    resignedById: null,
    messages: [],
  };
  rooms.set(roomId, room);

  res.json({
    success: true,
    roomId,
    playerToken: hostPlayer.token, // returned ONLY to the creator
    playerId: hostPlayer.id,
    playerColor: hostColor,
    room: publicRoom(room, true),
  });
});

// Join room
app.post('/api/rooms/:roomId/join', (req: Request, res: Response) => {
  if (!limiters.join.take(clientIp(req))) {
    res.setHeader('Retry-After', '300');
    return res.status(429).json({ error: 'Too many join attempts. Please wait a moment.' });
  }
  const room = getRoomOr404(req, res);
  if (!room) return;

  const body = bodyOf(req);

  // 1. Reconnecting participant (valid secret token)
  if (body.token) {
    const role = roleOf(room, body.token);
    if (role) {
      role.player.connected = role.kind === 'player' ? true : role.player.connected;
      role.player.lastSeen = Date.now();
      touch(room);
      return res.json({
        success: true,
        roomId: room.id,
        playerToken: body.token,
        playerId: role.player.id,
        playerColor: role.kind === 'player' ? role.color : 'spectator',
        room: publicRoom(room, true),
      });
    }
  }

  const newToken = generateToken();
  const makePlayer = (color: PieceColor, fallbackName: string): RoomPlayer => ({
    id: generatePlayerId(),
    token: newToken,
    name: cleanName(body.name, fallbackName),
    color,
    connected: true,
    lastSeen: Date.now(),
  });

  // 2. Open player seat
  if (!room.whitePlayer || !room.blackPlayer) {
    const color: PieceColor = !room.whitePlayer ? 'w' : 'b';
    const player = makePlayer(color, color === 'w' ? 'White Monarch' : 'Imperial Ruby Challenger');
    if (color === 'w') room.whitePlayer = player;
    else room.blackPlayer = player;

    if (room.whitePlayer && room.blackPlayer) {
      room.status = 'active';
      room.lastClockTick = Date.now();
    }
    touch(room);

    broadcastToRoom(room.id, { type: 'player_joined', player: publicPlayer(player), room: publicRoom(room) });
    return res.json({
      success: true,
      roomId: room.id,
      playerToken: newToken,
      playerId: player.id,
      playerColor: color,
      room: publicRoom(room, true),
    });
  }

  // 3. Room full: spectator
  if (room.spectators.length >= MAX_SPECTATORS) {
    return res.status(403).json({ error: 'This chamber has no more room for spectators.' });
  }
  const spectator = makePlayer('w', `Royal Spectator ${room.spectators.length + 1}`);
  room.spectators.push(spectator);
  touch(room);
  return res.json({
    success: true,
    roomId: room.id,
    playerToken: newToken,
    playerId: spectator.id,
    playerColor: 'spectator',
    room: publicRoom(room, true),
  });
});

// Room state (public view; contains no secrets and no chat payloads)
app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  settleClocks(room);
  res.json({ success: true, room: publicRoom(room) });
});

app.post('/api/rooms/:roomId/move', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  const body = bodyOf(req);
  sendResult(res, room, actionMove(room, body.token, body.move));
});

app.post('/api/rooms/:roomId/rematch', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  sendResult(res, room, actionRematch(room, bodyOf(req).token));
});

app.post('/api/rooms/:roomId/resign', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  sendResult(res, room, actionResign(room, bodyOf(req).token));
});

app.post('/api/rooms/:roomId/draw-offer', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  sendResult(res, room, actionOfferDraw(room, bodyOf(req).token));
});

app.post('/api/rooms/:roomId/draw-accept', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  sendResult(res, room, actionAcceptDraw(room, bodyOf(req).token));
});

app.post('/api/rooms/:roomId/draw-decline', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  sendResult(res, room, actionDeclineDraw(room, bodyOf(req).token));
});

app.post('/api/rooms/:roomId/chat', (req: Request, res: Response) => {
  const room = getRoomOr404(req, res);
  if (!room) return;
  const body = bodyOf(req);
  const result = actionChat(room, body.token, body as any);
  if (isFail(result)) return res.status(result.status).json({ error: result.error });
  res.json({ success: true, message: result.data?.message });
});

// Unknown API routes: JSON 404 (never fall through to the SPA)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD, perMessageDeflate: false });

function sendWs(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function detachFromRoom(ws: WebSocket) {
  const meta = clients.get(ws);
  if (!meta || !meta.roomId) return;
  const { roomId, token } = meta;
  meta.roomId = null;
  meta.token = null;

  const sockets = roomSockets.get(roomId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) roomSockets.delete(roomId);
  }

  const room = rooms.get(roomId);
  if (!room || !token) return;
  const role = roleOf(room, token);
  if (role && role.kind === 'player') {
    // Only mark disconnected if the same participant has no other open socket (e.g. a second tab).
    const stillConnected = [...(roomSockets.get(roomId) || [])].some(s => {
      const m = clients.get(s);
      return m && m.token === token;
    });
    if (!stillConnected) {
      role.player.connected = false;
      role.player.lastSeen = Date.now();
      broadcastToRoom(roomId, presenceMessage(room));
    }
  }
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = clientIp(req);
  clients.set(ws, { ip, roomId: null, token: null, alive: true, msgCount: 0, msgWindowStart: Date.now() });
  wsPerIp.set(ip, (wsPerIp.get(ip) || 0) + 1);

  ws.on('pong', () => {
    const m = clients.get(ws);
    if (m) m.alive = true;
  });

  ws.on('message', (data: Buffer | string) => {
    try {
      handleWsMessage(ws, data);
    } catch (err: any) {
      console.error('WebSocket handler error:', err?.message || err);
    }
  });

  function handleWsMessage(ws: WebSocket, data: Buffer | string) {
    const meta = clients.get(ws);
    if (!meta) return;

    // Per-socket message rate limit: 60 messages / 10 s
    const now = Date.now();
    if (now - meta.msgWindowStart > 10_000) {
      meta.msgWindowStart = now;
      meta.msgCount = 0;
    }
    if (++meta.msgCount > 60) {
      ws.close(1008, 'Rate limit exceeded');
      return;
    }

    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

    if (msg.type === 'ping') {
      sendWs(ws, { type: 'pong' });
      return;
    }

    if (msg.type === 'join_room') {
      const roomId = normalizeRoomId(msg.roomId);
      const room = roomId ? rooms.get(roomId) : undefined;
      if (!room || !roomId) {
        sendWs(ws, { type: 'error', message: 'Chamber not found' });
        return;
      }
      const token = typeof msg.token === 'string' && msg.token.length <= 128 ? msg.token : null;

      // Only seated players and spectators who joined through the lobby hold a valid token.
      // Anonymous sockets get nothing (no chat, no presence) and can never act.
      if (!roleOf(room, token)) {
        sendWs(ws, { type: 'error', message: 'Join the chamber first.' });
        return;
      }

      detachFromRoom(ws); // a socket belongs to at most one room
      meta.roomId = roomId;
      meta.token = token;
      if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
      roomSockets.get(roomId)!.add(ws);

      const role = roleOf(room, token);
      if (role && role.kind === 'player') {
        role.player.connected = true;
        role.player.lastSeen = Date.now();
      }
      settleClocks(room);

      sendWs(ws, { type: 'room_state', room: publicRoom(room, true) });
      broadcastToRoom(roomId, presenceMessage(room), ws);
      return;
    }

    // Every other message acts on the room THIS socket joined, using THIS socket's credential.
    if (!meta.roomId) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;

    let result: ActionResult | null = null;
    switch (msg.type) {
      case 'make_move':
        result = actionMove(room, meta.token, msg.move);
        if (isFail(result)) sendWs(ws, { type: 'room_state', room: publicRoom(room) }); // resync the client
        break;
      case 'request_rematch':
        result = actionRematch(room, meta.token);
        break;
      case 'resign':
        result = actionResign(room, meta.token);
        break;
      case 'offer_draw':
        result = actionOfferDraw(room, meta.token);
        break;
      case 'accept_draw':
        result = actionAcceptDraw(room, meta.token);
        break;
      case 'decline_draw':
        result = actionDeclineDraw(room, meta.token);
        break;
      case 'send_chat':
        result = actionChat(room, meta.token, msg);
        break;
      default:
        return;
    }
    if (result && isFail(result)) sendWs(ws, { type: 'error', message: result.error });
  }

  ws.on('close', () => {
    detachFromRoom(ws);
    clients.delete(ws);
    const left = (wsPerIp.get(ip) || 1) - 1;
    if (left <= 0) wsPerIp.delete(ip);
    else wsPerIp.set(ip, left);
  });

  ws.on('error', () => ws.terminate());
});

// Drop dead connections
setInterval(() => {
  for (const [ws, meta] of clients) {
    if (!meta.alive) {
      ws.terminate();
      continue;
    }
    meta.alive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  }
}, 30_000).unref();

function isOriginAllowed(req: http.IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return !IS_PROD; // browsers always send Origin; reject headless clients in production
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  if (EXTRA_ALLOWED_ORIGINS.includes(origin.toLowerCase())) return true;
  const hosts = [req.headers.host, TRUST_PROXY_HOPS > 0 ? req.headers['x-forwarded-host'] : undefined]
    .flatMap(h => String(h || '').split(','))
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.includes(originHost);
}

server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try {
    pathname = new URL(req.url || '', 'http://localhost').pathname;
  } catch {
    socket.destroy();
    return;
  }

  if (pathname !== '/ws') {
    // In dev the Vite HMR socket must be left alone; in production nothing else is served.
    if (IS_PROD) socket.destroy();
    return;
  }

  const ip = clientIp(req);
  if (!isOriginAllowed(req)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  if (!limiters.wsConnect.take(ip) || (wsPerIp.get(ip) || 0) >= MAX_WS_PER_IP) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});

// ---------------------------------------------------------------------------
// Vite (dev) / static files (prod)
// ---------------------------------------------------------------------------
async function setupVite() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, ws: { server }, hmr: { server } },
      appType: 'spa',
    });
    app.use(express.static(path.resolve(__dirname, 'public'), { dotfiles: 'ignore' }));
    app.use(vite.middlewares);
  } else {
    if (!hasBuild()) {
      console.log('No client build found (dist/). Building it now...');
      const { build } = await import('vite');
      await build({ root: __dirname, logLevel: 'warn' });
      if (!hasBuild()) throw new Error('Client build failed: dist/index.html was not produced.');
    }
    app.use(express.static(DIST_DIR, { dotfiles: 'ignore', index: false }));
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  // Final error handler: never leak stack traces or internal messages.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Malformed request' });
    }
    console.error('Unhandled server error:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Slow-client protections (Slowloris-style attacks)
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Crown & Carat Royal Chess Server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

// A stray error must never take every running game down with it.
process.on('unhandledRejection', reason => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', err => console.error('Uncaught exception:', err));

setupVite().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
