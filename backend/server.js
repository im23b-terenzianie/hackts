import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { nanoid } from 'nanoid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const lobbies = new Map();

function createLobby() {
    const code = nanoid();
    const lobby = {
        code,
        players: new Map(),
        lobbywords: new Array(),
        host: null,
        timer: null,
        timeLimit: 180,
        timeLeft: 180
    };
    lobbies.set(code, lobby);
    return code;
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

function broadcast(lobby, message) {
    lobby.players.forEach((player) => {
        player.ws.send(JSON.stringify(message));
    });
}

function startGame(lobby) {
    shuffle(lobby.lobbywords);
    lobby.players.forEach((player) => {
        player.currentWordIndex = 0;
        player.score = 0;
        sendNextWord(lobby, player);
    });
    broadcast(lobby, { type: "gameStarted", timeLimit: lobby.timeLimit });
    lobby.timeLeft = lobby.timeLimit;
    lobby.timer = setInterval(() => {
        lobby.timeLeft--;
        broadcast(lobby, { type: "timer", timeLeft: lobby.timeLeft });
        if (lobby.timeLeft <= 0) {
            clearInterval(lobby.timer);
            lobby.timer = null;
            endGame(lobby);
        }
    }, 1000);
}

function sendNextWord(lobby, player) {
    if (player.currentWordIndex < lobby.lobbywords.length) {
        const word = lobby.lobbywords[player.currentWordIndex];
        player.ws.send(JSON.stringify({ type: "nextWord", word }));
    } else {
        player.ws.send(JSON.stringify({ type: "finished", score: player.score }));

        if (Array.from(lobby.players.values()).every(p => p.currentWordIndex >= lobby.lobbywords.length)) {
            endGame(lobby);
        }
    }
}

function checkAnswer(lobby, playerId, answer) {
    const player = lobby.players.get(playerId);
    if (!player) return;
    const word = lobby.lobbywords[player.currentWordIndex];
    if (word && word.answer === answer) {
        player.score++;
        player.ws.send(JSON.stringify({ type: "correct", score: player.score }));
    } else {
        player.ws.send(JSON.stringify({ type: "incorrect", score: player.score }));
    }
    player.currentWordIndex++;
    sendNextWord(lobby, player);
}


function endGame(lobby) {
    if (lobby.timer) {
        clearInterval(lobby.timer);
        lobby.timer = null;
    }
    let maxScore = -1;
    let winners = [];
    lobby.players.forEach((player) => {
        if (player.score > maxScore) {
            maxScore = player.score;
            winners = [player.name];
        } else if (player.score === maxScore) {
            winners.push(player.name);
        }
    });
    broadcast(lobby, { type: "gameOver", winners, maxScore });
    lobbies.delete(lobby.code);
}

function removePlayer(lobby, player) {
    lobby.players.delete(player);
    broadcast(lobby, { type: "player_left", player });
};

function getPlayers(lobby) {
    return Array.from(lobby.players.values()).map((player) => player.id);
};

wss.on('connection', (ws) => {
    let currentLobby = null;
    const player = { id: nanoid(), ws, name: "", score: 0, currentWordIndex: 0 };

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        if (msg.type === "createLobby") {
            const code = createLobby();
            currentLobby = lobbies.get(code);
            currentLobby.host = player.id;
            player.name = msg.name;
            currentLobby.players.set(player.id, player);
            currentLobby.lobbywords = msg.words;
            if (msg.mode === "quick") currentLobby.timeLimit = 60;
            else if (msg.mode === "normal") currentLobby.timeLimit = 180;
            else if (msg.mode === "long") currentLobby.timeLimit = 300;
            currentLobby.timeLeft = currentLobby.timeLimit;
            ws.send(JSON.stringify({ type: "lobbyCreated", code, timeLimit: currentLobby.timeLimit }));
        }

        if (msg.type === "joinLobby") {
            const lobby = lobbies.get(msg.code);
            if (lobby && lobby.players.size < 2) {
                currentLobby = lobby;
                player.name = msg.name;
                player.currentWordIndex = 0;
                player.score = 0;
                lobby.players.set(player.id, player);
                broadcast(lobby, { type: "playerJoined", players: getPlayers(lobby) });
            }
        }

        if (msg.type === "startGame" && currentLobby && currentLobby.host === player.id) {
            startGame(currentLobby);
        }

        if (msg.type === "answer" && currentLobby) {
            checkAnswer(currentLobby, player.id, msg.answer);
        }
    });


    ws.on('close', () => {
        if (currentLobby) {
            removePlayer(currentLobby, player.id);
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
