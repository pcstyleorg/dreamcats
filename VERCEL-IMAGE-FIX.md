# Image Loading Fix for Vercel Deployment

## Problem
Images were not loading on Vercel deployment (working fine on localhost). The card images were clickable but not visible.

## Root Cause
Static assets from the `public` folder were not being properly served by Vercel's static file serving configuration. This is a common issue with Vercel deployments where:
- SPA routing conflicts with static assets
- Missing proper headers for asset caching
- Asset path resolution issues in production

## Solution

### 1. Updated `vercel.json`
Added proper routing and caching headers for assets:
```json
{
  "buildCommand": "npx convex deploy --cmd 'bun run build'",
  "installCommand": "bun install", 
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/assets/(.*)",
      "destination": "/assets/$1"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Created `public/_headers`
Added additional static asset headers for better caching and proper content types:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/*.png
  Cache-Control: public, max-age=31536000, immutable

/assets/*.png
  Content-Type: image/png
  Cache-Control: public, max-age=31536000, immutable
```

### 3. Enhanced `vite.config.ts`
Updated Vite configuration to properly handle asset organization:
```typescript
export default defineConfig({
  // ... existing config
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  publicDir: 'public',
});
```

### 4. Created `deploy-vercel.sh`
Automated deployment script that:
- Cleans previous builds
- Installs dependencies
- Builds the project with proper asset handling
- Verifies assets are created
- Deploys to Vercel

## How to Deploy

### Option 1: Use the automated script
```bash
./deploy-vercel.sh
```

### Option 2: Manual deployment
```bash
bun run build
vercel --prod
```

## Testing the Fix

1. **Before deployment**: Test that images load on localhost
   ```bash
   bun run dev
   ```

2. **After deployment**: Check the live site on Vercel
   - Visit your Vercel deployment URL
   - Open browser DevTools (F12)
   - Go to Network tab
   - Refresh the page
   - Look for `/assets/*.png` requests - they should all return status 200
   - Cards should now be visible on the game board

3. **Verify asset serving**: Visit `https://your-vercel-domain.vercel.app/assets/back.png` directly in browser - should load the card back image

## What Was Fixed

- ✅ Static assets now properly served from `/assets/` path
- ✅ Added proper cache headers for static assets
- ✅ Ensured SPA routing doesn't interfere with asset loading
- ✅ Proper content-type headers for PNG files
- ✅ Automated deployment verification

## Troubleshooting

If images still don't load after deploying:

1. **Check Network tab** - look for 404 errors on `/assets/*.png` requests
2. **Verify build output** - ensure `dist/assets/` directory exists after build
3. **Clear Vercel cache** - redeploy with `--force` flag
4. **Check browser console** - look for CORS or security errors

## Alternative Solutions (if needed)

If this fix doesn't work, you can also try:

1. **Move assets to `src/assets/`** and import them directly in components
2. **Use Vite's `new URL()` import syntax** for better asset handling
3. **Add a `public/robots.txt`** to ensure public directory is served
4. **Use Vercel Functions** for asset serving as fallback

The current solution should resolve the image loading issue for most Vercel deployments.