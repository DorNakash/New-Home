import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { RoomPage } from "@/pages/RoomPage";
import { ItemPage } from "@/pages/ItemPage";
import { StoresPage } from "@/pages/StoresPage";
import { ImportExportPage } from "@/pages/ImportExportPage";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/rooms/:roomId", element: <RoomPage /> },
          { path: "/items/:itemId", element: <ItemPage /> },
          { path: "/stores", element: <StoresPage /> },
          { path: "/import-export", element: <ImportExportPage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
