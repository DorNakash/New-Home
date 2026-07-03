import * as XLSX from "xlsx";
import type { SearchItem } from "@/lib/queries/items";

export const EXPORT_COLUMNS: Record<string, string> = {
  name: "שם מוצר",
  room_name: "חדר",
  category_name: "קטגוריה",
  store_name: "חנות",
  planned_price: "מחיר מתוכנן",
  actual_price: "מחיר בפועל",
  status: "סטטוס",
  priority: "עדיפות",
  notes: "הערות",
  product_url: "קישור",
};

export function exportItemsToExcel(items: SearchItem[]) {
  const rows = items.map((item) => ({
    "שם מוצר": item.name,
    "חדר": item.room_name,
    "קטגוריה": item.category_name ?? "",
    "חנות": item.store_name ?? "",
    "מחיר מתוכנן": item.planned_price ? Number(item.planned_price) : "",
    "מחיר בפועל": item.actual_price ? Number(item.actual_price) : "",
    "סטטוס": item.status,
    "עדיפות": item.priority,
    "הערות": "",
    "קישור": "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [20, 12, 12, 14, 14, 14, 16, 10, 20, 30].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "פריטים");
  XLSX.writeFile(wb, "בית-חדש.xlsx");
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export function parseExcelFile(file: File, headerRow = 1): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

        // Build hyperlink overlay: for each cell that has a hyperlink, store the URL
        const hlOverlay: Record<string, string> = {};
        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (cell?.l?.Target) hlOverlay[addr] = cell.l.Target;
          }
        }

        // Read all rows as raw arrays to preserve column indices
        const allRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: "" });
        const headerRowArr = (allRows[headerRow - 1] ?? []) as (string | number)[];
        const dataRows = allRows.slice(headerRow);

        const allHeaders = headerRowArr.map((h) => String(h ?? "").trim());
        const headers = allHeaders.filter((h) => h && !h.startsWith("__EMPTY"));

        const rows: ParsedRow[] = dataRows
          .map((row, dataIdx) => {
            const sheetRow = range.s.r + headerRow + dataIdx;
            const obj: ParsedRow = {};
            allHeaders.forEach((header, colIdx) => {
              if (!header || header.startsWith("__EMPTY")) return;
              const addr = XLSX.utils.encode_cell({ r: sheetRow, c: range.s.c + colIdx });
              obj[header] = hlOverlay[addr] ?? ((row as (string|number)[])[colIdx] ?? "");
            });
            return obj;
          })
          // Drop rows where every mapped column is empty
          .filter((obj) => Object.values(obj).some((v) => String(v ?? "").trim() !== ""));

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export interface ColumnMapping {
  name: string;
  room_name: string;
  category_name: string;
  store_name: string;
  planned_price: string;
  actual_price: string;
  quantity: string;
  is_required: string;
  bought_indicator: string;
  status: string;
  priority: string;
  notes: string;
  product_url: string;
}

const KNOWN_MAPPINGS: Record<string, keyof ColumnMapping> = {
  "אזור": "room_name",
  "פריט": "name",
  "כמות": "quantity",
  "לינק למוצר": "product_url",
  "מחיר": "planned_price",
  "הערות": "notes",
  "דגם": "notes",
  "הכרחי": "is_required",
  "נקנה": "bought_indicator",
  "עלות בפועל": "actual_price",
  // common English variants
  "name": "name",
  "room": "room_name",
  "price": "planned_price",
  "quantity": "quantity",
};

export function autoMap(headers: string[]): ColumnMapping {
  const mapping = { ...{ name: "", room_name: "", category_name: "", store_name: "", planned_price: "", actual_price: "", quantity: "", is_required: "", bought_indicator: "", status: "", priority: "", notes: "", product_url: "" } } as ColumnMapping;
  for (const header of headers) {
    const field = KNOWN_MAPPINGS[header.trim()];
    if (field && !mapping[field]) {
      mapping[field] = header;
    }
  }
  return mapping;
}

export const IMPORT_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: "name", label: "שם מוצר (פריט)", required: true },
  { key: "room_name", label: "חדר (אזור)", required: true },
  { key: "planned_price", label: "מחיר" },
  { key: "actual_price", label: "עלות בפועל" },
  { key: "quantity", label: "כמות" },
  { key: "product_url", label: "לינק למוצר" },
  { key: "notes", label: "הערות / דגם" },
  { key: "is_required", label: "הכרחי (v = כן, x = לא)" },
  { key: "bought_indicator", label: "נקנה (v = נרכש → סטטוס הגיע)" },
  { key: "category_name", label: "קטגוריה" },
  { key: "store_name", label: "חנות" },
  { key: "status", label: "סטטוס (SEARCHING/ORDERED/...)" },
  { key: "priority", label: "עדיפות (LOW/MEDIUM/HIGH)" },
];

function parsePrice(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(String(val).replace(/[₪,\s]/g, ""));
  return isNaN(n) ? null : n;
}

export function transformRows(rows: ParsedRow[], mapping: ColumnMapping) {
  let lastRoom = "";

  return rows
    .map((row) => {
      // Fill-down for merged room cells
      const rawRoom = mapping.room_name ? String(row[mapping.room_name] ?? "").trim() : "";
      if (rawRoom) lastRoom = rawRoom;
      const room_name = lastRoom;

      const YES_VALUES = new Set(["v", "✓", "כן", "1", "true", "x", "yes", "נקנה"]);
      const NO_VALUES = new Set(["", "לא", "no", "false", "0", "-"]);

      // "הכרחי" column
      const requiredRaw = mapping.is_required ? String(row[mapping.is_required] ?? "").trim().toLowerCase() : "";
      const is_required = YES_VALUES.has(requiredRaw);

      // "נקנה" column: any affirmative value → status ARRIVED
      const boughtRaw = mapping.bought_indicator ? String(row[mapping.bought_indicator] ?? "").trim().toLowerCase() : "";
      const bought = boughtRaw.length > 0 && !NO_VALUES.has(boughtRaw);
      const explicitStatus = mapping.status ? String(row[mapping.status] ?? "").trim() : "";
      const status = bought ? "ARRIVED" : (explicitStatus || undefined);

      return {
        name: String(row[mapping.name] ?? "").trim(),
        room_name,
        category_name: mapping.category_name ? String(row[mapping.category_name] ?? "").trim() || undefined : undefined,
        store_name: mapping.store_name ? String(row[mapping.store_name] ?? "").trim() || undefined : undefined,
        planned_price: parsePrice(mapping.planned_price ? row[mapping.planned_price] : null),
        actual_price: parsePrice(mapping.actual_price ? row[mapping.actual_price] : null),
        quantity: mapping.quantity && row[mapping.quantity] ? Math.max(1, Number(row[mapping.quantity])) || 1 : 1,
        is_required,
        status,
        priority: mapping.priority ? String(row[mapping.priority] ?? "").trim() || undefined : undefined,
        notes: mapping.notes ? String(row[mapping.notes] ?? "").trim() || undefined : undefined,
        product_url: (() => {
          const raw = mapping.product_url ? String(row[mapping.product_url] ?? "").trim() : "";
          return raw.startsWith("http") ? raw : undefined;
        })(),
      };
    })
    .filter((r) => r.name && r.room_name);
}
