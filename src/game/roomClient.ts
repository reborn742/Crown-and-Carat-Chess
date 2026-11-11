import { ChatMessage, Move, PieceColor, RoomData, RoomPlayer, ThemeId } from './types';

export interface CreateRoomOptions {
  preferredColor?: 'w' | 'b' | 'random';
  themeId?: ThemeId;
  clockMinutes?: number;
  hostName?: string;
}

export interface JoinRoomOptions {
  token?: string;
  name?: string;
}

export interface RoomSession {
  roomId: string;
  token: string; // SECRET credential: keep in memory/sessionStorage only, never log or share
  playerId: string;
  color: PieceColor | 'spectator';
  isHost: boolean;
}

const STORAGE_KEY = 'crown_carat_room_session';

const ROOM_CODE_RE = /^ROYAL-[2-9A-HJ-NP-Z]{6}$/;

/** Normalises user input into a valid room code, or returns null. */
export function normalizeRoomCode(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length > 64) return null;
  let id = raw.trim().toUpperCase();
  if (!id.startsWith('ROYAL-')) id = `ROYAL-${id}`;
  return ROOM_CODE_RE.test(id) ? id : null;
}

function cleanRoomId(roomId: string): string {
  const id = normalizeRoomCode(roomId);
  if (!id) throw new Error('Invalid chamber code');
  return id;
}

export function saveRoomSession(session: RoomSession | null) {
  try {
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Storage blocked (private mode / sandboxed iframe): the game still works, it just can't resume after a reload.
  }
}

export function loadSavedRoomSession(): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Never trust stored data blindly: validate its shape.
    if (
      !s ||
      typeof s.roomId !== 'string' ||
      !ROOM_CODE_RE.test(s.roomId) ||
      typeof s.token !== 'string' ||
      s.token.length > 128 ||
      typeof s.playerId !== 'string' ||
      !['w', 'b', 'spectator'].includes(s.color) ||
      typeof s.isHost !== 'boolean'
    ) {
      return null;
    }
    return s as RoomSession;
  } catch {
    return null;
  }
}

// REST API Methods
export async function apiCreateRoom(opts: CreateRoomOptions): Promise<{
  roomId: string;
  playerToken: string;
  playerId: string;
  playerColor: PieceColor;
  room: RoomData;
}> {
  const res = await fetch('/api/rooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create room');
  }

  return res.json();
}

export async function apiJoinRoom(
  roomId: string,
  opts: JoinRoomOptions = {}
): Promise<{
  roomId: string;
  playerToken: string;
  playerId: string;
  playerColor: PieceColor | 'spectator';
  room: RoomData;
}> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to join room');
  }

  return res.json();
}

export async function apiGetRoom(roomId: string): Promise<RoomData> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}`);
  if (!res.ok) {
    throw new Error('Room not found');
  }
  const data = await res.json();
  return data.room;
}

export async function apiSendMove(
  roomId: string,
  token: string,
  move: Move
): Promise<{ success: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, move }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Move rejected');
  }

  return res.json();
}

export async function apiRequestRematch(
  roomId: string,
  token: string
): Promise<{ success: boolean; restarted?: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/rematch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to request rematch');
  }

  return res.json();
}

export async function apiSendChatMessage(
  roomId: string,
  token: string,
  payload: { text?: string; imageUrl?: string; isReaction?: boolean }
): Promise<{ success: boolean; message: ChatMessage }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send chat message');
  }

  return res.json();
}

export async function apiResign(
  roomId: string,
  token: string
): Promise<{ success: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/resign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to resign');
  }

  return res.json();
}

export async function apiOfferDraw(
  roomId: string,
  token: string
): Promise<{ success: boolean; accepted?: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/draw-offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to offer draw');
  }

  return res.json();
}

export async function apiAcceptDraw(
  roomId: string,
  token: string
): Promise<{ success: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/draw-accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to accept draw');
  }

  return res.json();
}

export async function apiDeclineDraw(
  roomId: string,
  token: string
): Promise<{ success: boolean; room: RoomData }> {
  const cleanId = cleanRoomId(roomId);
  const res = await fetch(`/api/rooms/${cleanId}/draw-decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to decline draw');
  }

  return res.json();
}

// WebSocket Real-Time Connection
export class RoomSocketController {
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private pollInterval: any = null;
  private roomId: string;
  private token: string;
  private isDestroyed = false;

