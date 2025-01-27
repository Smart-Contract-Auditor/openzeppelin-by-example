const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("PausableContract", function () {
  let pauseableContract;
  let owner;
  let nonOwner;

  // Deploy fixture
  async function deployFixture() {
    [owner, nonOwner] = await hre.ethers.getSigners();
    pauseableContract = await hre.ethers.deployContract("PausableContract");
    return { pauseableContract, owner, nonOwner };
  }

  beforeEach(async () => {
    ({ pauseableContract, owner, nonOwner } = await loadFixture(deployFixture));
  });

  it("Should not be paused initially", async function () {
    console.log("Checking if the contract is paused initially...");
    expect(await pauseableContract.paused()).to.be.false;
  });

  it("Should allow owner to pause the contract", async function () {
    console.log("Pausing the contract as the owner...");
    await pauseableContract.pause();
    expect(await pauseableContract.paused()).to.be.true;
  });

  it("Should emit paused event when paused", async function () {
    console.log("Pausing the contract and checking for paused event...");
    await expect(pauseableContract.pause())
      .to.emit(pauseableContract, "Paused")
      .withArgs(owner.address);
  });

  it("Should not allow non-owner to pause the contract", async function () {
    console.log("Attempting to pause the contract as a non-owner...");
    await expect(pauseableContract.connect(nonOwner).pause())
      .to.be.revertedWithCustomError(pauseableContract, "OwnableUnauthorizedAccount");;
  });

  it("Should not allow pausing when already paused", async function () {
    console.log("Pausing the contract...");
    await pauseableContract.pause();
    console.log("Attempting to pause the contract again...");
    await expect(pauseableContract.pause())
      .to.be.revertedWithCustomError(pauseableContract, "EnforcedPause");
  });

  it("Should allow owner to unpause the contract", async function () {
    console.log("Pausing the contract...");
    await pauseableContract.pause();
    console.log("Unpausing the contract as the owner...");
    await pauseableContract.unpause();
    expect(await pauseableContract.paused()).to.be.false;
  });

  it("Should emit unpaused event when unpaused", async function () {
    console.log("Pausing the contract...");
    await pauseableContract.pause();
    console.log("Unpausing the contract and checking for unpaused event...");
    await expect(pauseableContract.unpause())
      .to.emit(pauseableContract, "Unpaused")
      .withArgs(owner.address);
  });

  it("Should not allow non-owner to unpause the contract", async function () {
    console.log("Pausing the contract...");
    await pauseableContract.pause();
    console.log("Attempting to unpause the contract as a non-owner...");
    await expect(pauseableContract.connect(nonOwner).unpause())
      .to.be.revertedWithCustomError(pauseableContract, "OwnableUnauthorizedAccount");
  });

  it("Should not allow unpausing when not paused", async function () {
    console.log("Attempting to unpause the contract when it is not paused...");
    await expect(pauseableContract.unpause())
      .to.be.revertedWithCustomError(pauseableContract, "ExpectedPause");
  });

  it("Should allow calling doSomething when not paused", async function () {
    console.log("Calling doSomething when the contract is not paused...");
    expect(await pauseableContract.doSomething()).to.be.true;
  });

  it("Should not allow calling doSomething when paused", async function () {
    console.log("Pausing the contract...");
    await pauseableContract.pause();
    console.log("Attempting to call doSomething when the contract is paused...");
    await expect(pauseableContract.doSomething())
      .to.be.revertedWithCustomError(pauseableContract, "EnforcedPause");
  });
});