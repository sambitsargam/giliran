// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base, RevertingEAS} from "./Base.t.sol";
import {Circle} from "../src/Circle.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";

contract RegistryTest is Base {
    function test_OnlyFactoryCirclesCanWrite() public {
        vm.expectRevert(SavingsRegistry.NotCircle.selector);
        registry.recordPayment(address(this), 1, 0, 0);
        vm.expectRevert(SavingsRegistry.NotCircle.selector);
        registry.recordJoin(address(this));
        vm.expectRevert(SavingsRegistry.NotCircle.selector);
        registry.recordCompletion(address(this));
    }

    function test_LookalikeCircleCannotWrite() public {
        // Same bytecode, but not deployed by the factory.
        Circle rogue = new Circle(_cfg(2), _commit(SECRET, organiser), organiser, registry);
        address m = makeAddr("m");
        _fund(m, address(rogue));
        vm.prank(m);
        vm.expectRevert(SavingsRegistry.NotCircle.selector);
        rogue.join();
        assertFalse(factory.isCircle(address(rogue)));
    }

    function test_SchemaSetterIsOneTime() public {
        vm.expectRevert(SavingsRegistry.SchemaAlreadySet.selector);
        registry.setSchemaUID(keccak256("other"));

        SavingsRegistry fresh = new SavingsRegistry(address(factory), address(eas));
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(SavingsRegistry.NotSchemaSetter.selector);
        fresh.setSchemaUID(keccak256("s"));
        vm.expectRevert(SavingsRegistry.ZeroSchema.selector);
        fresh.setSchemaUID(bytes32(0));
    }

    function test_TierThresholds() public {
        address[] memory pair = _members("p", 2);
        assertEq(registry.tierOf(pair[0]), 0);
        _runPrepaidCircle(pair);
        // Completed with 2 on-time payments: tier 1, not yet tier 2.
        assertEq(registry.tierOf(pair[0]), 1);
        SavingsRegistry.Passport memory p = registry.passportOf(pair[0]);
        assertEq(p.onTimePayments, 2);
        assertEq(p.circlesCompleted, 1);
        assertGt(p.firstSeen, 0);
    }

    function test_TwoMissesDropTier() public {
        address[] memory pair = _members("p", 2);
        _runPrepaidCircle(pair);
        assertEq(registry.tierOf(pair[0]), 1);

        // pair[0] joins a 3-member circle and misses two rounds.
        Circle c = _newCircle(3);
        address[] memory ms = new address[](3);
        ms[0] = pair[0];
        ms[1] = makeAddr("x");
        ms[2] = makeAddr("y");
        _joinAll(c, ms);
        _reveal(c);
        for (uint256 r = 1; r <= 2; ++r) {
            vm.warp(c.roundStart(r));
            vm.prank(ms[1]);
            c.contribute();
            vm.prank(ms[2]);
            c.contribute();
            vm.warp(c.graceEnd(r) + 1);
            c.settleRound();
        }
        assertEq(registry.passportOf(pair[0]).missedPayments, 2);
        assertEq(registry.tierOf(pair[0]), 0);
    }
}

contract EasFailureTest is Base {
    function setUp() public override {
        _deploy(address(new RevertingEAS()));
    }

    function test_EasRevertDoesNotBlockPayment() public {
        Circle c = _newCircle(2);
        address[] memory ms = _members("m", 2);
        _joinAll(c, ms);
        _reveal(c);
        address recipient = c.recipientOf(1);
        uint256 before = usdc.balanceOf(recipient);

        vm.prank(ms[0]);
        c.contribute();
        vm.expectEmit(true, true, false, true, address(registry));
        emit SavingsRegistry.AttestationFailed(ms[0], address(c), 1, 0);
        vm.prank(ms[1]);
        c.contribute();

        assertEq(c.currentRound(), 2);
        assertEq(usdc.balanceOf(recipient), before - C + 2 * C);
        assertEq(registry.passportOf(ms[0]).onTimePayments, 1);
    }

    function test_MissingEasCodeDoesNotBlockPayment() public {
        _deploy(address(0xEA5));
        Circle c = _newCircle(2);
        address[] memory ms = _members("m", 2);
        _joinAll(c, ms);
        _reveal(c);
        _contributeAll(c, ms);
        assertEq(c.currentRound(), 2);
    }
}
