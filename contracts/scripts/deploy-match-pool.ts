import { ethers } from "hardhat";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [operator] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("ZegonMatchPool");
  const pool = await factory.deploy(operator.address);
  await pool.waitForDeployment();
  const matchPoolAddress = await pool.getAddress();

  console.log("ZegonMatchPool deployed to:", matchPoolAddress);
  console.log("Operator:", operator.address);

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
        matchPoolAddress,
        matchPoolDeployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("Set ZEGON_MATCH_POOL_ADDRESS=", matchPoolAddress);
}

main().catch(console.error);
