import { ethers } from "hardhat";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [operator] = await ethers.getSigners();
  const poolFactory = await ethers.getContractFactory("ZegonDailyPool");
  const pool = await poolFactory.deploy(operator.address);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  console.log("ZegonDailyPool deployed to:", poolAddress);
  console.log("Operator:", operator.address);
  console.log("Explorer:", `https://chainscan-galileo.0g.ai/address/${poolAddress}`);

  const outDir = join(__dirname, "..", "deployments");
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "galileo.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    /* fresh */
  }
  writeFileSync(
    path,
    JSON.stringify(
      {
        ...existing,
        poolAddress,
        poolDeployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("Updated contracts/deployments/galileo.json");
  console.log("Set ZEGON_DAILY_POOL_ADDRESS=", poolAddress);
}

main().catch(console.error);
