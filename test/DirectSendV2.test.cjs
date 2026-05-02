const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DirectSendV2", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const usdc = await Mock.deploy("USDC", "USDC", 6);
    const eurc = await Mock.deploy("EURC", "EURC", 6);
    await usdc.waitForDeployment();
    await eurc.waitForDeployment();

    // Minter is `owner`; fund `alice` for deposits
    await usdc.transfer(alice.address, ethers.parseUnits("10000", 6));

    const DS = await ethers.getContractFactory("DirectSendV2");
    const ds = await DS.deploy(await usdc.getAddress(), await eurc.getAddress());
    await ds.waitForDeployment();

    return { owner, alice, bob, usdc, eurc, ds };
  }

  it("depositFor then claim sends net amount to recipient", async function () {
    const { alice, bob, usdc, ds } = await deployFixture();

    const amount = 1_000_000n; // 1 USDC
    const fee = (amount * 10n) / 10000n;
    const total = amount + fee;

    await usdc.connect(alice).approve(await ds.getAddress(), total);

    await expect(ds.connect(alice).depositFor(bob.address, amount, await usdc.getAddress()))
      .to.emit(ds, "DepositCreated")
      .withArgs(1n, alice.address, bob.address, amount, await usdc.getAddress());

    const beforeBob = await usdc.balanceOf(bob.address);
    await ds.connect(bob).claim(1n);
    const afterBob = await usdc.balanceOf(bob.address);
    expect(afterBob - beforeBob).to.equal(amount);
  });

  it("rejects claim from non-recipient", async function () {
    const { alice, bob, owner, usdc, ds } = await deployFixture();
    const amount = 1_000_000n;
    const fee = (amount * 10n) / 10000n;
    await usdc.connect(alice).approve(await ds.getAddress(), amount + fee);
    await ds.connect(alice).depositFor(bob.address, amount, await usdc.getAddress());
    await expect(ds.connect(owner).claim(1n)).to.be.revertedWith("Not recipient");
  });
});
