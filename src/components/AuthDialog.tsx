import React, { useState, useEffect, useCallback } from "react";
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
import { User, LogOut, Mail, Lock, UserCircle } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useTranslation } from "react-i18next";

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ trigger }) => {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnonymousSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn("anonymous");
      toast.success(t("common:success.playingAsGuest"));
      setOpen(false);
    } catch (error) {
      toast.error(t("common:errors.guestFailed"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(t("common:errors.enterEmailPassword"));
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn("password", { email, password, flow: mode });
      toast.success(mode === "signIn" ? t("common:success.signedIn") : t("common:success.accountCreated"));
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
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {mode === "signIn" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signIn"
              ? "Sign in to save your progress and scores"
              : "Create an account to save your progress"}
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
            Play as Guest
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
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
                ? "Loading..."
                : mode === "signIn"
                ? "Sign In"
                : "Create Account"}
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
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * AuthButton - A header button that shows auth state and provides quick access to sign in/out
 * Also auto-signs in anonymously when entering the app for seamless play
 */
interface AuthButtonProps {
  autoSignIn?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ autoSignIn = true }) => {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasAttemptedAutoSignIn, setHasAttemptedAutoSignIn] = useState(false);

  // Auto sign-in as anonymous for seamless experience
  useEffect(() => {
    if (autoSignIn && !isLoading && !isAuthenticated && !hasAttemptedAutoSignIn) {
      setHasAttemptedAutoSignIn(true);
      signIn("anonymous").catch((error) => {
        console.error("Auto sign-in failed:", error);
      });
    }
  }, [autoSignIn, isLoading, isAuthenticated, hasAttemptedAutoSignIn, signIn]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setPopoverOpen(false);
      toast.success(t("common:success.signedOut"));
    } catch (error) {
      toast.error(t("common:errors.signOutFailed"));
      console.error(error);
    }
  }, [signOut, t]);

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9">
        <UserCircle className="h-5 w-5 animate-pulse" />
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <UserCircle className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="end">
          <div className="space-y-3">
            <p className="text-sm font-medium">Playing as Guest</p>
            <p className="text-xs text-muted-foreground">
              Sign in with email to save your progress across devices.
            </p>
            <div className="flex flex-col gap-2">
              <AuthDialog
                trigger={
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    Upgrade Account
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full gap-2 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Not authenticated - show sign in button
  return <AuthDialog />;
};
