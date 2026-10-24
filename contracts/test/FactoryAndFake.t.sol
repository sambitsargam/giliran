// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Circle, CircleConfig} from "../src/Circle.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {FakeCircleDemo} from "../src/demo/FakeCircleDemo.sol";

contract FactoryTest is Base {
    function test_CreateRecordsCircle() public {
        Circle c = _newCircle(5);
        assertTrue(factory.isCircle(address(c)));
        assertEq(c.organiser(), organiser);
        assertEq(c.factory(), address(factory));
        assertFalse(factory.isCircle(address(this)));
    }

    function test_RejectsBadConfigs() public {
        bytes32 commit = _commit(SECRET, organiser);
        CircleConfig memory cfg = _cfg(21);
        vm.expectRevert(CircleFactory.BadMemberCap.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(1);
        vm.expectRevert(CircleFactory.BadMemberCap.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(5);
        cfg.roundDuration = 1 days - 1;
        vm.expectRevert(CircleFactory.RoundTooShort.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(5);
        cfg.demo = true;
        cfg.roundDuration = 59;
        cfg.graceDuration = 30;
        vm.expectRevert(CircleFactory.RoundTooShort.selector);
        factory.createCircle(cfg, commit);

        cfg.roundDuration = 60;
        cfg.graceDuration = 29;
        vm.expectRevert(CircleFactory.GraceTooShort.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(5);
        cfg.token = address(0xBAD);
        vm.expectRevert(CircleFactory.UnsupportedToken.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(5);
        cfg.contribution = 0;
        vm.expectRevert(CircleFactory.ZeroContribution.selector);
        factory.createCircle(cfg, commit);

        cfg = _cfg(5);
        cfg.joinDeadline = uint64(block.timestamp);
        vm.expectRevert(CircleFactory.BadJoinDeadline.selector);
        factory.createCircle(cfg, commit);

        vm.expectRevert(CircleFactory.EmptyCommit.selector);
        factory.createCircle(_cfg(5), bytes32(0));
    }

    function test_DemoAllowsShortRounds() public {
        CircleConfig memory cfg = _cfg(5);
        cfg.demo = true;
        cfg.roundDuration = 60;
        cfg.graceDuration = 30;
        Circle c = _newCircle(cfg);
        assertTrue(c.demo());
        assertEq(c.roundDuration(), 60);
    }

    function test_AcceptsRealUsdcAddress() public {
        CircleConfig memory cfg = _cfg(5);
        cfg.token = FAKE_USDC;
        Circle c = _newCircle(cfg);
        assertEq(address(c.token()), FAKE_USDC);
    }

    function test_FactoryRejectsForeignRegistry() public {
        SavingsRegistry other = new SavingsRegistry(address(0x1234), address(eas));
        vm.expectRevert(CircleFactory.RegistryMismatch.selector);
        new CircleFactory(other, address(usdc), FAKE_USDC);
    }
}

contract MockUsdcTest is Base {
    function test_FaucetOncePerDay() public {
        address u = makeAddr("u");
        vm.startPrank(u);
        usdc.faucet();
        assertEq(usdc.balanceOf(u), 100e6);
        assertEq(usdc.decimals(), 6);
        vm.expectRevert(abi.encodeWithSelector(MockUSDC.FaucetCooldown.selector, block.timestamp + 1 days));
        usdc.faucet();
        vm.warp(block.timestamp + 1 days);
        usdc.faucet();
        assertEq(usdc.balanceOf(u), 200e6);
        vm.stopPrank();
    }

    function test_TransferFromNeedsAllowance() public {
        address u = makeAddr("u");
        vm.prank(u);
        usdc.faucet();
        vm.expectRevert(MockUSDC.InsufficientAllowance.selector);
        usdc.transferFrom(u, address(this), 1);
    }
}

contract FakeCircleDemoTest is Base {
    FakeCircleDemo internal fake;
    address internal scammer = makeAddr("scammer");

    function setUp() public override {
        super.setUp();
        address[3] memory real = [makeAddr("r0"), makeAddr("r1"), makeAddr("r2")];
        vm.prank(scammer);
        fake = new FakeCircleDemo(address(usdc), C, real);
    }

    function test_ReportsDishonestValues() public view {
        assertEq(fake.memberCount(), 10);
        assertEq(fake.feeBps(), 500);
        assertEq(fake.promisedReturnBps(), 2000);
        assertTrue(fake.payoutPerRound() != fake.contribution() * fake.memberCap());
        assertFalse(factory.isCircle(address(fake)));

        address[] memory ms = fake.members();
        assertEq(ms.length, 10);
        uint256 empty;
        for (uint256 i; i < ms.length; ++i) {
            if (fake.depositOf(ms[i]) == 0) empty++;
        }
        assertEq(empty, 7);
        assertEq(fake.owner(), scammer);
    }

    function test_OwnerCanWithdraw() public {
        deal(address(usdc), address(fake), 50e6);
        vm.prank(scammer);
        fake.withdraw();
        assertEq(usdc.balanceOf(scammer), 50e6);
        assertEq(usdc.balanceOf(address(fake)), 0);
    }
}
