# Implementation Plan: Quick Rematch, Room Persistence, Analytics & PWA

## Overview

This plan covers four major improvements:
1. **Quick Rematch Functionality** - Allow players to instantly restart a game in the same room
2. **Room Persistence After Game End** - Keep room alive, return to lobby on 'X' click
3. **Re-enable Vercel Analytics** - Web Analytics and Speed Insights
4. **Mobile Polish & PWA Setup** - Progressive Web App with offline support

---

## Task 1: Quick Rematch Functionality

### Goal
Add a "Play Again" button on the game over screen that resets the game state while keeping all players in the same room.

### Files to Modify

#### Frontend
- `src/components/ActionModal.tsx` (lines 1-170)
  - Add "Play Again" button to game over modal
  - Add "New Game" button (different settings)

- `src/state/gameReducer.ts` (line 618+)
  - Current `START_NEW_ROUND` action resets between rounds
  - May need new action `RESTART_GAME` to reset from game_over to lobby

- `src/types/index.ts`
  - Add new GameAction type: `RESTART_GAME`

#### Backend (Convex)
- `convex/actions.ts`
  - Add `RESTART_GAME` mutation handler
  - Reset game state: scores to 0, phase to lobby, clear history
  - Keep room and players intact

- `convex/rooms.ts`
  - Add `restartGame` mutation (similar to `startGame` but for rematch)
  - Optional: Track rematch count in room metadata

### Implementation Steps

1. **Define new action types** (5 min)
   ```typescript
   // src/types/index.ts
   export type GameAction =
     | ... existing actions
     | { type: "RESTART_GAME" }
     | { type: "RETURN_TO_LOBBY" } // for 'X' button
   ```

2. **Add UI buttons to ActionModal** (15 min)
   ```tsx
   // src/components/ActionModal.tsx
   // In the game_over section, add:
   <div className="flex gap-2">
     <Button onClick={handlePlayAgain}>
       🔄 Play Again
     </Button>
     <Button variant="outline" onClick={handleNewGame}>
       ⚙️ New Game
     </Button>
   </div>
   ```

3. **Implement reducer logic** (20 min)
   ```typescript
   // src/state/gameReducer.ts
   case "RESTART_GAME": {
     if (state.gamePhase !== "game_over") return state;

     // Reset all player scores to 0
     const resetPlayers = state.players.map(p => ({
       ...p,
       score: 0,
       hand: [] // will be dealt fresh
     }));

     return {
       ...state,
       players: resetPlayers,
       gamePhase: "lobby",
       roundNumber: 0,
       turnCount: 0,
       lastRoundScores: undefined,
       gameWinnerName: undefined,
       // Keep roomId, gameMode, players
     };
   }
   ```

4. **Add Convex mutation** (20 min)
   ```typescript
   // convex/actions.ts
   case "RESTART_GAME": {
     if (!isMyTurn) throw new Error("Only current player can restart");
     if (state.gamePhase !== "game_over") throw new Error("Game not over");

     const resetPlayers = state.players.map(p => ({
       ...p,
       score: 0,
       hand: []
     }));

     await saveState({
       ...state,
       players: resetPlayers,
       gamePhase: "lobby",
       roundNumber: 0,
       turnCount: 0,
       // ... reset all game state
     });
     break;
   }
   ```

5. **Wire up UI handlers** (10 min)
   ```typescript
   const handlePlayAgain = async () => {
     await broadcastAction({ type: "RESTART_GAME" });
     playSound('click');
   };
   ```

### Testing Checklist
- [ ] Complete a full game to game_over
- [ ] Click "Play Again" - should reset scores and return to lobby
- [ ] All players should remain in room
- [ ] Room code should stay the same
- [ ] Start new game - everything should work normally
- [ ] Test in online, hotseat, and solo modes

---

## Task 2: Room Persistence (Return to Lobby on 'X')

### Goal
When clicking the 'X' or "Exit Game" button after game ends, return to lobby screen while keeping the room alive instead of dismissing everything.

### Current Behavior
- File: `src/components/Gameboard.tsx` (line 562)
- Handler: `handleExitGame` likely calls `leaveGame()` which destroys room

### Files to Modify

#### Frontend
- `src/components/Gameboard.tsx` (lines 33-873)
  - Modify `handleExitGame` to check game phase
  - If `game_over` or `round_end`, call `RETURN_TO_LOBBY` instead of `leaveGame`

