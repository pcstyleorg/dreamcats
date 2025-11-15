import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export const LobbyScreen: React.FC = () => {
  const { createRoom, joinRoom, state } = useGame();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setIsLoading(true);
    try {
        await createRoom(playerName);
    } catch (error) {
        toast.error("Could not create room. Is Supabase connected?");
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
    } catch (error: any) {
        toast.error(error.message || "Failed to join room.");
        setIsLoading(false);
    }
  };

  const effectiveLoading = isLoading || (state.roomId !== null && state.players.length < 2);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Sen: The Game</CardTitle>
          <CardDescription className="text-center">Join or Create a 2-Player Game</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="player-name">Your Name</Label>
            <Input
              id="player-name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={effectiveLoading}
            />
          </div>
          <div className="space-y-4">
            <Button onClick={handleCreateRoom} className="w-full" disabled={effectiveLoading}>
              {effectiveLoading && state.hostId ? 'Waiting for opponent...' : 'Create New Game'}
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or Join a Game
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-id">Room ID</Label>
            <Input
              id="room-id"
              placeholder="Enter Room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              disabled={effectiveLoading}
            />
          </div>
          <Button variant="secondary" onClick={handleJoinRoom} className="w-full" disabled={effectiveLoading}>
            {effectiveLoading && !state.hostId ? 'Joining...' : 'Join Game'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
