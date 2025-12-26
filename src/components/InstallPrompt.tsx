import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(standaloneMatch || iosStandalone);
};

export const InstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-lg p-4 shadow-soft-lg">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm sm:text-base font-semibold text-foreground">
            {t("pwa.installTitle")}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("pwa.installBody")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleInstall} size="sm" className="touch-target">
            {t("pwa.install")}
          </Button>
          <Button
            onClick={() => setShowPrompt(false)}
            size="sm"
            variant="ghost"
            className="touch-target"
          >
            {t("pwa.later")}
          </Button>
        </div>
      </div>
    </div>
  );
};
