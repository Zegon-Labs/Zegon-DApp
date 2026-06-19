import { ethers } from "hardhat";

async function main() {
  const [operator] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("ZegonDuel");
  const contract = await Factory.deploy(operator.address);
  await contract.waitForDeployment();
  console.log("ZegonDuel deployed to:", await contract.getAddress());
  console.log("Operator:", operator.address);
}

main().catch(console.error);
