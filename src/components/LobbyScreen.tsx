import React, { useState, useEffect } from "react";
import { useGame } from "@/state/useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Users, Cloud, Copy, Check, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export const LobbyScreen: React.FC = () => {
  const { t } = useTranslation();
  const { createRoom, joinRoom, startHotseatGame, startGame, state, myPlayerId } = useGame();
  const [mode, setMode] = useState<"select" | "online" | "hotseat">("select");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hotseatPlayers, setHotseatPlayers] = useState<string[]>(["", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-copy room ID when created
  useEffect(() => {
    if (state.gameMode === "online" && state.roomId && state.hostId === myPlayerId && state.gamePhase === 'lobby') {
      navigator.clipboard.writeText(state.roomId).then(() => {
        toast.success(t('common:success.roomIdCopied'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback or ignore if permission denied
      });
    }
  }, [state.roomId, state.gameMode, state.hostId, myPlayerId, state.gamePhase, t]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error(t('common:errors.enterName'));
      return;
    }
    setIsLoading(true);
    try {
      await createRoom(playerName);
    } catch {
      toast.error(t('common:errors.createRoomFailed'));
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error(t('common:errors.enterName'));
      return;
    }
    if (!roomIdInput.trim()) {
      toast.error(t('common:errors.enterRoomId'));
      return;
    }
    setIsLoading(true);
    try {
      await joinRoom(roomIdInput.trim(), playerName);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t('common:errors.joinRoomFailed');
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleStartHotseat = () => {
    if (hotseatPlayers.some((name) => !name.trim())) {
      toast.error(t('common:errors.enterAllNames'));
      return;
    }
    startHotseatGame();
  };

  const handleAddHotseatPlayer = () => {
    if (hotseatPlayers.length < 5) {
      setHotseatPlayers([...hotseatPlayers, ""]);
    }
  };

  const handleRemoveHotseatPlayer = (index: number) => {
    if (hotseatPlayers.length > 2) {
      const newPlayers = [...hotseatPlayers];
      newPlayers.splice(index, 1);
      setHotseatPlayers(newPlayers);
    }
  };

  const handleHotseatNameChange = (index: number, value: string) => {
    const newPlayers = [...hotseatPlayers];
    newPlayers[index] = value;
    setHotseatPlayers(newPlayers);
  };

  const handleStartOnlineGame = async () => {
    if (state.players.length < 2) {
      toast.error(t('common:errors.needTwoPlayers'));
      return;
    }
    setIsLoading(true);
    try {
      await startGame();
    } catch {
      toast.error(t('common:errors.startGameFailed'));
      setIsLoading(false);
    }
  };

  const handleCopyRoomId = () => {
    if (state.roomId) {
      navigator.clipboard.writeText(state.roomId);
      setCopied(true);
      toast.success(t('common:success.idCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const effectiveLoading =
    isLoading ||
    (state.gameMode === "online" &&
      state.roomId !== null &&
      state.gamePhase === 'lobby');

  const renderSelectMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <CardHeader className="space-y-2 sm:space-y-3">
        <CardTitle className="text-5xl sm:text-6xl md:text-7xl text-center font-heading bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))] bg-clip-text text-transparent drop-shadow-sm">
          {t('lobby.title')}
        </CardTitle>
        <CardDescription className="text-center text-base sm:text-lg font-medium text-muted-foreground">
          {t('lobby.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => setMode("online")}
          className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:from-[hsl(var(--primary))] hover:to-[hsl(var(--secondary))] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          size="lg"
        >
          <Cloud className="mr-3 h-6 w-6" /> {t('lobby.onlineMultiplayer')}
        </Button>
        <Button
          onClick={() => setMode("hotseat")}
          className="w-full h-16 text-lg font-semibold bg-card text-foreground border-2 border-border hover:bg-muted hover:border-muted-foreground/30 shadow-sm hover:shadow-md transition-all duration-300"
          size="lg"
          variant="ghost"
        >
          <Users className="mr-3 h-6 w-6" /> {t('lobby.localHotseat')}
        </Button>
      </CardContent>
    </motion.div>
  );

  const renderOnlineMode = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <CardHeader className="relative space-y-2 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 left-0 rounded-full hover:bg-muted"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <CardTitle className="text-3xl text-center font-heading text-foreground pt-4">
          {t('lobby.online.title')}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          {t('lobby.online.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {effectiveLoading && state.hostId ? (
          <div className="space-y-6">
            <div className="bg-muted p-6 rounded-xl border border-border text-center space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('lobby.online.roomId')}</Label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold text-foreground tracking-wider">{state.roomId}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleCopyRoomId}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('lobby.online.shareId')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-muted-foreground">{t('lobby.online.players')} ({state.players.length}/5)</span>
                {state.players.length < 2 && (
                  <span className="text-xs text-amber-500 animate-pulse">{t('lobby.online.waitingForOpponent')}</span>
                )}
              </div>
              <div className="grid gap-2">
                {state.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--primary-foreground))] font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground">{p.name}</span>
                    {p.id === state.hostId && <span className="ml-auto text-xs bg-secondary/30 dark:bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full border border-secondary/40">{t('lobby.online.host')}</span>}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - state.players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-3 bg-muted p-3 rounded-lg border border-dashed border-border">
                    <div className="h-8 w-8 rounded-full bg-muted-foreground/20 animate-pulse" />
                    <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {state.hostId === myPlayerId && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartOnlineGame();
                }}
                className={`w-full h-14 text-lg font-bold shadow-lg transition-all duration-300 ${state.players.length >= 2
                    ? "bg-gradient-to-r from-[hsl(var(--secondary))] to-[hsl(var(--primary))] hover:from-[hsl(var(--primary))] hover:to-[hsl(var(--accent))] hover:shadow-xl transform hover:-translate-y-1"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                disabled={state.players.length < 2}
              >
                {state.players.length >= 2 ? (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" /> {t('lobby.online.startGame')}
                  </>
                ) : (
                  t('lobby.online.waitingForPlayers')
                )}
              </Button>
            )}
            {state.hostId !== myPlayerId && (
              <div className="text-center p-4 text-muted-foreground italic">
                {t('lobby.online.waitingForHost')}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="player-name" className="text-foreground font-medium">
                {t('lobby.online.yourName')}
              </Label>
              <Input
                id="player-name"
                placeholder={t('lobby.online.namePlaceholder')}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={effectiveLoading}
                className="h-12 text-lg bg-muted border-border focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCreateRoom}
                className="w-full h-12 text-base font-semibold bg-[hsl(var(--accent))] hover:bg-[hsl(var(--primary))] shadow-md hover:shadow-lg transition-all text-[hsl(var(--primary-foreground))]"
                disabled={effectiveLoading}
              >
                {effectiveLoading && !state.hostId ? t('lobby.online.creating') : t('lobby.online.createGame')}
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">{t('lobby.online.orJoinExisting')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-id" className="text-foreground font-medium">
                {t('lobby.online.roomId')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="room-id"
                  placeholder={t('lobby.online.roomIdPlaceholder')}
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  disabled={effectiveLoading}
                  className="h-12 text-lg font-mono bg-muted border-border focus:border-primary focus:ring-primary"
                />
                <Button
                  variant="secondary"
                  onClick={handleJoinRoom}
                  className="h-12 px-6 font-semibold"
                  disabled={effectiveLoading}
                >
                  {effectiveLoading && !state.hostId ? t('lobby.online.joining') : t('lobby.online.join')}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </motion.div>
  );

  const renderHotseatMode = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <CardHeader className="relative space-y-2 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 left-0 rounded-full hover:bg-muted"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <CardTitle className="text-3xl text-center font-heading text-foreground pt-4">
          {t('lobby.hotseat.title')}
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          {t('lobby.hotseat.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          {hotseatPlayers.map((name, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor={`player-${index}-name`} className="text-sm font-medium text-foreground">
                  {t('lobby.hotseat.playerLabel', { number: index + 1 })}
                </Label>
                {hotseatPlayers.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHotseatPlayer(index)}
                    className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    {t('lobby.hotseat.remove')}
                  </Button>
                )}
              </div>
              <Input
                id={`player-${index}-name`}
                placeholder={t('lobby.hotseat.playerPlaceholder', { number: index + 1 })}
                value={name}
                onChange={(e) => handleHotseatNameChange(index, e.target.value)}
                className="h-11 bg-muted border-border"
              />
            </div>
          ))}
        </div>

        {hotseatPlayers.length < 5 && (
          <Button
            variant="outline"
            onClick={handleAddHotseatPlayer}
            className="w-full border-dashed border-2 border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5"
          >
            {t('lobby.hotseat.addPlayer')}
          </Button>
        )}

        <Button
          onClick={handleStartHotseat}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[hsl(var(--secondary))] to-[hsl(var(--primary))] hover:from-[hsl(var(--primary))] hover:to-[hsl(var(--accent))] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 mt-4 text-[hsl(var(--primary-foreground))]"
          size="lg"
        >
          {t('lobby.hotseat.startGame')}
        </Button>
      </CardContent>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--background))] to-[hsl(var(--accent)/0.2)] relative overflow-hidden">
      <div className="absolute -left-10 top-12 w-48 h-48 rounded-full bg-[hsl(var(--primary)/0.18)] blur-3xl" />
      <div className="absolute right-0 bottom-6 w-56 h-56 rounded-full bg-[hsl(var(--secondary)/0.22)] blur-3xl" />
      <Card className="w-full max-w-md sm:max-w-lg bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--accent)/0.08)] backdrop-blur-xl shadow-2xl border border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--secondary))] via-[hsl(var(--primary))] to-[hsl(var(--accent))]" />
        <AnimatePresence mode="wait">
          {mode === "select" && renderSelectMode()}
          {mode === "online" && renderOnlineMode()}
          {mode === "hotseat" && renderHotseatMode()}
        </AnimatePresence>
      </Card>
    </div>
  );
};
