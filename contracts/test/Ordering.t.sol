// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Circle, CircleConfig} from "../src/Circle.sol";

contract OrderingTest is Base {
    address[] internal veterans;
    address internal tier2;
    address internal tier1;

    function setUp() public override {
        super.setUp();
        // Tier 2: a completed 12-member circle gives 12 on-time payments and no misses.
        address[] memory twelve = _members("vet", 12);
        _runPrepaidCircle(twelve);
        tier2 = twelve[0];
        for (uint256 i; i < 12; ++i) veterans.push(twelve[i]);
        // Tier 1: a completed 2-member circle.
        address[] memory pair = _members("pair", 2);
        _runPrepaidCircle(pair);
        tier1 = pair[0];
    }

    function test_TierSetup() public {
        assertEq(registry.tierOf(tier2), 2);
        assertEq(registry.tierOf(tier1), 1);
        assertEq(registry.tierOf(makeAddr("newbie")), 0);
    }

    function testFuzz_NewcomersAlwaysLast(bytes32 seed) public {
        address[] memory list = new address[](6);
        list[0] = makeAddr("new0");
        list[1] = tier1;
        list[2] = makeAddr("new1");
        list[3] = tier2;
        list[4] = veterans[1];
        list[5] = makeAddr("new2");

        Circle c = _newCircle(6);
        address[] memory out = c.tieredOrder(list, seed);
        assertEq(out.length, 6);
        // Highest tiers first: two tier-2 veterans, then tier 1, then the three newcomers.
        assertEq(registry.tierOf(out[0]), 2);
        assertEq(registry.tierOf(out[1]), 2);
        assertEq(out[2], tier1);
        for (uint256 i = 3; i < 6; ++i) {
            assertEq(registry.tierOf(out[i]), 0);
        }
        // Permutation check: everyone appears exactly once.
        for (uint256 i; i < 6; ++i) {
            uint256 hits;
            for (uint256 j; j < 6; ++j) {
                if (out[j] == list[i]) hits++;
            }
            assertEq(hits, 1);
        }
    }

    function testFuzz_DrawnOrderPlacesNewcomerLast(bytes32 bh) public {
        vm.assume(bh != bytes32(0));
        Circle c = _newCircle(4);
        address newbie = makeAddr("newbie");
        address[] memory ms = new address[](4);
        ms[0] = veterans[2];
        ms[1] = veterans[3];
        ms[2] = tier1;
        ms[3] = newbie;
        _joinAll(c, ms);
        _revealWith(c, bh);
        assertEq(c.recipientOf(4), newbie);
    }

    function test_Tier2BeforeTier1() public {
        Circle c = _newCircle(2);
        address[] memory ms = new address[](2);
        ms[0] = tier1;
        ms[1] = tier2;
        _joinAll(c, ms);
        _reveal(c);
        assertEq(c.recipientOf(1), tier2);
        assertEq(c.recipientOf(2), tier1);
    }

    function test_ShuffleWithinTierDependsOnSeed() public {
        Circle c = _newCircle(5);
        address[] memory list = _members("n", 5);
        address[] memory a = c.tieredOrder(list, bytes32(uint256(1)));
        bool differs;
        for (uint256 s = 2; s < 10 && !differs; ++s) {
            address[] memory b = c.tieredOrder(list, bytes32(s));
            for (uint256 i; i < 5; ++i) {
                if (a[i] != b[i]) differs = true;
            }
        }
        assertTrue(differs);
    }
}

contract CommitRevealTest is Base {
    function _filled() internal returns (Circle c) {
        c = _newCircle(3);
        _joinAll(c, _members("m", 3));
    }

    function test_WrongSecretReverts() public {
        Circle c = _filled();
        vm.roll(c.fillBlock() + 2);
        vm.setBlockhash(c.fillBlock() + 1, keccak256("x"));
        vm.expectRevert(Circle.BadSecret.selector);
        c.revealOrder(keccak256("not the secret"));
    }

    function test_RevealBeforeNextBlockReverts() public {
        Circle c = _filled();
        vm.expectRevert(Circle.RevealTooEarly.selector);
        c.revealOrder(SECRET);
    }

    function test_RevealAfterBlockhashExpiredReverts() public {
        Circle c = _filled();
        vm.roll(c.fillBlock() + 300);
        vm.expectRevert(Circle.RevealExpired.selector);
        c.revealOrder(SECRET);
    }

    function test_RevealBeforeFillReverts() public {
        Circle c = _newCircle(3);
        vm.expectRevert(abi.encodeWithSelector(Circle.WrongState.selector, Circle.State.Drawing, Circle.State.Joining));
        c.revealOrder(SECRET);
    }

    function test_FallbackDrawOnlyAfterTimeout() public {
        Circle c = _filled();
        vm.roll(block.number + 5);
        vm.expectRevert(Circle.FallbackTooEarly.selector);
        c.fallbackDraw();
        vm.warp(c.fillTime() + c.revealTimeout());
        vm.expectRevert(Circle.FallbackTooEarly.selector);
        c.fallbackDraw();
        vm.warp(c.fillTime() + c.revealTimeout() + 1);
        vm.prank(makeAddr("anyone"));
        c.fallbackDraw();
        assertTrue(c.orderFromFallback());
        assertEq(c.order().length, 3);
        assertEq(uint256(c.state()), uint256(Circle.State.Active));
    }

    function test_OrganiserCannotRevealAfterFallback() public {
        Circle c = _filled();
        vm.warp(c.fillTime() + c.revealTimeout() + 1);
        vm.roll(c.fillBlock() + 3);
        c.fallbackDraw();
        vm.setBlockhash(c.fillBlock() + 1, keccak256("x"));
        vm.prank(organiser);
        vm.expectRevert(abi.encodeWithSelector(Circle.WrongState.selector, Circle.State.Drawing, Circle.State.Active));
        c.revealOrder(SECRET);
    }

    function test_DemoRevealTimeoutIsTenMinutes() public {
        CircleConfig memory cfg = _cfg(3);
        cfg.demo = true;
        cfg.roundDuration = 120;
        cfg.graceDuration = 30;
        Circle c = _newCircle(cfg);
        assertEq(c.revealTimeout(), 10 minutes);
        assertEq(_newCircle(3).revealTimeout(), 1 days);
    }
}
