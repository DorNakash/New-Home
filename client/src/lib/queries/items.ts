import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ItemOption {
  id: string;
  item_id: string;
  store_id: string | null;
  store_name: string | null;
  label: string | null;
  price: string | null;
  product_url: string | null;
  image_path: string | null;
  pros: string | null;
  cons: string | null;
  is_selected: boolean;
}

export interface ItemDetail {
  id: string;
  room_id: string;
  room_name: string;
  category_id: string | null;
  category_name: string | null;
  name: string;
  quantity: number;
  planned_price: string | null;
  actual_price: string | null;
  store_id: string | null;
  store_name: string | null;
  product_url: string | null;
  image_path: string | null;
  notes: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  is_required: boolean;
  purchase_date: string | null;
  warranty_months: number | null;
  selected_option_id: string | null;
  options: ItemOption[];
}

export interface SearchItem {
  id: string;
  name: string;
  room_name: string;
  category_name: string | null;
  store_name: string | null;
  actual_price: string | null;
  planned_price: string | null;
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  image_path: string | null;
}

export function useSearchItems(params: {
  q?: string;
  status?: string;
  room_id?: string;
  category_id?: string;
  priority?: string;
  store_id?: string;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const enabled = Object.values(params).some(Boolean);
  return useQuery<SearchItem[]>({
    queryKey: ["items-search", params],
    queryFn: () => api<SearchItem[]>(`/api/items?${qs}`),
    enabled,
  });
}

export function useItem(itemId: string | undefined) {
  return useQuery<ItemDetail>({
    queryKey: ["item", itemId],
    queryFn: () => api<ItemDetail>(`/api/items/${itemId}`),
    enabled: !!itemId,
  });
}

export interface ItemInput {
  room_id: string;
  category_id?: string | null;
  name: string;
  quantity?: number;
  planned_price?: number | null;
  actual_price?: number | null;
  store_id?: string | null;
  product_url?: string | null;
  image_path?: string | null;
  notes?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status?: string;
  is_required?: boolean;
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) => api("/api/items", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room", variables.room_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdateItem(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<ItemInput> & { id: string }) =>
      api(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["item", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteItem(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useFetchItemImage(itemId: string, roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageUrl?: string) =>
      api<ItemDetail>(`/api/items/${itemId}/fetch-image`, {
        method: "POST",
        body: JSON.stringify(imageUrl ? { imageUrl } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
    },
  });
}

export async function uploadItemImage(file: File, itemId: string): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("itemId", itemId);

  const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error("העלאת התמונה נכשלה");
  return res.json();
}
