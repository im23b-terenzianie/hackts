"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">WordBattle</h1>
          <p className="text-gray-600">Das ultimative 1v1 Vokabel-Duell</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Dein Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Gib deinen Namen ein..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Link 
            href={`/host?name=${encodeURIComponent(playerName)}`}
            className={`block w-full py-4 px-6 rounded-lg text-center font-semibold transition-all ${
              playerName.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={(e) => !playerName.trim() && e.preventDefault()}
          >
            🎮 Lobby erstellen
          </Link>
          
          <Link 
            href={`/join?name=${encodeURIComponent(playerName)}`}
            className={`block w-full py-4 px-6 rounded-lg text-center font-semibold transition-all ${
              playerName.trim() 
                ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={(e) => !playerName.trim() && e.preventDefault()}
          >
            🔗 Lobby beitreten
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">So funktioniert's:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
              Erstelle eine Lobby oder trete einer bei
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
              Lade deine Vokabeln hoch oder erstelle sie manuell
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
              Starte das Spiel und kämpfe um den Sieg!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
