import React from "react";
import { Button } from "./ui/button";
import { Copy, Cloud, Users, Menu } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Scoreboard } from "./Scoreboard";
import { Separator } from "./ui/separator";
import { ChatBox } from "./ChatBox";
import { ScrollText } from "lucide-react";
import {
  useCurrentPlayer,
  useIsMyTurn,
  useActionMessage,
  useRoomId,
  useGameMode,
  usePlayersView,
} from "@/state/hooks";

interface GameHUDProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

/**
 * Consolidated game HUD component.
 * - Mobile: Compact pill with turn indicator, room info tray accessible via menu
 * - Desktop: Full top bar with all info + sidebar
 */
export const GameHUD: React.FC<GameHUDProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const currentPlayer = useCurrentPlayer();
  const isMyTurn = useIsMyTurn();
  const actionMessage = useActionMessage();
  const roomId = useRoomId();
  const gameMode = useGameMode();
  const players = usePlayersView();

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success(t("common:success.roomIdCopied"));
    }
  };

  const SidePanelContent = () => (
    <>
      <div className="my-4 p-4 bg-accent/40 backdrop-blur-sm rounded-lg min-h-[60px] border border-border/30">
        <h4 className="font-semibold mb-2 font-heading flex items-center gap-2 text-foreground">
          <ScrollText className="w-4 h-4 text-primary" />
          {t("game.actionLog")}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {actionMessage}
        </p>
      </div>

      <Separator className="my-4 bg-border/50" />
      <div data-tutorial-id="scoreboard">
        <Scoreboard players={players} />
      </div>
      {gameMode === "online" && (
        <>
          <Separator className="my-4 bg-border/50" />
          <div className="h-64">
            <ChatBox />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-3 md:px-4 py-3 sm:py-4 sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/40">
        {/* Left: Turn indicator and action message */}
        <div className="flex items-center gap-3 bg-card/70 border border-border/60 px-4 py-3 rounded-2xl shadow-soft backdrop-blur-lg">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--primary-foreground))] font-heading text-lg shadow-soft">
            {currentPlayer?.name?.charAt(0) ?? "S"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {isMyTurn
                ? t("game.yourTurn")
                : t("game.playerTurn", { player: currentPlayer?.name ?? "" })}
            </span>
            <span className="text-sm sm:text-base text-foreground font-semibold">
              {actionMessage}
            </span>
          </div>
        </div>

        {/* Right: Room info and controls */}
        <div className="flex items-center gap-2">
          {/* Room ID pill - visible on mobile for online games */}
          {gameMode === "online" && roomId && (
            <div className="flex items-center gap-2 bg-card/70 px-3 py-2 rounded-xl border border-border/60 shadow-soft lg:hidden">
              <Cloud className="w-4 h-4 text-secondary" />
              <span className="font-mono text-sm text-foreground">{roomId}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyRoomId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* Game mode indicator for hotseat */}
          {gameMode === "hotseat" && (
            <div className="flex items-center gap-2 bg-card/70 px-3 py-2 rounded-xl border border-border/60 shadow-soft lg:hidden">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-sm text-foreground">{t("game.localGame")}</span>
            </div>
          )}
          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </div>

      {/* Mobile menu button - absolute positioned */}
      <div className="lg:hidden absolute top-2 right-2 z-20 flex gap-2">
        <div className="sm:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-border/60 bg-card/80 backdrop-blur-sm shadow-soft hover:scale-105 transition-transform"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card/95 backdrop-blur-lg border-border/40">
            <SheetHeader>
              <SheetTitle className="font-heading text-2xl">
                {t("game.gameMenu")}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-4rem)] pr-4">
              <SidePanelContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-full lg:w-80 lg:max-w-xs flex-shrink-0 bg-card/95 backdrop-blur-lg p-5 rounded-xl border border-border/40 shadow-soft-lg flex-col relative z-10">
        <h2 className="text-3xl font-bold mb-3 text-center font-heading text-foreground">
          Sen
        </h2>
        {gameMode === "online" && roomId && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
            <Cloud className="w-4 h-4" />
            <span>{roomId}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={copyRoomId}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
        {gameMode === "hotseat" && (
          <div className="flex items-center justify-center gap-2 mb-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t("game.localGame")}</span>
          </div>
        )}
        <Separator />
        <SidePanelContent />
      </aside>
    </>
  );
};
