// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICircleView
/// @notice Read surface any savings-circle contract can expose so a checker can compare its
///         claims against its actual state. Honest circles and dishonest ones implement the same
///         interface; the checker decides which is which from the numbers.
interface ICircleView {
    /// @notice Number of members who have actually joined.
    function memberCount() external view returns (uint256);
    /// @notice Maximum number of members.
    function memberCap() external view returns (uint256);
    /// @notice Contribution per member per round, in token units.
    function contribution() external view returns (uint256);
    /// @notice Security deposit currently held for `member`.
    function depositOf(address member) external view returns (uint256);
    /// @notice Fee taken by the organiser, in basis points.
    function feeBps() external view returns (uint256);
    /// @notice Amount the recipient of a full round receives.
    function payoutPerRound() external view returns (uint256);
    /// @notice Any "return" promised on top of contributions, in basis points.
    function promisedReturnBps() external view returns (uint256);
    /// @notice All member addresses.
    function members() external view returns (address[] memory);
}
