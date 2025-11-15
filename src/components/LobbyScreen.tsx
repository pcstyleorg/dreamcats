import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Users, Cloud } from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { createRoom, joinRoom, startHotseatGame, state } = useGame();
  const [mode, setMode] = useState<'select' | 'online' | 'hotseat'>('select');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
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

  const handleStartHotseat = () => {
    if (!player1Name.trim() || !player2Name.trim()) {
        toast.error("Please enter names for both players.");
        return;
    }
    startHotseatGame(player1Name, player2Name);
  }

  const effectiveLoading = isLoading || (state.gameMode === 'online' && state.roomId !== null && state.players.length < 2);

  const renderSelectMode = () => (
    <>
      <CardHeader>
        <CardTitle className="text-5xl text-center font-heading">Sen</CardTitle>
        <CardDescription className="text-center">A game of dreams and crows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => setMode('online')} className="w-full" size="lg">
            <Cloud className="mr-2 h-5 w-5" /> Online Multiplayer
        </Button>
        <Button onClick={() => setMode('hotseat')} className="w-full" size="lg" variant="secondary">
            <Users className="mr-2 h-5 w-5" /> Local Hot-Seat
        </Button>
      </CardContent>
    </>
  );

  const renderOnlineMode = () => (
    <>
      <CardHeader>
        <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setMode('select')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <CardTitle className="text-3xl text-center font-heading pt-8">Online Multiplayer</CardTitle>
        <CardDescription className="text-center">Join or Create a 2-Player Game</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="player-name">Your Name</Label>
            <Input id="player-name" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} disabled={effectiveLoading} />
        </div>
        <Button onClick={handleCreateRoom} className="w-full" disabled={effectiveLoading}>
            {effectiveLoading && state.hostId ? 'Waiting for opponent...' : 'Create New Game'}
        </Button>
        <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div></div>
        <div className="space-y-2">
            <Label htmlFor="room-id">Room ID</Label>
            <Input id="room-id" placeholder="Enter Room ID" value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value)} disabled={effectiveLoading} />
        </div>
        <Button variant="secondary" onClick={handleJoinRoom} className="w-full" disabled={effectiveLoading}>
            {effectiveLoading && !state.hostId ? 'Joining...' : 'Join Game'}
        </Button>
      </CardContent>
    </>
  );

  const renderHotseatMode = () => (
     <>
      <CardHeader>
        <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setMode('select')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <CardTitle className="text-3xl text-center font-heading pt-8">Local Hot-Seat</CardTitle>
        <CardDescription className="text-center">Two players, one device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="player1-name">Player 1 Name</Label>
            <Input id="player1-name" placeholder="Enter Player 1's name" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="player2-name">Player 2 Name</Label>
            <Input id="player2-name" placeholder="Enter Player 2's name" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} />
        </div>
        <Button onClick={handleStartHotseat} className="w-full !mt-8" size="lg">
            Start Game
        </Button>
      </CardContent>
    </>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-sm shadow-soft-lg relative">
        {mode === 'select' && renderSelectMode()}
        {mode === 'online' && renderOnlineMode()}
        {mode === 'hotseat' && renderHotseatMode()}
      </Card>
    </div>
  );
};
