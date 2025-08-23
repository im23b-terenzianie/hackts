import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { nanoid } from 'nanoid';
import cors from 'cors';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const lobbies = new Map();
const connectedPlayers = new Map(); // Track connected players by WebSocket

function createLobby() {
    const code = nanoid(6).toUpperCase(); // 6-character uppercase code
    const lobby = {
        code,
        players: new Map(),
        lobbywords: [],
        host: null,
        timer: null,
        timeLimit: 180,
        timeLeft: 180,
        gameState: 'waiting' // waiting, playing, finished
    };
    lobbies.set(code, lobby);
    console.log(`Lobby created: ${code}`);
    return code;
}

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function broadcast(lobby, message) {
    lobby.players.forEach((player) => {
        if (player.ws.readyState === 1) { // WebSocket.OPEN
            try {
                player.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending message to player:', error);
            }
        }
    });
}

function startGame(lobby) {
    if (lobby.players.size < 2) {
        broadcast(lobby, { type: "error", message: "Mindestens 2 Spieler benötigt" });
        return;
    }
    
    lobby.gameState = 'playing';
    lobby.lobbywords = shuffle(lobby.lobbywords);
    
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
        try {
            player.ws.send(JSON.stringify({ type: "nextWord", word }));
        } catch (error) {
            console.error('Error sending next word:', error);
        }
    } else {
        try {
            player.ws.send(JSON.stringify({ type: "finished", score: player.score }));
        } catch (error) {
            console.error('Error sending finished message:', error);
        }
        
        // Check if all players finished
        const allFinished = Array.from(lobby.players.values()).every(p => p.currentWordIndex >= lobby.lobbywords.length);
        if (allFinished) {
            endGame(lobby);
        }
    }
}

function checkAnswer(lobby, playerId, answer) {
    const player = lobby.players.get(playerId);
    if (!player || player.currentWordIndex >= lobby.lobbywords.length) return;
    
    const word = lobby.lobbywords[player.currentWordIndex];
    const isCorrect = word && word.answer && word.answer.toLowerCase().trim() === answer.toLowerCase().trim();
    
    try {
        if (isCorrect) {
            player.score++;
            player.ws.send(JSON.stringify({ type: "correct", score: player.score }));
        } else {
            player.ws.send(JSON.stringify({ type: "incorrect", score: player.score, correctAnswer: word.answer }));
        }
    } catch (error) {
        console.error('Error sending answer feedback:', error);
    }
    
    player.currentWordIndex++;
    sendNextWord(lobby, player);
}

function endGame(lobby) {
    if (lobby.timer) {
        clearInterval(lobby.timer);
        lobby.timer = null;
    }
    
    lobby.gameState = 'finished';
    
    // Find winner(s)
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
    
    const results = Array.from(lobby.players.values()).map(player => ({
        name: player.name,
        score: player.score
    }));
    
    broadcast(lobby, { type: "gameOver", winners, maxScore, results });
    
    // Clean up lobby after 10 seconds
    setTimeout(() => {
        lobbies.delete(lobby.code);
    }, 10000);
}

function removePlayer(lobby, playerId) {
    if (!lobby || !lobby.players.has(playerId)) return;
    
    const player = lobby.players.get(playerId);
    lobby.players.delete(playerId);
    
    // Remove from connectedPlayers map if the WebSocket is still tracked
    if (player.ws) {
        connectedPlayers.delete(player.ws);
    }
    
    console.log(`Player ${player.name} left lobby ${lobby.code}`);
    
    broadcast(lobby, { 
        type: "playerLeft", 
        playerName: player.name,
        players: getPlayersList(lobby)
    });
    
    // If host left, assign new host or end game
    if (lobby.host === playerId) {
        if (lobby.players.size > 0) {
            const newHost = Array.from(lobby.players.values())[0];
            lobby.host = newHost.id;
            broadcast(lobby, { type: "newHost", hostName: newHost.name });
        } else {
            // No players left, but don't delete lobby immediately for host reconnection
            // Only delete if no one reconnects within 30 seconds
            setTimeout(() => {
                if (lobby.players.size === 0) {
                    console.log(`Deleting empty lobby ${lobby.code}`);
                    lobbies.delete(lobby.code);
                }
            }, 30000);
        }
    }
    
    // If game is running and less than 2 players, end game
    if (lobby.gameState === 'playing' && lobby.players.size < 2) {
        endGame(lobby);
    }
}

function getPlayersList(lobby) {
    return Array.from(lobby.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.id === lobby.host
    }));
}

// REST API endpoints
app.get('/api/lobbies/:code', (req, res) => {
    const lobby = lobbies.get(req.params.code);
    if (lobby) {
        res.json({
            code: lobby.code,
            playerCount: lobby.players.size,
            gameState: lobby.gameState,
            timeLimit: lobby.timeLimit
        });
    } else {
        res.status(404).json({ error: 'Lobby not found' });
    }
});

