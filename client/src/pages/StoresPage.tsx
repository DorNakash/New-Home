import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Currency } from "@/components/items/Currency";
import { useStoresSummary } from "@/lib/queries/stores";
import { useSearchItems } from "@/lib/queries/items";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemFormDialog } from "@/components/items/ItemFormDialog";
import { useState } from "react";
import type { Item } from "@/lib/queries/rooms";
import type { SearchItem } from "@/lib/queries/items";

function StoreItemsSection({ storeId }: { storeId: string; storeName: string }) {
  const { data: items, isLoading } = useSearchItems({ store_id: storeId });
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">טוען...</div>;
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item as unknown as Item}
            onEdit={() => { setEditingItem(item as unknown as Item); setFormOpen(true); }}
          />
        ))}
      </div>
      {editingItem && (
        <ItemFormDialog
          roomId={(editingItem as unknown as SearchItem & { room_id: string }).room_id ?? ""}
          item={editingItem}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </div>
  );
}

export function StoresPage() {
  const navigate = useNavigate();
  const { data: stores, isLoading } = useStoresSummary();
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="חזרה">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-medium">
          <Store className="h-5 w-5" />
          חנויות
        </h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : !stores || stores.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            עדיין לא הוגדרו חנויות
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {stores.map((store) => (
            <div key={store.id}>
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.item_count} פריטים</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Currency value={store.total_spent} className="font-semibold" />
                    {store.website_url && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); window.open(store.website_url!, "_blank"); }}
                        aria-label="פתח אתר"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              {expandedStore === store.id && (
                <div className="mt-2 px-1">
                  <StoreItemsSection storeId={store.id} storeName={store.name} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
