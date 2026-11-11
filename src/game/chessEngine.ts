import { BoardGrid, CastlingRights, GameState, Move, Piece, PieceColor, PieceType, Position } from './types';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function posToSquare(pos: Position): string {
  return `${FILES[pos.col]}${RANKS[pos.row]}`;
}

export function squareToPos(sq: string): Position {
  const col = FILES.indexOf(sq[0].toLowerCase());
  const row = RANKS.indexOf(sq[1]);
  return { row, col };
}

let pieceIdCounter = 1;
export function createPiece(type: PieceType, color: PieceColor, customId?: string): Piece {
  return {
    type,
    color,
    id: customId || `${color}-${type}-${pieceIdCounter++}`,
  };
}

export function createInitialBoard(): BoardGrid {
  const board: BoardGrid = Array(8).fill(null).map(() => Array(8).fill(null));

  // Back ranks
  const backRank: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  // Black pieces (row 0 = rank 8, row 1 = rank 7)
  for (let c = 0; c < 8; c++) {
    board[0][c] = createPiece(backRank[c], 'b', `b-${backRank[c]}-${c}`);
    board[1][c] = createPiece('p', 'b', `b-p-${c}`);
  }

  // White pieces (row 7 = rank 1, row 6 = rank 2)
  for (let c = 0; c < 8; c++) {
    board[7][c] = createPiece(backRank[c], 'w', `w-${backRank[c]}-${c}`);
    board[6][c] = createPiece('p', 'w', `w-p-${c}`);
  }

  return board;
}

export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map(row => row.map(sq => (sq ? { ...sq } : null)));
}

export function cloneCastlingRights(cr: CastlingRights): CastlingRights {
  return {
    w: { ...cr.w },
    b: { ...cr.b },
  };
}

export function getInitialGameState(): GameState {
  const board = createInitialBoard();
  const state: GameState = {
    board,
    turn: 'w',
    castlingRights: {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    positionHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
  };
  state.positionHistory = [generatePositionKey(state)];
  return state;
}

export function generatePositionKey(state: GameState): string {
  let key = '';
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          key += emptyCount;
          emptyCount = 0;
        }
        key += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
    }
    if (emptyCount > 0) key += emptyCount;
    if (r < 7) key += '/';
  }
  key += ` ${state.turn} `;
  let castling = '';
  if (state.castlingRights.w.kingSide) castling += 'K';
  if (state.castlingRights.w.queenSide) castling += 'Q';
  if (state.castlingRights.b.kingSide) castling += 'k';
  if (state.castlingRights.b.queenSide) castling += 'q';
  key += castling || '-';
  key += ` ${state.enPassantTarget ? posToSquare(state.enPassantTarget) : '-'}`;
  return key;
}

export function gameStateToFen(state: GameState): string {
  const base = generatePositionKey(state);
  const halfmove = typeof state.halfmoveClock === 'number' ? state.halfmoveClock : 0;
  const fullmove = typeof state.fullmoveNumber === 'number' ? state.fullmoveNumber : 1;
  return `${base} ${halfmove} ${fullmove}`;
}

export function uciToMove(uciStr: string, state: GameState): Move | null {
  const clean = (uciStr || '').trim();
  if (clean.length < 4 || clean === '(none)') return null;

  const fromSq = clean.slice(0, 2).toLowerCase();
  const toSq = clean.slice(2, 4).toLowerCase();
  const promo = clean.length > 4 ? (clean.charAt(4).toLowerCase() as PieceType) : undefined;

  const legalMoves = getAllLegalMoves(state);
  const matched = legalMoves.find(m => {
    const f = posToSquare(m.from);
    const t = posToSquare(m.to);
    if (f !== fromSq || t !== toSq) return false;
    if (promo) {
      return m.promotion === promo;
    }
    return true;
  });

  return matched || null;
}

export function findKing(board: BoardGrid, color: PieceColor): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

