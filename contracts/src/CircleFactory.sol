// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Circle, CircleConfig} from "./Circle.sol";
import {SavingsRegistry} from "./SavingsRegistry.sol";

/// @title CircleFactory
/// @notice Deploys Giliran circles and remembers which addresses it deployed, so the registry
///         and the checker can tell a real circle from a look-alike. There is deliberately no
///         list of circles by creator or any other discovery view: circles are invite-only.
contract CircleFactory {
    uint256 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_MEMBERS = 20;
    uint256 public constant MIN_ROUND = 1 days;
    uint256 public constant MIN_DEMO_ROUND = 60;
    uint256 public constant MIN_DEMO_GRACE = 30;

    SavingsRegistry public immutable registry;
    /// @notice Test USD Coin deployed alongside the factory.
    address public immutable testUsdc;
    /// @notice Circle's USDC on Base Sepolia.
    address public immutable usdc;

    mapping(address => bool) public isCircle;

    event CircleCreated(address indexed circle, address indexed organiser, address token, bool demo);

    error RegistryMismatch();
    error UnsupportedToken();
    error ZeroContribution();
    error BadMemberCap();
    error RoundTooShort();
    error GraceTooShort();
    error GraceTooLong();
    error BadJoinDeadline();
    error EmptyCommit();

    constructor(SavingsRegistry registry_, address testUsdc_, address usdc_) {
        if (address(registry_.factory()) != address(this)) revert RegistryMismatch();
        registry = registry_;
        testUsdc = testUsdc_;
        usdc = usdc_;
    }

    /// @notice Create a new circle. The caller becomes the organiser, which carries no powers
    ///         beyond revealing the payout order they committed to.
    /// @param cfg Circle parameters. Demo circles may use 60s rounds and 30s grace.
    /// @param orderCommit keccak256(abi.encode(secret, organiser)).
    /// @return circle Address of the new circle.
    function createCircle(CircleConfig calldata cfg, bytes32 orderCommit) external returns (address circle) {
        if (cfg.token != testUsdc && cfg.token != usdc) revert UnsupportedToken();
        if (cfg.contribution == 0) revert ZeroContribution();
        if (cfg.memberCap < MIN_MEMBERS || cfg.memberCap > MAX_MEMBERS) revert BadMemberCap();
        if (cfg.demo) {
            if (cfg.roundDuration < MIN_DEMO_ROUND) revert RoundTooShort();
            if (cfg.graceDuration < MIN_DEMO_GRACE) revert GraceTooShort();
        } else if (cfg.roundDuration < MIN_ROUND) {
            revert RoundTooShort();
        }
        if (cfg.graceDuration > cfg.roundDuration) revert GraceTooLong();
        if (cfg.joinDeadline <= block.timestamp) revert BadJoinDeadline();
        if (orderCommit == bytes32(0)) revert EmptyCommit();

        circle = address(new Circle(cfg, orderCommit, msg.sender, registry));
        isCircle[circle] = true;
        emit CircleCreated(circle, msg.sender, cfg.token, cfg.demo);
    }
}
