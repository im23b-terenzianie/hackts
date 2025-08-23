"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lobbyCode = params.code;
  const playerName = searchParams.get('name') || '';
  
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  const [players, setPlayers] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [gameResults, setGameResults] = useState(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [hasJoined, setHasJoined] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);
  
  const answerInputRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!playerName) {
      console.log('No player name provided');
      setError('Kein Spielername angegeben');
      return;
    }

    console.log('Initializing WebSocket connection for lobby:', lobbyCode, 'player:', playerName);
    
    const connectWebSocket = () => {
      console.log('Creating new WebSocket connection...');
      const newWebSocket = new WebSocket('ws://localhost:3000');
      wsRef.current = newWebSocket;
      
      newWebSocket.onopen = () => {
        console.log('WebSocket connected, attempting to join lobby');
        setConnectionStatus('connected');
        setWs(newWebSocket);
        setError('');
        
        console.log('Sending joinLobby message:', { type: 'joinLobby', code: lobbyCode, name: playerName });
        newWebSocket.send(JSON.stringify({
          type: 'joinLobby',
          code: lobbyCode,
          name: playerName
        }));
      };

      newWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      newWebSocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setWs(null);
        wsRef.current = null;
        
        if (event.code !== 1000) { // Not a normal closure
          setError('Verbindung verloren. Versuche es erneut.');
          
          // Don't auto-reconnect immediately to prevent loops
          console.log('WebSocket closed unexpectedly, not auto-reconnecting to prevent loops');
        }
      };

      newWebSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('Verbindungsfehler. Stelle sicher, dass der Server läuft.');
      };

      return newWebSocket;
    };

    // Connect once when component mounts
    connectWebSocket();

    return () => {
      console.log('Cleaning up WebSocket connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [lobbyCode, playerName]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'playerJoined':
        console.log('playerJoined received:', data);
        console.log('Current player name:', playerName);
        console.log('Players in data:', data.players);
        setPlayers(data.players);
        setHasJoined(true);
        // Check if current player is host
        const currentPlayer = data.players.find(p => p.name === playerName);
        console.log('Current player found:', currentPlayer);
        console.log('Is host:', currentPlayer?.isHost);
        setIsHost(currentPlayer?.isHost || false);
        break;
        
      case 'newHost':
        setIsHost(true);
        setError(`${data.hostName} ist jetzt der Host`);
        setTimeout(() => setError(''), 3000);
        break;
        
      case 'playerLeft':
        setPlayers(data.players);
        setError(`${data.playerName} hat die Lobby verlassen`);
        setTimeout(() => setError(''), 3000);
        break;
        
      case 'gameStarted':
        setGameState('playing');
        setTimeLeft(data.timeLimit);
        setScore(0);
        setError('');
        break;
        
      case 'nextWord':
        setCurrentWord(data.word);
        setAnswer('');
        if (answerInputRef.current) {
          answerInputRef.current.focus();
        }
        break;
        
      case 'timer':
        setTimeLeft(data.timeLeft);
        break;
        
      case 'correct':
        setScore(data.score);
        setError('Richtig! 🎉');
        setTimeout(() => setError(''), 1000);
        break;
        
      case 'incorrect':
        setScore(data.score);
        setError(`Falsch! Die richtige Antwort war: ${data.correctAnswer}`);
        setTimeout(() => setError(''), 2000);
        break;
        
      case 'gameOver':
        setGameState('finished');
        setGameResults(data);
        setError('');
        break;
        
      case 'error':
        setError(data.message);
        setTimeout(() => setError(''), 5000);
        break;
    }
  };

  const startGame = () => {
    if (ws && isHost) {
      ws.send(JSON.stringify({ type: 'startGame' }));
    }
  };

  const submitAnswer = (e) => {
    e.preventDefault();
    if (ws && answer.trim()) {
      ws.send(JSON.stringify({ type: 'answer', answer: answer.trim() }));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verbinde mit Server...</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verbindungsfehler</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4"
          >
            Erneut versuchen
          </button>
          <Link 
            href="/"
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lobby: {lobbyCode}</h1>
              <p className="text-gray-600">Spieler: {playerName}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className={`font-semibold ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? 'Verbunden' : 'Getrennt'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Players List */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Spieler ({players.length}/2)</h2>
              <div className="space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                      <span className="font-medium">{player.name}</span>
                      {player.isHost && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {players.length < 2 && (
                  <div className="text-center py-8 text-gray-500">
                    Warte auf zweiten Spieler...
                  </div>
                )}
              </div>
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Host-Steuerung</h2>
                <button
                  onClick={startGame}
                  disabled={players.length < 2}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${
                    players.length < 2
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105'
                  }`}
                >
                  {players.length < 2 ? 'Warte auf Spieler...' : 'Spiel starten'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Mindestens 2 Spieler benötigt
                </p>
              </div>
            )}

            {!isHost && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Warten auf Host</h2>
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Der Host startet das Spiel...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'playing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Game Interface */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-lg text-gray-600">Zeit verbleibend</div>
              </div>

              {currentWord && (
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Übersetze:</h2>
                  <div className="text-4xl font-bold text-blue-600 mb-6">
                    {currentWord.question}
                  </div>
                  
                  <form onSubmit={submitAnswer} className="space-y-4">
                    <input
                      ref={answerInputRef}
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Deine Antwort..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!answer.trim()}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                        answer.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Antwort senden
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Score and Players */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Punktestand</h2>
              <div className="space-y-4">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="font-medium">{player.name}</span>
                      {player.name === playerName && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {player.name === playerName ? score : '?'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'finished' && gameResults && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Spiel beendet!</h2>
            
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Ergebnisse:</h3>
              <div className="space-y-3">
                {gameResults.results.map((result, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${
                    gameResults.winners.includes(result.name) 
                      ? 'bg-yellow-100 border-2 border-yellow-300' 
                      : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center">
                      {gameResults.winners.includes(result.name) && (
                        <span className="text-2xl mr-3">🏆</span>
                      )}
                      <span className="font-medium">{result.name}</span>
                      {result.name === playerName && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {result.score} Punkte
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Link 
                href="/"
                className="block w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Neues Spiel starten
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
