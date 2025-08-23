"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');

  return (
    <div className="h-screen bg-yellow-50 relative overflow-hidden">
      {/* Duolingo-style background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-orange-300 rounded-full opacity-25 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-amber-300 rounded-full opacity-20 animate-ping"></div>
        <div className="absolute bottom-32 right-10 w-12 h-12 bg-yellow-400 rounded-full opacity-35 animate-bounce"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center h-screen p-4">
        <div className="max-w-md w-full">
          {/* Header with Duolingo-style branding */}
          <div className="text-center mb-12">
            <div className="mb-6">
              {/* Logo */}
              <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
                <Image
                  src="/logo/duellingo.png"
                  alt="Duellingo Logo"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              </div>
            </div>
            <h1 className="text-5xl font-black text-yellow-600 mb-4">
              Duellingo
            </h1>
            <p className="text-xl text-gray-700 font-medium">Das ultimative Vokabel-Duell!</p>
          </div>

          {/* Main card - Duolingo style */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-yellow-200">
            <div className="space-y-6">
              <div>
                <label htmlFor="playerName" className="block text-lg font-bold text-gray-800 mb-3">
                  Dein Name
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Gib deinen Namen ein..."
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-yellow-300 rounded-2xl focus:ring-4 focus:ring-yellow-400 focus:border-yellow-500 text-gray-800 placeholder-gray-500 font-medium text-lg transition-all duration-300"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Link
                  href={`/host?name=${encodeURIComponent(playerName)}`}
                  className={`py-4 px-6 rounded-2xl font-bold text-lg text-center transition-all duration-300 transform hover:scale-105 ${
                    playerName.trim()
                      ? 'bg-yellow-400 text-white shadow-lg hover:shadow-xl hover:bg-yellow-500'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => !playerName.trim() && e.preventDefault()}
                >
                  Lobby erstellen
                </Link>
                
                <Link
                  href={`/join?name=${encodeURIComponent(playerName)}`}
                  className={`py-4 px-6 rounded-2xl font-bold text-lg text-center transition-all duration-300 transform hover:scale-105 ${
                    playerName.trim()
                      ? 'bg-orange-400 text-white shadow-lg hover:shadow-xl hover:bg-orange-500'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => !playerName.trim() && e.preventDefault()}
                >
                  Lobby beitreten
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-600 text-sm">
              Erstelle deine eigene Lobby oder trete einer bestehenden bei!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
