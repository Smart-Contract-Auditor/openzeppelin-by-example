const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("ContractWithOwner", () => {
    let deployer;
    let newOwner;
    let nonOwner;
    let contractWithOwner;

    async function deployFixture() {
        [deployer, newOwner, nonOwner] = await hre.ethers.getSigners();
        contractWithOwner = await hre.ethers.deployContract("ContractWithOwner");
        return { deployer, newOwner, nonOwner, contractWithOwner };
    }

    beforeEach(async () => {
        ({ deployer, newOwner, nonOwner, contractWithOwner } = await loadFixture(deployFixture));
    })

    it("Verify the owner is the contract deployer", async () => {
        console.log(`Deployer: ${deployer.address} Owner: ${await contractWithOwner.owner()}`);
        expect(await contractWithOwner.owner()).to.equal(deployer.address);
    });

    it("Should allow the owner to call the protected function", async () => {
        console.log("Current protectedCount value: ", await contractWithOwner.protectedCount());
        await contractWithOwner.protectedFunction(10);
        console.log("New protectedCount value: ", await contractWithOwner.protectedCount());
        expect(await contractWithOwner.protectedCount()).to.equal(10);
    });

    it("Should revert when a non-owner calls the protected function", async () => {
        console.log("Attempting to call protectedFunction as non-owner...");
        await expect(contractWithOwner.connect(nonOwner).protectedFunction(20))
            .to.be.revertedWithCustomError(contractWithOwner, "OwnableUnauthorizedAccount")
            .withArgs(nonOwner.address);
    });

    it("Should allow anyone to call the unprotected function", async () => {
        console.log("Current unprotectedCount value: ", await contractWithOwner.unprotectedCount());
        await contractWithOwner.connect(nonOwner).unprotectedFunction(30);
        console.log("New unprotectedCount value: ", await contractWithOwner.unprotectedCount());
        expect(await contractWithOwner.unprotectedCount()).to.equal(30);
    });

    it("Should revert when transferring ownership to the zero address", async () => {
        console.log("Attempting to transfer ownership to the zero address...");
        await expect(contractWithOwner.transferOwnership(hre.ethers.ZeroAddress))
            .to.be.revertedWithCustomError(contractWithOwner, "OwnableInvalidOwner")
            .withArgs(hre.ethers.ZeroAddress);
    });

    it("Should transfer ownership to a new owner", async () => {
        console.log(`Current owner: ${await contractWithOwner.owner()}`);
        console.log(`Transferring ownership to new owner: ${newOwner.address}`);
        await contractWithOwner.transferOwnership(newOwner.address);
        console.log(`New owner: ${await contractWithOwner.owner()}`);
        expect(await contractWithOwner.owner()).to.equal(newOwner.address);
    });

    it("Should allow the new owner to call the protected function", async () => {
        console.log(`Current owner: ${await contractWithOwner.owner()}`);
        await contractWithOwner.transferOwnership(newOwner.address);
        console.log(`New owner: ${await contractWithOwner.owner()}`);
        console.log("Current protectedCount value: ", await contractWithOwner.protectedCount());
        await contractWithOwner.connect(newOwner).protectedFunction(40);
        console.log("New protectedCount value: ", await contractWithOwner.protectedCount());
        expect(await contractWithOwner.protectedCount()).to.equal(40);
    });

    it("Should revert when a non-owner tries to renounce ownership", async () => {
        console.log(`Current owner: ${await contractWithOwner.owner()}`);
        console.log("Attempting to renounce ownership as non-owner...");
        await expect(contractWithOwner.connect(nonOwner).renounceOwnership())
            .to.be.revertedWithCustomError(contractWithOwner, "OwnableUnauthorizedAccount")
            .withArgs(nonOwner.address);
    });

    it("Should renounce ownership and leave the contract without an owner", async () => {
        console.log(`Current owner: ${await contractWithOwner.owner()}`);
        console.log("Renouncing ownership...");
        await contractWithOwner.renounceOwnership();
        console.log(`New owner: ${await contractWithOwner.owner()}`);
        expect(await contractWithOwner.owner()).to.equal(hre.ethers.ZeroAddress);
    });
});