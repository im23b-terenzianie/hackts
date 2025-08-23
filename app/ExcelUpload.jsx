import * as XLSX from "xlsx";

export async function parseXlsxToJson(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // -> Array von Objekten (Header-Zeile als Keys)
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}