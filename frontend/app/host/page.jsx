"use client";
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import XlsxDrop from '../../components/XlsxDrop';

export default function HostPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get('name') || '';
  
  const [words, setWords] = useState([]);
  const [gameMode, setGameMode] = useState('normal');
  const [lobbyCode, setLobbyCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [manualWord, setManualWord] = useState({ question: '', answer: '' });
  const [showManualInput, setShowManualInput] = useState(false);
  const [error, setError] = useState('');
  const [ws, setWs] = useState(null);
  const wsRef = useRef(null);

  const timeModes = {
    quick: { name: 'Schnell (1 Min)', time: 60 },
    normal: { name: 'Normal (3 Min)', time: 180 },
    long: { name: 'Lang (5 Min)', time: 300 }
  };

  const handleExcelUpload = (uploadedWords) => {
    const formattedWords = uploadedWords.map(word => ({
      question: word.english || word.question || '',
      answer: word.german || word.answer || ''
    })).filter(word => word.question && word.answer);
    
    setWords(prev => [...prev, ...formattedWords]);
  };

  const addManualWord = () => {
    if (manualWord.question.trim() && manualWord.answer.trim()) {
      setWords(prev => [...prev, { ...manualWord }]);
      setManualWord({ question: '', answer: '' });
    }
  };

  const removeWord = (index) => {
    setWords(prev => prev.filter((_, i) => i !== index));
  };

  const createLobby = async () => {
    if (words.length === 0) {
      setError('Bitte füge mindestens ein Wort hinzu!');
      return;
    }

    setIsCreating(true);
    setError('');
    
    try {
      // Create new WebSocket connection
      const websocket = new WebSocket('ws://localhost:3000');
      wsRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('WebSocket connected for lobby creation');
        setWs(websocket);
        
        websocket.send(JSON.stringify({
          type: 'createLobby',
          name: playerName,
          words: words,
          mode: gameMode
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          if (data.type === 'lobbyCreated') {
            setLobbyCode(data.code);
            setIsCreating(false);
            setError('');
            
            // Automatically navigate to the lobby after a short delay
            setTimeout(() => {
              router.push(`/lobby/${data.code}?name=${encodeURIComponent(playerName)}`);
            }, 2000);
          } else if (data.type === 'error') {
            setError(data.message);
            setIsCreating(false);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          setError('Fehler beim Verarbeiten der Server-Antwort');
          setIsCreating(false);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Verbindungsfehler. Stelle sicher, dass der Server läuft.');
        setIsCreating(false);
      };

      websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) {
          setError('Verbindung zum Server verloren');
        }
        setIsCreating(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Verbindungsfehler. Stelle sicher, dass der Server läuft.');
      setIsCreating(false);
    }
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lobby erstellen</h1>
              <p className="text-gray-600">Spieler: {playerName}</p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Zurück
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Game Mode Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Spielmodus</h2>
              <div className="space-y-3">
                {Object.entries(timeModes).map(([key, mode]) => (
                  <label key={key} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="gameMode"
                      value={key}
                      checked={gameMode === key}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-sm text-gray-500">{mode.time} Sekunden</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Word Input Methods */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Wörter hinzufügen</h2>
              
              {/* Excel Upload */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Excel-Datei hochladen</h3>
                <XlsxDrop onWordsUploaded={handleExcelUpload} />
              </div>

              {/* Manual Input */}
              <div>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showManualInput ? 'Manuelle Eingabe ausblenden' : 'Manuell Wörter hinzufügen'}
                </button>
                
                {showManualInput && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Frage (z.B. 'Hello')"
                      value={manualWord.question}
                      onChange={(e) => setManualWord(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Antwort (z.B. 'Hallo')"
                      value={manualWord.answer}
                      onChange={(e) => setManualWord(prev => ({ ...prev, answer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addManualWord}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Wort hinzufügen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Word List and Lobby */}
          <div className="space-y-6">
            {/* Word List */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Wörterliste ({words.length} Wörter)
              </h2>
              
              {words.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Noch keine Wörter hinzugefügt. Lade eine Excel-Datei hoch oder füge Wörter manuell hinzu.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {words.map((word, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{word.question}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span>{word.answer}</span>
                      </div>
                      <button
                        onClick={() => removeWord(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Lobby */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Lobby erstellen</h2>
              
              {lobbyCode ? (
                <div className="text-center">
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-medium">Lobby erstellt!</p>
                    <p className="text-2xl font-bold text-green-900 mt-2">{lobbyCode}</p>
                    <p className="text-sm text-green-700 mt-1">Teile diesen Code mit deinem Gegner</p>
                    <p className="text-sm text-green-600 mt-2">Du wirst automatisch zur Lobby weitergeleitet...</p>
                  </div>
                  <Link
                    href={`/lobby/${lobbyCode}?name=${encodeURIComponent(playerName)}`}
                    className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Jetzt zur Lobby gehen
                  </Link>
                </div>
              ) : (
                <button
                  onClick={createLobby}
                  disabled={isCreating || words.length === 0}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isCreating || words.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCreating ? 'Erstelle Lobby...' : 'Lobby erstellen'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
