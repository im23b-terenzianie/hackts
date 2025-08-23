import * as XLSX from "xlsx";

export async function parseXlsxWords(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Array-of-Arrays; defval "" füllt leere Zellen
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Ab Zeile 6 (Index 5). Spalten: A=0, F=5
  return aoa
    .slice(5)
    .map(row => ({ english: row[0], german: row[4] }))
    .filter(r => r.english || r.german);
}
