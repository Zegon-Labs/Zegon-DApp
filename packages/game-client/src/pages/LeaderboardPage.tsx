import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageShell } from "@/components/PageShell";
import { useLocale } from "@/hooks/useLocale";
import { format } from "../i18n/index.js";

interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: number;
}

interface LeaderboardPageProps {
  onBack: () => void;
}

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const { strings } = useLocale();
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily/leaderboard");
        if (!res.ok) throw new Error("offline");
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        const entries = data.entries.slice(0, 10);

        if (cancelled) return;

        if (entries.length === 0) {
          setLines([strings.leaderboardEmpty]);
          setOffline(false);
        } else {
          setLines(
            entries.map((e, i) =>
              format(strings.leaderboardRank, {
                rank: i + 1,
                id: `${e.playerId.slice(0, 6)}…${e.playerId.slice(-4)}`,
                score: e.score,
              }),
            ),
          );
          setOffline(false);
        }
      } catch {
        if (!cancelled) {
          setLines([strings.leaderboardEmpty, "", "(server offline)"]);
          setOffline(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [strings.leaderboardEmpty, strings.leaderboardRank]);

  return (
    <PageShell>
      <Button variant="ghost" size="sm" className="mb-4 w-fit" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {strings.back}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-2xl text-accent">{strings.leaderboardTitle}</CardTitle>
          <CardDescription>Daily challenge · top 10</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="font-mono text-sm">Loading…</span>
            </div>
          ) : (
            <ScrollArea className="h-[280px] rounded-md border border-border/60 bg-secondary/30 p-4">
              <div className="space-y-2 font-mono text-sm leading-relaxed">
                {lines.map((line, i) => (
                  <p
                    key={`${i}-${line}`}
                    className={line.startsWith("#") ? "text-foreground" : "text-muted-foreground"}
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
            </ScrollArea>
          )}
          {offline && (
            <p className="mt-3 text-xs text-muted-foreground">
              Play offline — scores sync when the API is available.
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
