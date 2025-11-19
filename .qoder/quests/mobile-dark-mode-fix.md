# Mobile Dark Mode Fix and Polish Language Support

## Overview

This design addresses two critical user experience issues: inconsistent dark mode application across all screens (currently only works in-game) and the addition of Polish language internationalization support to make the application accessible to Polish-speaking users.

## Problem Statement

### Current Issues

1. **Dark Mode Inconsistency**: The dark mode theme toggle exists and functions, but theme variables are only properly applied during gameplay. The landing page and lobby screen remain in light mode regardless of the theme setting, creating a jarring user experience and inconsistent visual presentation.

2. **Language Limitation**: The application currently displays all text in English only, with no internationalization infrastructure. This limits accessibility for non-English speakers, particularly Polish users who would benefit from native language support.

## Design Goals

1. Ensure dark mode works consistently across all application screens (landing page, lobby, and game)
2. Implement internationalization infrastructure using react-i18next
3. Provide complete Polish translations for all user-facing text
4. Allow users to switch between English and Polish languages
5. Persist language preference across sessions
6. Maintain existing functionality and visual design quality

## Solution Architecture

### Dark Mode Fix Strategy

The root cause of the dark mode inconsistency is that the LandingPage and LobbyScreen components use hardcoded color classes instead of the Tailwind CSS semantic color variables defined in index.css. The solution requires replacing all hardcoded colors with theme-aware semantic color classes.

#### Affected Components Analysis

**LandingPage Component**:
- Background uses hardcoded light colors: `from-blue-100 via-purple-50 to-cyan-100`
- Gradient blobs use light color variants: `from-purple-200/60`, `from-cyan-200/60`
- Text uses fixed dark colors: `text-gray-700`
- Crow SVG elements use fixed dark colors: `text-purple-900/20`, `text-purple-800/15`

**LobbyScreen Component**:
- Background uses fixed light gradient: `from-indigo-100 via-slate-50 to-purple-100`
- Cards use hardcoded white: `bg-white/80`
- Text uses fixed slate colors: `text-slate-800`, `text-slate-600`, `text-slate-400`
- Borders and inputs use fixed slate shades
- Button backgrounds use hardcoded gradients and white

#### Theme Variable Mapping Strategy

Replace hardcoded colors with semantic CSS variables that automatically adapt to dark mode:

| Current Usage | Semantic Replacement | Purpose |
|--------------|---------------------|---------|
| `bg-white`, `bg-slate-50` | `bg-background` | Main background surfaces |
| `bg-white/80` | `bg-card/80` | Card backgrounds with transparency |
| `text-slate-800`, `text-gray-700` | `text-foreground` | Primary text content |
| `text-slate-600` | `text-muted-foreground` | Secondary text content |
| `text-slate-400` | `text-muted-foreground/70` | Tertiary text, placeholders |
| `border-slate-200` | `border-border` | Border colors |
| `bg-slate-50` | `bg-muted` | Subtle background accents |

### Internationalization Architecture

#### Technology Choice

Use react-i18next for internationalization based on:
- Strong React ecosystem integration with hooks support
- Lazy loading capabilities for efficient bundle size
- Namespace organization for better code splitting
- Browser language detection
- LocalStorage persistence built-in

#### Translation Infrastructure

**Directory Structure**:
```
public/
  locales/
    en/
      translation.json
      common.json
    pl/
      translation.json
      common.json
```

**Namespace Organization**:
- `translation`: Screen-specific content (landing, lobby, game UI)
- `common`: Shared elements (buttons, labels, errors, notifications)

#### i18n Configuration Strategy

Create centralized i18n configuration module with:
- Language detection from browser preferences
- Fallback to English if language not supported
- LocalStorage persistence for user preference
- JSON backend for translation file loading
- Support for interpolation and pluralization
- React Suspense integration for loading states

### Language Switcher Component