export function isSquareAttacked(
  pos: Position,
  attackerColor: PieceColor,
  board: BoardGrid
): boolean {
  // Check pawn attacks
  const pawnDir = attackerColor === 'w' ? 1 : -1; // White pawns attack diagonally upwards from rank 2 to 8 (i.e. row decreases)
  const pawnRow = pos.row + pawnDir;
  if (pawnRow >= 0 && pawnRow < 8) {
    if (pos.col - 1 >= 0) {
      const p = board[pawnRow][pos.col - 1];
      if (p && p.color === attackerColor && p.type === 'p') return true;
    }
    if (pos.col + 1 < 8) {
      const p = board[pawnRow][pos.col + 1];
      if (p && p.color === attackerColor && p.type === 'p') return true;
    }
  }

  // Check knight attacks
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightMoves) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p && p.color === attackerColor && p.type === 'n') return true;
    }
  }

  // Check king attacks (adjacent)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && p.color === attackerColor && p.type === 'k') return true;
      }
    }
  }

  // Check straight lines (Rook / Queen)
  const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Check diagonals (Bishop / Queen)
  const diagonalDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagonalDirs) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
          return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isKingInCheck(board: BoardGrid, kingColor: PieceColor): boolean {
  const kingPos = findKing(board, kingColor);
  if (!kingPos) return false;
  const opponentColor: PieceColor = kingColor === 'w' ? 'b' : 'w';
  return isSquareAttacked(kingPos, opponentColor, board);
}

export function getPseudoLegalMoves(
  pos: Position,
  state: GameState,
  options?: { attacksOnly?: boolean }
): Move[] {
  const { board, turn, castlingRights, enPassantTarget } = state;
  const piece = board[pos.row][pos.col];
  if (!piece || piece.color !== turn) return [];

  const moves: Move[] = [];
  const opponentColor: PieceColor = turn === 'w' ? 'b' : 'w';

  if (piece.type === 'p') {
    const dir = turn === 'w' ? -1 : 1;
    const startRow = turn === 'w' ? 6 : 1;
    const promotionRow = turn === 'w' ? 0 : 7;

    // Standard push (not attacks)
    if (!options?.attacksOnly) {
      const nextRow = pos.row + dir;
      if (nextRow >= 0 && nextRow < 8 && !board[nextRow][pos.col]) {
        if (nextRow === promotionRow) {
          const promoPieces: PieceType[] = ['q', 'r', 'b', 'n'];
          for (const promo of promoPieces) {
            moves.push({ from: pos, to: { row: nextRow, col: pos.col }, piece, promotion: promo });
          }
        } else {
          moves.push({ from: pos, to: { row: nextRow, col: pos.col }, piece });
          // Double push
          const doubleRow = pos.row + 2 * dir;
          if (pos.row === startRow && !board[doubleRow][pos.col]) {
            moves.push({ from: pos, to: { row: doubleRow, col: pos.col }, piece });
          }
        }
      }
    }

    // Pawn diagonal captures
    for (const dc of [-1, 1]) {
      const targetCol = pos.col + dc;
      const targetRow = pos.row + dir;
      if (targetCol >= 0 && targetCol < 8 && targetRow >= 0 && targetRow < 8) {
        const destPiece = board[targetRow][targetCol];
        if (destPiece && destPiece.color === opponentColor) {
          if (targetRow === promotionRow) {
            const promoPieces: PieceType[] = ['q', 'r', 'b', 'n'];
            for (const promo of promoPieces) {
              moves.push({
                from: pos,
                to: { row: targetRow, col: targetCol },
                piece,
                captured: destPiece,
                promotion: promo,
              });
            }
          } else {
            moves.push({
              from: pos,
              to: { row: targetRow, col: targetCol },
              piece,
              captured: destPiece,
            });
          }
        } else if (
          enPassantTarget &&
          enPassantTarget.row === targetRow &&
          enPassantTarget.col === targetCol
        ) {
          // En passant capture
          const capturedPawn = board[pos.row][targetCol];
          if (capturedPawn && capturedPawn.color === opponentColor && capturedPawn.type === 'p') {
            moves.push({
              from: pos,
              to: { row: targetRow, col: targetCol },
              piece,
              captured: capturedPawn,
              isEnPassant: true,
            });
          }
        }
      }
    }
  } else if (piece.type === 'n') {
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const destPiece = board[r][c];
        if (!destPiece) {
          if (!options?.attacksOnly) {
            moves.push({ from: pos, to: { row: r, col: c }, piece });
          }
        } else if (destPiece.color === opponentColor) {
          moves.push({ from: pos, to: { row: r, col: c }, piece, captured: destPiece });
        }
      }
    }
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs: number[][] = [];
    if (piece.type === 'b' || piece.type === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'r' || piece.type === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    for (const [dr, dc] of dirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const destPiece = board[r][c];
        if (!destPiece) {
          if (!options?.attacksOnly) {
            moves.push({ from: pos, to: { row: r, col: c }, piece });
          }
        } else {
          if (destPiece.color === opponentColor) {
            moves.push({ from: pos, to: { row: r, col: c }, piece, captured: destPiece });
          }
          break; // ray blocked
        }
        r += dr;
        c += dc;
      }
    }
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const destPiece = board[r][c];
          if (!destPiece) {
            if (!options?.attacksOnly) {
              moves.push({ from: pos, to: { row: r, col: c }, piece });
            }
          } else if (destPiece.color === opponentColor) {
            moves.push({ from: pos, to: { row: r, col: c }, piece, captured: destPiece });
          }
        }
      }
    }

    // Castling
    if (!options?.attacksOnly) {
      const rank = turn === 'w' ? 7 : 0;
      if (pos.row === rank && pos.col === 4) {
        const rights = castlingRights[turn];
        const inCheckNow = isSquareAttacked(pos, opponentColor, board);

        if (!inCheckNow) {
          // King-side castling
          if (rights.kingSide) {
            const empty5 = !board[rank][5];
            const empty6 = !board[rank][6];
            const rookPiece = board[rank][7];
            if (
              empty5 &&
              empty6 &&
              rookPiece &&
              rookPiece.type === 'r' &&
              rookPiece.color === turn &&
              !isSquareAttacked({ row: rank, col: 5 }, opponentColor, board) &&
              !isSquareAttacked({ row: rank, col: 6 }, opponentColor, board)
            ) {
              moves.push({
                from: pos,
                to: { row: rank, col: 6 },
                piece,
                isCastle: 'kingside',
              });
            }
          }

          // Queen-side castling
          if (rights.queenSide) {
            const empty1 = !board[rank][1];
            const empty2 = !board[rank][2];
            const empty3 = !board[rank][3];
            const rookPiece = board[rank][0];
            if (
              empty1 &&
              empty2 &&
              empty3 &&
              rookPiece &&
              rookPiece.type === 'r' &&
              rookPiece.color === turn &&
              !isSquareAttacked({ row: rank, col: 3 }, opponentColor, board) &&
              !isSquareAttacked({ row: rank, col: 2 }, opponentColor, board)
            ) {
              moves.push({
                from: pos,
                to: { row: rank, col: 2 },
                piece,
                isCastle: 'queenside',
              });
            }
          }
        }
      }
    }
  }

  return moves;
}

