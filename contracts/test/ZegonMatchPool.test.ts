import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZegonMatchPool", function () {
  const stake = ethers.parseEther("0.05");

  async function deploy() {
    const [operator] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ZegonMatchPool");
    const pool = await Factory.deploy(operator.address);
    const matchId = ethers.id("challenge-1");
    return { pool, operator, matchId };
  }

  it("settles symmetric stakes to winner", async function () {
    const { pool, operator, matchId } = await deploy();
    const [, challenger, defender] = await ethers.getSigners();

    await pool.connect(challenger).enterAsChallenger(matchId, { value: stake });
    await pool.connect(defender).enterAsDefender(matchId, { value: stake });

    const before = await ethers.provider.getBalance(defender.address);
    await pool.connect(operator).settle(matchId, defender.address);
    const after = await ethers.provider.getBalance(defender.address);

    expect(after - before).to.equal(stake * 2n);
    const m = await pool.getMatch(matchId);
    expect(m.settled).to.equal(true);
    expect(m.winner).to.equal(defender.address);
  });

  it("rejects mismatched defender stake", async function () {
    const { pool, matchId } = await deploy();
    const [, challenger, defender] = await ethers.getSigners();

    await pool.connect(challenger).enterAsChallenger(matchId, { value: stake });
    await expect(
      pool.connect(defender).enterAsDefender(matchId, { value: ethers.parseEther("0.1") }),
    ).to.be.revertedWith("Stake mismatch");
  });
});
