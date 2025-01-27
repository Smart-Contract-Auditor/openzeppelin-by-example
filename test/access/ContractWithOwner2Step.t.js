const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("contractWithOwner2Step", () => {
    let deployer;
    let newOwner;
    let nonOwner;
    let contractWithOwner2Step;

    async function deployFixture() {
        const [deployer, newOwner, nonOwner] = await hre.ethers.getSigners();
        const contractWithOwner2Step = await hre.ethers.deployContract("ContractWithOwner2Step");
        return { deployer, newOwner, nonOwner, contractWithOwner2Step };
    }

    beforeEach(async () => {
        ({deployer, newOwner, nonOwner, contractWithOwner2Step} = await loadFixture(deployFixture));
    })

    /*** Ownable ***/

    it("Verify the owner is the contract deployer", async () => {
        console.log(`Deployer: ${deployer.address} Owner: ${await contractWithOwner2Step.owner()}`);
        expect(await contractWithOwner2Step.owner()).to.equal(deployer.address);
    });

    it("Should allow the owner to call the protected function", async () => {
        console.log("Current protectedCount value: ", await contractWithOwner2Step.protectedCount());
        await contractWithOwner2Step.protectedFunction(10);
        console.log("New protectedCount value: ", await contractWithOwner2Step.protectedCount());
        expect(await contractWithOwner2Step.protectedCount()).to.equal(10);
    });

    it("Should revert when a non-owner calls the protected function", async () => {
        console.log("Attempting to call protectedFunction as non-owner...");
        await expect(contractWithOwner2Step.connect(nonOwner).protectedFunction(20))
            .to.be.revertedWithCustomError(contractWithOwner2Step, "OwnableUnauthorizedAccount")
            .withArgs(nonOwner.address);
        console.log("Transaction reverted as expected.");
    });

    it("Should allow anyone to call the unprotected function", async () => {
        console.log("Current unprotectedCount value: ", await contractWithOwner2Step.unprotectedCount());
        await contractWithOwner2Step.connect(nonOwner).unprotectedFunction(30);
        console.log("New unprotectedCount value: ", await contractWithOwner2Step.unprotectedCount());
        expect(await contractWithOwner2Step.unprotectedCount()).to.equal(30);
    });

    /*** Ownable2Step ***/

    it("Should set a new pending owner", async () => {
        console.log(`Current owner: ${await contractWithOwner2Step.owner()}`);
        console.log(`Transferring ownership to new owner: ${newOwner.address}`);
        await contractWithOwner2Step.transferOwnership(newOwner.address);
        console.log(`Pending owner: ${await contractWithOwner2Step.pendingOwner()}`);
        expect(await contractWithOwner2Step.pendingOwner()).to.equal(newOwner.address);
    });

    it("Should allow setting the pending owner to the zero adddress", async () => {
        console.log(`Current owner: ${await contractWithOwner2Step.owner()}`);
        console.log(`Transferring ownership to new owner: ${hre.ethers.ZeroAddress}`);
        await contractWithOwner2Step.transferOwnership(hre.ethers.ZeroAddress);
        console.log(`New owner: ${await contractWithOwner2Step.pendingOwner()}`);
        expect(await contractWithOwner2Step.pendingOwner()).to.equal(hre.ethers.ZeroAddress);
    });

    it("Should allow the pending owner to accept ownership", async () => {
        console.log(`Current owner: ${await contractWithOwner2Step.owner()}`);
        await contractWithOwner2Step.transferOwnership(newOwner.address);
        console.log(`Pending owner is: ${await contractWithOwner2Step.pendingOwner()}`);
        await contractWithOwner2Step.connect(newOwner).acceptOwnership()
        console.log(`New owner is: ${await contractWithOwner2Step.owner()}`);
        expect(await contractWithOwner2Step.owner()).to.equal(newOwner.address)
    });

    it("Should not allow an address other than the pending owner to accept ownership", async () => {
        console.log(`Current owner: ${await contractWithOwner2Step.owner()}`);
        await contractWithOwner2Step.transferOwnership(newOwner.address);
        console.log(`Pending owner is: ${await contractWithOwner2Step.pendingOwner()}`);
        await expect(contractWithOwner2Step.connect(nonOwner).acceptOwnership())
            .to.be.revertedWithCustomError(contractWithOwner2Step, "OwnableUnauthorizedAccount");
    });

    it("Should allow the new owner to call the protected function", async () => {
        await contractWithOwner2Step.transferOwnership(newOwner.address);
        await contractWithOwner2Step.connect(newOwner).acceptOwnership()
        console.log("Current protectedCount value: ", await contractWithOwner2Step.protectedCount());
        await contractWithOwner2Step.connect(newOwner).protectedFunction(40);
        console.log("New protectedCount value: ", await contractWithOwner2Step.protectedCount());
        expect(await contractWithOwner2Step.protectedCount()).to.equal(40);
    });
});