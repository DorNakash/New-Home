import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Store {
  id: string;
  name: string;
  website_url: string | null;
}

export interface StoreSummary extends Store {
  item_count: number;
  total_spent: number;
}

export function useStoresSummary() {
  return useQuery<StoreSummary[]>({
    queryKey: ["stores-summary"],
    queryFn: () => api<StoreSummary[]>("/api/stores/summary"),
  });
}

export function useStores() {
  return useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => api<Store[]>("/api/stores"),
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<Store>("/api/stores", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });
}
