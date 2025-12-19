/* jshint esversion: 8 */
/* jshint loopfunc: true */
const boardElement = document.getElementById('board');
const blackScoreEl = document.getElementById('black-score');
const whiteScoreEl = document.getElementById('white-score');
const turnEl = document.getElementById('current-turn');

let board = [];
let currentPlayer = 1; 

const weights = [
    [100, -20, 10,  5,  5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [ 10,  -2,  5,  1,  1,  5,  -2,  10],
    [  5,  -2,  1,  1,  1,  1,  -2,   5],
    [  5,  -2,  1,  1,  1,  1,  -2,   5],
    [ 10,  -2,  5,  1,  1,  5,  -2,  10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10,  5,  5, 10, -20, 100]
];

function initGame() {
    board = Array(8).fill().map(() => Array(8).fill(0));
    board[3][3] = 2; board[3][4] = 1;
    board[4][3] = 1; board[4][4] = 2;
    currentPlayer = 1;
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
            
            if (board[r][c] !== 0) {
                const piece = document.createElement('div');
                // 核心：根據 board 數值設定初始翻轉狀態
                piece.className = `piece ${board[r][c] === 2 ? 'flipped' : ''}`;
                piece.innerHTML = `<div class="piece-front piece-black"></div><div class="piece-back piece-white"></div>`;
                cell.appendChild(piece);
                if (board[r][c] === 1) black++; else white++;
            } else {
                const move = hints.find(m => m.r === r && m.c === c);
                if (move && currentPlayer === 1) {
                    const hint = document.createElement('div');
                    hint.className = 'hint';
                    cell.onclick = () => handleMove(r, c, move.flips);
                    cell.appendChild(hint);
                }
            }
            boardElement.appendChild(cell);
        }
    }
    blackScoreEl.innerText = black;
    whiteScoreEl.innerText = white;
}

function handleMove(r, c, flips) {
    executeMove(r, c, flips);
    
    // 玩家下完後鎖定棋盤
    const allHints = document.querySelectorAll('.hint');
    allHints.forEach(h => h.remove());

    setTimeout(() => {
        currentPlayer = 2;
        turnEl.innerText = "白棋 (AI)";
        
        const aiMoves = getValidMoves(board, 2);
        if (aiMoves.length > 0) {
            setTimeout(() => aiTurn(aiMoves), 600);
        } else {
            setTimeout(() => {
                currentPlayer = 1;
                turnEl.innerText = "白棋無子可落，黑棋回合";
                renderBoard();
            }, 1000);
        }
    }, 1000);
}

function executeMove(r, c, flips) {
    // 1. 先更新資料陣列
    board[r][c] = currentPlayer;

    // 2. 直接在畫面上生成落下的那一顆棋子 (避免全盤重繪導致動畫中斷)
    const cells = document.getElementsByClassName('cell');
    const targetCell = cells[r * 8 + c];
    targetCell.innerHTML = ''; 
    const newPiece = document.createElement('div');
    newPiece.className = `piece ${currentPlayer === 2 ? 'flipped' : ''}`;
    newPiece.innerHTML = `<div class="piece-front piece-black"></div><div class="piece-back piece-white"></div>`;
    targetCell.appendChild(newPiece);

    // 3. 依序翻轉其他棋子 (現場檢視要求：依序翻棋)
    flips.forEach((pos, index) => {
        setTimeout(() => {
            board[pos.r][pos.c] = currentPlayer;
            const pieceToFlip = cells[pos.r * 8 + pos.c].querySelector('.piece');
            if (pieceToFlip) {
                if (currentPlayer === 2) {
                    pieceToFlip.classList.add('flipped'); // 黑翻白
                } else {
                    pieceToFlip.classList.remove('flipped'); // 白翻黑
                }
            }
            updateScore();
        }, (index + 1) * 200); 
    });
}

function aiTurn(moves) {
    const difficulty = document.getElementById('ai-difficulty').value;
    let bestMove;

    if (difficulty === 'basic') {
        bestMove = moves.reduce((prev, curr) => curr.flips.length > prev.flips.length ? curr : prev);
    } else {
        bestMove = moves.reduce((prev, curr) => {
            const score = weights[curr.r][curr.c] + curr.flips.length;
            const prevScore = weights[prev.r][prev.c] + prev.flips.length;
            return score > prevScore ? curr : prev;
        });
    }

    executeMove(bestMove.r, bestMove.c, bestMove.flips);
    
    setTimeout(() => {
        currentPlayer = 1;
        turnEl.innerText = "黑棋 (User)";
        renderBoard(); // AI 下完後完整重繪一次以確保狀態同步
    }, 1200);
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
        let tempFlips = [];
        let currR = r + dr;
        let currC = c + dc;
        while (currR >= 0 && currR < 8 && currC >= 0 && currC < 8 && tempBoard[currR][currC] === opponent) {
            tempFlips.push({r: currR, c: currC});
            currR += dr;
            currC += dc;
        }
        if (currR >= 0 && currR < 8 && currC >= 0 && currC < 8 && tempBoard[currR][currC] === player) {
            flips.push(...tempFlips);
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

function resetGame() { initGame(); }
initGame();