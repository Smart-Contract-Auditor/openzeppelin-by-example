// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "hardhat/console.sol";

 contract PausableContract is Ownable, Pausable {

    constructor() Ownable(msg.sender) {}

    function doSomething() external whenNotPaused view returns (bool) {
        console.log("Did something");
        return true;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
 }