import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const COLOR_THEMES = [
  { name: "Royal Blue", value: "theme-blue", color: "#3B82F6" },
  { name: "Emerald", value: "theme-emerald", color: "#10B981" },
  { name: "Sunset Orange", value: "theme-orange", color: "#F97316" },
  { name: "Rose", value: "theme-rose", color: "#F43F5E" },
  { name: "Violet", value: "theme-violet", color: "#8B5CF6" },
  { name: "Teal", value: "theme-teal", color: "#14B8A6" },
] as const;

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme-mode") === "dark" ||
        (!localStorage.getItem("theme-mode") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem("color-theme") || "theme-blue";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
    }
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    COLOR_THEMES.forEach((t) => root.classList.remove(t.value));
    root.classList.add(colorTheme);
    localStorage.setItem("color-theme", colorTheme);
  }, [colorTheme]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setDark(!dark)}
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Change color theme">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {COLOR_THEMES.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setColorTheme(t.value)}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <span
                className="h-3 w-3 rounded-full border border-border shrink-0"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
              {colorTheme === t.value && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ThemeToggle;