export function executeMoveOnBoard(board: BoardGrid, move: Move): BoardGrid {
  const nextBoard = cloneBoard(board);
  const { from, to, piece, promotion, isCastle, isEnPassant } = move;

  // Move the piece
  nextBoard[to.row][to.col] = promotion
    ? { ...piece, type: promotion, id: `${piece.id}-promoted` }
    : { ...piece };
  nextBoard[from.row][from.col] = null;

  // Handle en passant capture
  if (isEnPassant) {
    nextBoard[from.row][to.col] = null;
  }

  // Handle rook for castling
  if (isCastle === 'kingside') {
    const rank = from.row;
    const rook = nextBoard[rank][7];
    if (rook) {
      nextBoard[rank][5] = rook;
      nextBoard[rank][7] = null;
    }
  } else if (isCastle === 'queenside') {
    const rank = from.row;
    const rook = nextBoard[rank][0];
    if (rook) {
      nextBoard[rank][3] = rook;
      nextBoard[rank][0] = null;
    }
  }

  return nextBoard;
}

export function isMoveLegal(state: GameState, move: Move): boolean {
  const nextBoard = executeMoveOnBoard(state.board, move);
  return !isKingInCheck(nextBoard, state.turn);
}

export function getLegalMovesForPosition(pos: Position, state: GameState): Move[] {
  const pseudoMoves = getPseudoLegalMoves(pos, state);
  return pseudoMoves.filter(move => isMoveLegal(state, move));
}

export function getAllLegalMoves(state: GameState): Move[] {
  const legalMoves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === state.turn) {
        const moves = getLegalMovesForPosition({ row: r, col: c }, state);
        legalMoves.push(...moves);
      }
    }
  }
  return legalMoves;
}

