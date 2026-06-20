import { ethers } from "hardhat";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [operator] = await ethers.getSigners();

  const duelFactory = await ethers.getContractFactory("ZegonDuel");
  const duel = await duelFactory.deploy(operator.address);
  await duel.waitForDeployment();
  const duelAddress = await duel.getAddress();

  const poolFactory = await ethers.getContractFactory("ZegonDailyPool");
  const pool = await poolFactory.deploy(operator.address);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  console.log("ZegonDuel deployed to:", duelAddress);
  console.log("ZegonDailyPool deployed to:", poolAddress);
  console.log("Operator:", operator.address);

  const deployInfo = {
    duelAddress,
    poolAddress,
    operator: operator.address,
    network: "galileo",
    chainId: 16602,
    deployedAt: new Date().toISOString(),
  };

  const outDir = join(__dirname, "..", "deployments");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "galileo.json"), JSON.stringify(deployInfo, null, 2));
  console.log("Saved contracts/deployments/galileo.json");
  console.log("Set ZEGON_DUEL_CONTRACT_ADDRESS=", duelAddress);
  console.log("Set ZEGON_DAILY_POOL_ADDRESS=", poolAddress);
}

main().catch(console.error);
