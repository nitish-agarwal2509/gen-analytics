import { Moon, Sun, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">GenAnalytics</h1>
      </div>
      <Button variant="ghost" size="icon" onClick={onToggleTheme}>
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </header>
  );
}
