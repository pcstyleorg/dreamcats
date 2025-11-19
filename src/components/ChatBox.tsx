import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MessagesSquare, Send } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export const ChatBox = () => {
  const { t } = useTranslation();
  const { state, sendChatMessage, myPlayerId } = useGame();
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [state.chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h4 className="font-semibold mb-2 font-heading text-center flex items-center justify-center gap-2">
        <MessagesSquare className="w-5 h-5" />
        {t('game.chat')}
      </h4>
      <ScrollArea className="flex-grow h-48 rounded-md border p-2 mb-2 bg-black/10" ref={scrollAreaRef}>
        {state.chatMessages.map((msg) => (
          <div key={msg.id} className={cn("mb-2 text-sm", msg.senderId === myPlayerId ? "text-right" : "text-left")}>
            <div className={cn(
                "inline-block p-2 rounded-lg max-w-[80%]",
                msg.senderId === myPlayerId ? "bg-primary/80 text-primary-foreground" : "bg-secondary"
            )}>
              <p className="font-bold text-xs">{msg.senderName}</p>
              <p className="break-words">{msg.message}</p>
            </div>
          </div>
        ))}
         {state.chatMessages.length === 0 && <p className="text-center text-muted-foreground text-sm p-4">{t('game.noMessagesYet')}</p>}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder={t('game.chatPlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoComplete="off"
        />
        <Button type="submit" size="icon">
          <Send />
        </Button>
      </form>
    </div>
  );
};
