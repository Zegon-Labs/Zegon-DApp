import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZegonDuel", function () {
  let contract: Awaited<ReturnType<typeof deployContract>>;
  let operator: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  async function deployContract() {
    const [op] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ZegonDuel");
    return Factory.deploy(op.address);
  }

  beforeEach(async function () {
    [operator] = await ethers.getSigners();
    contract = await deployContract();
  });

  it("commits and reveals a move", async function () {
    const duelId = 1n;
    const roundId = 0n;
    const move = 0; // FIRE_HIGH
    const salt = ethers.id("test-salt");
    const commit = ethers.keccak256(
      ethers.solidityPacked(["uint8", "bytes32"], [move, salt]),
    );

    await contract.connect(operator).commitMove(duelId, roundId, commit);

    const roundBefore = await contract.getRound(duelId, roundId);
    expect(roundBefore.commit).to.equal(commit);
    expect(roundBefore.revealed).to.be.false;

    await contract.connect(operator).revealMove(duelId, roundId, move, salt);

    const roundAfter = await contract.getRound(duelId, roundId);
    expect(roundAfter.revealed).to.be.true;
    expect(roundAfter.zegonMove).to.equal(move);
  });

  it("rejects invalid reveal", async function () {
    const duelId = 2n;
    const roundId = 0n;
    const commit = ethers.keccak256(ethers.toUtf8Bytes("fake"));

    await contract.connect(operator).commitMove(duelId, roundId, commit);

    await expect(
      contract.connect(operator).revealMove(duelId, roundId, 1, ethers.id("wrong")),
    ).to.be.revertedWith("Invalid reveal");
  });

  it("records duel result", async function () {
    const duelId = 3n;
    const attestation = ethers.keccak256(ethers.toUtf8Bytes("attestation"));

    await contract.connect(operator).recordDuel(duelId, attestation, 1);

    const duel = await contract.duels(duelId);
    expect(duel.recorded).to.be.true;
    expect(duel.attestationHash).to.equal(attestation);
    expect(duel.result).to.equal(1);
  });

  it("blocks non-operator", async function () {
    const [, stranger] = await ethers.getSigners();
    await expect(
      contract.connect(stranger).commitMove(1n, 0n, ethers.ZeroHash),
    ).to.be.revertedWith("Not operator");
  });
});
