import { ethers } from "hardhat";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const leaderboardFactory = await ethers.getContractFactory("ZegonLeaderboard");
  const leaderboard = await leaderboardFactory.deploy();
  await leaderboard.waitForDeployment();
  const leaderboardAddress = await leaderboard.getAddress();

  console.log("ZegonLeaderboard deployed to:", leaderboardAddress);

  const outDir = join(__dirname, "..", "deployments");
  const outPath = join(outDir, "galileo.json");
  mkdirSync(outDir, { recursive: true });

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(readFileSync(outPath, "utf-8")) as Record<string, unknown>;
  } catch {
    // fresh file
  }

  const deployInfo = {
    ...existing,
    leaderboardAddress,
    leaderboardDeployedAt: new Date().toISOString(),
  };

  writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log("Updated contracts/deployments/galileo.json");
  console.log("Set VITE_LEADERBOARD_CONTRACT_ADDRESS=", leaderboardAddress);
}

main().catch(console.error);
