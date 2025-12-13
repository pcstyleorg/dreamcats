# Social Login Setup Guide

## Google OAuth

### 1. Create credentials in Google Cloud Console
- Go to https://console.cloud.google.com/apis/credentials
- Create a new OAuth 2.0 Client ID
- Set authorized redirect URI to:
  ```
  https://<your-convex-deployment>.convex.site/api/auth/callback/google
  ```
  (Find your deployment URL in Convex dashboard)

### 2. Set environment variables
```sh
bunx convex env set AUTH_GOOGLE_ID <your-google-client-id>
bunx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret>
bunx convex env set SITE_URL http://localhost:5173  # for local dev
```

### 3. Update `convex/auth.ts`
```ts
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, Password, Google],
});
```

---

## GitHub OAuth

### 1. Create a GitHub OAuth App
- Go to https://github.com/settings/developers → OAuth Apps → New
- Set callback URL to:
  ```
  https://<your-convex-deployment>.convex.site/api/auth/callback/github
  ```

### 2. Set environment variables
```sh
bunx convex env set AUTH_GITHUB_ID <your-github-client-id>
bunx convex env set AUTH_GITHUB_SECRET <your-github-client-secret>
```

### 3. Update `convex/auth.ts`
```ts
import GitHub from "@auth/core/providers/github";
// add GitHub to providers array
providers: [Anonymous, Password, Google, GitHub],
```

---

## Discord OAuth

### 1. Create a Discord Application
- Go to https://discord.com/developers/applications
- Create new app → OAuth2 → Add redirect:
  ```
  https://<your-convex-deployment>.convex.site/api/auth/callback/discord
  ```

### 2. Set environment variables
```sh
bunx convex env set AUTH_DISCORD_ID <your-discord-client-id>
bunx convex env set AUTH_DISCORD_SECRET <your-discord-client-secret>
```

### 3. Update `convex/auth.ts`
```ts
import Discord from "@auth/core/providers/discord";
providers: [Anonymous, Password, Google, GitHub, Discord],
```

---

## Add buttons to your UI

In `AuthDialog.tsx` / `AuthGate.tsx`, add social login buttons:

```tsx
const handleGoogleSignIn = () => signIn("google");
const handleGitHubSignIn = () => signIn("github");
const handleDiscordSignIn = () => signIn("discord");
```

---

## Production

Update `SITE_URL` to your actual domain:
```sh
bunx convex env set SITE_URL https://your-domain.com
```