- `src/state/useGame.ts`
  - May need to add `returnToLobby()` helper distinct from `leaveGame()`

- `src/components/ActionModal.tsx`
  - Add 'X' button to game over modal if not present
  - Wire to `RETURN_TO_LOBBY` action

#### Backend (Convex)
- `convex/actions.ts`
  - Add `RETURN_TO_LOBBY` handler (similar to RESTART_GAME but keeps scores)

- `convex/rooms.ts`
  - Ensure room status can transition from "playing" → "lobby" without destroying room

### Implementation Steps

1. **Add conditional exit logic** (15 min)
   ```typescript
   // src/components/Gameboard.tsx
   const handleExitGame = () => {
     // If game is over or round ended, return to lobby instead of leaving
     if (gamePhase === "game_over" || gamePhase === "round_end") {
       broadcastAction({ type: "RETURN_TO_LOBBY" });
     } else {
       // Confirm before leaving mid-game
       if (confirm(t('game.confirmLeave'))) {
         leaveGame();
       }
     }
   };
   ```

2. **Implement RETURN_TO_LOBBY action** (20 min)
   ```typescript
   // src/state/gameReducer.ts
   case "RETURN_TO_LOBBY": {
     if (state.gamePhase !== "game_over" && state.gamePhase !== "round_end") {
       return state;
     }

     return {
       ...state,
       gamePhase: "lobby",
       // Keep players with their current scores
       // Clear active game state
       drawnCard: null,
       drawSource: null,
       tempCards: undefined,
       swapState: undefined,
       lastMove: null,
       drawPile: [],
       discardPile: [],
       peekingState: undefined,
     };
   }
   ```

3. **Add server handler** (15 min)
   ```typescript
   // convex/actions.ts
   case "RETURN_TO_LOBBY": {
     if (state.gamePhase !== "game_over" && state.gamePhase !== "round_end") {
       throw new Error("Can only return to lobby after game/round ends");
     }

     await saveState({
       ...state,
       gamePhase: "lobby",
       // Reset game-specific state, keep room & players
     });
     break;
   }
   ```

4. **Update room status** (10 min)
   ```typescript
   // convex/rooms.ts - in performAction mutation
   // After state update, sync room status
   const room = await ctx.db.query("rooms")
     .withIndex("by_roomId", q => q.eq("roomId", roomId))
     .first();

   if (room && newState.gamePhase === "lobby") {
     await ctx.db.patch(room._id, { status: "waiting" });
   }
   ```

### Testing Checklist
- [ ] Play game to completion (game_over)
- [ ] Click 'X' or Exit Game button
- [ ] Should return to lobby screen
- [ ] Room code should still be visible
- [ ] All players should still be in room
- [ ] Click "Start Game" - should begin new game
- [ ] Test mid-game exit still shows confirmation
- [ ] Test in online mode with multiple players

---

## Task 3: Re-enable Vercel Analytics & Speed Insights

### Goal
Enable Vercel's built-in Web Analytics and Speed Insights for production monitoring.

### Files to Check/Modify

#### 1. Vercel Dashboard Settings
- Navigate to: https://vercel.com/[your-project]/settings/analytics
- Enable "Web Analytics"
- Enable "Speed Insights"

#### 2. Add Analytics Components
- `src/main.tsx` or `src/App.tsx`
  - Import and add `<Analytics />` and `<SpeedInsights />` components

#### 3. Package Dependencies
- Check `package.json` for `@vercel/analytics` and `@vercel/speed-insights`

### Implementation Steps

1. **Install Vercel packages** (2 min)
   ```bash
   bun add @vercel/analytics @vercel/speed-insights
   ```

2. **Add to main app** (5 min)
   ```typescript
   // src/main.tsx
   import { Analytics } from '@vercel/analytics/react';
   import { SpeedInsights } from '@vercel/speed-insights/react';

   createRoot(document.getElementById("root")!).render(
     <StrictMode>
       <ConvexProvider client={convex}>
         <App />
         <Analytics />
         <SpeedInsights />
       </ConvexProvider>
     </StrictMode>
   );
   ```

3. **Verify in production** (after deploy)
   - Deploy to Vercel
   - Visit site and perform actions
   - Check Vercel dashboard Analytics tab (may take a few hours for data)

