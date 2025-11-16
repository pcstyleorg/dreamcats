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

interface ScoreboardProps {
  players: Player[];
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players }) => {
  return (
    <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-lg p-3 sm:p-4 border border-purple-200/40">
      <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center font-heading flex items-center justify-center gap-2 text-gray-800">
        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
        Scoreboard
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="border-purple-200/30 hover:bg-transparent">
            <TableHead className="text-gray-700 font-semibold text-sm sm:text-base">
              Player
            </TableHead>
            <TableHead className="text-right text-gray-700 font-semibold text-sm sm:text-base">
              Score
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow
              key={player.id}
              className="border-purple-200/30 hover:bg-purple-100/30"
            >
              <TableCell className="font-medium text-gray-800 text-sm sm:text-base">
                {player.name}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold text-gray-800 text-sm sm:text-base">
                {player.score}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
