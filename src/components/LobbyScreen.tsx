import React, { useState } from "react";
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
import { ArrowLeft, Users, Cloud } from "lucide-react";

export const LobbyScreen: React.FC = () => {
  const { createRoom, joinRoom, startHotseatGame, state } = useGame();
  const [mode, setMode] = useState<"select" | "online" | "hotseat">("select");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    if (!player1Name.trim() || !player2Name.trim()) {
      toast.error("Please enter names for both players.");
      return;
    }
    startHotseatGame(player1Name, player2Name);
  };

  const effectiveLoading =
    isLoading ||
    (state.gameMode === "online" &&
      state.roomId !== null &&
      state.players.length < 2);

  const renderSelectMode = () => (
    <>
      <CardHeader className="space-y-2 sm:space-y-3">
        <CardTitle className="text-4xl sm:text-5xl md:text-6xl text-center font-heading bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Sen
        </CardTitle>
        <CardDescription className="text-center text-sm sm:text-base">
          A game of dreams and crows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <Button
          onClick={() => setMode("online")}
          className="w-full min-h-[52px] sm:min-h-[56px] text-base sm:text-lg"
          size="lg"
        >
          <Cloud className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> Online Multiplayer
        </Button>
        <Button
          onClick={() => setMode("hotseat")}
          className="w-full min-h-[52px] sm:min-h-[56px] text-base sm:text-lg"
          size="lg"
          variant="secondary"
        >
          <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> Local Hot-Seat
        </Button>
      </CardContent>
    </>
  );

  const renderOnlineMode = () => (
    <>
      <CardHeader className="space-y-2 sm:space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 min-h-[40px]"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />{" "}
          <span className="hidden sm:inline">Back</span>
        </Button>
        <CardTitle className="text-2xl sm:text-3xl md:text-4xl text-center font-heading pt-10 sm:pt-8">
          Online Multiplayer
        </CardTitle>
        <CardDescription className="text-center text-sm sm:text-base">
          Join or Create a 2-Player Game
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="player-name" className="text-sm sm:text-base">
            Your Name
          </Label>
          <Input
            id="player-name"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={effectiveLoading}
            className="min-h-[44px] text-base"
          />
        </div>
        <Button
          onClick={handleCreateRoom}
          className="w-full min-h-[48px] sm:min-h-[52px] text-base"
          disabled={effectiveLoading}
        >
          {effectiveLoading && state.hostId
            ? "Waiting for opponent..."
            : "Create New Game"}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="room-id" className="text-sm sm:text-base">
            Room ID
          </Label>
          <Input
            id="room-id"
            placeholder="Enter Room ID"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            disabled={effectiveLoading}
            className="min-h-[44px] text-base"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleJoinRoom}
          className="w-full min-h-[48px] sm:min-h-[52px] text-base"
          disabled={effectiveLoading}
        >
          {effectiveLoading && !state.hostId ? "Joining..." : "Join Game"}
        </Button>
      </CardContent>
    </>
  );

  const renderHotseatMode = () => (
    <>
      <CardHeader className="space-y-2 sm:space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 left-3 sm:top-4 sm:left-4 min-h-[40px]"
          onClick={() => setMode("select")}
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />{" "}
          <span className="hidden sm:inline">Back</span>
        </Button>
        <CardTitle className="text-2xl sm:text-3xl md:text-4xl text-center font-heading pt-10 sm:pt-8">
          Local Hot-Seat
        </CardTitle>
        <CardDescription className="text-center text-sm sm:text-base">
          Two players, one device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="player1-name" className="text-sm sm:text-base">
            Player 1 Name
          </Label>
          <Input
            id="player1-name"
            placeholder="Enter Player 1's name"
            value={player1Name}
            onChange={(e) => setPlayer1Name(e.target.value)}
            className="min-h-[44px] text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="player2-name" className="text-sm sm:text-base">
            Player 2 Name
          </Label>
          <Input
            id="player2-name"
            placeholder="Enter Player 2's name"
            value={player2Name}
            onChange={(e) => setPlayer2Name(e.target.value)}
            className="min-h-[44px] text-base"
          />
        </div>
        <Button
          onClick={handleStartHotseat}
          className="w-full min-h-[52px] sm:min-h-[56px] text-base sm:text-lg !mt-6 sm:!mt-8"
          size="lg"
        >
          Start Game
        </Button>
      </CardContent>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
      <Card className="w-full max-w-md sm:max-w-lg bg-white/90 backdrop-blur-sm shadow-soft-lg relative border-2 border-purple-100/50">
        {mode === "select" && renderSelectMode()}
        {mode === "online" && renderOnlineMode()}
        {mode === "hotseat" && renderHotseatMode()}
      </Card>
    </div>
  );
};
