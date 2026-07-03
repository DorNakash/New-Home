import { useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, Trash2, ImageOff, ImageDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Currency } from "./Currency";
import { useFetchOptionImage } from "@/lib/queries/options";
import { imgSrc } from "@/lib/utils/image";
import type { ItemOption } from "@/lib/queries/items";

export function OptionCard({
  option,
  itemId,
  onSelect,
  onEdit,
  onDelete,
  isSelecting,
}: {
  option: ItemOption;
  itemId: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelecting: boolean;
}) {
  const fetchImage = useFetchOptionImage(option.id, itemId);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");

  return (
    <Card className={option.is_selected ? "ring-2 ring-primary" : undefined}>
      <div className="group relative flex h-28 items-center justify-center overflow-hidden rounded-t-xl bg-muted">
        {option.image_path ? (
          <img
            src={imgSrc(option.image_path)!}
            alt={option.label ?? ""}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/40" />
        )}

        {!showManualInput && (
          <div className={`absolute left-1.5 top-1.5 flex gap-1 transition-opacity ${option.image_path ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
            {option.product_url?.startsWith("http") && (
              <button
                onClick={() => fetchImage.mutate(undefined, { onError: () => setShowManualInput(true) })}
                disabled={fetchImage.isPending}
                title="שלוף תמונה מהמוצר"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
              >
                {fetchImage.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageDown className="h-3 w-3" />}
              </button>
            )}
            <button
              onClick={() => setShowManualInput(true)}
              title="הכנס קישור לתמונה"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur-sm transition-colors hover:bg-background"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {showManualInput && (
          <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
            <input
              autoFocus
              type="url"
              value={manualImageUrl}
              onChange={(e) => setManualImageUrl(e.target.value)}
              placeholder="https://..."
              className="h-7 flex-1 rounded border bg-background/95 px-2 text-xs shadow focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowManualInput(false); setManualImageUrl(""); }
                if (e.key === "Enter" && manualImageUrl.trim()) {
                  fetchImage.mutate(manualImageUrl.trim(), { onSuccess: () => { setShowManualInput(false); setManualImageUrl(""); } });
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={!manualImageUrl.trim() || fetchImage.isPending}
              onClick={() => fetchImage.mutate(manualImageUrl.trim(), { onSuccess: () => { setShowManualInput(false); setManualImageUrl(""); } })}
            >
              {fetchImage.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "שמור"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={() => { setShowManualInput(false); setManualImageUrl(""); }}>×</Button>
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{option.label || option.store_name || "אפשרות"}</span>
          {option.is_selected && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              נבחר
            </span>
          )}
        </div>
        {option.store_name && <span className="text-xs text-muted-foreground">חנות: {option.store_name}</span>}
        <Currency value={Number(option.price ?? 0)} className="text-lg font-semibold" />

        {option.pros && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">יתרונות: </span>
            {option.pros}
          </p>
        )}
        {option.cons && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">חסרונות: </span>
            {option.cons}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {!option.is_selected && (
            <Button size="sm" onClick={onSelect} disabled={isSelecting}>
              {isSelecting ? "בוחר..." : "בחר אפשרות זו"}
            </Button>
          )}
          <div className="flex gap-2">
            {option.product_url?.startsWith("http") && (
              <button
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => window.open(option.product_url!, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3 w-3" />
                פתח
              </button>
            )}
            <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              ערוך
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="מחק אפשרות">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
