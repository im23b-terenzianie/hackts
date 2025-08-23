import express from 'express';
import { WebSocket } from 'ws';
import { createServer } from 'http';
import { nanoid } from 'nanoid';
import { arrayBuffer } from 'stream/consumers';

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

const lobbies = new Map();

function createLobby() {
    const code = nanoid();
    const lobby = {
        code,
        players: new Map(),
        lobbywords: new Array(),
        host: null,
        timer: null
    }
    lobbies.set(code, lobby);
    return code;
};


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

function broadcast(lobby, message) {
    lobby.players.forEach((player) => {
        player.send(JSON.stringify(message));
    });
};

function startGame(lobby) {
    shuffle(lobby.lobbywords);
    const currentWord = lobby.lobbywords.pop();
    broadcast(lobby, { type: "start", word: currentWord });
};

function checkAnswer(lobby, player, answer) {
    const currentWord = lobby.lobbywords[lobby.lobbywords.length - 1];
    if (currentWord && currentWord.answer === answer) {
        broadcast(lobby, { type: "correct", player });
    } else {
        broadcast(lobby, { type: "incorrect", player });
    }
};

function nextWord(lobby) {
    const currentWord = lobby.lobbywords.pop();
    if (currentWord) {
        broadcast(lobby, { type: "next", word: currentWord });
    } else {
        broadcast(lobby, { type: "end" });
    }
};

function endGame(lobby) {
    broadcast(lobby, { type: "end" });
    lobby.players.forEach((player) => {
        player.close();
    });
    lobbies.delete(lobby.code);
};

function removePlayer(lobby, player) {
    lobby.players.delete(player);
    broadcast(lobby, { type: "player_left", player });
};

function getPlayers(lobby) {
    return Array.from(lobby.players.values()).map((player) => player.id);
};

wss.on('connection', (ws) => {
    const player = { id: nanoid(), ws, name: "", score: 0 };

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        if (msg.type === "createLobby") {
            const code = createLobby();
            currentLobby = lobbies.get(code);
            currentLobby.host = player.id;
            player.name = msg.name;
            currentLobby.players.set(player.id, player);
            currentLobby.lobbywords = msg.words;
            ws.send(JSON.stringify({ type: "lobbyCreated", code }));
        }

        if (msg.type === "joinLobby") {
            const lobby = lobbies.get(msg.code);
            if (lobby && lobby.players.size < 2) {
                currentLobby = lobby;
                player.name = msg.name;
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
