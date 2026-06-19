import { ethers } from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [operator] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("ZegonDuel");
  const contract = await Factory.deploy(operator.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("ZegonDuel deployed to:", address);
  console.log("Operator:", operator.address);
  console.log("Explorer:", `https://chainscan-galileo.0g.ai/address/${address}`);

  const deployInfo = {
    address,
    operator: operator.address,
    network: "galileo",
    chainId: 16602,
    deployedAt: new Date().toISOString(),
  };

  try {
    const outDir = join(__dirname, "..", "deployments");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "galileo.json"),
      JSON.stringify(deployInfo, null, 2),
    );
    console.log("Saved deployment info to contracts/deployments/galileo.json");
  } catch {
    console.log("Set ZEGON_DUEL_CONTRACT_ADDRESS=", address);
  }
}

main().catch(console.error);
