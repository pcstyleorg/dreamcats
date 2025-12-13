import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useGame } from "@/state/useGame";
import { RefreshCw, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/state/store";
import { Footer } from "./Footer";
import { safeLocalStorage } from "@/lib/storage";

interface LandingPageProps {
  onEnter: () => void;
}

const Crow = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    className={["pointer-events-none select-none", className].filter(Boolean).join(" ")}
    style={style}
    fill="currentColor"
  >
    <path d="M123.5,62.1c-2.4-1.2-4.9-1.8-7.5-1.8c-7.9,0-15,6.3-16.1,14.2c-1.3,9.5,4.6,18.1,13.2,19.5c0.8,0.1,1.5,0.2,2.3,0.2c6.9,0,13.1-4.7,15.2-11.5C132.8,75.1,129.8,66.4,123.5,62.1z M52.9,138.1c-1.9,0-3.8-0.5-5.5-1.5c-5.5-3.2-8.4-9.6-6.5-15.6l16.3-51.2c1.9-6,7.8-9.9,13.8-8.6c6,1.3,9.9,7.1,8.6,13.2l-16.3,51.2C62.1,133.5,57.7,138.1,52.9,138.1z M145.2,120.3c-2.9,0-5.7-1.1-7.8-3.3c-4.2-4.2-4.2-11,0-15.2c4.2-4.2,11-4.2,15.2,0c4.2,4.2,4.2,11,0,15.2C150.9,119.2,148.1,120.3,145.2,120.3z" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const { t } = useTranslation();
  const title = t('landing.title');
  const { activeSession, clearActiveSession } = useUserPreferences();
  const { rejoinRoom, leaveGame } = useGame();
  const setGame = useAppStore((s) => s.setGame);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const setRoom = useAppStore((s) => s.setRoom);

  const containerVariants = {
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
      },
    },
  };

  const letterVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
      },
    },
  };

  const handleEnter = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onEnter();
  };

  const handleRejoin = async () => {
    if (activeSession?.roomId && activeSession?.playerId) {
      try {
        const storedName = safeLocalStorage.getItem("playerName") || "Player";
        await rejoinRoom(activeSession.roomId, activeSession.playerId, storedName);
        toast.success(t("common:success.rejoinedGame"));
        handleEnter();
      } catch (e) {
        toast.error(t("common:errors.rejoinFailed"));
        console.error(e);
      }
    } else if (activeSession?.gameMode === 'hotseat' && activeSession.localGameState) {
       // Restore saved local hotseat state
       const viewer = activeSession.localGameState.players?.[0];
       if (viewer) {
         setPlayer(viewer.id, viewer.name);
       }
       setRoom(null);
       setGame(activeSession.localGameState, { source: "local" });
       toast.success(t("common:success.rejoinedGame"));
       // brief feedback so the user sees we're resuming
       setTimeout(() => handleEnter(), 50);
    }
  };

  const handleStartFresh = async () => {
    // 1. Clear session from disk/db
    await clearActiveSession();
    // 2. Reset local game state (Zustand) to prevent auto-save loop
    leaveGame(); 
    // 3. Enter lobby
    handleEnter();
  };
  
  // Filter out very old sessions (older than 12 hours) - simplistic check 
  // (Assuming activeSession doesn't have timestamp, we just rely on user action)

  return (
    <div 
      id="landing-root"
      className="w-full min-h-dvh flex items-center justify-center relative overflow-hidden p-4 sm:p-6 md:p-8 bg-background"
    >
      {/* Background elements - theme-aware gradients */}
      <motion.div
        className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.16)] via-[hsl(var(--accent)/0.08)] to-[hsl(var(--secondary)/0.2)] pointer-events-none"
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      <motion.div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-linear-to-br from-[hsl(var(--primary)/0.3)] to-[hsl(var(--secondary)/0.35)] rounded-full blur-3xl animate-float pointer-events-none" />
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-linear-to-br from-[hsl(var(--accent)/0.35)] to-[hsl(var(--primary)/0.25)] rounded-full blur-3xl animate-float pointer-events-none"
        style={{ animationDelay: "-3s" }}
      />
      <motion.div className="absolute top-1/3 left-10 w-32 h-32 rounded-full bg-[hsl(var(--secondary)/0.25)] blur-2xl opacity-70 pointer-events-none" />

      {/* Flying Crows - theme-aware for visibility */}
      <Crow
        className="absolute top-[10%] -left-[10%] w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-muted-foreground/20 animate-fly-across"
        style={{ animationDelay: "-2s", animationDuration: "25s" }}
      />
      <Crow
        className="absolute top-[50%] -left-[10%] w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-muted-foreground/15 animate-fly-across"
        style={{ animationDelay: "0s", animationDuration: "18s" }}
      />
      <Crow
        className="absolute top-[80%] -left-[10%] w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-muted-foreground/20 animate-fly-across"
        style={{ animationDelay: "-10s", animationDuration: "30s" }}
      />

      <motion.div
        className="text-center z-10 flex flex-col items-center max-w-3xl mx-auto"
        variants={containerVariants}
        animate="visible"
      >
        <motion.h1
          className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold bg-linear-to-br from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))] bg-clip-text text-transparent flex overflow-hidden"
          aria-label={title}
        >
          {title.split("").map((letter, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-foreground/80 font-medium"
          variants={itemVariants}
        >
          {t('landing.subtitle')}
        </motion.p>

        <motion.div variants={itemVariants} className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center gap-4">
          
          {activeSession ? (
            <div className="flex flex-col gap-3 w-full max-w-sm">
                <Button
                  type="button"
                  onClick={handleRejoin}
                  size="lg"
                  className="w-full font-semibold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-soft-lg hover:shadow-dreamy transition-all duration-300 hover:scale-105 active:scale-95 bg-linear-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 border-none"
                >
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin-slow" />
                  {t('landing.rejoinGame')}
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleStartFresh}
                    variant="outline"
                    className="flex-1 border-dashed border-border/60 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                     <Trash2 className="mr-2 h-4 w-4" />
                     {t('landing.startFresh')}
                  </Button>
                   <Button
                    type="button"
                    onClick={handleEnter} // Just enter lobby without rejoining
                    variant="ghost" 
                    className="flex-1"
                  >
                    {t('landing.enterLobby')}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground/70 mt-1">
                   Room: {activeSession.roomId}
                </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleEnter}
              size="lg"
              className="font-semibold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-soft-lg hover:shadow-dreamy transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {t('landing.enterButton')}
            </Button>
          )}

        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <Footer />
      </div>
    </div>
  );
};