### Configuration Options

Add environment variables if needed:
```bash
# .env.local (already gitignored)
VITE_VERCEL_ANALYTICS_ID=your-project-id # optional, auto-detected
```

### Testing Checklist
- [ ] Packages installed
- [ ] Components added to main.tsx
- [ ] Build succeeds locally
- [ ] Deploy to Vercel
- [ ] Visit site from multiple devices
- [ ] Check Vercel dashboard after 1-2 hours
- [ ] Verify pageviews tracked
- [ ] Verify speed metrics appear

---

## Task 4: Sound Toggle (Disabled by Default)

### Goal
Add a setting to enable/disable game sounds. Sounds should be OFF by default to avoid surprising users.

### Files to Modify

#### Frontend
- `src/state/store.ts` (session slice or UI slice)
  - Add `soundEnabled: boolean` to persisted state
  - Default to `false`

- `src/state/useGame.ts` or wherever `playSound` is defined
  - Check `soundEnabled` flag before playing sounds

- `src/components/ui/` (settings area)
  - Add toggle switch for sound in game menu or settings
  - Could go in the sidebar, or top menu

- `src/components/Gameboard.tsx` (line 558+)
  - Add sound toggle to settings area near ThemeToggle

### Implementation Steps

1. **Add to store** (10 min)
   ```typescript
   // src/state/store.ts
   interface SessionSlice {
     // ... existing fields
     soundEnabled: boolean;
     toggleSound: () => void;
   }

   const createSessionSlice: StateCreator<
     AppState,
     [],
     [],
     SessionSlice
   > = (set) => ({
     // ... existing fields
     soundEnabled: false, // DEFAULT TO FALSE
     toggleSound: () =>
       set((state) => ({ soundEnabled: !state.soundEnabled })),
   });
   ```

2. **Update playSound to respect setting** (5 min)
   ```typescript
   // src/state/useGame.ts (or wherever playSound is defined)
   const playSound = (soundName: string) => {
     const soundEnabled = useAppStore.getState().soundEnabled;
     if (!soundEnabled) return; // Exit early if sounds disabled

     // ... existing sound playback logic
   };
   ```

3. **Create SoundToggle component** (20 min)
   ```typescript
   // src/components/SoundToggle.tsx
   import React from 'react';
   import { Volume2, VolumeX } from 'lucide-react';
   import { Button } from './ui/button';
   import { useAppStore } from '@/state/store';
   import { cn } from '@/lib/utils';

   export const SoundToggle: React.FC<{ className?: string }> = ({ className }) => {
     const soundEnabled = useAppStore((state) => state.soundEnabled);
     const toggleSound = useAppStore((state) => state.toggleSound);

     return (
       <Button
         variant="ghost"
         size="icon"
         onClick={toggleSound}
         className={cn("rounded-full h-9 w-9", className)}
         title={soundEnabled ? "Disable sounds" : "Enable sounds"}
       >
         {soundEnabled ? (
           <Volume2 className="h-5 w-5 text-primary" />
         ) : (
           <VolumeX className="h-5 w-5 text-muted-foreground" />
         )}
       </Button>
     );
   };
   ```

4. **Add to Gameboard settings** (5 min)
   ```tsx
   // src/components/Gameboard.tsx (around line 555)
   import { SoundToggle } from './SoundToggle';

   // In the settings area (near ThemeToggle)
   <div className="flex items-center gap-1.5 sm:gap-2 ...">
     <LanguageSwitcher />
     <SoundToggle /> {/* Add this */}
     <ThemeToggle theme={theme} onToggle={toggleTheme} />
     {/* ... rest */}
   </div>
   ```

5. **Optional: Add to LandingPage/LobbyScreen** (10 min)
   - Also expose sound toggle in landing page or lobby for early access
   - Helps users discover the setting before entering a game

### Testing Checklist
- [ ] Default state: sounds are OFF
- [ ] Click sound toggle → icon changes to Volume2 (enabled)
- [ ] Perform actions (draw card, swap, etc.) → sounds play
- [ ] Click toggle again → icon changes to VolumeX (disabled)
- [ ] Perform actions → no sounds play
- [ ] Refresh page → setting persists (localStorage)
- [ ] Test in all game modes (online, hotseat, solo)

