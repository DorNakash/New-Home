import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Item {
  id: string;
  name: string;
  quantity: number;
  planned_price: string | null;
  actual_price: string | null;
  product_url: string | null;
  image_path: string | null;
  notes: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  category_id: string | null;
  category_name?: string | null;
  store_id: string | null;
  store_name: string | null;
  is_required: boolean;
}

export interface Room {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface RoomDetail extends Room {
  items: Item[];
}

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => api<Room[]>("/api/rooms"),
  });
}

export function useRoom(roomId: string | undefined) {
  return useQuery<RoomDetail>({
    queryKey: ["room", roomId],
    queryFn: () => api<RoomDetail>(`/api/rooms/${roomId}`),
    enabled: !!roomId,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; icon?: string | null }) =>
      api<Room>("/api/rooms", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/rooms/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; icon?: string | null }) =>
      api<Room>(`/api/rooms/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
