import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, PackageOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemFormDialog } from "@/components/items/ItemFormDialog";
import { RoomFormDialog } from "@/components/rooms/RoomFormDialog";
import { FilterBar, applyFilters, EMPTY_FILTERS, type Filters } from "@/components/rooms/FilterBar";
import { useRoom, useDeleteRoom, type Item } from "@/lib/queries/rooms";

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { data: room, isLoading } = useRoom(roomId);
  const deleteRoom = useDeleteRoom();
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="חזרה">
            <ArrowRight className="h-5 w-5" />
          </Button>
          {isLoading || !room ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <h1 className="flex items-center gap-2 text-lg font-medium">
              <span>{room.icon}</span>
              <span>{room.name}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => setRoomFormOpen(true)} aria-label="ערוך חדר">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {room && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              פריט חדש
            </Button>
          )}
          {room && !confirmDeleteRoom && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteRoom(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {confirmDeleteRoom && (
            <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1">
              <span className="text-xs text-destructive">מחק חדר וכל הפריטים?</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={deleteRoom.isPending}
                onClick={() => deleteRoom.mutate(room!.id, { onSuccess: () => navigate("/") })}
              >
                כן, מחק
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteRoom(false)}>
                ביטול
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isLoading && room && room.items.length > 0 && (
        <FilterBar items={room.items} filters={filters} onChange={setFilters} />
      )}

      {isLoading || !room ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : room.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8" />
            <p>עדיין אין פריטים בחדר הזה</p>
          </CardContent>
        </Card>
      ) : (() => {
        const filtered = applyFilters(room.items, filters);
        return filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <p>אין פריטים התואמים את הסינון</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} onEdit={() => openEdit(item)} />
            ))}
          </div>
        );
      })()}

      {room && (
        <>
          <ItemFormDialog roomId={room.id} item={editingItem} open={formOpen} onOpenChange={setFormOpen} />
          <RoomFormDialog
            room={{ id: room.id, name: room.name, icon: room.icon }}
            open={roomFormOpen}
            onOpenChange={setRoomFormOpen}
          />
        </>
      )}
    </div>
  );
}