export function generateSAN(
  state: GameState,
  move: Move,
  allMovesAtPosition?: Move[]
): string {
  if (move.isCastle === 'kingside') return 'O-O';
  if (move.isCastle === 'queenside') return 'O-O-O';

  const { piece, from, to, captured, promotion } = move;
  const isCapture = Boolean(captured);
  const destSquare = posToSquare(to);

  let san = '';

  if (piece.type === 'p') {
    if (isCapture) {
      san += FILES[from.col] + 'x' + destSquare;
    } else {
      san += destSquare;
    }
    if (promotion) {
      san += '=' + promotion.toUpperCase();
    }
  } else {
    san += piece.type.toUpperCase();

    // Check disambiguation: do multiple pieces of same type and color reach destination?
    const candidates = (allMovesAtPosition || getAllLegalMoves(state)).filter(
      m => m.piece.type === piece.type &&
           m.piece.color === piece.color &&
           m.to.row === to.row &&
           m.to.col === to.col &&
           (m.from.row !== from.row || m.from.col !== from.col)
    );

    if (candidates.length > 0) {
      const sameFile = candidates.some(m => m.from.col === from.col);
      const sameRank = candidates.some(m => m.from.row === from.row);

      if (!sameFile) {
        san += FILES[from.col];
      } else if (!sameRank) {
        san += RANKS[from.row];
      } else {
        san += posToSquare(from);
      }
    }

    if (isCapture) {
      san += 'x';
    }
    san += destSquare;
  }

  // Check/Checkmate suffix
  const nextBoard = executeMoveOnBoard(state.board, move);
  const opponentColor: PieceColor = state.turn === 'w' ? 'b' : 'w';
  const isOpponentInCheck = isKingInCheck(nextBoard, opponentColor);

  if (isOpponentInCheck) {
    // Check if checkmate
    const tempState: GameState = {
      ...state,
      board: nextBoard,
      turn: opponentColor,
      castlingRights: updateCastlingRights(state.castlingRights, move),
      enPassantTarget: getNextEnPassantTarget(move),
    };
    const oppMoves = getAllLegalMoves(tempState);
    if (oppMoves.length === 0) {
      san += '#';
    } else {
      san += '+';
    }
  }

  return san;
}

export function updateCastlingRights(cr: CastlingRights, move: Move): CastlingRights {
  const next = cloneCastlingRights(cr);
  const { piece, from, to } = move;

  // King moves
  if (piece.type === 'k') {
    next[piece.color].kingSide = false;
    next[piece.color].queenSide = false;
  }

  // Rook moves
  if (piece.type === 'r') {
    if (piece.color === 'w') {
      if (from.row === 7 && from.col === 0) next.w.queenSide = false;
      if (from.row === 7 && from.col === 7) next.w.kingSide = false;
    } else {
      if (from.row === 0 && from.col === 0) next.b.queenSide = false;
      if (from.row === 0 && from.col === 7) next.b.kingSide = false;
    }
  }

  // Rook captured
  if (to.row === 7 && to.col === 0) next.w.queenSide = false;
  if (to.row === 7 && to.col === 7) next.w.kingSide = false;
  if (to.row === 0 && to.col === 0) next.b.queenSide = false;
  if (to.row === 0 && to.col === 7) next.b.kingSide = false;

  return next;
}

export function getNextEnPassantTarget(move: Move): Position | null {
  if (move.piece.type === 'p') {
    const diff = Math.abs(move.to.row - move.from.row);
    if (diff === 2) {
      return {
        row: (move.from.row + move.to.row) / 2,
        col: move.from.col,
      };
    }
  }
  return null;
}

export function isInsufficientMaterial(board: BoardGrid): boolean {
  const pieces: Piece[] = [];
  let whiteBishops: Position[] = [];
  let blackBishops: Position[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        pieces.push(p);
        if (p.type === 'b') {
          if (p.color === 'w') whiteBishops.push({ row: r, col: c });
          else blackBishops.push({ row: r, col: c });
        }
      }
    }
  }

  // King vs King
  if (pieces.length === 2) return true;

  // King & Bishop vs King or King & Knight vs King
  if (pieces.length === 3) {
    const nonKing = pieces.find(p => p.type !== 'k');
    if (nonKing && (nonKing.type === 'b' || nonKing.type === 'n')) {
      return true;
    }
  }

  // King & Bishop vs King & Bishop on the same color squares
  if (pieces.length === 4 && whiteBishops.length === 1 && blackBishops.length === 1) {
    const wbSquareColor = (whiteBishops[0].row + whiteBishops[0].col) % 2;
    const bbSquareColor = (blackBishops[0].row + blackBishops[0].col) % 2;
    if (wbSquareColor === bbSquareColor) {
      return true;
    }
  }

  return false;
}

