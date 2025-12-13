import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LegalModal } from "./LegalModal";
import { Mail, MessageSquare, FileText, Shield } from "lucide-react";

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [openModal, setOpenModal] = useState<"privacy" | "terms" | null>(null);

  const handleFeedback = () => {
    window.location.href = "mailto:adamkrupa@tuta.io?subject=Dreamcats Feedback";
  };

  return (
    <>
      <footer className="w-full py-4 px-4 bg-background/80 backdrop-blur-sm border-t border-border/30">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <button
            onClick={() => setOpenModal("privacy")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Shield className="w-3 h-3" />
            {t("footer.privacy")}
          </button>
          <button
            onClick={() => setOpenModal("terms")}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <FileText className="w-3 h-3" />
            {t("footer.terms")}
          </button>
          <button
            onClick={handleFeedback}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            {t("footer.feedback")}
          </button>
          <a
            href="mailto:adamkrupa@tuta.io"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="w-3 h-3" />
            {t("footer.contact")}
          </a>
        </div>
      </footer>

      <LegalModal
        type="privacy"
        open={openModal === "privacy"}
        onOpenChange={(open) => setOpenModal(open ? "privacy" : null)}
      />
      <LegalModal
        type="terms"
        open={openModal === "terms"}
        onOpenChange={(open) => setOpenModal(open ? "terms" : null)}
      />
    </>
  );
};