wss.on('connection', (ws) => {
    let currentLobby = null;
    const player = { 
        id: nanoid(), 
        ws, 
        name: "", 
        score: 0, 
        currentWordIndex: 0 
    };

    // Track this connection
    connectedPlayers.set(ws, player);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('Received message:', msg.type, msg);

            if (msg.type === "createLobby") {
                // Check if player is already in a lobby
                if (currentLobby) {
                    ws.send(JSON.stringify({ type: "error", message: "Du bist bereits in einer Lobby" }));
                    return;
                }

                const code = createLobby();
                currentLobby = lobbies.get(code);
                currentLobby.host = player.id;
                player.name = msg.name;
                currentLobby.players.set(player.id, player);
                currentLobby.lobbywords = msg.words || [];
                
                // Update connectedPlayers map
                connectedPlayers.set(ws, player);
                
                // Set time limit based on mode
                if (msg.mode === "quick") currentLobby.timeLimit = 60;
                else if (msg.mode === "normal") currentLobby.timeLimit = 180;
                else if (msg.mode === "long") currentLobby.timeLimit = 300;
                
                currentLobby.timeLeft = currentLobby.timeLimit;
                
                console.log(`Lobby ${code} created by ${player.name} with ${currentLobby.lobbywords.length} words`);
                
                ws.send(JSON.stringify({ 
                    type: "lobbyCreated", 
                    code, 
                    timeLimit: currentLobby.timeLimit,
                    players: getPlayersList(currentLobby)
                }));
            }

            if (msg.type === "joinLobby") {
                // Check if player is already in a lobby (but allow host reconnection)
                if (currentLobby) {
                    ws.send(JSON.stringify({ type: "error", message: "Du bist bereits in einer Lobby" }));
                    return;
                }

                const lobby = lobbies.get(msg.code);
                console.log(`Attempting to join lobby ${msg.code}:`, lobby ? 'found' : 'not found');
                
                if (lobby && lobby.gameState === 'waiting') {
                    currentLobby = lobby;
                    player.name = msg.name;
                    player.currentWordIndex = 0;
                    player.score = 0;
                    
                    // Check if this player already exists in the lobby (by name)
                    const existingPlayers = Array.from(lobby.players.values());
                    const existingPlayer = existingPlayers.find(p => p.name === msg.name);
                    
                    console.log(`Join attempt by ${msg.name}:`);
                    console.log(`- Existing players:`, existingPlayers.map(p => ({ name: p.name, id: p.id, isHost: p.id === lobby.host })));
                    console.log(`- Existing player with same name:`, existingPlayer);
                    console.log(`- Current host ID:`, lobby.host);
                    
                    if (existingPlayer) {
                        // Player is reconnecting, update their connection
                        console.log(`Player ${msg.name} is reconnecting, updating their connection`);
                        
                        // Remove old player entry
                        lobby.players.delete(existingPlayer.id);
                        
                        // If this was the host, update host ID
                        if (existingPlayer.id === lobby.host) {
                            lobby.host = player.id;
                            console.log(`Host ${player.name} reconnected with new ID ${player.id}`);
                        }
                        
                        // Add player with new connection
                        lobby.players.set(player.id, player);
                    } else if (lobby.players.size < 2) {
                        // New player joining
                        lobby.players.set(player.id, player);
                        console.log(`New player ${player.name} joined lobby ${msg.code}`);
                    } else {
                        // Lobby is full
                        ws.send(JSON.stringify({ 
                            type: "error", 
                            message: "Lobby ist voll"
                        }));
                        return;
                    }
                    
                    // Send confirmation to the joining player
                    const playersList = getPlayersList(lobby);
                    console.log(`Sending playerJoined to ${player.name}:`, playersList);
                    console.log(`Host ID: ${lobby.host}, Player ID: ${player.id}, IsHost: ${player.id === lobby.host}`);
                    
                    ws.send(JSON.stringify({ 
                        type: "playerJoined", 
                        players: playersList,
                        newPlayer: { name: player.name, isHost: player.id === lobby.host }
                    }));
                    
                    // Broadcast to all players in the lobby
                    broadcast(lobby, { 
                        type: "playerJoined", 
                        players: getPlayersList(lobby),
                        newPlayer: { name: player.name, isHost: player.id === lobby.host }
                    });
                } else {
                    const errorMessage = lobby 
                        ? (lobby.gameState !== 'waiting' ? "Spiel läuft bereits" : "Lobby ist voll") 
                        : "Lobby nicht gefunden";
                    ws.send(JSON.stringify({ 
                        type: "error", 
                        message: errorMessage
                    }));
                }
            }

            if (msg.type === "startGame" && currentLobby && currentLobby.host === player.id) {
                if (currentLobby.lobbywords.length === 0) {
                    ws.send(JSON.stringify({ type: "error", message: "Keine Wörter verfügbar" }));
                    return;
                }
                console.log(`Starting game in lobby ${currentLobby.code}`);
                startGame(currentLobby);
            }

            if (msg.type === "answer" && currentLobby && currentLobby.gameState === 'playing') {
                checkAnswer(currentLobby, player.id, msg.answer);
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ type: "error", message: "Ungültige Nachricht" }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed for player:', player.name);
        if (currentLobby) {
            // Don't immediately remove the player if they might be reconnecting
            // Give them 5 seconds to reconnect
            setTimeout(() => {
                // Check if player is still not connected
                const stillExists = currentLobby.players.has(player.id);
                if (stillExists && (!connectedPlayers.has(ws) || connectedPlayers.get(ws).id === player.id)) {
                    console.log(`Removing player ${player.name} after timeout`);
                    removePlayer(currentLobby, player.id);
                }
            }, 5000);
        }
        // connectedPlayers is managed in removePlayer function
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (currentLobby) {
            removePlayer(currentLobby, player.id);
        }
        // connectedPlayers is managed in removePlayer function
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
