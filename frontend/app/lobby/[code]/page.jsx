"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
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
        setMessage('Richtig! 🎉');
        setMessageType('success');
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 1000);
        break;
        
      case 'incorrect':
        setScore(data.score);
        setMessage(`Falsch! Die richtige Antwort war: ${data.correctAnswer}`);
        setMessageType('error');
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 2000);
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
    <div className="h-screen bg-yellow-50 p-4 overflow-hidden">
      <div className="max-w-4xl mx-auto h-full">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mr-4 p-2">
                <Image
                  src="/logo/duellingo.png"
                  alt="Duellingo Logo"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </div>
              <div>
                <h1 className="text-4xl font-black text-yellow-600 mb-2">
                  Lobby: {lobbyCode}
                </h1>
                <p className="text-xl text-gray-700 font-medium">Spieler: {playerName}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div className={`flex items-center justify-end font-bold text-lg ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {connectionStatus === 'connected' ? 'Verbunden' : 'Getrennt'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-700 px-6 py-4 rounded-2xl mb-8 font-medium">
            ⚠️ {error}
          </div>
        )}



                 {gameState === 'waiting' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto">
             {/* Players List */}
             <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8">
               <h2 className="text-2xl font-bold text-gray-800 mb-6">Spieler ({players.length}/2)</h2>
               <div className="space-y-4">
                 {players.map((player) => (
                   <div key={player.id} className="flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                     <div className="flex items-center">
                       <span className="w-4 h-4 bg-green-500 rounded-full mr-4"></span>
                       <span className="font-bold text-gray-800">{player.name}</span>
                       {player.isHost && (
                         <span className="ml-3 px-3 py-1 bg-yellow-400 text-white text-sm rounded-full font-bold">
                           Host
                         </span>
                       )}
                     </div>
                   </div>
                 ))}
                 {players.length < 2 && (
                   <div className="text-center py-12">
                     <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-yellow-400"></div>
                     </div>
                     <p className="text-gray-600 font-medium">Warte auf zweiten Spieler...</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Host Controls */}
             {isHost && (
               <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8">
                 <h2 className="text-2xl font-bold text-gray-800 mb-6">Host-Steuerung</h2>
                 <button
                   onClick={startGame}
                   disabled={players.length < 2}
                   className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                     players.length < 2
                       ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                       : 'bg-yellow-400 text-white hover:bg-yellow-500 transform hover:scale-105 shadow-lg hover:shadow-xl'
                   }`}
                 >
                   {players.length < 2 ? 'Warte auf Spieler...' : 'Spiel starten'}
                 </button>
                 <p className="text-sm text-gray-600 mt-3 text-center">
                   Mindestens 2 Spieler benötigt
                 </p>
               </div>
             )}

             {!isHost && (
               <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8">
                 <h2 className="text-2xl font-bold text-gray-800 mb-6">Warten auf Host</h2>
                 <div className="text-center py-12">
                   <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-yellow-400"></div>
                   </div>
                   <p className="text-gray-600 font-medium">Der Host startet das Spiel...</p>
                 </div>
               </div>
             )}
           </div>
         )}

        {gameState === 'playing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto">
            {/* Game Interface */}
            <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-orange-600 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-lg text-gray-600 font-medium">Zeit verbleibend</div>
              </div>

              {currentWord && (
                <div className="text-center mb-6">
                  {message ? (
                    /* Message Display - ersetzt die gesamte Guessing-Box */
                    <div className={`p-8 rounded-2xl font-medium text-2xl ${
                      messageType === 'success' 
                        ? 'bg-green-100 border-4 border-green-300 text-green-700' 
                        : 'bg-red-100 border-4 border-red-300 text-red-700'
                    }`}>
                      <div className="text-4xl mb-4">
                        {messageType === 'success' ? '✅' : '❌'}
                      </div>
                      {message}
                    </div>
                  ) : (
                    /* Normal Guessing Interface */
                    <>
                      <h2 className="text-2xl font-bold text-gray-800 mb-6">Übersetze:</h2>
                      <div className="text-4xl font-bold text-yellow-600 mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                        {currentWord.question}
                      </div>
                      
                      <form onSubmit={submitAnswer} className="space-y-4">
                        <input
                          ref={answerInputRef}
                          type="text"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Deine Antwort..."
                          className="w-full px-6 py-4 border-2 border-yellow-300 rounded-2xl focus:ring-4 focus:ring-yellow-400 focus:border-yellow-500 text-center text-lg font-medium text-black"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!answer.trim()}
                          className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                            answer.trim()
                              ? 'bg-orange-400 text-white hover:bg-orange-500 shadow-lg hover:shadow-xl'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Antwort senden
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Score and Players */}
            <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Punktestand</h2>
              <div className="space-y-4">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                    <div className="flex items-center">
                      <span className="font-bold text-gray-800">{player.name}</span>
                      {player.name === playerName && (
                        <span className="ml-3 px-3 py-1 bg-yellow-400 text-white text-sm rounded-full font-bold">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-orange-600">
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
                      <span className="font-medium text-gray-800">{result.name}</span>
                      {result.name === playerName && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-gray-800">
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