---

## Task 5: Mobile Polish & PWA Setup

### Goal
Improve mobile UX with larger touch targets, better gestures, and enable PWA installation.

### Part A: Mobile UX Polish

#### Files to Modify

1. **Touch Target Improvements**
   - `src/components/Card.tsx` (lines 1-275)
     - Increase card touch area on mobile
     - Add `min-height` / `min-width` for touchable elements

   - `src/components/GameActions.tsx` (lines 1-150)
     - Enlarge buttons on mobile breakpoints
     - Add more spacing between action buttons

   - `src/components/PlayerHand.tsx` (lines 1-637)
     - Already has responsive sizing, may need tweaking
     - Ensure 48px minimum touch target (Apple/Google guidelines)

2. **Mobile-specific Interactions**
   - `src/components/Gameboard.tsx`
     - Add swipe gestures for common actions
     - Vibration feedback (if supported)

#### Implementation Steps

1. **Audit touch targets** (30 min)
   ```typescript
   // Use CSS to ensure minimum 44x44px (iOS) or 48x48px (Android)
   // src/index.css or tailwind.config.js

   @layer components {
     .touch-target {
       @apply min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px];
     }
   }
   ```

2. **Add haptic feedback** (20 min)
   ```typescript
   // src/state/useGame.ts
   export const useHaptic = () => {
     const vibrate = (pattern: number | number[]) => {
       if ('vibrate' in navigator) {
         navigator.vibrate(pattern);
       }
     };

     return { vibrate };
   };

   // Usage in card click
   const handleCardClick = () => {
     vibrate(10); // 10ms vibration
     // ... rest of logic
   };
   ```

3. **Optimize mobile layout** (45 min)
   - Review all components at 375px width (iPhone SE)
   - Ensure no horizontal scroll
   - Test on real device if possible
   - Adjust font sizes, spacing, card sizes

4. **Add swipe gestures (optional)** (60 min)
   ```typescript
   // Install react-use-gesture
   bun add @use-gesture/react

   // src/components/Gameboard.tsx
   import { useSwipe } from '@use-gesture/react';

   const bind = useSwipe({
     onSwipeLeft: () => {
       // Next player view or quick action
     },
     onSwipeRight: () => {
       // Previous player view
     },
   });

   <div {...bind()}>
     {/* game content */}
   </div>
   ```

### Part B: PWA Setup

#### Files to Create/Modify

1. **Web Manifest**
   - Create: `public/manifest.json`

2. **Service Worker**
   - Create: `public/service-worker.js`
   - Or use Vite PWA plugin: `vite-plugin-pwa`

3. **Icons**
   - Create/add to `public/icons/`:
     - `icon-192.png`
     - `icon-512.png`
     - `apple-touch-icon.png`
     - `favicon.ico` (if not present)

4. **HTML Meta Tags**
   - Modify: `index.html`

5. **Vite Config**
   - Modify: `vite.config.ts`

#### Implementation Steps

1. **Install PWA plugin** (2 min)
   ```bash
   bun add -D vite-plugin-pwa
   ```

2. **Configure Vite** (15 min)
   ```typescript
   // vite.config.ts
   import { VitePWA } from 'vite-plugin-pwa';

   export default defineConfig({
     plugins: [
       react(),
       VitePWA({
         registerType: 'autoUpdate',
         includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
         manifest: {
           name: 'Dreamcats Card Game',
           short_name: 'Dreamcats',
           description: 'Multiplayer card game - build the lowest scoring 4-card hand',
           theme_color: '#8b5cf6',
           background_color: '#0f172a',
           display: 'standalone',
           scope: '/',
           start_url: '/',
           icons: [
             {
               src: '/icons/icon-192.png',
               sizes: '192x192',
               type: 'image/png',
               purpose: 'any maskable'
             },
             {
               src: '/icons/icon-512.png',
               sizes: '512x512',
               type: 'image/png',
               purpose: 'any maskable'
             }
           ],
           orientation: 'portrait',
           categories: ['games', 'entertainment']
         },
         workbox: {
           // Cache strategy
           runtimeCaching: [
             {
               urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
               handler: 'CacheFirst',
               options: {
                 cacheName: 'google-fonts-cache',
                 expiration: {
                   maxEntries: 10,
                   maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                 }
               }
             },
             {
               urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/i,
               handler: 'NetworkFirst',
               options: {
                 cacheName: 'convex-api-cache',
                 networkTimeoutSeconds: 10,
                 expiration: {
                   maxEntries: 50,
                   maxAgeSeconds: 60 * 5 // 5 minutes
                 }
               }
             },
             {
               urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
               handler: 'CacheFirst',
               options: {
                 cacheName: 'images-cache',
                 expiration: {
                   maxEntries: 50,
                   maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                 }
               }
             }
           ]
         }
       })
     ]
   });
   ```

