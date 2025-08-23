"use client";
import { useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get('name') || '';
  
  const [lobbyCode, setLobbyCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef(null);

  const joinLobby = async () => {
    if (!lobbyCode.trim()) {
      setError('Bitte gib einen Lobby-Code ein');
      return;
    }

    setIsJoining(true);
    setError('');
    
    try {
      // Create new WebSocket connection
      const websocket = new WebSocket('ws://localhost:3000');
      wsRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('WebSocket connected for joining lobby');
        
        websocket.send(JSON.stringify({
          type: 'joinLobby',
          code: lobbyCode.toUpperCase(),
          name: playerName
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          if (data.type === 'playerJoined') {
            router.push(`/lobby/${lobbyCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
          } else if (data.type === 'error') {
            setError(data.message);
            setIsJoining(false);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          setError('Fehler beim Verarbeiten der Server-Antwort');
          setIsJoining(false);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Verbindungsfehler. Stelle sicher, dass der Server läuft.');
        setIsJoining(false);
      };

      websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) {
          setError('Verbindung zum Server verloren');
        }
        setIsJoining(false);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (isJoining) {
          setError('Zeitüberschreitung. Bitte versuche es erneut.');
          setIsJoining(false);
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.close();
          }
        }
      }, 10000);

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Verbindungsfehler. Stelle sicher, dass der Server läuft.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Lobby beitreten</h1>
          <p className="text-gray-600">Spieler: {playerName}</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="lobbyCode" className="block text-sm font-medium text-gray-700 mb-2">
              Lobby-Code
            </label>
            <input
              type="text"
              id="lobbyCode"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              placeholder="z.B. ABC123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              maxLength={6}
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-1">
              Gib den 6-stelligen Code ein, den dir der Host gegeben hat
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={joinLobby}
            disabled={isJoining || !lobbyCode.trim()}
            className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${
              isJoining || !lobbyCode.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105'
            }`}
          >
            {isJoining ? 'Trete bei...' : 'Lobby beitreten'}
          </button>

          <div className="text-center">
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Wie funktioniert's?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
              Der Host erstellt eine Lobby und erhält einen Code
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
              Der Host teilt dir den Code mit
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
              Gib den Code hier ein und trete der Lobby bei
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
