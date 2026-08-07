let board = null;
const game = new Chess();
let currentUser = null;

const pieceThemeURLs = {
    wikipedia: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    alpha: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png',
    chesspro: 'https://chessboardjs.com/img/chesspieces/chesspro/{piece}.png'
};

// 1. Sistema de Usuário e Estatísticas (LocalStorage)
function initUserSession() {
    const savedUser = localStorage.getItem('chess_current_user');
    if (savedUser) {
        currentUser = savedUser;
        $('#loginModal').hide();
        loadUserData();
    } else {
        $('#loginModal').css('display', 'flex');
    }
}

$('#loginForm').on('submit', (e) => {
    e.preventDefault();
    const username = $('#usernameInput').val().trim();
    if (username) {
        currentUser = username;
        localStorage.setItem('chess_current_user', username);
        if (!localStorage.getItem(`stats_${currentUser}`)) {
            saveUserData({ wins: 0, losses: 0, draws: 0 });
        }
        $('#loginModal').hide();
        loadUserData();
    }
});

$('#logoutBtn').on('click', () => {
    localStorage.removeItem('chess_current_user');
    location.reload();
});

function loadUserData() {
    $('#userDisplay').text(currentUser);
    const stats = JSON.parse(localStorage.getItem(`stats_${currentUser}`)) || { wins: 0, losses: 0, draws: 0 };
    $('#winsCount').text(stats.wins);
    $('#lossesCount').text(stats.losses);
    $('#drawsCount').text(stats.draws);
}

function saveUserData(stats) {
    localStorage.setItem(`stats_${currentUser}`, JSON.stringify(stats));
    loadUserData();
}

function updateGameResult(result) {
    const stats = JSON.parse(localStorage.getItem(`stats_${currentUser}`)) || { wins: 0, losses: 0, draws: 0 };
    if (result === 'win') stats.wins++;
    if (result === 'loss') stats.losses++;
    if (result === 'draw') stats.draws++;
    saveUserData(stats);
}

$('#resetStatsBtn').on('click', () => {
    if (confirm('Zerar seu histórico de vitórias/derrotas?')) {
        saveUserData({ wins: 0, losses: 0, draws: 0 });
    }
});

// 2. Inteligência do Bot (Minimax)
const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000 };

function evaluateBoard(boardState) {
    let total = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardState[i][j];
            if (piece) {
                const val = pieceValues[piece.type];
                total += piece.color === 'w' ? val : -val;
            }
        }
    }
    return total;
}

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
        updateStatus();
    }
}

// 3. Regras do Tabuleiro e Eventos
function onDragStart(source, piece) {
    if (game.game_over() || piece.search(/^b/) !== -1) return false;
}

function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    
    updateStatus();
    if (!game.game_over()) {
        window.setTimeout(makeBotMove, 250);
    }
}

function updateStatus() {
    let statusText = '';
    const turn = game.turn() === 'w' ? 'Sua vez' : 'Vez do Bot';

    if (game.in_checkmate()) {
        if (game.turn() === 'b') {
            statusText = 'Xeque-mate! Você venceu!';
            updateGameResult('win');
        } else {
            statusText = 'Xeque-mate! O Bot venceu!';
            updateGameResult('loss');
        }
    } else if (game.in_draw()) {
        statusText = 'Empate!';
        updateGameResult('draw');
    } else {
        statusText = turn;
        if (game.in_check()) statusText += ' (Em Xeque!)';
    }

    $('#status').text(statusText);
}

// 4. Inicialização do Tabuleiro e Personalização
const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: () => board.position(game.fen()),
    pieceTheme: pieceThemeURLs.wikipedia
};

board = Chessboard('board', config);

// Troca de Temas
$('#boardTheme').on('change', function() {
    $('body').removeClass('theme-classic theme-dark theme-wood theme-neon')
             .addClass(`theme-${this.value}`);
});

$('#pieceTheme').on('change', function() {
    config.pieceTheme = pieceThemeURLs[this.value];
    board = Chessboard('board', config);
    board.position(game.fen());
});

$('#resetBtn').on('click', () => {
    game.reset();
    board.start();
    updateStatus();
});

// Início
initUserSession();
updateStatus();
