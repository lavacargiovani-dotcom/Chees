let board = null;
const game = new Chess();
let mode = 'bot'; // 'bot' ou 'local'

// Relogios
let timerInterval = null;
let whiteTime = 600;
let blackTime = 600;
let activeTimer = null; // 'w' ou 'b'

// Variaveis para promocao de peao
let pendingMove = null;

// Valores base das pecas
const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000 };

// Matrizes de Avaliacao Posicional (PST - Piece Square Tables)
const pstPawn = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const pstKnight = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

// Avaliacao posicional completa do tabuleiro
function evaluateBoard(boardState) {
    let total = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardState[i][j];
            if (piece) {
                let val = pieceValues[piece.type];
                
                // Bonus Posicional
                if (piece.type === 'p') {
                    val += (piece.color === 'w') ? pstPawn[i][j] : pstPawn[7 - i][j];
                } else if (piece.type === 'n') {
                    val += (piece.color === 'w') ? pstKnight[i][j] : pstKnight[7 - i][j];
                }

                total += (piece.color === 'w') ? val : -val;
            }
        }
    }
    return total;
}

// Algoritmo Minimax com Poda Alfa-Beta
function minimax(gameInst, depth, alpha, beta, isMax) {
    if (depth === 0 || gameInst.game_over()) return evaluateBoard(gameInst.board());
    const moves = gameInst.moves();
    
    if (isMax) {
        let best = -Infinity;
        for (let move of moves) {
            gameInst.move(move);
            best = Math.max(best, minimax(gameInst, depth - 1, alpha, beta, false));
            gameInst.undo();
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (let move of moves) {
            gameInst.move(move);
            best = Math.min(best, minimax(gameInst, depth - 1, alpha, beta, true));
            gameInst.undo();
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function makeBotMove() {
    const depth = parseInt($('#difficulty').val());
    const moves = game.moves();
    if (moves.length === 0 || game.game_over()) return;

    let bestMove = null;
    let bestVal = Infinity;

    for (let move of moves) {
        game.move(move);
        const val = minimax(game, depth - 1, -Infinity, Infinity, true);
        game.undo();
        if (val < bestVal) {
            bestVal = val;
            bestMove = move;
        }
    }

    if (bestMove) {
        game.move(bestMove);
        board.position(game.fen());
        onMoveComplete();
    }
}

// Manipulacao de Peoes e Drag & Drop
function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if (mode === 'bot' && piece.search(/^b/) !== -1) return false;
}

function onDrop(source, target) {
    // Verifica se e uma promocao de peao
    const moves = game.moves({ verbose: true });
    const isPromotion = moves.some(m => m.from === source && m.to === target && m.flags.includes('p'));

    if (isPromotion) {
        pendingMove = { from: source, to: target };
        $('#promotionModal').css('display', 'flex');
        return;
    }

    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    onMoveComplete();

    if (mode === 'bot' && !game.game_over()) {
        window.setTimeout(makeBotMove, 250);
    }
}

// Modal de Promocao
$('.promotion-options button').on('click', function() {
    const piece = $(this).data('piece');
    $('#promotionModal').hide();
    
    if (pendingMove) {
        game.move({ from: pendingMove.from, to: pendingMove.to, promotion: piece });
        board.position(game.fen());
        pendingMove = null;
        onMoveComplete();

        if (mode === 'bot' && !game.game_over()) {
            window.setTimeout(makeBotMove, 250);
        }
    }
});

// Acoes executadas apos cada jogada valida
function onMoveComplete() {
    updateHistory();
    updateCapturedPieces();
    updateEvalBar();
    highlightCheck();
    switchTimer();
}

// Destaque de Xeque
function highlightCheck() {
    $('#board .square-55d68').removeClass('in-check');
    if (game.in_check()) {
        const turn = game.turn();
        const boardState = game.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const p = boardState[i][j];
                if (p && p.type === 'k' && p.color === turn) {
                    const files = ['a','b','c','d','e','f','g','h'];
                    const square = files[j] + (8 - i);
                    $(`#board .square-${square}`).addClass('in-check');
                }
            }
        }
    }
}

// Barra de Vantagem
function updateEvalBar() {
    const score = evaluateBoard(game.board()) / 10;
    let percentage = 50 + (score * 5);
    percentage = Math.max(5, Math.min(95, percentage));

    $('#evalBar').css('height', `${percentage}%`);
    $('#evalScore').text(score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1));
}

// Peças Capturadas
function updateCapturedPieces() {
    const history = game.history({ verbose: true });
    let whiteCaptured = [];
    let blackCaptured = [];

    const icons = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

    history.forEach(move => {
        if (move.captured) {
            if (move.color === 'w') {
                blackCaptured.push(icons[move.captured]);
            } else {
                whiteCaptured.push(icons[move.captured]);
            }
        }
    });

    $('#bottomCaptured').text(whiteCaptured.join(' '));
    $('#topCaptured').text(blackCaptured.join(' '));
}

// Historico PGN
function updateHistory() {
    const history = game.history();
    let historyHTML = '';
    for (let i = 0; i < history.length; i += 2) {
        historyHTML += `<div>${(i/2)+1}. ${history[i]} ${history[i+1] || ''}</div>`;
    }
    $('#moveHistory').html(historyHTML);
    $('#moveHistory').scrollTop($('#moveHistory')[0].scrollHeight);
}

// Relogio de Xadrez
function startTimers() {
    clearInterval(timerInterval);
    const initial = parseInt($('#timeControl').val());
    whiteTime = initial;
    blackTime = initial;
    activeTimer = 'w';
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (activeTimer === 'w') {
            whiteTime--;
            if (whiteTime <= 0) endGame('Pretas vencem no tempo!');
        } else {
            blackTime--;
            if (blackTime <= 0) endGame('Brancas vencem no tempo!');
        }
        updateTimerDisplay();
    }, 1000);
}

function switchTimer() {
    activeTimer = game.turn();
    $('.timer').removeClass('active');
    if (activeTimer === 'w') $('#bottomTimer').addClass('active');
    else $('#topTimer').addClass('active');
}

function updateTimerDisplay() {
    $('#bottomTimer').text(formatTime(whiteTime));
    $('#topTimer').text(formatTime(blackTime));
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function endGame(msg) {
    clearInterval(timerInterval);
    alert(msg);
}

// Configuração do Tabuleiro
const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen()),
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('board', config);
$(window).resize(board.resize);

// Controles da Interface
$('#themeSelect').on('change', function() {
    $('body').removeClass('theme-green theme-dark theme-wood').addClass(`theme-${this.value}`);
});

$('#btnNewGame').on('click', () => {
    game.reset();
    board.start();
    $('#moveHistory').empty();
    $('#bottomCaptured, #topCaptured').empty();
    $('#board .square-55d68').removeClass('in-check');
    updateEvalBar();
    startTimers();
});

$('#btnVsBot').on('click', function() {
    mode = 'bot';
    $('.header-actions button').removeClass('active');
    $(this).addClass('active');
    $('#opponentName').text('Stockfish Bot');
    $('#btnNewGame').click();
});

$('#btnPassAndPlay').on('click', function() {
    mode = 'local';
    $('.header-actions button').removeClass('active');
    $(this).addClass('active');
    $('#opponentName').text('Jogador 2 (Local)');
    $('#btnNewGame').click();
});

// Inicializacao
startTimers();
