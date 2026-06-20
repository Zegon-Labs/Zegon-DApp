import { useEffect, useState } from "react";
import { fetchHealth, type HealthStatus } from "../services/health.js";

interface HackathonStatusBarProps {
  commitTxHash?: string | null;
  brainMode?: "tee" | "dummy";
}

export function HackathonStatusBar({
  commitTxHash,
  brainMode: brainOverride,
}: HackathonStatusBarProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    void fetchHealth().then(setHealth);
  }, []);

  const brain = brainOverride ?? health?.brainMode ?? "dummy";
  const teeOk = brain === "tee";
  const chainOk = health?.contractConfigured ?? false;
  const storageOk = health?.storageConfigured ?? false;

  return (
    <div className="hackathon-bar" role="status" aria-label="0G integration status">
      <span className={`hackathon-bar__pill ${teeOk ? "hackathon-bar__pill--ok" : ""}`}>
        {teeOk ? "0G TEE ✓" : "Dummy Brain"}
      </span>
      <span className={`hackathon-bar__pill ${chainOk ? "hackathon-bar__pill--ok" : ""}`}>
        Galileo {chainOk ? "✓" : "—"}
      </span>
      {commitTxHash ? (
        <a
          className="hackathon-bar__pill hackathon-bar__pill--link"
          href={`https://chainscan-galileo.0g.ai/tx/${commitTxHash}`}
          target="_blank"
          rel="noreferrer"
        >
          Commit tx ✓
        </a>
      ) : (
        <span className="hackathon-bar__pill">Commit —</span>
      )}
      <span className={`hackathon-bar__pill ${storageOk ? "hackathon-bar__pill--ok" : ""}`}>
        Storage {storageOk ? "✓" : "—"}
      </span>
    </div>
  );
}
