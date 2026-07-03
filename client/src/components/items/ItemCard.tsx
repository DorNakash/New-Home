import { useNavigate } from "react-router-dom";
import { ExternalLink, Pencil, ImageOff, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Currency } from "./Currency";
import { StatusBadge } from "./StatusBadge";
import { PriorityStars } from "./PriorityStars";
import { useUpdateItem } from "@/lib/queries/items";
import { imgSrc } from "@/lib/utils/image";
import type { Item } from "@/lib/queries/rooms";

export function ItemCard({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const navigate = useNavigate();
  const updateItem = useUpdateItem(item.room_id ?? "");
  const price = Number(item.actual_price ?? item.planned_price ?? 0);

  return (
    <Card
      className={`flex h-full cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md ${item.is_required ? "ring-2 ring-rose-400 dark:ring-rose-500" : ""}`}
      onClick={() => navigate(`/items/${item.id}`)}
    >
      <div className="relative flex h-36 items-center justify-center bg-muted">
        {item.image_path ? (
          <img
            src={imgSrc(item.image_path)!}
            alt={item.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <ImageOff className="h-8 w-8 text-muted-foreground/40" />
        )}
        {item.is_required && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            <Zap className="h-3 w-3" />
            הכרחי
          </span>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-tight">{item.name}</span>
          <StatusBadge status={item.status} />
        </div>
        <Currency value={price} className="text-lg font-semibold" />
        <PriorityStars priority={item.priority} />
        {item.store_name && <span className="text-xs text-muted-foreground">חנות: {item.store_name}</span>}

        <div className="mt-auto flex gap-2 pt-2">
          {item.product_url?.startsWith("http") && (
            <button
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.product_url!, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              פתח מוצר
            </button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            ערוך
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
