import React, { useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ProfileStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileStatsDialog: React.FC<ProfileStatsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation("common");
  const { isAuthenticated } = useConvexAuth();

  const overview = useQuery(
    api.stats.getMyOverview,
    isAuthenticated && open ? {} : "skip",
  );

  const derived = useMemo(() => {
    const stats = overview?.stats;
    const gamesPlayed = stats?.gamesPlayed ?? 0;
    const gamesWon = stats?.gamesWon ?? 0;
    const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
    const avgScore =
      gamesPlayed > 0 ? Math.round((stats?.totalScore ?? 0) / gamesPlayed) : 0;
    const bestScore = stats?.bestScore ?? null;
    return { gamesPlayed, gamesWon, winRate, avgScore, bestScore };
  }, [overview?.stats]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("auth.statsTitle")}</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("auth.statsRequiresSignIn")}
            </p>
            <Button onClick={() => onOpenChange(false)}>{t("auth.close")}</Button>
          </div>
        ) : overview === undefined ? (
          <div className="text-sm text-muted-foreground">{t("auth.loadingStats")}</div>
        ) : overview === null ? (
          <div className="text-sm text-muted-foreground">{t("auth.loadingStats")}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("auth.gamesPlayed")}</div>
                <div className="text-lg font-semibold">{derived.gamesPlayed}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("auth.gamesWon")}</div>
                <div className="text-lg font-semibold">{derived.gamesWon}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("auth.winRate")}</div>
                <div className="text-lg font-semibold">{derived.winRate}%</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("auth.avgScore")}</div>
                <div className="text-lg font-semibold">{derived.avgScore}</div>
              </div>
              <div className="rounded-md border p-3 col-span-2">
                <div className="text-xs text-muted-foreground">{t("auth.bestScore")}</div>
                <div className="text-lg font-semibold">
                  {derived.bestScore === null ? "—" : derived.bestScore}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{t("auth.recentMatches")}</div>
              </div>
              {overview.matches.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t("auth.noMatchesYet")}
                </div>
              ) : (
                <div className="max-h-64 overflow-auto rounded-md border">
                  <div className="divide-y">
                    {overview.matches.map((m) => (
                      <div
                        key={m.matchId}
                        className="p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {t("auth.matchRow", {
                              place: m.yourPlace,
                              score: m.yourScore,
                              total: m.playerCount,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t("auth.matchMeta", {
                              roomId: m.roomId,
                              mode: m.mode,
                              winner: m.winnerName,
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(m.endedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("auth.close")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