Design a new LanguageSwitcher component that:
- Displays current language flag or code
- Provides dropdown or toggle to switch languages
- Persists selection to localStorage
- Updates all UI immediately on language change
- Positioned consistently across all screens (near theme toggle)

Visual treatment should match the existing ThemeToggle component style for consistency.

## Implementation Requirements

### Phase 1: Dark Mode Fix

#### LandingPage Component Updates

Replace all hardcoded color references:

1. **Background gradient**: Convert fixed light gradient to use background and subtle accent colors that adapt to theme
2. **Floating decorative elements**: Use muted background variants with reduced opacity
3. **Typography colors**: Replace gray-700 with foreground semantic color
4. **SVG decorative elements**: Use muted-foreground with opacity for visibility in both themes
5. **Button styling**: Already uses semantic colors, verify consistency

Expected behavior: When dark mode is active, landing page displays deep dark background with appropriate contrast, decorative elements remain visible but subtle, and all text maintains readability.

#### LobbyScreen Component Updates

Replace all hardcoded color references:

1. **Container background**: Use background gradient with theme-aware colors
2. **Card surfaces**: Replace white backgrounds with card semantic color
3. **Text hierarchy**: Map all slate text colors to appropriate foreground variables
4. **Input fields**: Use input semantic color for backgrounds and borders
5. **Buttons**: Verify gradient buttons maintain visibility, use semantic colors for variants
6. **Loading states**: Use muted colors for placeholder elements
7. **Badge elements**: Ensure contrast in both light and dark modes

Expected behavior: Lobby screen seamlessly switches between light and dark themes, maintaining visual hierarchy and all interactive elements remain clearly visible.

#### Visual Consistency Verification

Ensure the following visual qualities in both themes:
- Text contrast ratios meet WCAG AA standards (4.5:1 for normal text)
- Interactive elements have clear hover and active states
- Gradient transitions remain smooth and visually appealing
- Decorative elements enhance rather than distract
- Mobile viewports maintain proper spacing and sizing

### Phase 2: Internationalization Infrastructure

#### i18n Setup Module

Create `src/i18n/config.ts` module that:
- Initializes i18next with react-i18next plugin
- Configures i18next-http-backend for JSON file loading
- Sets up i18next-browser-languagedetector for automatic detection
- Defines supported languages: English (en), Polish (pl)
- Sets English as fallback language
- Enables interpolation for dynamic content
- Configures namespace loading strategy
- Exports configured i18n instance

#### Translation File Structure

**English Translation File (en/translation.json)**:

Organize translations by screen and feature:
- Landing page section: title, subtitle, enter button
- Lobby mode selection: online multiplayer, local hotseat labels
- Lobby online mode: form labels, room creation, joining, waiting states
- Lobby hotseat mode: player setup, add/remove actions
- Common actions: start, join, create, back, copy

**Polish Translation File (pl/translation.json)**:

Provide equivalent Polish translations maintaining:
- Formal vs informal tone consistency (use informal "ty" form for game context)
- Cultural appropriateness for game terminology
- Proper plural forms (Polish has complex pluralization rules)
- Gender-neutral language where applicable
- Technical terms that may remain in English (e.g., "Room ID")

**Common Translation File (common.json)**:

Shared vocabulary across both languages:
- Button labels: confirm, cancel, close, save
- Error messages: connection failed, invalid input, player limit
- Success notifications: copied to clipboard, game started
- Loading states: loading, waiting, connecting
- Form validation: required field, invalid format, too short/long

#### Application Integration

**Root Component Updates (App.tsx)**:
- Import i18n configuration at application entry
- Wrap application with I18nextProvider if not using initReactI18next
- Ensure i18n initializes before first render
- Add Suspense boundary for translation loading

**Component Translation Integration**:
- Import useTranslation hook in all components with user-facing text
- Replace hardcoded strings with t() function calls
- Use Trans component for strings with embedded HTML or React components
- Provide interpolation values for dynamic content (player names, counts)
- Use namespace prefixes for organized translation keys

