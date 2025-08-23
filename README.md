# WordBattle - Das ultimative 1v1 Vokabel-Duell

Eine interaktive Web-App für Vokabel-Duelle zwischen zwei Spielern. Perfekt für den Schulalltag, um Vokabeln spielerisch zu lernen und zu üben.

## 🎯 Problem & Lösung

**Problem:** Im Schulalltag ist es oft schwierig, Vokabeln effektiv zu lernen. Herkömmliche Methoden sind langweilig und wenig motivierend.

**Lösung:** WordBattle bietet ein spannendes 1v1-Duell-System, bei dem Spieler gegeneinander antreten und Vokabeln in Echtzeit übersetzen müssen. Die App unterstützt sowohl manuelle Eingabe als auch Excel-Upload für einfache Verwaltung von Vokabellisten.

## ✨ Features

- **1v1 Echtzeit-Duelle**: Zwei Spieler treten gegeneinander an
- **Excel-Import**: Einfaches Hochladen von Vokabellisten aus Excel-Dateien
- **Manuelle Eingabe**: Wörter können auch direkt in der App hinzugefügt werden
- **Verschiedene Zeitmodi**: Schnell (1 Min), Normal (3 Min), Lang (5 Min)
- **Echtzeit-Punktestand**: Live-Verfolgung der Punkte beider Spieler
- **Responsive Design**: Funktioniert auf Desktop und Mobile
- **Lobby-System**: Einfaches Erstellen und Beitreten von Spielen via Code

## 🛠️ Technologie-Stack

### Backend
- **Node.js** mit **Express.js**
- **WebSocket** für Echtzeit-Kommunikation
- **nanoid** für sichere Lobby-Codes

### Frontend
- **Next.js 14** mit **React 18**
- **Tailwind CSS** für modernes Design
- **xlsx** für Excel-Datei-Verarbeitung

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### Backend starten

```bash
# Backend-Verzeichnis wechseln
cd backend

# Abhängigkeiten installieren
npm install

# Server starten
npm start
```

Der Backend-Server läuft dann auf `http://localhost:3000`

### Frontend starten

```bash
# Frontend-Verzeichnis wechseln
cd frontend

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Das Frontend ist dann unter `http://localhost:3001` verfügbar

## 🎮 Wie man spielt

### 1. Spiel starten
- Öffne die App im Browser
- Gib deinen Namen ein
- Wähle "Lobby erstellen" oder "Lobby beitreten"

### 2. Lobby erstellen (Host)
- Wähle einen Zeitmodus (Schnell/Normal/Lang)
- Lade eine Excel-Datei hoch oder füge Wörter manuell hinzu
- Erstelle die Lobby und teile den Code mit deinem Gegner

### 3. Lobby beitreten (Spieler)
- Gib den 6-stelligen Lobby-Code ein
- Warte auf den Host, der das Spiel startet

### 4. Spielen
- Wörter werden zufällig angezeigt
- Übersetze das angezeigte Wort so schnell wie möglich
- Der Spieler mit den meisten richtigen Antworten gewinnt

## 📊 Excel-Format

Die App unterstützt Excel-Dateien (.xlsx) mit folgendem Format:
- **Spalte A**: Frage (z.B. englische Vokabel)
- **Spalte F**: Antwort (z.B. deutsche Übersetzung)
- **Ab Zeile 6**: Erste Vokabel (Zeilen 1-5 werden ignoriert)

### Beispiel:
| A (Frage) | B | C | D | E | F (Antwort) |
|-----------|---|---|---|---|-------------|
| Hello     |   |   |   |   | Hallo       |
| Goodbye   |   |   |   |   | Auf Wiedersehen |

## 🔧 Entwicklung

### Projektstruktur
```
hackts/
├── backend/
│   ├── server.js          # Express + WebSocket Server
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── page.jsx       # Startseite
│   │   ├── host/          # Lobby erstellen
│   │   ├── join/          # Lobby beitreten
│   │   └── lobby/[code]/  # Spiel-Lobby
│   ├── components/
│   │   └── XlsxDrop.jsx   # Excel-Upload Komponente
│   └── lib/
│       └── parseXlsxToJson.js # Excel-Parser
└── README.md
```

### WebSocket-Nachrichten

#### Client → Server
- `createLobby`: Neue Lobby erstellen
- `joinLobby`: Lobby beitreten
- `startGame`: Spiel starten (nur Host)
- `answer`: Antwort auf Vokabel

#### Server → Client
- `lobbyCreated`: Lobby erfolgreich erstellt
- `playerJoined`: Neuer Spieler beigetreten
- `gameStarted`: Spiel gestartet
- `nextWord`: Nächste Vokabel
- `correct/incorrect`: Antwort-Feedback
- `gameOver`: Spiel beendet

## 🎨 Design-Features

- **Modernes UI**: Clean Design mit Tailwind CSS
- **Responsive**: Funktioniert auf allen Geräten
- **Intuitive Navigation**: Klare Benutzerführung
- **Echtzeit-Feedback**: Sofortige Rückmeldung bei Aktionen
- **Visuelle Effekte**: Hover-Effekte und Animationen

## 🔮 Zukünftige Erweiterungen

- **Mehrspieler-Modi**: 3-4 Spieler gleichzeitig
- **Verschiedene Spielmodi**: Multiple Choice, Bilder-Raten
- **Statistiken**: Persönliche Lernfortschritte
- **Offline-Modus**: Lokale Spiele ohne Internet
- **Sprachausgabe**: Audio-Unterstützung für Aussprache
- **Leaderboards**: Globale Ranglisten

## 👥 Contributors

- **Entwicklung**: [Dein Name]
- **Design**: [Dein Name]
- **Konzept**: [Dein Name]

## 📝 Lizenz

Dieses Projekt wurde für den Hackathon "Von Nervig zu nützlich" entwickelt.

## 🤝 Support

Bei Fragen oder Problemen:
1. Überprüfe, ob alle Abhängigkeiten installiert sind
2. Stelle sicher, dass Backend und Frontend laufen
3. Überprüfe die Browser-Konsole auf Fehlermeldungen

---

**Viel Spaß beim Vokabel-Lernen! 🎓**