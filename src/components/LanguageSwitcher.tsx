import React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.split('-')[0]; // Get base language (en from en-US)

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'pl' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${currentLang === 'en' ? 'Polish' : 'English'}`}
      onClick={toggleLanguage}
      className={cn(
        "rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-sm shadow-soft",
        "hover:scale-105 transition-transform",
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      <span className="sr-only ml-1 text-xs font-semibold">
        {currentLang.toUpperCase()}
      </span>
      <span className="absolute bottom-0 right-0 text-[10px] font-bold opacity-70">
        {currentLang.toUpperCase()}
      </span>
    </Button>
  );
};
