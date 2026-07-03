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
import { useCreateRoom, useUpdateRoom } from "@/lib/queries/rooms";
import { EmojiPicker } from "./EmojiPicker";

type EditableRoom = { id: string; name: string; icon: string | null };

export function RoomFormDialog({
  room,
  open,
  onOpenChange,
}: {
  room: EditableRoom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!room;
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(room?.name ?? "");
      setIcon(room?.icon ?? "");
      setError(null);
    }
  }, [open, room]);

  const isPending = createRoom.isPending || updateRoom.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("יש להזין שם חדר");
      return;
    }

    try {
      if (isEdit && room) {
        await updateRoom.mutateAsync({ id: room.id, name: name.trim(), icon: icon.trim() || null });
      } else {
        await createRoom.mutateAsync({ name: name.trim(), icon: icon.trim() || null });
      }
      onOpenChange(false);
    } catch {
      setError("שמירת החדר נכשלה, נסו שוב");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת חדר" : "חדר חדש"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="room-name">שם החדר</Label>
              <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>אייקון</Label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>
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