### Phase 3: Language Switcher Component

#### Component Design

Create `src/components/LanguageSwitcher.tsx` component with:

**Visual Design**:
- Button-based selector matching ThemeToggle aesthetics
- Display current language as two-letter code (EN/PL)
- Icon showing language or globe symbol
- Smooth transition animation on language change
- Consistent sizing and positioning with theme toggle

**Behavior**:
- Click to toggle between English and Polish
- Update i18n instance language immediately
- Persist selection to localStorage
- Show brief toast notification on language change
- Keyboard accessible with proper ARIA labels

**Positioning**:
- Fixed position near ThemeToggle button
- Visible on all screens (landing, lobby, game)
- Mobile-responsive: adequate touch target size
- Z-index ensures visibility above other content

#### Integration Points

Place LanguageSwitcher in App.tsx next to ThemeToggle:
- Both controls in fixed top-right corner
- Horizontal arrangement on desktop
- Vertical stacking on mobile if needed
- Consistent spacing and visual weight

### Phase 4: Translation Content

#### English Content Mapping

Map all existing hardcoded strings to translation keys:

**Landing Page**:
- `landing.title`: "Sen"
- `landing.subtitle`: "A game of dreams and crows."
- `landing.enterButton`: "Enter the Dream"

**Lobby Mode Selection**:
- `lobby.title`: "Sen"
- `lobby.subtitle`: "A game of dreams and crows."
- `lobby.onlineMultiplayer`: "Online Multiplayer"
- `lobby.localHotseat`: "Local Hot-Seat"

**Online Lobby**:
- `lobby.online.title`: "Online Multiplayer"
- `lobby.online.subtitle`: "Join or Create a 2-Player Game"
- `lobby.online.yourName`: "Your Name"
- `lobby.online.namePlaceholder`: "Enter your name"
- `lobby.online.createGame`: "Create New Game"
- `lobby.online.roomId`: "Room ID"
- `lobby.online.roomIdPlaceholder`: "Enter Room ID"
- `lobby.online.join`: "Join"
- `lobby.online.shareId`: "Share this ID with your friend"
- `lobby.online.players`: "Players"
- `lobby.online.waitingForOpponent`: "Waiting for opponent..."
- `lobby.online.host`: "HOST"
- `lobby.online.startGame`: "Start Game"
- `lobby.online.waitingForPlayers`: "Waiting for Players..."
- `lobby.online.waitingForHost`: "Waiting for host to start..."

**Hotseat Lobby**:
- `lobby.hotseat.title`: "Local Hot-Seat"
- `lobby.hotseat.subtitle`: "Play on one device"
- `lobby.hotseat.playerLabel`: "Player {{number}}"
- `lobby.hotseat.playerPlaceholder`: "Enter Player {{number}}'s name"
- `lobby.hotseat.remove`: "Remove"
- `lobby.hotseat.addPlayer`: "Add Player"
- `lobby.hotseat.startGame`: "Start Game"

**Common Errors and Notifications**:
- `common.errors.enterName`: "Please enter your name."
- `common.errors.enterRoomId`: "Please enter a Room ID."
- `common.errors.createRoomFailed`: "Could not create room. Please check your connection."
- `common.errors.joinRoomFailed`: "Failed to join room."
- `common.errors.startGameFailed`: "Failed to start game."
- `common.errors.needTwoPlayers`: "Need at least 2 players to start."
- `common.errors.enterAllNames`: "Please enter names for all players."
- `common.success.roomIdCopied`: "Room ID copied to clipboard!"
- `common.success.idCopied`: "Room ID copied!"

#### Polish Content Translation

Provide accurate Polish translations maintaining game-appropriate tone:

**Landing Page (Polish)**:
- `landing.title`: "Sen" (name remains unchanged)
- `landing.subtitle`: "Gra o snach i wronach."
- `landing.enterButton`: "Wejdź do Snu"

