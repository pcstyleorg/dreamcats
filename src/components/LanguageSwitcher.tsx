import React, { useState, useCallback } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { i18n } = useTranslation();
  // Use local state to force re-render after language change
  const [currentLang, setCurrentLang] = useState(() => 
    i18n.language?.split('-')[0] || 'en'
  );

  const toggleLanguage = useCallback(async () => {
    const newLang = currentLang === 'en' ? 'pl' : 'en';
    try {
      // Change language and wait for it to complete
      await i18n.changeLanguage(newLang);
      // Update local state to force re-render
      setCurrentLang(newLang);
      // Persist to localStorage
      localStorage.setItem('i18nextLng', newLang);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [currentLang, i18n]);

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
