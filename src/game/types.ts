export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  id: string; // unique id for animation keys
}

export type BoardSquare = Piece | null;
export type BoardGrid = BoardSquare[][]; // 8 rows x 8 cols: row 0 = rank 8, row 7 = rank 1

export interface Position {
  row: number; // 0 to 7
  col: number; // 0 to 7
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece | null;
  promotion?: PieceType;
  isCastle?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  san?: string; // Standard Algebraic Notation (e.g., "Nf3", "O-O", "e8=Q#")
}

export interface CastlingRights {
  w: { kingSide: boolean; queenSide: boolean };
  b: { kingSide: boolean; queenSide: boolean };
}

export interface GameState {
  board: BoardGrid;
  turn: PieceColor;
  castlingRights: CastlingRights;
  enPassantTarget: Position | null; // square that can be moved to for en passant
  halfmoveClock: number; // for 50-move rule
  fullmoveNumber: number;
  history: Move[];
  positionHistory: string[]; // FEN strings or position keys for 3-fold repetition
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient-material' | 'mutual-agreement';
  resignedBy?: PieceColor;
  winner?: PieceColor | 'draw';
}

export type GameMode = 'room' | 'pvc';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type ThemeId = 'diamond-ruby' | 'emerald-pearl' | 'sapphire-topaz';

export interface RoomPlayer {
  id: string; // public identifier (secret tokens never reach other clients)
  name: string;
  color: PieceColor;
  connected: boolean;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PieceColor | 'spectator';
  text?: string;
  imageUrl?: string;
  timestamp: number;
  isReaction?: boolean;
}

export interface RoomData {
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
  rematchRequestedBy: string | null;
  drawOfferBy: string | null;
  resignedById: string | null;
  messages: ChatMessage[];
}

export interface CapturedPieces {
  w: Piece[]; // White pieces captured by Black
  b: Piece[]; // Black pieces captured by White
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  lightPieceName: string;
  darkPieceName: string;
  tagline: string;
  lightSquareStyle: string;
  darkSquareStyle: string;
  boardBorder: string;
  frameInner: string;
  accentGlow: string;
  primaryAccent: string;
  lightPieceColors: {
    baseStart: string;
    baseEnd: string;
    facetHighlight: string;
    facetShadow: string;
    coreGlow: string;
    stroke: string;
    refraction: string;
  };
  darkPieceColors: {
    baseStart: string;
    baseEnd: string;
    facetHighlight: string;
    facetShadow: string;
    coreGlow: string;
    stroke: string;
    refraction: string;
  };
}

export type AnimationIntensity = 'minimal' | 'normal' | 'epic';

export interface ActiveAnimation {
  id: string;
  move: Move;
  startTime: number;
  duration: number; // in milliseconds
  fromCoord: { col: number; row: number };
  toCoord: { col: number; row: number };
  secondaryMove?: {
    fromCoord: { col: number; row: number };
    toCoord: { col: number; row: number };
    piece: Piece;
  };
  isCapture: boolean;
  isQueenCapture?: boolean;
  isPromotion?: boolean;
  promotionType?: PieceType;
  isCastle?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  isBrilliant?: boolean;
}

