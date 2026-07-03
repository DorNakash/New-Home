import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RoomSummary {
  id: string;
  name: string;
  icon: string | null;
  spent: number;
  planned: number;
  itemCount: number;
  percentComplete: number;
}

export interface DashboardSummary {
  budget: number | null;
  totalPlanned: number;
  totalActual: number;
  totalSpent: number;
  itemCount: number;
  installedCount: number;
  orderedCount: number;
  toBuyCount: number;
  percentComplete: number;
  rooms: RoomSummary[];
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (budget: number | null) =>
      api("/api/household", { method: "PATCH", body: JSON.stringify({ budget }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
  });
}
