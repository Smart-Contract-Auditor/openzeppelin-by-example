// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ContractWithAccessControl is AccessControl, Pausable {
    using SafeERC20 for IERC20;

    event Deposit(address indexed account, address indexed token, uint amount);
    event Withdraw(address indexed account, address indexed token, uint amount);

    error InsufficientBalance();

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address account => mapping(address token => uint balance)) private balances;

    constructor(address _pauser) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, _pauser);
    }

    function deposit(address _token, uint _amount) external whenNotPaused {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        emit Deposit(msg.sender, _token, _amount);

        balances[msg.sender][_token] += _amount;
    }

    function withdraw(address _receiver, address _token, uint _amount) external whenNotPaused {
        if (balances[msg.sender][_token] < _amount)
            revert InsufficientBalance();

        balances[msg.sender][_token] -= _amount;

        IERC20(_token).safeTransfer(_receiver, _amount);

        emit Withdraw(msg.sender, _token, _amount);
    }

    function pause() external onlyRole(PAUSER_ROLE){
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE){
        _unpause();
    }

    function getBalance(address _account, address _token) external view returns(uint balance) {
        balance = balances[_account][_token];
    }
}