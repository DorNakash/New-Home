import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Me {
  id: string;
  username: string;
  displayName: string;
}

export function useMe() {
  return useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (creds: { username: string; password: string }) =>
      api<Me>("/api/auth/login", { method: "POST", body: JSON.stringify(creds) }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
    },
  });
}
