import React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const LanguageSwitcher: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t, i18n } = useTranslation("common");
  const { setLanguage } = useUserPreferences();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'pl' : 'en';
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  const ariaLabel =
    currentLang === "en"
      ? t("language.switchTo", { lang: t("language.pl") })
      : t("language.switchTo", { lang: t("language.en") });

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={ariaLabel}
      onClick={toggleLanguage}
      className={cn(
        "rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-xs shadow-soft",
        "hover:scale-105 transition-transform",
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      <span className="sr-only">
        {ariaLabel}
      </span>
    </Button>
  );
};
