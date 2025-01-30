const hre = require("hardhat");
const { expect } = require("chai");

describe("ReentrancyGuardedContract", () => {
    let deployer, attacker, pauser;
    let reentrancyGuardedContract, maliciousReentrancy, maliciousReentrancyBlocked;

    const DEPOSIT_AMOUNT = hre.ethers.parseEther("5");

    // Fixture to deploy the contracts
    beforeEach(async () => {
        [deployer, attacker, pauser] = await hre.ethers.getSigners();

        // Deploy the reentrancyGuardedContract
        reentrancyGuardedContract = await hre.ethers.deployContract("ReentrancyGuardedContract", [pauser.address]);

        // Deploy the MaliciousReentrancy contracts with target address
        maliciousReentrancy = await hre.ethers.deployContract("MaliciousReentrancy",
            [
                reentrancyGuardedContract.target,
                hre.ethers.ZeroAddress
            ],
            attacker
        );

        maliciousReentrancyBlocked = await hre.ethers.deployContract("MaliciousReentrancyBlocked",
            [
                reentrancyGuardedContract.target,
                hre.ethers.ZeroAddress
            ],
            attacker
        );

        // Deposit ETH into the contract by deployer
        let tx = await deployer.sendTransaction({ to: reentrancyGuardedContract.target, value: DEPOSIT_AMOUNT });
        await tx.wait();

        // Zero address represents ether.
        const deployerDepositedBalance = await reentrancyGuardedContract.getBalance(deployer.address, hre.ethers.ZeroAddress);
        console.log("deployerDepositedBalance: ", hre.ethers.formatEther(deployerDepositedBalance));
    });

    it("Should allow attacker to exploit withdrawWithVulnerability", async () => {
        // Attacker deposits ETH into the attack contract
        tx = await attacker.sendTransaction({ to: maliciousReentrancy.target, value: DEPOSIT_AMOUNT });
        await tx.wait();

        // Attacker deposits ETH into the target contract
        await maliciousReentrancy.depositToTarget();

        // Amount the attacker has deposited into the target contract, zero address represents ether
        const attackerDepositedBalance = await reentrancyGuardedContract.getBalance(maliciousReentrancy.target, hre.ethers.ZeroAddress);
        console.log("attackerDepositedBalance: ", hre.ethers.formatEther(attackerDepositedBalance));
        console.log("ReentrancyGuardedContract balance: ", hre.ethers.formatEther(await hre.ethers.provider.getBalance(reentrancyGuardedContract.target)));

        const attackerBalanceBefore = await hre.ethers.provider.getBalance(maliciousReentrancy.target);
        console.log("attackerBalanceBefore: ", hre.ethers.formatEther(attackerBalanceBefore));

        // Attacker performs the attack
        await maliciousReentrancy.connect(attacker).attack();

        const attackerBalanceAfter = await hre.ethers.provider.getBalance(maliciousReentrancy.target);
        console.log("attackerBalanceAfter: ", hre.ethers.formatEther(attackerBalanceAfter));

        // Assert that the attacker's balance has increased by the expected amount
        expect(attackerBalanceAfter > attackerBalanceBefore).to.be.true;

        // Asssert the contract's balance has been totally drained
        expect(await hre.ethers.provider.getBalance(reentrancyGuardedContract.target)).to.equal(0);
    });

    it("Should prevent reentrancy in withdrawWithReentrancyGuard", async () => {
        // Attacker deposits ETH into the attack contract
        tx = await attacker.sendTransaction({ to: maliciousReentrancyBlocked.target, value: DEPOSIT_AMOUNT });
        await tx.wait();

        // Attacker deposits ETH into the target contract
        await maliciousReentrancyBlocked.depositToTarget();

        // Amount the attacker has deposited into the target contract, zero address represents ether
        const attackerDepositedBalance = await reentrancyGuardedContract.getBalance(maliciousReentrancyBlocked.target, hre.ethers.ZeroAddress);
        console.log("attackerDepositedBalance: ", hre.ethers.formatEther(attackerDepositedBalance));
        console.log("ReentrancyGuardedContract balance: ", hre.ethers.formatEther(await hre.ethers.provider.getBalance(reentrancyGuardedContract.target)));

        // Attacker tries to exploit the guarded function
        await expect(maliciousReentrancyBlocked.connect(attacker).attack()).to.be.revertedWithCustomError(reentrancyGuardedContract, "ETHTransferFailed");

        // Assert the deployer's deposited balance is still 5.
        const deployerDepositedBalance = await reentrancyGuardedContract.getBalance(deployer.address, hre.ethers.ZeroAddress);
        console.log("deployerDepositedBalance: ", hre.ethers.formatEther(deployerDepositedBalance));
        expect(deployerDepositedBalance).to.equal(hre.ethers.parseEther("5"));

        // Assert the attackers's deposited balance is still 5.
        const attacherDepositedBalance = await reentrancyGuardedContract.getBalance(maliciousReentrancyBlocked.target, hre.ethers.ZeroAddress);
        console.log("attackerDepositedBalance: ", hre.ethers.formatEther(attacherDepositedBalance));
        expect(attacherDepositedBalance).to.equal(hre.ethers.parseEther("5"));
    });
});
