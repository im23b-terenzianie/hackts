"use client";
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  const [currentStep, setCurrentStep] = useState(1); // 1: Zeit, 2: Wörter, 3: Start

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
            
            // Navigate immediately to the lobby
            router.push(`/lobby/${data.code}?name=${encodeURIComponent(playerName)}`);
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
                  Lobby erstellen
                </h1>
                <p className="text-xl text-gray-700 font-medium">Spieler: {playerName}</p>
              </div>
            </div>
            <Link 
              href="/"
              className="px-6 py-3 bg-yellow-400 text-white rounded-2xl hover:bg-yellow-500 transition-all duration-300 font-bold shadow-lg"
            >
              ← Zurück
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-700 px-6 py-4 rounded-2xl mb-8 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Step Navigation */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-3 mb-3">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                currentStep === 1
                  ? 'bg-yellow-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="w-5 h-5 bg-white text-yellow-600 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="font-medium text-sm">Zeit wählen</span>
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                currentStep === 2
                  ? 'bg-yellow-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="w-5 h-5 bg-white text-yellow-600 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="font-medium text-sm">Wörter hinzufügen</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                currentStep === 3
                  ? 'bg-yellow-400 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="w-5 h-5 bg-white text-yellow-600 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="font-medium text-sm">Lobby starten</span>
            </button>
          </div>
        </div>

        <div className="h-full overflow-y-auto">
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Spielmodus wählen</h2>
                <div className="space-y-2">
                  {Object.entries(timeModes).map(([key, mode]) => (
                    <label key={key} className="flex items-center p-3 bg-gray-50 border-2 border-yellow-200 rounded-2xl cursor-pointer hover:bg-yellow-50 transition-all duration-300">
                      <input
                        type="radio"
                        name="gameMode"
                        value={key}
                        checked={gameMode === key}
                        onChange={(e) => setGameMode(e.target.value)}
                        className="mr-2 w-4 h-4 text-yellow-500 bg-white border-yellow-300 focus:ring-yellow-400"
                      />
                      <div>
                        <div className="font-bold text-gray-800">{mode.name}</div>
                        <div className="text-gray-600 text-sm">{mode.time} Sekunden</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-yellow-400 text-white rounded-2xl hover:bg-yellow-500 transition-all duration-300 font-bold shadow-lg"
                  >
                    Weiter zu Wörtern
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="max-w-4xl mx-auto">
              {words.length === 0 ? (
                /* Excel Upload - nur wenn keine Wörter vorhanden */
                <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">Excel-Datei hochladen</h2>
                  <XlsxDrop onWordsUploaded={handleExcelUpload} />
                </div>
              ) : (
                /* Word List - nur wenn Wörter vorhanden */
                <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">
                    Wörterliste ({words.length} Wörter)
                  </h2>
                  
                  <div className="max-h-64 overflow-y-auto mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {words.map((word, index) => (
                        <div key={index} className="p-2 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-center relative">
                          <div className="font-bold text-gray-800 text-xs">{word.question}</div>
                          <div className="text-yellow-500 text-xs">→</div>
                          <div className="text-gray-700 text-xs">{word.answer}</div>
                          <button
                            onClick={() => removeWord(index)}
                            className="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 bg-yellow-400 text-white rounded-2xl hover:bg-yellow-500 transition-all duration-300 font-bold shadow-lg"
                    >
                      Weiter zur Lobby
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-200 p-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Lobby erstellen</h2>
                
                <div className="space-y-3 mb-4">
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3">
                    <h3 className="font-bold text-gray-800 mb-1 text-sm">Gewählter Spielmodus:</h3>
                    <p className="text-gray-700 text-sm">{timeModes[gameMode].name}</p>
                  </div>
                  
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3">
                    <h3 className="font-bold text-gray-800 mb-1 text-sm">Wörter hinzugefügt:</h3>
                    <p className="text-gray-700 text-sm">{words.length} Wörter</p>
                  </div>
                </div>
                
                {lobbyCode ? (
                  <div className="text-center">
                    <div className="bg-yellow-100 border-4 border-yellow-300 rounded-2xl p-3 mb-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-5 h-5 bg-white rounded-full"></div>
                      </div>
                      <p className="text-yellow-800 font-bold text-sm">Lobby erstellt!</p>
                      <p className="text-xl font-black text-yellow-900 mt-1 tracking-wider">{lobbyCode}</p>
                      <p className="text-xs text-yellow-700 mt-1">Teile diesen Code mit deinem Gegner</p>
                      <p className="text-xs text-yellow-600 mt-1">Du wirst automatisch zur Lobby weitergeleitet...</p>
                    </div>
                    <Link
                      href={`/lobby/${lobbyCode}?name=${encodeURIComponent(playerName)}`}
                      className="block w-full py-2 px-4 bg-orange-400 text-white rounded-2xl hover:bg-orange-500 transition-all duration-300 font-bold shadow-lg text-sm"
                    >
                      Jetzt zur Lobby gehen
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={createLobby}
                    disabled={isCreating || words.length === 0}
                    className={`w-full py-2 px-4 rounded-2xl font-bold transition-all duration-300 text-sm ${
                      isCreating || words.length === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-yellow-400 text-white hover:bg-yellow-500 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isCreating ? 'Erstelle Lobby...' : `Lobby erstellen (${words.length} Wörter)`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
