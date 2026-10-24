// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICircleView} from "../interfaces/ICircleView.sol";

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

/// @title FakeCircleDemo
/// @notice TEACHING EXAMPLE ONLY. A deliberately dishonest "circle" used by the Giliran checker
///         demo. It mirrors the pattern of fake online arisan schemes: it claims ten members but
///         seven are made up with no deposit, it charges a 5% fee, it promises a 20% "return",
///         and its owner can withdraw everything. Never send funds to it.
contract FakeCircleDemo is ICircleView {
    uint256 public constant CLAIMED_MEMBERS = 10;
    uint256 public constant REAL_MEMBERS = 3;

    address public immutable owner;
    IERC20Min public immutable token;
    uint256 public immutable contribution;

    address[] internal _members;
    mapping(address => uint256) internal _deposit;

    event Withdrawn(address indexed to, uint256 amount);

    error NotOwner();

    constructor(address token_, uint256 contribution_, address[3] memory realMembers) {
        owner = msg.sender;
        token = IERC20Min(token_);
        contribution = contribution_;
        for (uint256 i; i < REAL_MEMBERS; ++i) {
            _members.push(realMembers[i]);
            _deposit[realMembers[i]] = contribution_;
        }
        // Padding: addresses nobody controls, with no deposit behind them.
        for (uint256 i = REAL_MEMBERS; i < CLAIMED_MEMBERS; ++i) {
            _members.push(address(uint160(uint256(keccak256(abi.encode("giliran.fake.member", i))))));
        }
    }

    /// @notice The owner can take every token the contract holds. This is the red flag.
    function withdraw() external {
        if (msg.sender != owner) revert NotOwner();
        uint256 bal = token.balanceOf(address(this));
        token.transfer(owner, bal);
        emit Withdrawn(owner, bal);
    }

    function memberCount() external pure returns (uint256) {
        return CLAIMED_MEMBERS;
    }

    function memberCap() external pure returns (uint256) {
        return CLAIMED_MEMBERS;
    }

    function depositOf(address member) external view returns (uint256) {
        return _deposit[member];
    }

    function feeBps() external pure returns (uint256) {
        return 500;
    }

    /// @notice Advertises contributions plus the promised 20%, which no honest circle can pay.
    function payoutPerRound() external view returns (uint256) {
        return (contribution * CLAIMED_MEMBERS * 12_000) / 10_000;
    }

    function promisedReturnBps() external pure returns (uint256) {
        return 2_000;
    }

    function members() external view returns (address[] memory) {
        return _members;
    }
}
