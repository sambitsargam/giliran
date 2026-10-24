// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Base} from "./Base.t.sol";
import {Circle} from "../src/Circle.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract CircleHandler is Test {
    Circle public c;
    MockUSDC public usdc;
    address[] public ms;

    constructor(Circle c_, MockUSDC usdc_, address[] memory ms_) {
        c = c_;
        usdc = usdc_;
        ms = ms_;
    }

    function contribute(uint256 who) external {
        address m = ms[who % ms.length];
        vm.prank(m);
        try c.contribute() {} catch {}
    }

    function prepay(uint256 who, uint8 rounds) external {
        address m = ms[who % ms.length];
        rounds = uint8(bound(rounds, 1, 3));
        vm.prank(m);
        try c.prepay(rounds) {} catch {}
    }

    function settle() external {
        try c.settleRound() {} catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1 hours, 3 days));
    }

    function tryWithdraw() external {
        try c.organiserWithdraw() {} catch {}
    }
}

contract CircleInvariantTest is Base {
    Circle internal c;
    CircleHandler internal handler;

    function setUp() public override {
        super.setUp();
        c = _newCircle(5);
        address[] memory ms = _members("inv", 5);
        _joinAll(c, ms);
        _reveal(c);
        handler = new CircleHandler(c, usdc, ms);
        targetContract(address(handler));
    }

    /// The circle always holds at least what it still owes.
    function invariant_BalanceCoversObligations() public view {
        assertGe(usdc.balanceOf(address(c)), c.outstanding());
    }

    /// Nothing ever leaves the circle beyond what members paid in.
    function invariant_PaidOutNeverExceedsPaidIn() public view {
        assertLe(c.totalPaidOut() + c.totalDepositsReturned(), c.totalPaidIn());
        assertEq(usdc.balanceOf(address(c)), c.totalPaidIn() - c.totalPaidOut() - c.totalDepositsReturned());
    }
}