export function makeMove(state: GameState, move: Move): GameState {
  // Generate SAN if not present
  const moveWithSAN: Move = {
    ...move,
    san: move.san || generateSAN(state, move),
  };

  const nextBoard = executeMoveOnBoard(state.board, moveWithSAN);
  const nextCastlingRights = updateCastlingRights(state.castlingRights, moveWithSAN);
  const nextEnPassantTarget = getNextEnPassantTarget(moveWithSAN);
  const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';

  const isPawnOrCapture = move.piece.type === 'p' || Boolean(move.captured);
  const nextHalfmoveClock = isPawnOrCapture ? 0 : state.halfmoveClock + 1;
  const nextFullmoveNumber = state.turn === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  const nextHistory = [...state.history, moveWithSAN];

  const nextState: GameState = {
    board: nextBoard,
    turn: nextTurn,
    castlingRights: nextCastlingRights,
    enPassantTarget: nextEnPassantTarget,
    halfmoveClock: nextHalfmoveClock,
    fullmoveNumber: nextFullmoveNumber,
    history: nextHistory,
    positionHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
  };

  const posKey = generatePositionKey(nextState);
  nextState.positionHistory = [...state.positionHistory, posKey];

  // Check state of next turn
  const inCheck = isKingInCheck(nextBoard, nextTurn);
  nextState.isCheck = inCheck;

  const legalMoves = getAllLegalMoves(nextState);

  if (legalMoves.length === 0) {
    if (inCheck) {
      nextState.isCheckmate = true;
      nextState.winner = state.turn; // previous turn delivered checkmate
    } else {
      nextState.isStalemate = true;
      nextState.isDraw = true;
      nextState.drawReason = 'stalemate';
      nextState.winner = 'draw';
    }
  } else if (nextHalfmoveClock >= 100) {
    // 50-move rule (100 halfmoves)
    nextState.isDraw = true;
    nextState.drawReason = 'fifty-move';
    nextState.winner = 'draw';
  } else if (isInsufficientMaterial(nextBoard)) {
    nextState.isDraw = true;
    nextState.drawReason = 'insufficient-material';
    nextState.winner = 'draw';
  } else {
    // Threefold repetition
    const occurrences = nextState.positionHistory.filter(k => k === posKey).length;
    if (occurrences >= 3) {
      nextState.isDraw = true;
      nextState.drawReason = 'threefold';
      nextState.winner = 'draw';
    }
  }

  return nextState;
}

export function undoLastMove(state: GameState): GameState {
  if (state.history.length === 0) return state;

  // Replay from beginning up to n - 1 moves
  const movesToReplay = state.history.slice(0, -1);
  let rebuilt = getInitialGameState();

  for (const mv of movesToReplay) {
    rebuilt = makeMove(rebuilt, mv);
  }

  return rebuilt;
}

export function getCapturedPieces(history: Move[]): { w: Piece[]; b: Piece[] } {
  const captured: { w: Piece[]; b: Piece[] } = { w: [], b: [] };
  for (const m of history) {
    if (m.captured) {
      // If a white piece was captured, add to w
      if (m.captured.color === 'w') {
        captured.w.push(m.captured);
      } else {
        captured.b.push(m.captured);
      }
    }
  }
  return captured;
}

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function getMaterialAdvantage(captured: { w: Piece[]; b: Piece[] }): {
  whiteScore: number;
  blackScore: number;
  diff: number; // positive = white ahead, negative = black ahead
} {
  // Captured pieces: white lost captured.w, black lost captured.b
  // So White holds Black's captured pieces (captured.b)
  const whiteValue = captured.b.reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);
  const blackValue = captured.w.reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);

  return {
    whiteScore: whiteValue,
    blackScore: blackValue,
    diff: whiteValue - blackValue,
  };
}

/**
 * SECURITY: Resolve an untrusted, client-supplied move into the engine's own
 * legal Move object. Only `from`, `to` and `promotion` are read from the input;
 * every other field (piece, captured, isCastle, isEnPassant, san) is rebuilt by
 * the engine, so a malicious client cannot forge pieces, captures or castling.
 * Returns null if the input is malformed or the move is not legal.
 */
export function resolveLegalMove(state: GameState, raw: unknown): Move | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;

  const isSquareCoord = (p: any): p is Position =>
    p &&
    typeof p === 'object' &&
    Number.isInteger(p.row) &&
    Number.isInteger(p.col) &&
    p.row >= 0 &&
    p.row <= 7 &&
    p.col >= 0 &&
    p.col <= 7;

  if (!isSquareCoord(r.from) || !isSquareCoord(r.to)) return null;

  const from: Position = { row: r.from.row, col: r.from.col };
  const to: Position = { row: r.to.row, col: r.to.col };

  const promotion = r.promotion;
  if (promotion !== undefined && promotion !== null) {
    if (typeof promotion !== 'string' || !['q', 'r', 'b', 'n'].includes(promotion)) return null;
  }

  const candidates = getLegalMovesForPosition(from, state).filter(
    m => m.to.row === to.row && m.to.col === to.col
  );
  if (candidates.length === 0) return null;

  // Promotion moves are emitted once per promotion piece; a promoting pawn
  // must say which piece it becomes.
  const match = candidates.find(m => (m.promotion || null) === (promotion || null));
  return match || null;
}
