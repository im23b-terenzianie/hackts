import { useRef, useState } from "react";
import * as XLSX from "xlsx";

export default function Home() {
    const [words, setWords] = useState([]);
    const [name, setName] = useState("");
    const [mode, setMode] = useState("normal");
    const [ws, setWs] = useState(null);
    const [lobbyCode, setLobbyCode] = useState("");
    const [feedback, setFeedback] = useState("");
    const fileInput = useRef();

    // WebSocket initialisieren
    function connectWS() {
        if (ws) return ws;
        const socket = new WebSocket("ws://localhost:3000");
        socket.onopen = () => setFeedback("WebSocket connected");
        socket.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === "lobbyCreated") {
                setLobbyCode(msg.code);
                setFeedback(`Lobby created! Code: ${msg.code}`);
            }
            if (msg.type === "gameStarted") {
                setFeedback("Game started!");
            }
            if (msg.type === "gameOver") {
                setFeedback(`Game over! Winner(s): ${msg.winners.join(", ")}`);
            }
            // ...weitere Events nach Bedarf
        };
        setWs(socket);
        return socket;
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            // Annahme: Erste Zeile ist Header oder direkt Daten
            const parsed = json
                .filter((row) => row[0] && row[1])
                .map((row) => ({ question: row[0], answer: row[1] }));
            setWords(parsed);
            setFeedback(`Loaded ${parsed.length} words from Excel.`);
        };
        reader.readAsArrayBuffer(file);
    }

    function handleCreateLobby() {
        if (!name || words.length === 0) {
            setFeedback("Please enter your name and upload a word list.");
            return;
        }
        const socket = connectWS();
        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    type: "createLobby",
                    name,
                    words,
                    mode,
                })
            );
        };
        // Falls Socket schon offen:
        if (socket.readyState === 1) {
            socket.send(
                JSON.stringify({
                    type: "createLobby",
                    name,
                    words,
                    mode,
                })
            );
        }
    }

    return (
        <div style={{ maxWidth: 500, margin: "2rem auto", fontFamily: "sans-serif" }}>
            <h2>Lobby erstellen</h2>
            <input
                type="text"
                placeholder="Dein Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", marginBottom: 8 }}
            />
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "100%", marginBottom: 8 }}>
                <option value="quick">Schnell (1 Min)</option>
                <option value="normal">Normal (3 Min)</option>
                <option value="long">Lang (5 Min)</option>
            </select>
            <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInput}
                onChange={handleFileUpload}
                style={{ width: "100%", marginBottom: 8 }}
            />
            <button onClick={handleCreateLobby} style={{ width: "100%", marginBottom: 8 }}>
                Lobby erstellen
            </button>
            {lobbyCode && <div>Lobby-Code: <b>{lobbyCode}</b></div>}
            <div style={{ marginTop: 16, color: "#0070f3" }}>{feedback}</div>
            {words.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <b>Wörter geladen:</b>
                    <ul>
                        {words.map((w, i) => (
                            <li key={i}>{w.question} - {w.answer}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
