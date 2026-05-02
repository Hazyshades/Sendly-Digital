const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GiftCard (Tempo TIP-20 compatibility)", function () {
  async function deployGiftCardWithTokens(tokenAddresses) {
    const GiftCard = await ethers.getContractFactory("GiftCard");
    const giftCard = await GiftCard.deploy(
      tokenAddresses[0],
      tokenAddresses[1],
      tokenAddresses[2],
      tokenAddresses[3]
    );
    await giftCard.waitForDeployment();
    return giftCard;
  }

  it("works with ERC20-like tokens that don't return bool (SafeERC20 fallback)", async function () {
    const [owner] = await ethers.getSigners();

    const initial = ethers.parseUnits("1000", 18);
    const amount = ethers.parseUnits("25", 18);

    const Token = await ethers.getContractFactory("MockNoReturnERC20");

    const t0 = await Token.deploy("pathUSD", "pUSD", 18, owner.address, initial);
    const t1 = await Token.deploy("alphaUSD", "aUSD", 18, owner.address, initial);
    const t2 = await Token.deploy("betaUSD", "bUSD", 18, owner.address, initial);
    const t3 = await Token.deploy("thetaUSD", "tUSD", 18, owner.address, initial);

    await Promise.all([t0.waitForDeployment(), t1.waitForDeployment(), t2.waitForDeployment(), t3.waitForDeployment()]);

    const giftCard = await deployGiftCardWithTokens([
      await t0.getAddress(),
      await t1.getAddress(),
      await t2.getAddress(),
      await t3.getAddress(),
    ]);

    await t0.approve(await giftCard.getAddress(), amount);

    const before = await t0.balanceOf(owner.address);
    const tx = await giftCard.createGiftCard(owner.address, amount, await t0.getAddress(), "ipfs://meta", "hi");
    await tx.wait();

    const afterCreate = await t0.balanceOf(owner.address);
    expect(afterCreate).to.equal(before - amount);

    // tokenId starts at 1
    const redeemTx = await giftCard.redeemGiftCard(1);
    await redeemTx.wait();

    const afterRedeem = await t0.balanceOf(owner.address);
    expect(afterRedeem).to.equal(before);
  });

  it("works with TIP-20 style tokens that expose transferFromWithMemo/transferWithMemo", async function () {
    const [owner] = await ethers.getSigners();

    const initial = ethers.parseUnits("1000", 18);
    const amount = ethers.parseUnits("10", 18);

    const Tip = await ethers.getContractFactory("MockTip20WithMemo");

    const t0 = await Tip.deploy("pathUSD", "pUSD", 18, owner.address, initial);
    const t1 = await Tip.deploy("alphaUSD", "aUSD", 18, owner.address, initial);
    const t2 = await Tip.deploy("betaUSD", "bUSD", 18, owner.address, initial);
    const t3 = await Tip.deploy("thetaUSD", "tUSD", 18, owner.address, initial);

    await Promise.all([t0.waitForDeployment(), t1.waitForDeployment(), t2.waitForDeployment(), t3.waitForDeployment()]);

    const giftCard = await deployGiftCardWithTokens([
      await t0.getAddress(),
      await t1.getAddress(),
      await t2.getAddress(),
      await t3.getAddress(),
    ]);

    await t0.approve(await giftCard.getAddress(), amount);

    const before = await t0.balanceOf(owner.address);
    const tx = await giftCard.createGiftCard(owner.address, amount, await t0.getAddress(), "ipfs://meta", "hi");
    await tx.wait();

    const afterCreate = await t0.balanceOf(owner.address);
    expect(afterCreate).to.equal(before - amount);

    const redeemTx = await giftCard.redeemGiftCard(1);
    await redeemTx.wait();

    const afterRedeem = await t0.balanceOf(owner.address);
    expect(afterRedeem).to.equal(before);
  });
});

