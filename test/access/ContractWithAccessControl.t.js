const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

// Import WETH ABI
const WETH_ABI = require("./abi/weth.json");

describe("ContractWithAccessControl", () => {
    let deployer;
    let pauser;
    let user;
    let weth;
    let contractWithAccessControl;

    const PAUSER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PAUSER_ROLE"));

    // WETH mainnet address
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    async function deployFixture() {

        [deployer, pauser, user] = await hre.ethers.getSigners();

        // Instantiate the reference to the WETH contract
        weth = new hre.ethers.Contract(WETH_ADDRESS, WETH_ABI, deployer);

        // Deploy the AccessControl contract
        const contractWithAccessControl = await hre.ethers.deployContract("ContractWithAccessControl", [pauser]);

        return { deployer, pauser, user, weth, contractWithAccessControl };
    }

    beforeEach(async () => {
        ({ deployer, pauser, user, weth, contractWithAccessControl } = await loadFixture(deployFixture));
    });

    it("Should assign deployer as DEFAULT_ADMIN_ROLE", async () => {
        const DEFAULT_ADMIN_ROLE = await contractWithAccessControl.DEFAULT_ADMIN_ROLE();
        expect(await contractWithAccessControl.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("Should assign pauser the PAUSER_ROLE", async () => {
        const PAUSER_ROLE = await contractWithAccessControl.PAUSER_ROLE();
        expect(await contractWithAccessControl.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
    });

    it("Should allow pauser to pause and unpause the contract", async () => {
        await contractWithAccessControl.connect(pauser).pause();
        expect(await contractWithAccessControl.paused()).to.be.true;

        await contractWithAccessControl.connect(pauser).unpause();
        expect(await contractWithAccessControl.paused()).to.be.false;
    });

    it("Should allow user to deposit WETH when not paused", async () => {
        const amount = hre.ethers.parseEther("2");

        // Wrap ETH into WETH
        await weth.deposit({ value: amount });

        // Approve the contract to spend WETH
        await weth.approve(contractWithAccessControl.target, amount);

        // Deposit WETH into the contract
        await expect(contractWithAccessControl.deposit(weth.target, amount))
            .to.emit(contractWithAccessControl, "Deposit")
            .withArgs(deployer.address, WETH_ADDRESS, amount);

        // Verify the balance in the contract
        const balance = await contractWithAccessControl.getBalance(deployer.address, WETH_ADDRESS);
        expect(balance).to.equal(amount);
    });

    it("Should revert deposits when the contract is paused", async () => {
        const amount = hre.ethers.parseEther("0.5");

        // Pause the contract
        await contractWithAccessControl.connect(pauser).pause();

        await weth.deposit({ value: amount });
        await weth.approve(contractWithAccessControl.target, amount);

        await expect(
            contractWithAccessControl.deposit(weth.target, amount)
        ).to.be.revertedWithCustomError(contractWithAccessControl, "EnforcedPause");
    });

    it("Should allow user to withdraw WETH when not paused", async () => {
        const depositAmount = hre.ethers.parseEther("1");
        const withdrawAmount = hre.ethers.parseEther("0.5");

        await weth.deposit({ value: depositAmount });
        await weth.approve(contractWithAccessControl.target, depositAmount);
        await contractWithAccessControl.deposit(weth.target, depositAmount);

        await expect(
            contractWithAccessControl.withdraw(deployer.address, WETH_ADDRESS, withdrawAmount)
        )
            .to.emit(contractWithAccessControl, "Withdraw")
            .withArgs(deployer.address, WETH_ADDRESS, withdrawAmount);

        // Check remaining balance
        const remainingBalance = await contractWithAccessControl.getBalance(deployer.address, WETH_ADDRESS);
        expect(remainingBalance).to.equal(depositAmount - withdrawAmount);

        // Check WETH balance of user
        const userBalance = await weth.balanceOf(deployer.address);
        expect(userBalance).to.equal(remainingBalance);
    });

    it("Should revert withdrawals when the contract is paused", async () => {
        const amount = hre.ethers.parseEther("1");

        await weth.deposit({ value: amount });
        await weth.approve(contractWithAccessControl.target, amount);
        await contractWithAccessControl.deposit(weth.target, amount);

        await contractWithAccessControl.connect(pauser).pause();

        await expect(
            contractWithAccessControl.withdraw(weth.target, deployer.address, amount)
        ).to.be.revertedWithCustomError(contractWithAccessControl, "EnforcedPause");
    });

    it("Should revert withdrawals if balance is insufficient", async () => {
        const depositAmount = hre.ethers.parseEther("1");
        const withdrawAmount = hre.ethers.parseEther("2");

        await weth.deposit({ value: depositAmount });
        await weth.approve(contractWithAccessControl.target, depositAmount);
        await contractWithAccessControl.deposit(weth.target, depositAmount);

        await expect(
            contractWithAccessControl.withdraw(weth.target, deployer.address, withdrawAmount)
        ).to.be.revertedWithCustomError(contractWithAccessControl, "InsufficientBalance");
    });

    it("Should allow the deployer to revoke the PAUSER_ROLE from the pauser", async () => {
        expect(await contractWithAccessControl.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
    
        // Revoke the role
        await contractWithAccessControl.revokeRole(PAUSER_ROLE, pauser.address);
    
        expect(await contractWithAccessControl.hasRole(PAUSER_ROLE, pauser.address)).to.be.false;
    });
    
    it("Should allow the pauser to renounce their PAUSER_ROLE", async () => {
        expect(await contractWithAccessControl.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
    
        // The pauser renounces their role
        await contractWithAccessControl.connect(pauser).renounceRole(PAUSER_ROLE, pauser.address);
    
        expect(await contractWithAccessControl.hasRole(PAUSER_ROLE, pauser.address)).to.be.false;
    });
    
});