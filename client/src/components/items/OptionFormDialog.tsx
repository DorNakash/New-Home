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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStores, useCreateStore } from "@/lib/queries/stores";
import { useCreateOption, useUpdateOption } from "@/lib/queries/options";
import { uploadItemImage } from "@/lib/queries/items";
import type { ItemOption } from "@/lib/queries/items";

const NEW_STORE_VALUE = "__new_store__";

export function OptionFormDialog({
  itemId,
  option,
  open,
  onOpenChange,
}: {
  itemId: string;
  option: ItemOption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!option;
  const { data: stores } = useStores();
  const createStore = useCreateStore();
  const createOption = useCreateOption(itemId);
  const updateOption = useUpdateOption(itemId);

  const [label, setLabel] = useState("");
  const [storeId, setStoreId] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [price, setPrice] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLabel(option?.label ?? "");
      setStoreId(option?.store_id ?? "");
      setNewStoreName("");
      setPrice(option?.price ?? "");
      setProductUrl(option?.product_url ?? "");
      setPros(option?.pros ?? "");
      setCons(option?.cons ?? "");
      setImageFile(null);
      setError(null);
    }
  }, [open, option]);

  const isPending = createOption.isPending || updateOption.isPending || createStore.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
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
        label: label.trim() || null,
        store_id: resolvedStoreId,
        price: price ? Number(price) : null,
        product_url: productUrl.trim() || null,
        pros: pros.trim() || null,
        cons: cons.trim() || null,
      };

      let savedOptionId = option?.id;
      if (isEdit && option) {
        await updateOption.mutateAsync({ id: option.id, ...payload });
      } else {
        const created = (await createOption.mutateAsync(payload)) as { id: string };
        savedOptionId = created.id;
      }

      if (imageFile && savedOptionId) {
        const { path } = await uploadItemImage(imageFile, itemId);
        await updateOption.mutateAsync({ id: savedOptionId, image_path: path });
      }

      onOpenChange(false);
    } catch {
      setError("שמירת האפשרות נכשלה, נסו שוב");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת אפשרות" : "אפשרות חדשה"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-label">שם האפשרות</Label>
            <Input
              id="option-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="לדוגמה: IKEA - גרסה לבנה"
              autoFocus
            />
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-price">מחיר</Label>
            <Input id="option-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-url">קישור למוצר</Label>
            <Input
              id="option-url"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-pros">יתרונות</Label>
            <Textarea id="option-pros" value={pros} onChange={(e) => setPros(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-cons">חסרונות</Label>
            <Textarea id="option-cons" value={cons} onChange={(e) => setCons(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-image">תמונה</Label>
            {option?.image_path && !imageFile && (
              <img
                src={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/uploads/${option.image_path}`}
                alt="תמונה נוכחית"
                className="h-24 w-full rounded-md object-cover"
              />
            )}
            <Input
              id="option-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
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
