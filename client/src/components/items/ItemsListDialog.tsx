import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Currency } from "./Currency";
import { useDashboardItems } from "@/lib/queries/items";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/status";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  statuses?: string[];
}

export function ItemsListDialog({ open, onOpenChange, title, statuses }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardItems({ statuses, enabled: open });

  function handleItemClick(itemId: string) {
    onOpenChange(false);
    navigate(`/items/${itemId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto -mx-4 px-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין פריטים</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleItemClick(item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.room_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {item.actual_price ? (
                      <Currency value={Number(item.actual_price)} className="text-sm font-medium" />
                    ) : item.planned_price ? (
                      <Currency value={Number(item.planned_price)} className="text-sm text-muted-foreground" />
                    ) : null}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] ?? ""}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
