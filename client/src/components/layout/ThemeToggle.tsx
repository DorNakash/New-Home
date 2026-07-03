import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="החלף מצב תצוגה"
    >
      <Sun className="h-5 w-5 scale-100 dark:scale-0 transition-transform" />
      <Moon className="absolute h-5 w-5 scale-0 dark:scale-100 transition-transform" />
    </Button>
  );
}
