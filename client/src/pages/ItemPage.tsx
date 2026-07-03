import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, ExternalLink, ImageOff, Pencil, Trash2, ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Currency } from "@/components/items/Currency";
import { StatusBadge } from "@/components/items/StatusBadge";
import { PriorityStars } from "@/components/items/PriorityStars";
import { OptionCard } from "@/components/items/OptionCard";
import { OptionFormDialog } from "@/components/items/OptionFormDialog";
import { ItemFormDialog } from "@/components/items/ItemFormDialog";
import { useItem, useDeleteItem, useFetchItemImage, type ItemOption } from "@/lib/queries/items";
import { imgSrc } from "@/lib/utils/image";
import { useDeleteOption, useSelectOption } from "@/lib/queries/options";
import type { Item } from "@/lib/queries/rooms";


export function ItemPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { data: item, isLoading } = useItem(itemId);
  const selectOption = useSelectOption(itemId ?? "");
  const deleteOption = useDeleteOption(itemId ?? "");
  const deleteItem = useDeleteItem(item?.room_id ?? "");
  const fetchImage = useFetchItemImage(itemId ?? "", item?.room_id ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [editingOption, setEditingOption] = useState<ItemOption | null>(null);
  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  function openCreateOption() {
    setEditingOption(null);
    setOptionFormOpen(true);
  }

  function openEditOption(option: ItemOption) {
    setEditingOption(option);
    setOptionFormOpen(true);
  }

  async function handleSelect(optionId: string) {
    setSelectingId(optionId);
    try {
      await selectOption.mutateAsync(optionId);
    } finally {
      setSelectingId(null);
    }
  }

  if (isLoading || !item) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const price = Number(item.actual_price ?? item.planned_price ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">{item.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            ערוך
          </Button>
          {!confirmDelete ? (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              מחק
            </Button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1">
              <span className="text-xs text-destructive">בטוח?</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => deleteItem.mutate(item.id, { onSuccess: () => navigate(-1) })}
                disabled={deleteItem.isPending}
              >
                כן, מחק
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDelete(false)}>
                ביטול
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">פרטים</TabsTrigger>
          <TabsTrigger value="options">
            אפשרויות {item.options.length > 0 && `(${item.options.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="flex flex-col gap-4">
            {/* Image */}
            <div className="group relative overflow-hidden rounded-xl bg-muted" style={{ height: item.image_path ? "240px" : "140px" }}>
              {item.image_path ? (
                <img src={imgSrc(item.image_path)!} alt={item.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              {/* Small icon buttons top-left, visible on hover (or always if no image) */}
              {!showManualInput && (
                <div className={`absolute left-2 top-2 flex gap-1.5 transition-opacity ${item.image_path ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
                  {item.product_url?.startsWith("http") && (
                    <button
                      onClick={() => fetchImage.mutate(undefined, { onError: () => setShowManualInput(true) })}
                      disabled={fetchImage.isPending}
                      title="שלוף תמונה מהמוצר"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
                    >
                      {fetchImage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setShowManualInput(true)}
                    title="הכנס קישור לתמונה"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur-sm transition-colors hover:bg-background"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}

              {showManualInput && (
                <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
                  <input
                    autoFocus
                    type="url"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 flex-1 rounded-md border bg-background/95 px-2 text-xs shadow focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setShowManualInput(false); setManualImageUrl(""); }
                      if (e.key === "Enter" && manualImageUrl.trim()) {
                        fetchImage.mutate(manualImageUrl.trim(), { onSuccess: () => { setShowManualInput(false); setManualImageUrl(""); } });
                      }
                    }}
                  />
                  <Button size="sm" className="h-8 px-3" disabled={!manualImageUrl.trim() || fetchImage.isPending}
                    onClick={() => fetchImage.mutate(manualImageUrl.trim(), { onSuccess: () => { setShowManualInput(false); setManualImageUrl(""); } })}>
                    {fetchImage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "שמור"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setShowManualInput(false); setManualImageUrl(""); }}>×</Button>
                </div>
              )}
            </div>

            {/* Info card */}
            <Card>
              <CardContent className="flex flex-col gap-4 py-4">
                <div className="flex items-center justify-between">
                  <Currency value={price} className="text-2xl font-semibold" />
                  <div className="flex items-center gap-2">
                    <PriorityStars priority={item.priority} />
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span className="text-muted-foreground">חדר: <span className="text-foreground">{item.room_name}</span></span>
                  {item.category_name && <span className="text-muted-foreground">קטגוריה: <span className="text-foreground">{item.category_name}</span></span>}
                  {item.store_name && <span className="text-muted-foreground">חנות: <span className="text-foreground">{item.store_name}</span></span>}
                  {item.warranty_months != null && <span className="text-muted-foreground">אחריות: <span className="text-foreground">{item.warranty_months} חודשים</span></span>}
                </div>

                {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}

                {item.product_url?.startsWith("http") && (
                  <a href={item.product_url} target="_blank" rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    פתח מוצר
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="options">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={openCreateOption}>
              <Plus className="h-4 w-4" />
              אפשרות חדשה
            </Button>
          </div>
          {item.options.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                עדיין אין אפשרויות רכישה לפריט הזה
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {item.options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  itemId={itemId ?? ""}
                  isSelecting={selectingId === option.id}
                  onSelect={() => handleSelect(option.id)}
                  onEdit={() => openEditOption(option)}
                  onDelete={() => deleteOption.mutate(option.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {itemId && (
        <OptionFormDialog
          itemId={itemId}
          option={editingOption}
          open={optionFormOpen}
          onOpenChange={setOptionFormOpen}
        />
      )}

      <ItemFormDialog
        roomId={item.room_id}
        item={item as unknown as Item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
