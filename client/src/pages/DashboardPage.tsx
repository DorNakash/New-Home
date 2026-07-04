import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CreditCard, Package, ShoppingCart, Truck, CheckCircle2, Plus, Pencil, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Currency } from "@/components/items/Currency";
import { RoomFormDialog } from "@/components/rooms/RoomFormDialog";
import { ItemsListDialog } from "@/components/items/ItemsListDialog";
import { useDashboardSummary, useUpdateBudget } from "@/lib/queries/dashboard";

function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetCard({ budget }: { budget: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const updateBudget = useUpdateBudget();

  function startEdit() {
    setValue(budget != null ? String(budget) : "");
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function save() {
    const num = value.trim() === "" ? null : Number(value);
    updateBudget.mutate(num, { onSettled: () => setEditing(false) });
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">תקציב כולל לבית</p>
          {editing ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Input
                ref={inputRef}
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                className="h-7 w-28 text-sm"
                placeholder="0"
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={save} disabled={updateBudget.isPending}>
                שמור
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-medium">
                {budget != null ? <Currency value={budget} /> : <span className="text-muted-foreground text-sm">לא הוגדר</span>}
              </p>
              <Button variant="ghost" size="icon-xs" onClick={startEdit} aria-label="ערוך תקציב">
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const ROOM_ACCENTS = [
  "bg-rose-100 dark:bg-rose-900/40",
  "bg-emerald-100 dark:bg-emerald-900/40",
  "bg-sky-100 dark:bg-sky-900/40",
  "bg-amber-100 dark:bg-amber-900/40",
  "bg-violet-100 dark:bg-violet-900/40",
  "bg-teal-100 dark:bg-teal-900/40",
];

type ItemsDialog = { title: string; statuses?: string[] } | null;

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const navigate = useNavigate();
  const [editingRoom, setEditingRoom] = useState<{ id: string; name: string; icon: string | null } | null>(
    null
  );
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [itemsDialog, setItemsDialog] = useState<ItemsDialog>(null);

  function openCreateRoom() {
    setEditingRoom(null);
    setRoomFormOpen(true);
  }

  function openEditRoom(room: { id: string; name: string; icon: string | null }, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomFormOpen(true);
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">🏠 הבית שלי</h1>
          <span className="text-sm font-medium text-muted-foreground">{data.percentComplete}% נרכש</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${data.percentComplete}%`, minWidth: data.percentComplete > 0 ? undefined : "0%" }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>התחלה</span>
          <span>סיום</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <BudgetCard budget={data.budget} />
        <SummaryCard
          icon={BadgeCheck}
          label="שולם עד כה"
          value={<Currency value={data.totalSpent ?? 0} />}
          colorClass="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
          onClick={() => setItemsDialog({ title: "שולם עד כה", statuses: ["ORDERED", "ARRIVED", "INSTALLED"] })}
        />
        <SummaryCard
          icon={CreditCard}
          label="מתוכנן (כל הפריטים)"
          value={<Currency value={data.totalPlanned} />}
          colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          onClick={() => setItemsDialog({ title: "כל הפריטים" })}
        />
        <SummaryCard
          icon={Package}
          label="מספר פריטים"
          value={data.itemCount}
          colorClass="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          onClick={() => setItemsDialog({ title: "כל הפריטים" })}
        />
        <SummaryCard
          icon={ShoppingCart}
          label="נשאר לקנות"
          value={data.toBuyCount}
          colorClass="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          onClick={() => setItemsDialog({ title: "נשאר לקנות", statuses: ["SEARCHING", "READY_TO_ORDER"] })}
        />
        <SummaryCard
          icon={Truck}
          label="הוזמן"
          value={data.orderedCount}
          colorClass="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
          onClick={() => setItemsDialog({ title: "הוזמן", statuses: ["ORDERED"] })}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="הותקן"
          value={data.installedCount}
          colorClass="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          onClick={() => setItemsDialog({ title: "הותקן", statuses: ["INSTALLED"] })}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">תקציב לפי חדר</h2>
          <Button size="sm" variant="outline" onClick={openCreateRoom}>
            <Plus className="h-4 w-4" />
            חדר חדש
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rooms.map((room, index) => (
            <Card
              key={room.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <CardContent className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${ROOM_ACCENTS[index % ROOM_ACCENTS.length]}`}
                    >
                      {room.icon}
                    </span>
                    <span>{room.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{room.percentComplete}%</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => openEditRoom({ id: room.id, name: room.name, icon: room.icon }, e)}
                      aria-label="ערוך חדר"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mb-2 flex items-baseline gap-1">
                  <Currency value={room.spent} className="text-lg font-semibold" />
                  {room.planned > 0 && (
                    <span className="text-xs text-muted-foreground">
                      / <Currency value={room.planned} />
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${room.percentComplete}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <RoomFormDialog room={editingRoom} open={roomFormOpen} onOpenChange={setRoomFormOpen} />
      <ItemsListDialog
        open={!!itemsDialog}
        onOpenChange={(open) => { if (!open) setItemsDialog(null); }}
        title={itemsDialog?.title ?? ""}
        statuses={itemsDialog?.statuses}
      />
    </div>
  );
}
