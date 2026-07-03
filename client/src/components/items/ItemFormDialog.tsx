import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useCreateCategory } from "@/lib/queries/categories";
import { useStores, useCreateStore } from "@/lib/queries/stores";
import { useCreateItem, useUpdateItem, uploadItemImage } from "@/lib/queries/items";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants/status";
import type { Item } from "@/lib/queries/rooms";

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABELS);
const NEW_STORE_VALUE = "__new_store__";
const NEW_CATEGORY_VALUE = "__new_category__";

export function ItemFormDialog({
  roomId,
  item,
  open,
  onOpenChange,
}: {
  roomId: string;
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!item;
  const { data: categories } = useCategories();
  const { data: stores } = useStores();
  const createStore = useCreateStore();
  const createCategory = useCreateCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem(roomId);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [newStoreName, setNewStoreName] = useState("");
  const [plannedPrice, setPlannedPrice] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("SEARCHING");
  const [isRequired, setIsRequired] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategoryId(item?.category_id ?? "");
      setNewCategoryName("");
      setStoreId(item?.store_id ?? "");
      setNewStoreName("");
      setPlannedPrice(item?.planned_price ?? "");
      setActualPrice(item?.actual_price ?? "");
      setProductUrl(item?.product_url ?? "");
      setNotes(item?.notes ?? "");
      setPriority(item?.priority ?? "MEDIUM");
      setStatus(item?.status ?? "SEARCHING");
      setIsRequired(item?.is_required ?? false);
      setImageFile(null);
      setError(null);
    }
  }, [open, item]);

  const isPending =
    createItem.isPending || updateItem.isPending || createStore.isPending || createCategory.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("יש להזין שם מוצר");
      return;
    }

    try {
      let resolvedCategoryId = categoryId || null;
      if (categoryId === NEW_CATEGORY_VALUE) {
        if (!newCategoryName.trim()) {
          setError("יש להזין שם קטגוריה חדשה");
          return;
        }
        const category = await createCategory.mutateAsync(newCategoryName.trim());
        resolvedCategoryId = category.id;
      }

      let resolvedStoreId = storeId || null;
      if (storeId === NEW_STORE_VALUE) {
        if (!newStoreName.trim()) {
          setError("יש להזין שם חנות חדשה");
          return;
        }
        const store = await createStore.mutateAsync(newStoreName.trim());
        resolvedStoreId = store.id;
      }

      const payload = {
        room_id: roomId,
        name: name.trim(),
        category_id: resolvedCategoryId,
        store_id: resolvedStoreId,
        planned_price: plannedPrice ? Number(plannedPrice) : null,
        actual_price: actualPrice ? Number(actualPrice) : null,
        product_url: productUrl.trim() || null,
        notes: notes.trim() || null,
        priority: priority as "LOW" | "MEDIUM" | "HIGH",
        status,
        is_required: isRequired,
      };

      let savedItemId = item?.id;
      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, ...payload });
      } else {
        const created = (await createItem.mutateAsync(payload)) as { id: string };
        savedItemId = created.id;
      }

      if (imageFile && savedItemId) {
        const { path } = await uploadItemImage(imageFile, savedItemId);
        await updateItem.mutateAsync({ id: savedItemId, image_path: path });
      }

      onOpenChange(false);
    } catch {
      setError("שמירת הפריט נכשלה, נסו שוב");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת פריט" : "פריט חדש"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-name">שם המוצר</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>קטגוריה</Label>
            <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="בחרו קטגוריה">
                  {(value: string) =>
                    value === NEW_CATEGORY_VALUE
                      ? "+ קטגוריה חדשה"
                      : (categories?.find((c) => c.id === value)?.name ?? "בחרו קטגוריה")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CATEGORY_VALUE}>+ קטגוריה חדשה</SelectItem>
              </SelectContent>
            </Select>
            {categoryId === NEW_CATEGORY_VALUE && (
              <Input
                placeholder="שם הקטגוריה"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1.5"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>חנות</Label>
            <Select value={storeId || undefined} onValueChange={(v) => setStoreId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="בחרו חנות">
                  {(value: string) =>
                    value === NEW_STORE_VALUE
                      ? "+ חנות חדשה"
                      : (stores?.find((s) => s.id === value)?.name ?? "בחרו חנות")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stores?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_STORE_VALUE}>+ חנות חדשה</SelectItem>
              </SelectContent>
            </Select>
            {storeId === NEW_STORE_VALUE && (
              <Input
                placeholder="שם החנות"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="mt-1.5"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planned-price">מחיר מתוכנן</Label>
              <Input
                id="planned-price"
                type="number"
                value={plannedPrice}
                onChange={(e) => setPlannedPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actual-price">מחיר בפועל</Label>
              <Input
                id="actual-price"
                type="number"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>עדיפות</Label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => PRIORITY_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>סטטוס</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => STATUS_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-medium">הכרחי — חייב להיות בבית</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-url">קישור למוצר</Label>
            <Input
              id="product-url"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://..."
              className="truncate"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image">תמונה</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">הערות</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="break-all" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-2 flex-row gap-2">
            <DialogClose render={<Button type="button" variant="outline" className="flex-1" />}>
              ביטול
            </DialogClose>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "שומר..." : "שמירה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
