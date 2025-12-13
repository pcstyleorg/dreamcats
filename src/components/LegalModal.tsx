import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalModalProps {
  type: "privacy" | "terms";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  type,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();

  const content = type === "privacy" ? <PrivacyContent /> : <TermsContent />;
  const title = type === "privacy" ? t("legal.privacyTitle") : t("legal.termsTitle");
  const description = type === "privacy"
    ? t("legal.privacyLastUpdated")
    : t("legal.termsLastUpdated");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const PrivacyContent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 text-sm text-foreground/90">
      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.intro.title")}</h3>
        <p>{t("legal.privacy.intro.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.dataCollected.title")}</h3>
        <p className="mb-2">{t("legal.privacy.dataCollected.text")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("legal.privacy.dataCollected.item1")}</li>
          <li>{t("legal.privacy.dataCollected.item2")}</li>
          <li>{t("legal.privacy.dataCollected.item3")}</li>
          <li>{t("legal.privacy.dataCollected.item4")}</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.cookies.title")}</h3>
        <p>{t("legal.privacy.cookies.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.analytics.title")}</h3>
        <p>{t("legal.privacy.analytics.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.thirdParty.title")}</h3>
        <p>{t("legal.privacy.thirdParty.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.security.title")}</h3>
        <p>{t("legal.privacy.security.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.rights.title")}</h3>
        <p>{t("legal.privacy.rights.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.privacy.contact.title")}</h3>
        <p>
          {t("legal.privacy.contact.text")}{" "}
          <a href="mailto:adamkrupa@tuta.io" className="text-primary hover:underline">
            adamkrupa@tuta.io
          </a>
        </p>
      </section>
    </div>
  );
};

const TermsContent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 text-sm text-foreground/90">
      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.acceptance.title")}</h3>
        <p>{t("legal.terms.acceptance.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.description.title")}</h3>
        <p>{t("legal.terms.description.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.accounts.title")}</h3>
        <p>{t("legal.terms.accounts.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.conduct.title")}</h3>
        <p className="mb-2">{t("legal.terms.conduct.text")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("legal.terms.conduct.item1")}</li>
          <li>{t("legal.terms.conduct.item2")}</li>
          <li>{t("legal.terms.conduct.item3")}</li>
          <li>{t("legal.terms.conduct.item4")}</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.ip.title")}</h3>
        <p>{t("legal.terms.ip.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.disclaimer.title")}</h3>
        <p>{t("legal.terms.disclaimer.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.liability.title")}</h3>
        <p>{t("legal.terms.liability.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.changes.title")}</h3>
        <p>{t("legal.terms.changes.text")}</p>
      </section>

      <section>
        <h3 className="text-base font-semibold mb-2">{t("legal.terms.contact.title")}</h3>
        <p>
          {t("legal.terms.contact.text")}{" "}
          <a href="mailto:adamkrupa@tuta.io" className="text-primary hover:underline">
            adamkrupa@tuta.io
          </a>
        </p>
      </section>
    </div>
  );
};
