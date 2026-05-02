// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICardVault
 * @notice Interface for Card Vault contracts to break circular dependency
 */
interface ICardVault {
    function depositCardForUsername(
        uint256 tokenId,
        string memory username,
        address sender
    ) external;
}