**Lobby Mode Selection (Polish)**:
- `lobby.title`: "Sen"
- `lobby.subtitle`: "Gra o snach i wronach."
- `lobby.onlineMultiplayer`: "Gra Online"
- `lobby.localHotseat`: "Lokalna Gra na Zmianę"

**Online Lobby (Polish)**:
- `lobby.online.title`: "Gra Online"
- `lobby.online.subtitle`: "Dołącz lub Stwórz Grę dla 2 Graczy"
- `lobby.online.yourName`: "Twoje Imię"
- `lobby.online.namePlaceholder`: "Wpisz swoje imię"
- `lobby.online.createGame`: "Stwórz Nową Grę"
- `lobby.online.roomId`: "ID Pokoju"
- `lobby.online.roomIdPlaceholder`: "Wpisz ID Pokoju"
- `lobby.online.join`: "Dołącz"
- `lobby.online.shareId`: "Udostępnij to ID znajomemu"
- `lobby.online.players`: "Gracze"
- `lobby.online.waitingForOpponent`: "Oczekiwanie na przeciwnika..."
- `lobby.online.host`: "GOSPODARZ"
- `lobby.online.startGame`: "Rozpocznij Grę"
- `lobby.online.waitingForPlayers`: "Oczekiwanie na Graczy..."
- `lobby.online.waitingForHost`: "Oczekiwanie na rozpoczęcie przez gospodarza..."

**Hotseat Lobby (Polish)**:
- `lobby.hotseat.title`: "Lokalna Gra na Zmianę"
- `lobby.hotseat.subtitle`: "Grajcie na jednym urządzeniu"
- `lobby.hotseat.playerLabel`: "Gracz {{number}}"
- `lobby.hotseat.playerPlaceholder`: "Wpisz imię Gracza {{number}}"
- `lobby.hotseat.remove`: "Usuń"
- `lobby.hotseat.addPlayer`: "Dodaj Gracza"
- `lobby.hotseat.startGame`: "Rozpocznij Grę"

**Common Errors and Notifications (Polish)**:
- `common.errors.enterName`: "Proszę wpisać swoje imię."
- `common.errors.enterRoomId`: "Proszę wpisać ID Pokoju."
- `common.errors.createRoomFailed`: "Nie udało się stworzyć pokoju. Sprawdź połączenie internetowe."
- `common.errors.joinRoomFailed`: "Nie udało się dołączyć do pokoju."
- `common.errors.startGameFailed`: "Nie udało się rozpocząć gry."
- `common.errors.needTwoPlayers`: "Potrzeba co najmniej 2 graczy do rozpoczęcia."
- `common.errors.enterAllNames`: "Proszę wpisać imiona wszystkich graczy."
- `common.success.roomIdCopied`: "ID Pokoju skopiowane do schowka!"
- `common.success.idCopied`: "ID Pokoju skopiowane!"

### Phase 5: Testing and Validation

#### Dark Mode Testing Requirements

Verify dark mode functionality across:
- Landing page in both light and dark themes
- Lobby screen mode selection in both themes
- Online lobby with all states (empty, waiting, ready) in both themes
- Hotseat lobby setup in both themes
- Theme toggle button visibility and functionality
- Theme persistence across page reloads
- Smooth theme transition animations

Visual regression checks:
- Text remains readable with sufficient contrast
- Buttons and interactive elements are clearly visible
- Decorative elements enhance without overwhelming
- No color clashing or visual artifacts
- Mobile responsive behavior maintained

#### Internationalization Testing Requirements

Verify language functionality:
- Language switcher appears on all screens
- Switching language updates all visible text immediately
- Language preference persists across sessions
- Default language detection from browser settings works
- Fallback to English for unsupported languages
- Translation keys properly interpolate dynamic values
- Plural forms display correctly in Polish
- All screens have complete translations (no missing keys)

