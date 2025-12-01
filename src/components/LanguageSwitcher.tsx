import React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en'; // Get base language (en from en-US)

  const toggleLanguage = async () => {
    const newLang = currentLang === 'en' ? 'pl' : 'en';
    try {
      await i18n.changeLanguage(newLang);
      // Explicitly save to localStorage to ensure persistence
      localStorage.setItem('i18nextLng', newLang);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
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
      <span className="sr-only">
        {currentLang === 'en' ? 'Switch to Polish' : 'Switch to English'}
      </span>
    </Button>
  );
};
