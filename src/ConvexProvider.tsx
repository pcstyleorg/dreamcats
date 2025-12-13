import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { isLocalStorageAvailable } from "@/lib/storage";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Convex features will not work. Please set VITE_CONVEX_URL in your .env file."
  );
}

const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud");

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => {
  // Convex Auth auto-handles a `?code=` query parameter by attempting a sign-in.
  // Some hosting/auth tooling (and even certain browser flows) also use `?code=`,
  // which can cause unexpected redirects/reloads on production.
  //
  // Only handle `?code=` if we see a Convex Auth OAuth verifier in storage (i.e. we
  // initiated an OAuth sign-in from this app).
  const shouldHandleCode = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("code")) return false;
      if (!isLocalStorageAvailable()) return false;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key?.startsWith("__convexAuthOAuthVerifier_")) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <ConvexAuthProvider client={convex} shouldHandleCode={shouldHandleCode}>
      {children}
    </ConvexAuthProvider>
  );
};
