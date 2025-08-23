"use client";
import { useState } from "react";
import { parseXlsxWords } from "../lib/parseXlsxToJson";

export default function XlsxDrop({ onWordsUploaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedWords, setUploadedWords] = useState([]);

  const handleFiles = async (files) => {
    const f = files?.[0];
    if (!f) return;
    
    try {
      const rows = await parseXlsxWords(f);
      const formattedWords = rows.map(word => ({
        question: word.english || word.question || '',
        answer: word.german || word.answer || ''
      })).filter(word => word.question && word.answer);
      
      setUploadedWords(formattedWords);
      if (onWordsUploaded) {
        onWordsUploaded(formattedWords);
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      alert('Fehler beim Lesen der Excel-Datei. Stelle sicher, dass es sich um eine gültige .xlsx-Datei handelt.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="text-gray-600 mb-2">
          📄 Excel-Datei hierher ziehen (.xlsx)
        </div>
        <div className="text-sm text-gray-500 mb-4">oder</div>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleFiles(e.target.files)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-gray-500 mt-2">
          Erwartetes Format: Spalte A = Frage, Spalte F = Antwort (ab Zeile 6)
        </p>
      </div>

      {uploadedWords.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-800 font-medium">
              ✅ {uploadedWords.length} Wörter erfolgreich hochgeladen
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {uploadedWords.slice(0, 5).map((word, i) => (
              <div key={i} className="text-sm text-green-700">
                <span className="font-medium">{word.question}</span>
                <span className="mx-2">→</span>
                <span>{word.answer}</span>
              </div>
            ))}
            {uploadedWords.length > 5 && (
              <div className="text-sm text-green-600">
                ... und {uploadedWords.length - 5} weitere
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
