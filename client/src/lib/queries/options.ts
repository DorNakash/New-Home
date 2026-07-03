import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface OptionInput {
  store_id?: string | null;
  label?: string | null;
  price?: number | null;
  product_url?: string | null;
  image_path?: string | null;
  pros?: string | null;
  cons?: string | null;
}

export function useCreateOption(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OptionInput) =>
      api(`/api/items/${itemId}/options`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item", itemId] }),
  });
}

export function useUpdateOption(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: OptionInput & { id: string }) =>
      api(`/api/options/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item", itemId] }),
  });
}

export function useDeleteOption(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/options/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item", itemId] }),
  });
}

export function useFetchOptionImage(optionId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageUrl?: string) =>
      api(`/api/options/${optionId}/fetch-image`, {
        method: "POST",
        body: JSON.stringify(imageUrl ? { imageUrl } : {}),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item", itemId] }),
  });
}

export function useSelectOption(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => api(`/api/options/${optionId}/select`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
