// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ContractWithOwner2Step is Ownable2Step {

    constructor() Ownable(msg.sender) {}

    uint public protectedCount;
    uint public unprotectedCount;

    function protectedFunction(uint _newCount) external onlyOwner {
        protectedCount = _newCount;
    }

    function unprotectedFunction(uint _newCount) external {
        unprotectedCount = _newCount;
    }
}