3. **Create icons** (30 min)
   - Use existing logo or create new icons
   - Generate multiple sizes: 192x192, 512x512, 180x180 (Apple)
   - Tools: https://realfavicongenerator.net/ or Figma/Photoshop
   - Save to `public/icons/`

4. **Update HTML** (10 min)
   ```html
   <!-- index.html -->
   <head>
     <!-- Existing meta tags -->

     <!-- PWA Meta Tags -->
     <link rel="manifest" href="/manifest.json">
     <meta name="theme-color" content="#8b5cf6">
     <meta name="apple-mobile-web-app-capable" content="yes">
     <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
     <meta name="apple-mobile-web-app-title" content="Dreamcats">
     <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

     <!-- Mobile Optimization -->
     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
     <meta name="mobile-web-app-capable" content="yes">
   </head>
   ```

5. **Add install prompt** (30 min)
   ```typescript
   // src/components/InstallPrompt.tsx
   import { useEffect, useState } from 'react';
   import { Button } from './ui/button';

   export const InstallPrompt = () => {
     const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
     const [showPrompt, setShowPrompt] = useState(false);

     useEffect(() => {
       const handler = (e: Event) => {
         e.preventDefault();
         setDeferredPrompt(e);
         setShowPrompt(true);
       };

       window.addEventListener('beforeinstallprompt', handler);
       return () => window.removeEventListener('beforeinstallprompt', handler);
     }, []);

     const handleInstall = async () => {
       if (!deferredPrompt) return;

       deferredPrompt.prompt();
       const { outcome } = await deferredPrompt.userChoice;

       if (outcome === 'accepted') {
         setShowPrompt(false);
       }
       setDeferredPrompt(null);
     };

     if (!showPrompt) return null;

     return (
       <div className="fixed bottom-4 left-4 right-4 bg-card p-4 rounded-lg shadow-lg border z-50">
         <p className="text-sm mb-2">Install Dreamcats for a better experience!</p>
         <div className="flex gap-2">
           <Button onClick={handleInstall} size="sm">Install</Button>
           <Button onClick={() => setShowPrompt(false)} variant="ghost" size="sm">
             Later
           </Button>
         </div>
       </div>
     );
   };
   ```

6. **Add to App** (5 min)
   ```typescript
   // src/App.tsx
   import { InstallPrompt } from './components/InstallPrompt';

   function App() {
     return (
       <>
         {/* existing app content */}
         <InstallPrompt />
       </>
     );
   }
   ```

7. **Offline fallback** (20 min)
   ```typescript
   // src/components/OfflineBanner.tsx
   import { useEffect, useState } from 'react';

   export const OfflineBanner = () => {
     const [isOnline, setIsOnline] = useState(navigator.onLine);

     useEffect(() => {
       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);

       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);

       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }, []);

     if (isOnline) return null;

     return (
       <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-2 text-center z-50">
         ⚠️ You're offline. Online games won't work, but you can play Hotseat mode!
       </div>
     );
   };
   ```

### Testing Checklist - Mobile Polish
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] All buttons are tappable (48px minimum)
- [ ] No horizontal scroll at 375px width
- [ ] Cards are easy to tap and drag
- [ ] Text is readable at mobile sizes
- [ ] Test landscape orientation
- [ ] Haptic feedback works (if implemented)

### Testing Checklist - PWA
- [ ] Build succeeds with PWA plugin
- [ ] Manifest.json is accessible at /manifest.json
- [ ] Icons load correctly
- [ ] Service worker registers (check DevTools → Application → Service Workers)
- [ ] Install prompt appears on mobile Chrome/Edge
- [ ] Can install app to home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] Theme color applies correctly
- [ ] Works offline for cached content
- [ ] Test on iOS Safari (different PWA behavior)
- [ ] Lighthouse PWA score > 90

