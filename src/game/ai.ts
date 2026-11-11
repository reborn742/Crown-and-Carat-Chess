import { AiDifficulty, GameState, Move, PieceColor, PieceType } from './types';
import { getAllLegalMoves, makeMove, PIECE_VALUES } from './chessEngine';

// Piece-Square Tables (8x8) from White's perspective (row 0 = rank 8, row 7 = rank 1)
const PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const ROOK_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0],
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const KING_MID_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20],
];

const PST_MAP: Record<PieceType, number[][]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_MID_PST,
};

// Evaluate board: positive = White advantage, negative = Black advantage
export function evaluateBoard(state: GameState): number {
  if (state.isCheckmate) {
    // If it's White's turn and White is checkmated, Black won (-99999)
    // If it's Black's turn and Black is checkmated, White won (+99999)
    return state.turn === 'w' ? -99999 : 99999;
  }
  if (state.isDraw) {
    return 0;
  }

  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] * 100;
      const pst = PST_MAP[piece.type];

      // For white, row index is direct (row 7 is rank 1)
      // For black, flip row index (row 0 is black's rank 1)
      const pstVal = piece.color === 'w' ? pst[r][c] : pst[7 - r][c];

      const pieceTotal = baseVal + pstVal;
      if (piece.color === 'w') {
        score += pieceTotal;
      } else {
        score -= pieceTotal;
      }
    }
  }

  return score;
}

// Move sorting for alpha-beta pruning efficiency
function scoreMoveForOrdering(move: Move): number {
  let score = 0;
  if (move.captured) {
    // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    score += PIECE_VALUES[move.captured.type] * 10 - PIECE_VALUES[move.piece.type];
  }
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion] * 10;
  }
  if (move.isCastle) {
    score += 5;
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));
}

// Minimax with alpha-beta pruning
function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || state.isCheckmate || state.isDraw) {
    return evaluateBoard(state);
  }

  const moves = orderMoves(getAllLegalMoves(state));
  if (moves.length === 0) {
    return evaluateBoard(state);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move);
      const evaluation = minimax(nextState, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move);
      const evaluation = minimax(nextState, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export async function getBestMove(
  state: GameState,
  difficulty: AiDifficulty
): Promise<Move | null> {
  const legalMoves = getAllLegalMoves(state);
  if (legalMoves.length === 0) return null;

  const aiColor = state.turn;
  const isMaximizing = aiColor === 'w';

  // Quick natural pause (sub-100ms)
  await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 40));

  if (difficulty === 'easy') {
    // Depth 1 with soft randomness
    const scoredMoves = legalMoves.map(m => {
      const nextState = makeMove(state, m);
      const score = evaluateBoard(nextState);
      return { move: m, score };
    });

    // Sort by score
    scoredMoves.sort((a, b) => (isMaximizing ? b.score - a.score : a.score - b.score));

    // 60% pick best, 40% pick from top 3
    if (Math.random() > 0.4 || scoredMoves.length === 1) {
      return scoredMoves[0].move;
    } else {
      const topSlice = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
      const chosen = topSlice[Math.floor(Math.random() * topSlice.length)];
      return chosen.move;
    }
  }

  if (difficulty === 'medium') {
    // Depth 2
    let bestMove: Move = legalMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    const ordered = orderMoves(legalMoves);
    for (const move of ordered) {
      const nextState = makeMove(state, move);
      const score = minimax(nextState, 1, -Infinity, Infinity, !isMaximizing);
      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    return bestMove;
  }

  // Hard: Depth 3 with alpha-beta and move ordering
  let bestMove: Move = legalMoves[0];
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  const ordered = orderMoves(legalMoves);
  for (const move of ordered) {
    const nextState = makeMove(state, move);
    const score = minimax(nextState, 2, alpha, beta, !isMaximizing);

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
    }
    if (beta <= alpha) break;
  }

  return bestMove;
}
