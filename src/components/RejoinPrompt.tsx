import React, { useEffect, useState } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useGame } from "@/state/useGame";
import { useAppStore } from "@/state/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Gamepad2, Users } from "lucide-react";
import { toast } from "sonner";

interface RejoinPromptProps {
  onEnter: () => void;
}

export const RejoinPrompt: React.FC<RejoinPromptProps> = ({ onEnter }) => {
  const { activeSession, clearActiveSession, isLoading } = useUserPreferences();
  const { rejoinRoom } = useGame();
  const setGame = useAppStore((s) => s.setGame);
  const setPlayer = useAppStore((s) => s.setPlayer);
  const displayName = useAppStore((s) => s.playerName);
  const [open, setOpen] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Check for active session on mount
  useEffect(() => {
    if (isLoading || hasChecked) return;
    
    setHasChecked(true);
    
    if (activeSession) {
      // Has an active session - show prompt
      setOpen(true);
    }
  }, [activeSession, isLoading, hasChecked]);

  const handleRejoinOnline = async () => {
    if (!activeSession?.roomId || !activeSession?.playerId) {
      toast.error("Session data missing");
      return;
    }

    setIsRejoining(true);
    try {
      // Get stored name or use existing
      const storedName = localStorage.getItem("playerName") || displayName || "Player";
      
      // Rejoin using the stored player ID (not generating a new one)
      await rejoinRoom(activeSession.roomId, activeSession.playerId, storedName);
      
      toast.success("Rejoined game!");
      setOpen(false);
      onEnter();
    } catch (error) {
      console.error("Failed to rejoin:", error);
      toast.error("Could not rejoin. The game may have ended.");
      // Clear the stale session
      await clearActiveSession();
    } finally {
      setIsRejoining(false);
    }
  };

  const handleResumeHotseat = () => {
    if (!activeSession?.localGameState) {
      toast.error("No saved game found");
      return;
    }

    try {
      // Restore the game state
      setGame(activeSession.localGameState, { source: "local" });
      
      // Set the first player as the viewer
      const firstPlayer = activeSession.localGameState.players[0];
      if (firstPlayer) {
        setPlayer(firstPlayer.id, firstPlayer.name);
      }
      
      toast.success("Game resumed!");
      setOpen(false);
      onEnter();
    } catch (error) {
      console.error("Failed to resume:", error);
      toast.error("Could not resume the game");
      clearActiveSession();
    }
  };

  const handleDismiss = async () => {
    await clearActiveSession();
    setOpen(false);
  };

  const handleStartFresh = async () => {
    await clearActiveSession();
    setOpen(false);
    onEnter();
  };

  if (!activeSession) {
    return null;
  }

  const isOnline = activeSession.gameMode === "online";
  const isHotseat = activeSession.gameMode === "hotseat" && activeSession.localGameState;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isOnline ? (
              <>
                <RefreshCw className="h-5 w-5 text-primary" />
                Rejoin Game?
              </>
            ) : (
              <>
                <Gamepad2 className="h-5 w-5 text-primary" />
                Resume Game?
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isOnline ? (
              <>
                You were in an online game in room{" "}
                <span className="font-mono font-semibold text-foreground">
                  {activeSession.roomId}
                </span>
                . Would you like to rejoin?
              </>
            ) : (
              <>
                You have a local game in progress with{" "}
                <span className="font-semibold text-foreground">
                  {activeSession.localGameState?.players.length || 0} players
                </span>
                . Would you like to resume?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleStartFresh}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Start Fresh
          </Button>
          
          {isOnline && (
            <Button
              onClick={handleRejoinOnline}
              disabled={isRejoining}
              className="w-full sm:w-auto"
            >
              {isRejoining ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Rejoin Room
            </Button>
          )}
          
          {isHotseat && (
            <Button onClick={handleResumeHotseat} className="w-full sm:w-auto">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Resume Game
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
