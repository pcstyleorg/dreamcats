import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Convex features will not work. Please set VITE_CONVEX_URL in your .env file."
  );
}

const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud");

export const ConvexClientProvider = ({ children }: { children: ReactNode }) => {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
};

