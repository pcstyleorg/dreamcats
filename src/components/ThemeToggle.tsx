import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ThemeMode = "light" | "dark";

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className,
}) => {
  const { t } = useTranslation('common');
  const isDark = theme === "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      onClick={onToggle}
      className={cn(
        "rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-xs shadow-soft",
        "hover:scale-105 transition-transform",
        className,
      )}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all",
          isDark ? "rotate-90 scale-0" : "rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "h-4 w-4 absolute transition-all",
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0",
        )}
      />
      <span className="sr-only">{isDark ? t('theme.switchToLight') : t('theme.switchToDark')}</span>
    </Button>
  );
};
