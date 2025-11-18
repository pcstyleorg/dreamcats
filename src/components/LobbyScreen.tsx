import React, { useState, useEffect } from "react";
import { useGame } from "@/context/GameContext";
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

export const LobbyScreen: React.FC = () => {
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
        toast.success("Room ID copied to clipboard!");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback or ignore if permission denied
      });
    }
  }, [state.roomId, state.gameMode, state.hostId, myPlayerId, state.gamePhase]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setIsLoading(true);
    try {
      await createRoom(playerName);
    } catch {
      toast.error("Could not create room. Please check your connection.");
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!roomIdInput.trim()) {
      toast.error("Please enter a Room ID.");
      return;
    }
    setIsLoading(true);
    try {
      await joinRoom(roomIdInput.trim(), playerName);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to join room.";
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleStartHotseat = () => {
    if (hotseatPlayers.some((name) => !name.trim())) {
      toast.error("Please enter names for all players.");
      return;
    }
    startHotseatGame(hotseatPlayers);
  };

  const handleAddHotseatPlayer = () => {
    if (hotseatPlayers.length < 4) {
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
      toast.error("Need at least 2 players to start.");
      return;
    }
    setIsLoading(true);
    try {
      await startGame();
    } catch {
      toast.error("Failed to start game.");
      setIsLoading(false);
    }
  };

  const handleCopyRoomId = () => {
    if (state.roomId) {
      navigator.clipboard.writeText(state.roomId);
      setCopied(true);
      toast.success("Room ID copied!");
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
        <CardTitle className="text-5xl sm:text-6xl md:text-7xl text-center font-heading bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
          Sen
        </CardTitle>
        <CardDescription className="text-center text-base sm:text-lg font-medium text-slate-600">
          A game of dreams and crows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => setMode("online")}
          className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          size="lg"
        >
          <Cloud className="mr-3 h-6 w-6" /> Online Multiplayer
        </Button>
        <Button
          onClick={() => setMode("hotseat")}
          className="w-full h-16 text-lg font-semibold bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300"
          size="lg"
          variant="ghost"
        >
          <Users className="mr-3 h-6 w-6" /> Local Hot-Seat
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
          className="absolute top-0 left-0 rounded-full hover:bg-slate-100"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <CardTitle className="text-3xl text-center font-heading text-slate-800 pt-4">
          Online Multiplayer
        </CardTitle>
        <CardDescription className="text-center text-slate-500">
          Join or Create a 2-Player Game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {effectiveLoading && state.hostId ? (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Room ID</Label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold text-slate-800 tracking-wider">{state.roomId}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                    onClick={handleCopyRoomId}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">Share this ID with your friend</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-slate-600">Players ({state.players.length}/4)</span>
                {state.players.length < 2 && (
                  <span className="text-xs text-amber-500 animate-pulse">Waiting for opponent...</span>
                )}
              </div>
              <div className="grid gap-2">
                {state.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700">{p.name}</span>
                    {p.id === state.hostId && <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">HOST</span>}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - state.players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                    <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
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
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl transform hover:-translate-y-1"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                disabled={state.players.length < 2}
              >
                {state.players.length >= 2 ? (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" /> Start Game
                  </>
                ) : (
                  "Waiting for Players..."
                )}
              </Button>
            )}
            {state.hostId !== myPlayerId && (
              <div className="text-center p-4 text-slate-500 italic">
                Waiting for host to start...
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="player-name" className="text-slate-600 font-medium">
                Your Name
              </Label>
              <Input
                id="player-name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={effectiveLoading}
                className="h-12 text-lg bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCreateRoom}
                className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                disabled={effectiveLoading}
              >
                {effectiveLoading && !state.hostId ? "Creating..." : "Create New Game"}
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or Join Existing</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-id" className="text-slate-600 font-medium">
                Room ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="room-id"
                  placeholder="Enter Room ID"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  disabled={effectiveLoading}
                  className="h-12 text-lg font-mono bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <Button
                  variant="secondary"
                  onClick={handleJoinRoom}
                  className="h-12 px-6 font-semibold"
                  disabled={effectiveLoading}
                >
                  {effectiveLoading && !state.hostId ? "..." : "Join"}
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
          className="absolute top-0 left-0 rounded-full hover:bg-slate-100"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <CardTitle className="text-3xl text-center font-heading text-slate-800 pt-4">
          Local Hot-Seat
        </CardTitle>
        <CardDescription className="text-center text-slate-500">
          Play on one device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          {hotseatPlayers.map((name, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor={`player-${index}-name`} className="text-sm font-medium text-slate-600">
                  Player {index + 1}
                </Label>
                {hotseatPlayers.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHotseatPlayer(index)}
                    className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Input
                id={`player-${index}-name`}
                placeholder={`Enter Player ${index + 1}'s name`}
                value={name}
                onChange={(e) => handleHotseatNameChange(index, e.target.value)}
                className="h-11 bg-slate-50 border-slate-200"
              />
            </div>
          ))}
        </div>

        {hotseatPlayers.length < 4 && (
          <Button
            variant="outline"
            onClick={handleAddHotseatPlayer}
            className="w-full border-dashed border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
          >
            + Add Player
          </Button>
        )}

        <Button
          onClick={handleStartHotseat}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 mt-4"
          size="lg"
        >
          Start Game
        </Button>
      </CardContent>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-purple-100">
      <Card className="w-full max-w-md sm:max-w-lg bg-white/80 backdrop-blur-xl shadow-2xl border-0 ring-1 ring-white/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <AnimatePresence mode="wait">
          {mode === "select" && renderSelectMode()}
          {mode === "online" && renderOnlineMode()}
          {mode === "hotseat" && renderHotseatMode()}
        </AnimatePresence>
      </Card>
    </div>
  );
};
