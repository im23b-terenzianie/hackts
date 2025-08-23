"use client";
import { useState } from "react";
import { parseXlsxWords } from "../lib/parseXlsxToJson";

export default function XlsxDrop() {
  const [items, setItems] = useState([]);

  const handleFiles = async (files) => {
    const f = files?.[0];
    if (!f) return;
    const rows = await parseXlsxWords(f);
    setItems(rows);
  };

  return (
    <div style={{ padding: 16 }}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        style={{ border: "1px dashed #aaa", borderRadius: 8, padding: 20, textAlign: "center", marginBottom: 12 }}
      >
        Datei hierher ziehen (.xlsx)
        <div style={{ margin: 8 }}>oder</div>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {items.map((r, i) => (
            <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
              <strong>{r.english || <em>(leer)</em>}</strong>
              <span style={{ opacity: 0.6, marginLeft: 8 }}>→</span>
              <span style={{ marginLeft: 8 }}>{r.german || <em>(leer)</em>}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
