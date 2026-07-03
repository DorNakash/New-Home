import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants/status";
import type { Item } from "@/lib/queries/rooms";

export interface Filters {
  status: string;
  categoryId: string;
  priority: string;
}

export const EMPTY_FILTERS: Filters = { status: "", categoryId: "", priority: "" };

export function FilterBar({
  items,
  filters,
  onChange,
}: {
  items: Item[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const categories = Array.from(
    new Map(
      items
        .filter((i) => i.category_id && i.category_name)
        .map((i) => [i.category_id!, i.category_name!])
    ).entries()
  );

  const hasFilters = filters.status || filters.categoryId || filters.priority;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.status || "all"} onValueChange={(v) => onChange({ ...filters, status: v === "all" ? "" : (v ?? "") })}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="כל הסטטוסים">
            {(v: string) => (v === "all" || !v ? "כל הסטטוסים" : (STATUS_LABELS[v] ?? v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הסטטוסים</SelectItem>
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <SelectItem key={k} value={k}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {categories.length > 0 && (
        <Select value={filters.categoryId || "all"} onValueChange={(v) => onChange({ ...filters, categoryId: v === "all" ? "" : (v ?? "") })}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="כל הקטגוריות">
              {(v: string) => (v === "all" || !v ? "כל הקטגוריות" : (categories.find(([id]) => id === v)?.[1] ?? v))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.priority || "all"} onValueChange={(v) => onChange({ ...filters, priority: v === "all" ? "" : (v ?? "") })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="כל העדיפויות">
            {(v: string) => (v === "all" || !v ? "כל העדיפויות" : (PRIORITY_LABELS[v] ?? v))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל העדיפויות</SelectItem>
          {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
            <SelectItem key={k} value={k}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange(EMPTY_FILTERS)}>
          נקה סינון
        </Button>
      )}
    </div>
  );
}

export function applyFilters(items: Item[], filters: Filters): Item[] {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.categoryId && item.category_id !== filters.categoryId) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    return true;
  });
}
