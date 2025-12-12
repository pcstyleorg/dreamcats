import React, { useState, useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { User, LogOut, Mail, Lock, UserCircle, Settings } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useTranslation } from "react-i18next";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { ProfileStatsDialog } from "@/components/ProfileStatsDialog";

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ trigger }) => {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("common");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnonymousSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn("anonymous");
      toast.success(t("success.playingAsGuest"));
      setOpen(false);
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
      await signIn("password", { email, password, flow: mode });
      toast.success(mode === "signIn" ? t("success.signedIn") : t("success.accountCreated"));
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // If already authenticated, don't show the dialog trigger
  // (AuthButton handles the authenticated state with its popover)
  if (isAuthenticated && !trigger) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            {t("auth.signIn")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {t("auth.welcomeTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("auth.welcomeSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Quick Play - Anonymous */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleAnonymousSignIn}
            disabled={isSubmitting}
          >
            <User className="mr-2 h-4 w-4" />
            {t("auth.playAsGuest")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
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
                  className="pl-10"
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
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("auth.loading")
                : mode === "signIn"
                ? t("auth.signIn")
                : t("auth.signUp")}
            </Button>
          </form>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
              className="text-primary hover:underline"
              disabled={isSubmitting}
            >
              {mode === "signIn"
                ? t("auth.noAccount")
                : t("auth.haveAccount")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * AuthButton - A header button that shows auth state and provides quick access to profile/settings
 */
export const AuthButton: React.FC = () => {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { t, i18n } = useTranslation("common");
  const {
    displayName,
    setDisplayName,
    theme,
    setTheme,
    setLanguage,
    soundEnabled,
    setSoundEnabled,
  } = useUserPreferences();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(displayName);
  const [soundEnabledValue, setSoundEnabledValue] = useState(soundEnabled);
  const [themeValue, setThemeValue] = useState<"light" | "dark">(theme);

  const currentLang = (i18n.language?.split("-")[0] || "en") as "en" | "pl";

  const applyThemeToDocument = useCallback((next: "light" | "dark") => {
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setPopoverOpen(false);
      toast.success(t("success.signedOut"));
    } catch (error) {
      toast.error(t("errors.signOutFailed"));
      console.error(error);
    }
  }, [signOut, t]);

  const handleSaveName = useCallback(async () => {
    if (nameValue.trim()) {
      await setDisplayName(nameValue.trim());
      toast.success(t("success.profileSaved"));
      setEditingName(false);
    }
  }, [nameValue, setDisplayName, t]);

  const handleThemeChange = useCallback(
    async (nextTheme: "light" | "dark") => {
      setThemeValue(nextTheme);
      applyThemeToDocument(nextTheme);
      await setTheme(nextTheme);
    },
    [applyThemeToDocument, setTheme],
  );

  const handleLanguageChange = useCallback(
    async (nextLanguage: "en" | "pl") => {
      await i18n.changeLanguage(nextLanguage);
      await setLanguage(nextLanguage);
    },
    [i18n, setLanguage],
  );

  const handleSoundChange = useCallback(
    (enabled: boolean) => {
      setSoundEnabledValue(enabled);
      setSoundEnabled(enabled);
    },
    [setSoundEnabled],
  );

  return (
    <>
      <ProfileStatsDialog open={statsOpen} onOpenChange={setStatsOpen} />
      <Popover
        open={popoverOpen}
        onOpenChange={(nextOpen) => {
          setPopoverOpen(nextOpen);
          if (nextOpen) {
            setNameValue(displayName);
            setSoundEnabledValue(localStorage.getItem("soundEnabled") !== "false");
            setThemeValue(
              (localStorage.getItem("theme") ?? "light") as "light" | "dark",
            );
            setEditingName(false);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isLoading}>
            <UserCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{t("auth.settings")}</span>
          </div>

          {isAuthenticated && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-xs text-muted-foreground">
                {t("auth.displayName")}
              </Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    placeholder={t("auth.displayNamePlaceholder")}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={handleSaveName}>
                    {t("auth.saveChanges")}
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setNameValue(displayName);
                    setEditingName(true);
                  }}
                >
                  <span className="text-sm">{displayName || t("auth.displayNamePlaceholder")}</span>
                  <span className="text-xs text-muted-foreground">{t("auth.edit")}</span>
                </div>
              )}
            </div>
          )}

          {isAuthenticated && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setPopoverOpen(false);
                setStatsOpen(true);
              }}
            >
              {t("auth.viewStats")}
            </Button>
          )}

          <div className="pt-2 border-t border-border space-y-3">
            <div className="text-sm font-semibold">{t("preferences.title")}</div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("preferences.sound")}
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={soundEnabledValue ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleSoundChange(true)}
                >
                  {t("preferences.soundOn")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!soundEnabledValue ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleSoundChange(false)}
                >
                  {t("preferences.soundOff")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("preferences.theme")}
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={themeValue === "light" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleThemeChange("light")}
                >
                  {t("preferences.themeLight")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={themeValue === "dark" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleThemeChange("dark")}
                >
                  {t("preferences.themeDark")}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("preferences.language")}
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={currentLang === "en" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleLanguageChange("en")}
                >
                  {t("language.en")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={currentLang === "pl" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => handleLanguageChange("pl")}
                >
                  {t("language.pl")}
                </Button>
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  {t("auth.playingAsGuest")}
                </p>
                <AuthDialog
                  trigger={
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Mail className="h-4 w-4" />
                      {t("auth.upgradeAccount")}
                    </Button>
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full gap-2 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                {t("auth.signOut")}
              </Button>
            </>
          ) : (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground">
                {t("auth.upgradeDescription")}
              </p>
              <AuthDialog
                trigger={
                  <Button size="sm" className="w-full h-9">
                    {t("auth.signIn")}
                  </Button>
                }
              />
            </div>
          )}
        </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
