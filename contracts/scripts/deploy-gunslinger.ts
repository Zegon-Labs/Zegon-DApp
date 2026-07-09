import { ethers } from "hardhat";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [operator] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("ZegonGunslinger");
  const contract = await factory.deploy(operator.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("ZegonGunslinger deployed to:", address);
  console.log("Operator:", operator.address);

  const outDir = join(__dirname, "..", "deployments");
  mkdirSync(outDir, { recursive: true });
  const galileoPath = join(outDir, "galileo.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(readFileSync(galileoPath, "utf-8")) as Record<string, unknown>;
  } catch {
    // fresh
  }

  const next = {
    ...existing,
    gunslingerAddress: address,
    gunslingerOperator: operator.address,
    gunslingerDeployedAt: new Date().toISOString(),
  };
  writeFileSync(galileoPath, JSON.stringify(next, null, 2));
  console.log("Updated contracts/deployments/galileo.json");
  console.log("Set ZEGON_GUNSLINGER_CONTRACT_ADDRESS=", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
