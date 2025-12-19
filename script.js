/* jshint loopfunc: true */
/* jshint esversion: 8 */
const boardElement = document.getElementById('board');
const blackScoreEl = document.getElementById('black-score');
const whiteScoreEl = document.getElementById('white-score');
const turnEl = document.getElementById('current-turn');

let board = [];
let currentPlayer = 1; 
let lastMove = null; // 紀錄最後落子位置

const weights = [
    [100, -25, 10,  5,  5, 10, -25, 100],
    [-25, -45,  1,  1,  1,  1, -45, -25],
    [ 10,   1,  3,  2,  2,  3,   1,  10],
    [  5,   1,  2,  1,  1,  2,   1,   5],
    [  5,   1,  2,  1,  1,  2,   1,   5],
    [ 10,   1,  3,  2,  2,  3,   1,  10],
    [-25, -45,  1,  1,  1,  1, -45, -25],
    [100, -25, 10,  5,  5, 10, -25, 100]
];

function initGame() {
    board = Array(8).fill().map(() => Array(8).fill(0));
    board[3][3] = 2; board[3][4] = 1;
    board[4][3] = 1; board[4][4] = 2;
    currentPlayer = 1;
    lastMove = null;
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = '';
    let black = 0, white = 0;
    const hints = getValidMoves(board, currentPlayer);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // 標記最後一手
            if (lastMove && lastMove.r === r && lastMove.c === c) {
                cell.classList.add('last-move');
            }

            if (board[r][c] !== 0) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[r][c] === 2 ? 'flipped' : ''}`;
                piece.innerHTML = `<div class="piece-front piece-black"></div><div class="piece-back piece-white"></div>`;
                cell.appendChild(piece);
                if (board[r][c] === 1) black++; else white++;
            } else {
                const move = hints.find(m => m.r === r && m.c === c);
                if (move && currentPlayer === 1) {
                    const hint = document.createElement('div');
                    hint.className = 'hint';
                    hint.innerText = move.flips.length;

                    cell.onmouseover = () => highlightPreFlipped(move.flips, true);
                    cell.onmouseout = () => highlightPreFlipped(move.flips, false);
                    
                    cell.onclick = () => {
                        lastMove = {r, c};
                        highlightPreFlipped(move.flips, false);
                        handleMove(r, c, move.flips);
                    };
                    cell.appendChild(hint);
                }
            }
            boardElement.appendChild(cell);
        }
    }
    blackScoreEl.innerText = black;
    whiteScoreEl.innerText = white;
}

function highlightPreFlipped(flips, isHighlight) {
    const cells = document.getElementsByClassName('cell');
    flips.forEach(pos => {
        const piece = cells[pos.r * 8 + pos.c].querySelector('.piece');
        if (piece) {
            if (isHighlight) piece.classList.add('preview-flip');
            else piece.classList.remove('preview-flip');
        }
    });
}

function handleMove(r, c, flips) {
    executeMove(r, c, flips);
    
    // 鎖定 UI
    const allHints = document.querySelectorAll('.hint');
    allHints.forEach(h => h.remove());

    setTimeout(() => {
        currentPlayer = 2;
        turnEl.innerText = "AI 思考中...";
        
        const aiMoves = getValidMoves(board, 2);
        if (aiMoves.length > 0) {
            setTimeout(() => aiTurn(aiMoves), 800);
        } else {
            setTimeout(() => {
                currentPlayer = 1;
                turnEl.innerText = "AI 無法下棋，換你！";
                renderBoard();
            }, 800);
        }
    }, 1200);
}

function executeMove(r, c, flips) {
    board[r][c] = currentPlayer;
    const cells = document.getElementsByClassName('cell');
    const targetCell = cells[r * 8 + c];
    targetCell.innerHTML = '';
    
    const newPiece = document.createElement('div');
    newPiece.className = `piece ${currentPlayer === 2 ? 'flipped' : ''}`;
    newPiece.innerHTML = `<div class="piece-front piece-black"></div><div class="piece-back piece-white"></div>`;
    targetCell.appendChild(newPiece);

    flips.forEach((pos, index) => {
        setTimeout(() => {
            board[pos.r][pos.c] = currentPlayer;
            const piece = cells[pos.r * 8 + pos.c].querySelector('.piece');
            if (piece) {
                if (currentPlayer === 2) piece.classList.add('flipped');
                else piece.classList.remove('flipped');
            }
            updateScore();
        }, (index + 1) * 100);
    });
}

function aiTurn(moves) {
    const difficulty = document.getElementById('ai-difficulty').value;
    let bestMove;

    if (difficulty === 'basic') {
        bestMove = moves.reduce((prev, curr) => curr.flips.length > prev.flips.length ? curr : prev);
    } else {
        bestMove = moves.reduce((prev, curr) => {
            const score = weights[curr.r][curr.c] + (curr.flips.length * 2);
            const prevScore = weights[prev.r][prev.c] + (prev.flips.length * 2);
            return score > prevScore ? curr : prev;
        });
    }

    lastMove = {r: bestMove.r, c: bestMove.c};
    executeMove(bestMove.r, bestMove.c, bestMove.flips);
    
    setTimeout(() => {
        currentPlayer = 1;
        turnEl.innerText = "黑棋回合 (User)";
        renderBoard();
        checkGameOver();
    }, 1000);
}

function getValidMoves(tempBoard, player) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (tempBoard[r][c] !== 0) continue;
            const flips = getFlips(tempBoard, r, c, player);
            if (flips.length > 0) moves.push({r, c, flips});
        }
    }
    return moves;
}

function getFlips(tempBoard, r, c, player) {
    const flips = [];
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    const opponent = player === 1 ? 2 : 1;

    directions.forEach(([dr, dc]) => {
        let temp = [];
        let curR = r + dr, curC = c + dc;
        while (curR >= 0 && curR < 8 && curC >= 0 && curC < 8 && tempBoard[curR][curC] === opponent) {
            temp.push({r: curR, c: curC});
            curR += dr; curC += dc;
        }
        if (curR >= 0 && curR < 8 && curC >= 0 && curC < 8 && tempBoard[curR][curC] === player) {
            flips.push(...temp);
        }
    });
    return flips;
}

function updateScore() {
    let b = 0, w = 0;
    board.flat().forEach(v => { if(v===1) b++; if(v===2) w++; });
    blackScoreEl.innerText = b;
    whiteScoreEl.innerText = w;
}

function checkGameOver() {
    const p1Moves = getValidMoves(board, 1).length;
    const p2Moves = getValidMoves(board, 2).length;
    if (p1Moves === 0 && p2Moves === 0) {
        const b = parseInt(blackScoreEl.innerText);
        const w = parseInt(whiteScoreEl.innerText);
        const res = b > w ? "黑棋獲勝！" : (w > b ? "白棋獲勝！" : "平手！");
        setTimeout(() => alert(`遊戲結束\n黑棋: ${b} | 白棋: ${w}\n${res}`), 500);
    }
}

function resetGame() { initGame(); }
initGame();
