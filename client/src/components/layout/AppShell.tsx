import { Outlet, useNavigate } from "react-router-dom";
import { Home, LogOut, Store } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/queries/auth";

export function AppShell() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
            onClick={() => navigate("/")}
          >
            <Home className="h-5 w-5" />
            <span>בית חדש</span>
          </button>
          <div className="flex items-center gap-1">
            <SearchBar />
            <Button variant="ghost" size="icon" onClick={() => navigate("/stores")} aria-label="חנויות">
              <Store className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/import-export")} aria-label="ייבוא / ייצוא" title="ייבוא / ייצוא">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </Button>
            {me && <span className="text-sm text-muted-foreground hidden sm:inline">{me.displayName}</span>}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout.mutate()} aria-label="התנתק">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
