import { useEffect, useState, Suspense, useLayoutEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/state/useGame';
import { LobbyScreen } from './components/LobbyScreen';
import { Gameboard } from './components/Gameboard';
import { Toaster } from "@/components/ui/sonner"
import { TutorialProvider } from './context/TutorialContext';
import { Tutorial } from './components/Tutorial';
import { LandingPage } from './components/LandingPage';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './i18n/config';
import { ConvexSync } from "@/state/ConvexSync";

function App() {
  const { state } = useGame();
  const [hasEntered, setHasEntered] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [scale, setScale] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const isCalculating = useRef(false);
  const lastScale = useRef(1);

  // Measure actual content and calculate scale to fit viewport
  const calculateScale = useCallback(() => {
    if (!contentRef.current || isCalculating.current) return;
    isCalculating.current = true;

    const container = contentRef.current;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Temporarily reset to scale=1 to measure natural content size
    const prevZoom = container.style.zoom;
    container.style.zoom = '1';
    container.style.minHeight = '100dvh';
    
    // Also reset children that have inline minHeight
    const main = container.querySelector('main');
    if (main) (main as HTMLElement).style.minHeight = '100dvh';
    
    // Force reflow
    void container.offsetHeight;
    
    // Measure content at scale=1
    const contentHeight = container.scrollHeight;
    const contentWidth = container.scrollWidth;

    // Calculate required scale
    let newScale = 1;
    if (contentHeight > viewportHeight || contentWidth > viewportWidth) {
      const scaleY = viewportHeight / contentHeight;
      const scaleX = viewportWidth / contentWidth;
      newScale = Math.min(scaleX, scaleY, 1);
      newScale = Math.max(newScale, 0.5); // Minimum 50%
      // Round to avoid sub-pixel issues
      newScale = Math.round(newScale * 100) / 100;
    }

    // Only update if scale actually changed to avoid loops
    // Only update if scale actually changed to avoid loops
    if (newScale !== lastScale.current) {
      lastScale.current = newScale;
      setScale(newScale);
    }
    // else: keep current zoom - no need to restore it
    
    isCalculating.current = false;
  }, []);

  // Run calculation on mount, resize, zoom changes, and content changes
  useLayoutEffect(() => {
    // Initial calculation after render
    const timer = setTimeout(calculateScale, 50);
    
    // Debounce helper
    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedCalculate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(calculateScale, 100);
    };
    
    // Window resize (catches browser zoom changes too)
    window.addEventListener('resize', debouncedCalculate);
    
    // Visual viewport resize (catches pinch zoom on mobile, keyboard show/hide)
    window.visualViewport?.addEventListener('resize', debouncedCalculate);
    
    // MutationObserver to catch structural DOM changes that might affect size
    // Only watch childList changes, not attribute changes (avoids firing on animations/hover states)
    const mutationObserver = new MutationObserver(debouncedCalculate);
    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, {
        childList: true,
        subtree: true,
      });
    }
    
    return () => {
      clearTimeout(timer);
      clearTimeout(debounceTimer);
      window.removeEventListener('resize', debouncedCalculate);
      window.visualViewport?.removeEventListener('resize', debouncedCalculate);
      mutationObserver.disconnect();
    };
  }, [calculateScale, state.gamePhase, hasEntered]);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const showLanding = !hasEntered;
  const showLobby = hasEntered && state.gamePhase === 'lobby';
  const showGameboard = hasEntered && state.gamePhase !== 'lobby';

  // Compensate min-height for zoom (viewport units don't scale with zoom)
  const compensatedHeight = `${100 / scale}dvh`;

  return (
    <Suspense fallback={<div className="h-[100dvh] bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>}>
      <TutorialProvider>
        <div 
          ref={contentRef}
          className="bg-background w-full"
          style={{
            zoom: scale,
            minHeight: compensatedHeight,
          }}
        >
          <main 
            className="font-sans bg-background text-foreground transition-colors relative flex flex-col w-full"
            style={{ minHeight: compensatedHeight }}
          >
            <ConvexSync />
            {!showGameboard && (
              <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex gap-2">
                <LanguageSwitcher />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
            )}
            <AnimatePresence mode="wait">
              {showLanding && (
                <motion.div key="landing" className="flex-1 w-full" style={{ minHeight: compensatedHeight }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
                  <LandingPage onEnter={() => setHasEntered(true)} compensatedHeight={compensatedHeight} />
                </motion.div>
              )}
              {showLobby && (
                <motion.div key="lobby" className="flex-1 w-full" style={{ minHeight: compensatedHeight }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <LobbyScreen compensatedHeight={compensatedHeight} />
                </motion.div>
              )}
              {showGameboard && (
                <motion.div key="gameboard" className="flex-1 w-full" style={{ minHeight: compensatedHeight }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  <Gameboard theme={theme} toggleTheme={toggleTheme} compensatedHeight={compensatedHeight} />
                </motion.div>
              )}
            </AnimatePresence>

            <Toaster richColors theme={theme} />
            {hasEntered && <Tutorial />}
          </main>
        </div>
      </TutorialProvider>
    </Suspense>
  );
}

export default App;