---

## File Reference Summary

### To Create
- `public/manifest.json` - PWA manifest (or auto-generated by vite-plugin-pwa)
- `public/icons/icon-192.png` - App icon 192x192
- `public/icons/icon-512.png` - App icon 512x512
- `public/icons/apple-touch-icon.png` - iOS home screen icon
- `src/components/InstallPrompt.tsx` - PWA install prompt component
- `src/components/OfflineBanner.tsx` - Offline status indicator
- `src/components/SoundToggle.tsx` - Sound enable/disable toggle button

### To Modify
- `src/components/ActionModal.tsx` (game over buttons)
- `src/components/Gameboard.tsx` (exit game handler, sound toggle)
- `src/state/gameReducer.ts` (new actions: RESTART_GAME, RETURN_TO_LOBBY)
- `src/state/useGame.ts` (playSound respects soundEnabled flag, optional: haptic feedback hook)
- `src/state/store.ts` (add soundEnabled setting to SessionSlice)
- `src/types/index.ts` (new GameAction types)
- `convex/actions.ts` (server handlers for new actions)
- `convex/rooms.ts` (room status updates)
- `vite.config.ts` (PWA plugin configuration)
- `index.html` (PWA meta tags)
- `src/main.tsx` (Analytics components)
- `package.json` (new dependencies)

### To Check
- `vercel.json` - Ensure analytics not disabled
- Vercel Dashboard → Settings → Analytics

---

## Estimated Time

| Task | Time |
|------|------|
| Quick Rematch | 1-2 hours |
| Room Persistence | 1-1.5 hours |
| Vercel Analytics | 15 minutes |
| Sound Toggle | 30-45 minutes |
| Mobile Polish | 2-3 hours |
| PWA Setup | 2-3 hours |
| **Total** | **7-11 hours** |

---

## Dependencies to Install

```bash
# Analytics
bun add @vercel/analytics @vercel/speed-insights

# PWA
bun add -D vite-plugin-pwa

# Optional: Gesture support
bun add @use-gesture/react
```

---

## Deployment Checklist

After implementation:
- [ ] Run `bun run build` locally - verify no errors
- [ ] Test all features in dev mode
- [ ] Commit changes with descriptive message
- [ ] Push to GitHub
- [ ] Deploy to Vercel (or auto-deploy)
- [ ] Test in production:
  - [ ] Quick rematch works
  - [ ] Room persistence works
  - [ ] Analytics tracking (wait 1-2 hours for data)
  - [ ] PWA installable on mobile
  - [ ] Mobile UX improved
- [ ] Check Lighthouse scores (should improve)

---

## Notes

- **Quick Rematch vs New Game**: "Play Again" keeps same settings/players; "New Game" allows configuration changes
- **Room Persistence**: Only for game_over/round_end; mid-game exit should still show confirmation
- **Analytics**: Zero impact on performance, privacy-friendly, GDPR compliant
- **PWA Offline**: Hotseat mode can work offline; Online mode requires network
- **iOS PWA**: Less full-featured than Android (no install prompt, Add to Home Screen manual)

---

## Future Enhancements (Post-MVP)

- [ ] Push notifications for turn reminders (requires backend push service)
- [ ] Background sync for offline moves (sync when back online)
- [ ] Better offline experience (local storage game state)
- [ ] Share game results to social media
- [ ] Deep linking to specific rooms

---

## Recommended Implementation Order

### Priority 1 (Do First - High User Impact)
1. **Sound Toggle** (30-45 min) - Quick win, improves UX immediately
2. **Quick Rematch** (1-2 hours) - Most requested feature, keeps players engaged
3. **Room Persistence** (1-1.5 hours) - Natural complement to quick rematch

### Priority 2 (Do Second - Infrastructure)
4. **Vercel Analytics** (15 min) - Start collecting data ASAP
5. **PWA Setup** (2-3 hours) - Enables mobile installation

### Priority 3 (Do Third - Polish)
6. **Mobile UX Polish** (2-3 hours) - Test with PWA installed for best results

**Suggested workflow:** Start with Priority 1 tasks in order, test thoroughly, then move to Priority 2. This gets core features out fast while building toward the full experience.

---

**Ready to implement!** 🚀
