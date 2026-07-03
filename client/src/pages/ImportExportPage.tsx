import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSearchItems } from "@/lib/queries/items";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  exportItemsToExcel,
  parseExcelFile,
  transformRows,
  autoMap,
  IMPORT_FIELDS,
  type ColumnMapping,
  type ParsedRow,
} from "@/lib/utils/excel";

const EMPTY_MAPPING: ColumnMapping = {
  name: "", room_name: "", category_name: "", store_name: "",
  planned_price: "", actual_price: "", quantity: "",
  is_required: "", bought_indicator: "",
  status: "", priority: "", notes: "", product_url: "",
};

const IGNORE = "__ignore__";

export function ImportExportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allItems } = useSearchItems({ q: undefined });

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headerRow, setHeaderRow] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; statusCounts?: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reparse(f: File, row: number) {
    setResult(null);
    setError(null);
    try {
      const { headers: h, rows: r } = await parseExcelFile(f, row);
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
    } catch {
      setError("לא ניתן לקרוא את הקובץ");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setHeaderRow(1);
    setResult(null);
    setError(null);
    try {
      let { headers: h, rows: r } = await parseExcelFile(f, 1);
      // If first parse has no recognizable columns, try row 2 (title row above headers)
      if (!autoMap(h).name && !autoMap(h).room_name) {
        const result2 = await parseExcelFile(f, 2);
        if (autoMap(result2.headers).name || autoMap(result2.headers).room_name) {
          h = result2.headers;
          r = result2.rows;
          setHeaderRow(2);
        }
      }
      setHeaders(h);
      setRows(r);
      setMapping(autoMap(h));
    } catch {
      setError("לא ניתן לקרוא את הקובץ — ודאו שזה קובץ Excel תקין");
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const items = transformRows(rows, mapping);
      if (items.length === 0) { setError("לא נמצאו שורות תקינות (שם מוצר + חדר חובה)"); setImporting(false); return; }
      const res = await api<{ imported: number }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["items-search"] });
    } catch {
      setError("הייבוא נכשל — נסו שוב");
    } finally {
      setImporting(false);
    }
  }

  const previewRows = rows.slice(0, 5);
  const mappingComplete = mapping.name && mapping.room_name;
  const importableRows = mappingComplete ? transformRows(rows, mapping) : [];
  const importableCount = importableRows.length;
  const arrivedCount = importableRows.filter((r) => r.status === "ARRIVED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="חזרה">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-medium">ייבוא / ייצוא</h1>
      </div>

      {/* Clear all */}
      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">מחק את כל הפריטים</p>
              <p className="text-xs text-muted-foreground">מוחק את כל הפריטים מהמערכת (החדרים נשמרים)</p>
            </div>
          </div>
          {!confirmClear ? (
            <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmClear(true)}>
              מחק הכל
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">בטוח לגמרי?</span>
              <Button
                variant="destructive"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await api("/api/import", { method: "DELETE" });
                    queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
                    queryClient.invalidateQueries({ queryKey: ["items-search"] });
                    setResult(null);
                  } finally {
                    setClearing(false);
                    setConfirmClear(false);
                  }
                }}
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "כן, מחק"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>ביטול</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">ייצוא ל-Excel</p>
              <p className="text-xs text-muted-foreground">
                {allItems ? `${allItems.length} פריטים` : "..."} ייוצאו לקובץ Excel
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => allItems && exportItemsToExcel(allItems)}
            disabled={!allItems || allItems.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            הורד Excel
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardContent className="flex flex-col gap-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">ייבוא מ-Excel</p>
              <p className="text-xs text-muted-foreground">העלו קובץ Excel ומפו עמודות לשדות</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-file">קובץ Excel</Label>
            <Input id="import-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </div>

          {file && headers.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="shrink-0 text-sm">שורת כותרות</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={headerRow}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value));
                  setHeaderRow(n);
                  reparse(file, n);
                }}
                className="h-8 w-20 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                אם העמודות מציגות EMPTY__ — שנו ל-2
              </span>
            </div>
          )}

          {headers.length > 0 && (
            <>
              <div>
                <p className="mb-3 text-sm font-medium">מיפוי עמודות</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {IMPORT_FIELDS.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <Label className="text-xs">
                        {field.label}
                        {field.required && <span className="text-destructive"> *</span>}
                      </Label>
                      <Select
                        value={mapping[field.key] || IGNORE}
                        onValueChange={(v) => setMapping({ ...mapping, [field.key]: v === IGNORE ? "" : v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>
                            {(v: string) => (v === IGNORE || !v ? "— התעלם —" : v)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE}>— התעלם —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {previewRows.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">תצוגה מקדימה (5 שורות ראשונות)</p>
                  <div className="overflow-x-auto rounded-md border text-xs">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          {headers.filter(h => !h.startsWith("__EMPTY")).map((h) => <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {headers.filter(h => !h.startsWith("__EMPTY")).map((h) => <td key={h} className="px-3 py-1.5">{String(row[h] ?? "")}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-0.5 text-sm text-emerald-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    יובאו {result.imported} פריטים בהצלחה!
                  </div>
                  {result.statusCounts && Object.entries(result.statusCounts).map(([status, count]) => (
                    <span key={status} className="mr-6 text-xs text-muted-foreground">
                      {status}: {count}
                    </span>
                  ))}
                </div>
              )}

              {importing && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>מייבא {importableCount} פריטים... אנא המתינו</span>
                </div>
              )}

              {mappingComplete && importableCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {importableCount} פריטים יובאו
                  {arrivedCount > 0 && <span className="text-teal-600"> · {arrivedCount} מסומנים כנקנה (הגיע)</span>}
                </p>
              )}

              <Button
                onClick={handleImport}
                disabled={importing || !mappingComplete || importableCount === 0}
                className="self-start"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> מייבא...</>
                ) : (
                  `ייבא ${importableCount} פריטים`
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
