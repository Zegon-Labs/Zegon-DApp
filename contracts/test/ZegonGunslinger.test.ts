import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZegonGunslinger", () => {
  it("mints, burns, and remints for the same wallet", async () => {
    const [operator, player] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ZegonGunslinger");
    const nft = await factory.deploy(operator.address);
    await nft.waitForDeployment();

    await nft.connect(operator).mint(player.address, "https://example.com/1");
    expect(await nft.tokenOfOwner(player.address)).to.equal(1n);

    await nft.connect(operator).burn(player.address);
    expect(await nft.tokenOfOwner(player.address)).to.equal(0n);

    await nft.connect(operator).mint(player.address, "https://example.com/2");
    expect(await nft.tokenOfOwner(player.address)).to.equal(2n);
  });

  it("rejects burn when wallet has no token", async () => {
    const [operator, player] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ZegonGunslinger");
    const nft = await factory.deploy(operator.address);
    await nft.waitForDeployment();

    await expect(nft.connect(operator).burn(player.address)).to.be.revertedWith("No token");
  });
});
