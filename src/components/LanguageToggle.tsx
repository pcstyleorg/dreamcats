import React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className }) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "pl" : "en");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={language === "en" ? "Switch to Polish" : "Przełącz na angielski"}
      onClick={toggleLanguage}
      className={cn(
        "rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-sm shadow-soft",
        "hover:scale-105 transition-transform",
        className
      )}
    >
      <Languages className="h-4 w-4" />
      <span className="sr-only text-xs ml-1 font-bold">
        {language.toUpperCase()}
      </span>
    </Button>
  );
};
