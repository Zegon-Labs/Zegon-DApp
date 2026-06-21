import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZegonLeaderboard", function () {
  async function deploy() {
    const Factory = await ethers.getContractFactory("ZegonLeaderboard");
    return Factory.deploy();
  }

  it("submits first score and ranks player", async function () {
    const lb = await deploy();
    const [alice] = await ethers.getSigners();
    const duelId = ethers.id("duel-1");

    await expect(lb.connect(alice).submitScore(500, duelId))
      .to.emit(lb, "ScoreSubmitted")
      .withArgs(alice.address, 500, duelId, true);

    expect(await lb.getScore(alice.address)).to.equal(500);

    const [addrs, scores] = await lb.getTopN(10);
    expect(addrs[0]).to.equal(alice.address);
    expect(scores[0]).to.equal(500);
  });

  it("keeps best score per address", async function () {
    const lb = await deploy();
    const [alice] = await ethers.getSigners();

    await lb.connect(alice).submitScore(300, ethers.id("duel-a"));
    await lb.connect(alice).submitScore(800, ethers.id("duel-b"));

    expect(await lb.getScore(alice.address)).to.equal(800);

    await expect(
      lb.connect(alice).submitScore(200, ethers.id("duel-c")),
    ).to.emit(lb, "ScoreSubmitted").withArgs(alice.address, 200, ethers.id("duel-c"), false);

    expect(await lb.getScore(alice.address)).to.equal(800);
  });

  it("rejects duplicate duelId", async function () {
    const lb = await deploy();
    const [alice, bob] = await ethers.getSigners();
    const duelId = ethers.id("duel-dup");

    await lb.connect(alice).submitScore(100, duelId);

    await expect(lb.connect(bob).submitScore(999, duelId)).to.be.revertedWith(
      "Duel already submitted",
    );
  });

  it("orders top N by score", async function () {
    const lb = await deploy();
    const [alice, bob, carol] = await ethers.getSigners();

    await lb.connect(alice).submitScore(100, ethers.id("d1"));
    await lb.connect(bob).submitScore(300, ethers.id("d2"));
    await lb.connect(carol).submitScore(200, ethers.id("d3"));

    const [addrs, scores] = await lb.getTopN(3);
    expect(addrs[0]).to.equal(bob.address);
    expect(scores[0]).to.equal(300);
    expect(addrs[1]).to.equal(carol.address);
    expect(scores[1]).to.equal(200);
    expect(addrs[2]).to.equal(alice.address);
    expect(scores[2]).to.equal(100);
  });
});
