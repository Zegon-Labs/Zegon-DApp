import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Home } from "lucide-react";
import type { DuelResult } from "@zegon/game-core";
import { createDailyDuel } from "@zegon/game-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import { useLocale } from "@/hooks/useLocale";
import { format } from "../i18n/index.js";
import { getWalletAddress } from "../services/wallet.js";
import { cn } from "@/lib/utils";

interface VerifyRound {
  roundIndex: number;
  commitHash: string;
  commitBeforePlayer: boolean;
}

interface VerifyResponse {
  duelId: string;
  verified: boolean;
  contractAddress?: string;
  rounds: VerifyRound[];
}

interface ResultPageProps {
  result: DuelResult;
  duelId?: string | null;
  apiBaseUrl?: string;
  mode?: "standard" | "daily";
  onMenu: () => void;
}

export function ResultPage({
  result,
  duelId,
  apiBaseUrl = "",
  mode = "standard",
  onMenu,
}: ResultPageProps) {
  const { strings } = useLocale();
  const [verifyText, setVerifyText] = useState("");
  const [dailyText, setDailyText] = useState("");
  const [copied, setCopied] = useState(false);

  const winnerLabel =
    result.winner === "PLAYER"
      ? strings.youWin
      : result.winner === "ZEGON"
        ? strings.zegonWins
        : strings.draw;

  const winnerColor =
    result.winner === "PLAYER"
      ? "text-primary"
      : result.winner === "ZEGON"
        ? "text-accent"
        : "text-muted-foreground";

  useEffect(() => {
    if (mode !== "daily") return;

    const address = getWalletAddress();
    if (!address) {
      setDailyText(strings.scoreSubmitNoWallet);
      return;
    }

    const daily = createDailyDuel();
    void fetch("/api/daily/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: address,
        score: result.score,
        seed: daily.seed,
      }),
    })
      .then((res) => {
        if (res.ok) setDailyText(strings.scoreSubmitted);
      })
      .catch(() => setDailyText(strings.leaderboardEmpty));
  }, [mode, result.score, strings]);

  useEffect(() => {
    if (!duelId) return;
    const url = `${apiBaseUrl}/api/duel/verify/${duelId}`;

    void fetch(url)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as VerifyResponse;
        const proofCount = data.rounds.filter((r) => r.commitBeforePlayer).length;
        const status = data.verified ? strings.verifyOk : strings.verifyPending;
        setVerifyText(
          `${status}\n${strings.verifyRounds}: ${proofCount}/${data.rounds.length}` +
            (data.contractAddress ? `\n${data.contractAddress.slice(0, 10)}…` : ""),
        );
      })
      .catch(() => setVerifyText(strings.verifyPending));
  }, [apiBaseUrl, duelId, strings]);

  function handleShare() {
    const text = format(strings.shareText, {
      score: result.score,
      timesRead: result.timesRead,
    });
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageShell>
      <Card className="border-accent/30 shadow-[0_0_40px_-20px_rgba(255,77,46,0.25)]">
        <CardHeader className="text-center">
          <Badge variant="outline" className="mx-auto w-fit font-mono text-[10px] uppercase">
            {mode === "daily" ? "Daily duel" : "Duel complete"}
          </Badge>
          <CardTitle className={cn("font-mono text-4xl tracking-wide", winnerColor)}>
            {winnerLabel}
          </CardTitle>
          <CardDescription className="font-mono text-base text-foreground/80">
            {strings.score}: {result.score}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-secondary/30 p-4 font-mono text-sm">
            <Stat label={strings.rounds} value={String(result.roundsPlayed)} />
            <Stat label={strings.timesRead} value={String(result.timesRead)} />
            <Stat label={strings.finalBlindsight} value={`${result.finalBlindsight}%`} />
            <Stat label={strings.score} value={String(result.score)} highlight />
          </div>

          {verifyText && (
            <p className="whitespace-pre-line text-center text-xs text-primary">{verifyText}</p>
          )}
          {dailyText && (
            <p className="text-center text-xs text-muted-foreground">{dailyText}</p>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button
            variant="outline"
            className="w-full font-mono"
            onClick={() => {
              if (duelId) {
                window.open(`/verify.html?duel=${encodeURIComponent(duelId)}`, "_blank");
              } else {
                setVerifyText(strings.verifyOffline);
              }
            }}
          >
            <ExternalLink className="size-4" />
            {strings.verifyOnChain}
          </Button>
          <Button variant="secondary" className="w-full font-mono" onClick={handleShare}>
            {copied ? <CheckCircle2 className="size-4 text-primary" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : strings.share}
          </Button>
          <Separator className="my-1" />
          <Button variant="default" className="w-full font-mono" onClick={onMenu}>
            <Home className="size-4" />
            {strings.menu}
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("text-lg", highlight && "text-primary")}>{value}</span>
    </div>
  );
}