User experience validation:
- Polish translations are culturally appropriate
- Tone consistency across all translated text
- Technical terms are handled appropriately
- Layout accommodates different text lengths (Polish tends to be longer)
- No text overflow or truncation issues
- Mobile layouts accommodate both languages

## Technical Considerations

### Dependencies Required

New package installations:
- `i18next`: Core internationalization framework
- `react-i18next`: React bindings for i18next
- `i18next-http-backend`: Backend to load translation files
- `i18next-browser-languagedetector`: Automatic language detection

All packages are mature, well-maintained, and have strong TypeScript support.

### Performance Implications

**Bundle Size Impact**:
- i18next core: ~15KB gzipped
- react-i18next: ~8KB gzipped
- Translation JSON files: ~2-3KB per language (loaded on demand)
- Total overhead: ~25-30KB for internationalization infrastructure

**Optimization Strategies**:
- Lazy load translation namespaces only when needed
- Use HTTP backend to fetch translations asynchronously
- Cache translations in memory after first load
- Leverage browser caching for translation JSON files

**Runtime Performance**:
- Translation lookups are fast (hash map O(1) lookup)
- No performance impact on rendering or interaction
- Theme switching already optimized by existing implementation

### Browser Compatibility

Target browsers support all required features:
- CSS variables (dark mode): All modern browsers, IE 11+ with fallback
- LocalStorage: Universal support
- Fetch API (for translation loading): All modern browsers, polyfill available
- React 19: Modern browser requirement already established

### Mobile Considerations

**Touch Interactions**:
- Language switcher and theme toggle have adequate touch targets (44x44px minimum)
- Proper spacing prevents accidental activation
- Visual feedback on touch events

**Viewport Adaptations**:
- Fixed position controls remain accessible on small screens
- Text scaling respects system font size preferences
- Color contrast sufficient for outdoor/bright light viewing
- Animations remain smooth on lower-powered devices

**Network Considerations**:
- Translation files are small and cache well
- Graceful degradation if translation loading fails
- Offline capability: translations can be bundled if needed

## Acceptance Criteria

### Dark Mode Functionality

1. Dark mode toggle affects landing page background and text colors
2. Dark mode toggle affects lobby screen in all states
3. All text maintains readable contrast in both light and dark modes
4. Decorative elements (crows, gradients) remain visible in both themes
5. Theme preference persists across browser sessions
6. No visual glitches during theme transitions
7. Mobile viewports display correctly in both themes

### Internationalization Functionality

1. Application initializes with browser's preferred language if supported
2. Language switcher component is visible and functional on all screens
3. Switching language updates all UI text immediately
4. Language preference persists in localStorage
5. All user-facing text has English and Polish translations
6. No missing translation keys in either language
7. Dynamic content (player names, counts) interpolates correctly
8. Polish plural forms display appropriately
9. Error and success messages appear in selected language
10. Layout accommodates text length differences between languages

### User Experience

1. New controls (language switcher) integrate naturally with existing UI
2. Control placement is consistent and intuitive
3. Visual design matches existing component aesthetics
4. Mobile users can easily access both language and theme controls
5. No performance degradation from i18n infrastructure
6. First-time users see appropriate default language and theme
7. Switching settings provides immediate visual feedback

## Future Enhancements

Potential future improvements beyond this design scope:

1. **Additional Languages**: Framework supports easy addition of more languages (e.g., German, Spanish, French)

2. **In-Game Translations**: Extend translations to game cards, actions, and notifications during active gameplay

3. **Regional Variants**: Support for regional language differences (e.g., Brazilian Portuguese vs European Portuguese)

4. **RTL Language Support**: Add right-to-left language support if needed (Arabic, Hebrew)

5. **Translation Management**: Integrate with translation management platform for easier content updates

6. **Automatic Translation**: Use AI translation services for rapid prototyping of new languages

7. **User-Contributed Translations**: Community translation submission and review system

8. **Accessibility Enhancements**: Screen reader announcements for language/theme changes, high contrast mode option
