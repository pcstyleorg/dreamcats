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
import { useTranslation } from "react-i18next";

interface ScoreboardProps {
  players: Player[];
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players }) => {
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
          {players.map((player) => (
            <TableRow
              key={player.id}
              className="border-border/50 hover:bg-primary/5"
            >
              <TableCell className="font-medium text-foreground text-sm sm:text-base">
                {player.name}
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
