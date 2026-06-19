import { ethers } from "hardhat";
import { randomBytes } from "node:crypto";

async function main() {
  const address = process.env.ZEGON_DUEL_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("ZEGON_DUEL_CONTRACT_ADDRESS not set");
  }

  const [operator] = await ethers.getSigners();
  const contract = await ethers.getContractAt("ZegonDuel", address, operator);

  const duelId = BigInt(`0x${randomBytes(8).toString("hex")}`);
  const roundId = 0n;
  const move = 0;
  const saltBytes = randomBytes(32);
  const salt = `0x${saltBytes.toString("hex")}`;
  const commit = ethers.solidityPackedKeccak256(
    ["uint8", "bytes32"],
    [move, salt],
  );

  console.log("Smoke test ZegonDuel on Galileo");
  console.log("Contract:", address);
  console.log("Operator:", operator.address);
  console.log("DuelId:", duelId.toString());

  const commitTx = await contract.commitMove(duelId, roundId, commit);
  const commitReceipt = await commitTx.wait();
  console.log("commitMove OK:", commitReceipt?.hash);

  const roundBefore = await contract.getRound(duelId, roundId);
  if (roundBefore.commit !== commit) {
    throw new Error("Commit mismatch on-chain");
  }

  const revealTx = await contract.revealMove(duelId, roundId, move, salt);
  const revealReceipt = await revealTx.wait();
  console.log("revealMove OK:", revealReceipt?.hash);

  const roundAfter = await contract.getRound(duelId, roundId);
  if (!roundAfter.revealed || Number(roundAfter.zegonMove) !== move) {
    throw new Error("Reveal state mismatch");
  }

  try {
    await contract.revealMove(duelId, roundId, 1, ethers.id("wrong"));
    throw new Error("Expected invalid reveal to revert");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Invalid reveal") && !msg.includes("Already revealed")) {
      throw err;
    }
    console.log("Invalid reveal correctly rejected");
  }

  const attestation = ethers.keccak256(ethers.toUtf8Bytes("smoke-attestation"));
  const recordTx = await contract.recordDuel(duelId, attestation, 1);
  const recordReceipt = await recordTx.wait();
  console.log("recordDuel OK:", recordReceipt?.hash);

  const duel = await contract.duels(duelId);
  if (!duel.recorded) {
    throw new Error("Duel not recorded");
  }

  const signers = await ethers.getSigners();
  const stranger = signers[1];
  if (stranger) {
    try {
      await contract.connect(stranger).commitMove(duelId + 1n, 0n, commit);
      throw new Error("Expected non-operator to revert");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Not operator")) {
        throw err;
      }
      console.log("Non-operator correctly rejected");
    }
  }

  console.log("All Galileo smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
