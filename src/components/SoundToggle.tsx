import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/store";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SoundToggleProps {
  className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ className }) => {
  const { t } = useTranslation("common");
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={
        soundEnabled ? t("preferences.soundOn") : t("preferences.soundOff")
      }
      onClick={toggleSound}
      className={cn(
        "touch-target rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-xs shadow-soft",
        "hover:scale-105 transition-transform",
        className,
      )}
      title={t("preferences.sound")}
    >
      {soundEnabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="sr-only">{t("preferences.sound")}</span>
    </Button>
  );
};
