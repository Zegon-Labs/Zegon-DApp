import { useEffect, useState } from "react";
import { ExternalLink, Trophy, Wallet } from "lucide-react";
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
import { gameBridge } from "@/game/bridge";
import { useLocale } from "@/hooks/useLocale";
import {
  connectWallet,
  disconnectWallet,
  getWalletAddress,
  hasEthereumProvider,
  onWalletChange,
  truncateAddress,
} from "../services/wallet.js";
import { isTutorialDone } from "../tutorial/steps.js";

export function HubPage() {
  const { strings } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [walletHint, setWalletHint] = useState<string | null>(null);

  useEffect(() => onWalletChange(setWallet), []);

  async function handleConnect() {
    if (!hasEthereumProvider()) {
      setWalletHint(strings.walletNoProvider);
      return;
    }
    try {
      await connectWallet();
      setWalletHint(null);
    } catch {
      setWalletHint(strings.walletNoProvider);
    }
  }

  const tutorialLabel = isTutorialDone()
    ? `${strings.tutorial}  ${strings.tutorialDoneBadge}`
    : strings.tutorial;

  return (
    <PageShell>
      <div className="mb-4 flex items-start justify-end">
        <div className="flex flex-col items-end gap-1">
          {wallet ? (
            <Button variant="outline" size="sm" onClick={() => disconnectWallet()}>
              <Wallet className="size-3.5" />
              {truncateAddress(wallet)}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void handleConnect()}>
              <Wallet className="size-3.5" />
              {strings.connectWallet}
            </Button>
          )}
          <p className="max-w-[200px] text-right text-[11px] text-muted-foreground">
            {wallet ? strings.disconnectWallet : strings.walletOptional}
          </p>
          {walletHint && (
            <p className="text-right text-[11px] text-destructive">{walletHint}</p>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-accent/30 shadow-[0_0_60px_-20px_rgba(255,77,46,0.35)]">
        <CardHeader className="items-center bg-gradient-to-b from-accent/10 to-transparent pb-8 text-center">
          <Badge variant="outline" className="border-accent/40 font-mono text-[10px] uppercase tracking-[0.2em]">
            0G · Provably fair
          </Badge>
          <CardTitle className="font-mono text-5xl tracking-widest text-foreground">ZEGON</CardTitle>
          <CardDescription className="text-base text-accent">{strings.tagline}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          <Button
            variant="accent"
            size="lg"
            className="h-12 w-full font-mono text-base tracking-wide"
            onClick={() => gameBridge.startScene("TutorialScene")}
          >
            {tutorialLabel}
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-11 w-full font-mono"
            onClick={() => gameBridge.startScene("DuelScene", { mode: "standard" })}
          >
            {strings.duel}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="h-11 w-full font-mono"
            onClick={() => gameBridge.startScene("DuelScene", { mode: "daily" })}
          >
            {strings.daily}
          </Button>
          <Separator className="my-1 bg-border/60" />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="font-mono"
              onClick={() => gameBridge.navigate({ type: "leaderboard" })}
            >
              <Trophy className="size-4" />
              {strings.leaderboard}
            </Button>
            <Button
              variant="outline"
              className="font-mono"
              onClick={() => gameBridge.navigate({ type: "settings" })}
            >
              {strings.settings}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-2 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">{strings.hubFooter}</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => window.open("/verify.html", "_blank")}
          >
            {strings.hubVerifyLink}
            <ExternalLink className="size-3" />
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
