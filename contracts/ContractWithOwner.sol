// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractWithOwner is Ownable {

    constructor() Ownable(msg.sender) {}

    uint public protectedCount;
    uint public unprotectedCount;

    function protectedFunction(uint _newCount) onlyOwner external {
        protectedCount = _newCount;
    }

    function unprotectedFunction(uint _newCount) external {
        unprotectedCount = _newCount;
    }
}