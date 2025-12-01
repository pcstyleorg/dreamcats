import React from "react";
import { Player } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type SeatPosition = "bottom" | "top" | "left" | "right" | "bench";

export interface ScoreboardEntry {
  player: Player;
  seat?: SeatPosition;
  isLocal?: boolean;
  isActive?: boolean;
}

interface ScoreboardProps {
  entries: ScoreboardEntry[];
}

const seatLabelMap: Record<SeatPosition, string> = {
  bottom: "You",
  top: "Top",
  left: "Left",
  right: "Right",
  bench: "Seat",
};

export const Scoreboard: React.FC<ScoreboardProps> = ({ entries }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 rounded-lg p-3 sm:p-4 border border-border/50 shadow-soft">
      <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center font-heading flex items-center justify-center gap-2 text-foreground">
        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
        {t('game.scoreboard')}
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-foreground font-semibold text-sm sm:text-base">
              {t('game.player')}
            </TableHead>
            <TableHead className="text-right text-foreground font-semibold text-sm sm:text-base">
              {t('game.score')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(({ player, seat, isLocal, isActive }) => (
            <TableRow
              key={player.id}
              className={cn(
                "border-border/50 hover:bg-primary/5 transition-colors",
                isActive && "bg-primary/10 border-primary/50 shadow-[0_0_0_1px_rgba(94,92,255,0.28)]"
              )}
            >
              <TableCell className="font-medium text-foreground text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  {seat && (
                    <span
                      className={cn(
                        "text-[0.65rem] uppercase tracking-[0.15em] px-2 py-1 rounded-full border",
                        isLocal
                          ? "bg-primary/20 border-primary/50 text-primary-foreground"
                          : "bg-muted/30 border-border/60 text-muted-foreground"
                      )}
                    >
                      {seatLabelMap[seat]}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span>{player.name}</span>
                    {isLocal && (
                      <span className="text-xs text-muted-foreground">
                        ({t('game.you')})
                      </span>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-foreground text-sm sm:text-base">
                {player.score}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
