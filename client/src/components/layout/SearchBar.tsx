import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchItems } from "@/lib/queries/items";
import { STATUS_LABELS } from "@/lib/constants/status";
import { formatCurrency } from "@/lib/utils/currency";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 280);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results } = useSearchItems({ q: debounced.length >= 2 ? debounced : undefined });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(itemId: string) {
    close();
    navigate(`/items/${itemId}`);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="חיפוש">
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          placeholder="חפשו פריט..."
          className="h-9 w-52 text-sm"
        />
        <Button variant="ghost" size="icon" onClick={close} aria-label="סגור">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {debounced.length >= 2 && (
        <div className="absolute start-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
          {!results || results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">לא נמצאו תוצאות</p>
          ) : (
            <ul>
              {results.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <button
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-start text-sm hover:bg-muted"
                    onClick={() => pick(item.id)}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.room_name} · {STATUS_LABELS[item.status] ?? item.status}</span>
                    </span>
                    {(item.actual_price ?? item.planned_price) && (
                      <span className="shrink-0 text-xs font-medium" dir="ltr">
                        {formatCurrency(Number(item.actual_price ?? item.planned_price))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
