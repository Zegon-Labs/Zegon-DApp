import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import hre from "hardhat";

async function main() {
  const pk = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!pk) throw new Error("SERVER_WALLET_PRIVATE_KEY required");

  const wallet = new ethers.Wallet(pk);
  const operator = wallet.address;

  const ZegonGunslinger = await hre.ethers.getContractFactory("ZegonGunslinger");
  const contract = await ZegonGunslinger.deploy(operator);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  const deploymentPath = resolve(import.meta.dirname, "../deployments/galileo.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(readFileSync(deploymentPath, "utf-8")) as Record<string, unknown>;
  } catch {
    // fresh
  }

  const next = {
    ...existing,
    gunslingerAddress: address,
    gunslingerOperator: operator,
    gunslingerDeployedAt: new Date().toISOString(),
  };
  writeFileSync(deploymentPath, JSON.stringify(next, null, 2));

  console.log("ZegonGunslinger deployed:", address);
  console.log("Operator:", operator);
  console.log("Set ZEGON_GUNSLINGER_CONTRACT_ADDRESS=", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