  public onRoomState?: (room: RoomData) => void;
  public onMoveMade?: (payload: {
    move: Move;
    gameState: any;
    whiteTime: number;
    blackTime: number;
  }) => void;
  public onPlayerJoined?: (player: RoomPlayer, room: RoomData) => void;
  public onPresenceUpdate?: (whiteConnected: boolean, blackConnected: boolean) => void;
  public onRematchOffered?: (byId: string) => void;
  public onRematchStarted?: (room: RoomData) => void;
  public onMatchResigned?: (payload: {
    resignedById: string;
    resignedColor: PieceColor;
    winner: PieceColor;
    room: RoomData;
  }) => void;
  public onDrawOffered?: (payload: { byId: string; byColor: PieceColor }) => void;
  public onDrawAccepted?: (payload: { room: RoomData }) => void;
  public onDrawDeclined?: (payload: { byId: string; offeringId?: string }) => void;
  public onChatMessage?: (message: ChatMessage) => void;
  public onConnectionChange?: (connected: boolean) => void;

  constructor(roomId: string, token: string) {
    this.roomId = roomId;
    this.token = token;
    this.connect();
    this.startPollingFallback();
  }

  private connect() {
    if (this.isDestroyed) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onConnectionChange?.(true);
        // Join room
        this.send({
          type: 'join_room',
          roomId: this.roomId,
          token: this.token,
        });

        // Start ping
        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping' });
          }
        }, 12000);
      };

      this.ws.onmessage = evt => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'room_state') {
            this.onRoomState?.(msg.room);
          } else if (msg.type === 'move_made') {
            this.onMoveMade?.(msg);
          } else if (msg.type === 'player_joined') {
            this.onPlayerJoined?.(msg.player, msg.room);
          } else if (msg.type === 'presence_update') {
            this.onPresenceUpdate?.(msg.whiteConnected, msg.blackConnected);
          } else if (msg.type === 'rematch_offered') {
            this.onRematchOffered?.(msg.byId);
          } else if (msg.type === 'rematch_started') {
            this.onRematchStarted?.(msg.room);
          } else if (msg.type === 'match_resigned') {
            this.onMatchResigned?.(msg);
          } else if (msg.type === 'draw_offered') {
            this.onDrawOffered?.(msg);
          } else if (msg.type === 'draw_accepted') {
            this.onDrawAccepted?.(msg);
          } else if (msg.type === 'draw_declined') {
            this.onDrawDeclined?.(msg);
          } else if (msg.type === 'chat_message') {
            this.onChatMessage?.(msg.message);
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.onConnectionChange?.(false);
        clearInterval(this.pingInterval);
        // Attempt reconnect in 3s if not destroyed
        if (!this.isDestroyed) {
          setTimeout(() => this.connect(), 3000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      // WS initialization failed, polling fallback will handle sync
    }
  }

  private startPollingFallback() {
    // Poll every 2.5s as resilient backup
    this.pollInterval = setInterval(async () => {
      if (this.isDestroyed) return;
      try {
        const room = await apiGetRoom(this.roomId);
        this.onRoomState?.(room);
      } catch {
        // Ignored
      }
    }, 2500);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  public sendMove(move: Move) {
    const sent = this.send({
      type: 'make_move',
      roomId: this.roomId,
      token: this.token,
      move,
    });

    // Also call REST endpoint if WS wasn't open or as reliable backup
    if (!sent) {
      apiSendMove(this.roomId, this.token, move).catch(err => {
        console.error('REST move fallback failed:', err);
      });
    }
  }

  public requestRematch() {
    this.send({
      type: 'request_rematch',
      roomId: this.roomId,
      token: this.token,
    });
    apiRequestRematch(this.roomId, this.token).catch(() => {});
  }

  public sendChatMessage(payload: { text?: string; imageUrl?: string; isReaction?: boolean }) {
    const sent = this.send({
      type: 'send_chat',
      roomId: this.roomId,
      token: this.token,
      ...payload,
    });

    if (!sent) {
      apiSendChatMessage(this.roomId, this.token, payload).catch(err => {
        console.error('REST chat fallback failed:', err);
      });
    }
  }

  public resign() {
    this.send({
      type: 'resign',
      roomId: this.roomId,
      token: this.token,
    });
    apiResign(this.roomId, this.token).catch(() => {});
  }

  public offerDraw() {
    this.send({
      type: 'offer_draw',
      roomId: this.roomId,
      token: this.token,
    });
    apiOfferDraw(this.roomId, this.token).catch(() => {});
  }

  public acceptDraw() {
    this.send({
      type: 'accept_draw',
      roomId: this.roomId,
      token: this.token,
    });
    apiAcceptDraw(this.roomId, this.token).catch(() => {});
  }

  public declineDraw() {
    this.send({
      type: 'decline_draw',
      roomId: this.roomId,
      token: this.token,
    });
    apiDeclineDraw(this.roomId, this.token).catch(() => {});
  }

  public destroy() {
    this.isDestroyed = true;
    clearInterval(this.pingInterval);
    clearInterval(this.pollInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
