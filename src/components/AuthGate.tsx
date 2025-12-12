import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Lock, Sparkles } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface AuthGateProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  onAuthenticated: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ theme, toggleTheme, onAuthenticated }) => {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { t } = useTranslation("common");
  const [mode, setMode] = useState<"select" | "signIn" | "signUp">("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // if already authenticated, notify parent
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      onAuthenticated();
    }
  }, [isAuthenticated, isLoading, onAuthenticated]);

  const handleAnonymousSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn("anonymous");
      toast.success(t("success.playingAsGuest"));
      onAuthenticated();
    } catch (error) {
      toast.error(t("errors.guestFailed"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(t("errors.enterEmailPassword"));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn("password", { email, password, flow: mode === "signIn" ? "signIn" : "signUp" });
      toast.success(mode === "signIn" ? t("success.signedIn") : t("success.accountCreated"));
      onAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">{t("auth.loading")}</p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <div className="w-full min-h-dvh flex items-center justify-center relative overflow-hidden p-4 sm:p-6 md:p-8 bg-background">
      {/* background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.16)] via-[hsl(var(--accent)/0.08)] to-[hsl(var(--secondary)/0.2)]" />
      <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-[hsl(var(--primary)/0.3)] to-[hsl(var(--secondary)/0.35)] rounded-full blur-3xl" />
      <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-[hsl(var(--accent)/0.35)] to-[hsl(var(--primary)/0.25)] rounded-full blur-3xl" />

      {/* top right controls */}
      <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex gap-2">
        <LanguageSwitcher />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* title */}
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))] bg-clip-text text-transparent">
            Dreamcats
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            {t("auth.welcomeSubtitle")}
          </p>
        </motion.div>

        {/* auth card */}
        <motion.div
          className="bg-card/95 backdrop-blur-lg border border-border/60 rounded-2xl p-6 sm:p-8 shadow-soft-lg"
          variants={itemVariants}
        >
          {mode === "select" && (
            <div className="space-y-4">
              <Button
                onClick={handleAnonymousSignIn}
                disabled={isSubmitting}
                size="lg"
                className="w-full h-14 text-base font-semibold"
              >
                <User className="mr-2 h-5 w-5" />
                {t("auth.playAsGuest")}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">
                    {t("auth.orContinueWith")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode("signIn")}
                  disabled={isSubmitting}
                  className="h-12"
                >
                  {t("auth.signIn")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("signUp")}
                  disabled={isSubmitting}
                  className="h-12"
                >
                  {t("auth.signUp")}
                </Button>
              </div>
            </div>
          )}

          {(mode === "signIn" || mode === "signUp") && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold">
                  {mode === "signIn" ? t("auth.signIn") : t("auth.signUp")}
                </h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("auth.loading")
                  : mode === "signIn"
                  ? t("auth.signIn")
                  : t("auth.signUp")}
              </Button>

              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  onClick={() => setMode("select")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
                  className="text-primary hover:underline"
                  disabled={isSubmitting}
                >
                  {mode === "signIn" ? t("auth.noAccount") : t("auth.haveAccount")}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
