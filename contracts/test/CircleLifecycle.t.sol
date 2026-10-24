// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base} from "./Base.t.sol";
import {Circle, CircleConfig} from "../src/Circle.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";

contract CircleLifecycleTest is Base {
    function test_FullHonestCycleFiveMembers() public {
        Circle c = _newCircle(5);
        address[] memory ms = _members("m", 5);
        _joinAll(c, ms);
        assertEq(uint256(c.state()), uint256(Circle.State.Drawing));
        _reveal(c);
        assertEq(uint256(c.state()), uint256(Circle.State.Active));

        uint256[] memory before = new uint256[](5);
        for (uint256 i; i < 5; ++i) before[i] = usdc.balanceOf(ms[i]);

        address[] memory ord = c.order();
        for (uint256 r = 1; r <= 5; ++r) {
            vm.warp(c.roundStart(r) + 1 hours);
            address recipient = ord[r - 1];
            uint256 recBefore = usdc.balanceOf(recipient);
            _contributeAll(c, ms);
            // Recipient paid C this round and received the full pot in the same tx.
            uint256 recAfter = usdc.balanceOf(recipient);
            if (r < 5) assertEq(recAfter + C, recBefore + C * 5);
        }

        assertEq(uint256(c.state()), uint256(Circle.State.Completed));
        assertEq(usdc.balanceOf(address(c)), 0);
        for (uint256 i; i < 5; ++i) {
            // Pays 5 rounds, receives one pot of 5, gets the deposit back: net zero overall.
            assertEq(usdc.balanceOf(ms[i]), before[i] + C);
            assertEq(c.depositOf(ms[i]), 0);
            SavingsRegistry.Passport memory p = registry.passportOf(ms[i]);
            assertEq(p.onTimePayments, 5);
            assertEq(p.circlesCompleted, 1);
            assertEq(p.circlesJoined, 1);
        }
        assertEq(c.totalPaidOut() + c.totalDepositsReturned(), c.totalPaidIn());
        assertEq(eas.count(), 25);
    }

    function test_LatePayerWithinGraceIsLate() public {
        Circle c = _newCircle(3);
        address[] memory ms = _members("m", 3);
        _joinAll(c, ms);
        _reveal(c);

        vm.prank(ms[0]);
        c.contribute();
        vm.prank(ms[1]);
        c.contribute();
        vm.warp(c.roundDeadline(1) + 1);
        vm.expectEmit(true, true, false, true, address(c));
        emit Circle.Contributed(ms[2], 1, 1);
        vm.prank(ms[2]);
        c.contribute();

        assertEq(c.currentRound(), 2);
        assertEq(registry.passportOf(ms[2]).latePayments, 1);
        assertEq(registry.passportOf(ms[0]).onTimePayments, 1);
    }

    function test_MissedAfterGraceUsesDepositAndAttests() public {
        Circle c = _newCircle(3);
        address[] memory ms = _members("m", 3);
        _joinAll(c, ms);
        _reveal(c);
        address recipient = c.recipientOf(1);

        vm.prank(ms[0]);
        c.contribute();
        vm.prank(ms[1]);
        c.contribute();

        vm.expectRevert(Circle.NothingToSettle.selector);
        c.settleRound();

        vm.warp(c.graceEnd(1) + 1);
        vm.prank(ms[2]);
        vm.expectRevert(Circle.RoundOverdue.selector);
        c.contribute();

        uint256 recBefore = usdc.balanceOf(recipient);
        uint256 easBefore = eas.count();
        vm.prank(makeAddr("anyone"));
        c.settleRound();

        assertEq(usdc.balanceOf(recipient), recBefore + 3 * C);
        assertEq(c.depositOf(ms[2]), 0);
        assertEq(registry.passportOf(ms[2]).missedPayments, 1);
        assertEq(eas.count(), easBefore + 3);
        // The last attestation in the loop is for ms[2] with status missed.
        assertEq(eas.lastRecipient(), ms[2]);
        (address circ, uint32 round, uint8 status,) = abi.decode(eas.lastData(), (address, uint32, uint8, uint64));
        assertEq(circ, address(c));
        assertEq(round, 1);
        assertEq(status, 2);
        assertFalse(eas.lastRevocable());
    }

    function test_EarlyCollectorDefaultsShortfallButCompletes() public {
        Circle c = _newCircle(4);
        address[] memory ms = _members("m", 4);
        _joinAll(c, ms);
        _reveal(c);
        address defaulter = c.recipientOf(1);

        vm.warp(c.roundStart(1));
        _contributeAll(c, ms);
        assertEq(c.currentRound(), 2);

        bool sawShortfall;
        for (uint256 r = 2; r <= 4; ++r) {
            vm.warp(c.roundStart(r));
            for (uint256 i; i < 4; ++i) {
                if (ms[i] != defaulter) {
                    vm.prank(ms[i]);
                    c.contribute();
                }
            }
            vm.warp(c.graceEnd(r) + 1);
            if (r == 3) {
                vm.expectEmit(true, true, false, true, address(c));
                emit Circle.Shortfall(defaulter, 3, C);
                sawShortfall = true;
            }
            c.settleRound();
        }
        assertTrue(sawShortfall);
        assertEq(uint256(c.state()), uint256(Circle.State.Completed));
        assertTrue(c.hadShortfall(defaulter));
        assertEq(registry.passportOf(defaulter).missedPayments, 3);
        assertEq(registry.passportOf(defaulter).circlesCompleted, 0);
        assertEq(registry.passportOf(ms[0] == defaulter ? ms[1] : ms[0]).circlesCompleted, 1);
        assertLe(c.totalPaidOut() + c.totalDepositsReturned(), c.totalPaidIn());
        assertEq(usdc.balanceOf(address(c)), 0);
    }

    function test_OrganiserWithdrawAlwaysReverts() public {
        Circle c = _newCircle(3);
        _joinAll(c, _members("m", 3));
        vm.prank(organiser);
        vm.expectRevert(Circle.NoOneCanWithdraw.selector);
        c.organiserWithdraw();
        vm.expectRevert(Circle.NoOneCanWithdraw.selector);
        c.organiserWithdraw();
    }

    function test_ReceiveReverts() public {
        Circle c = _newCircle(3);
        vm.deal(address(this), 1 ether);
        (bool ok, bytes memory ret) = address(c).call{value: 1}("");
        assertFalse(ok);
        assertEq(bytes4(ret), Circle.NoOneCanWithdraw.selector);
    }

    function test_FallbackReverts() public {
        Circle c = _newCircle(3);
        (bool ok, bytes memory ret) = address(c).call(abi.encodeWithSignature("withdrawAll(address)", organiser));
        assertFalse(ok);
        assertEq(bytes4(ret), Circle.NoOneCanWithdraw.selector);
    }

    function test_TwentyFirstMemberReverts() public {
        Circle c = _newCircle(20);
        _joinAll(c, _members("m", 20));
        assertEq(c.memberCount(), 20);
        address extra = makeAddr("extra");
        _fund(extra, address(c));
        vm.prank(extra);
        vm.expectRevert(abi.encodeWithSelector(Circle.WrongState.selector, Circle.State.Joining, Circle.State.Drawing));
        c.join();
    }

    function test_DoubleJoinReverts() public {
        Circle c = _newCircle(3);
        address m = makeAddr("m");
        _fund(m, address(c));
        vm.startPrank(m);
        c.join();
        vm.expectRevert(Circle.AlreadyMember.selector);
        c.join();
        vm.stopPrank();
    }

    function test_JoinAfterDeadlineReverts() public {
        Circle c = _newCircle(3);
        address m = makeAddr("m");
        _fund(m, address(c));
        vm.warp(c.joinDeadline() + 1);
        vm.prank(m);
        vm.expectRevert(Circle.JoinClosed.selector);
        c.join();
    }

    function test_RefundWhenCircleNeverFills() public {
        Circle c = _newCircle(5);
        address m = makeAddr("m");
        _fund(m, address(c));
        uint256 bal = usdc.balanceOf(m);
        vm.prank(m);
        c.joinWithPrepay(2);
        assertEq(usdc.balanceOf(m), bal - 3 * C);

        vm.prank(m);
        vm.expectRevert(Circle.StillOpen.selector);
        c.refundUnfilled();

        vm.warp(c.joinDeadline() + 1);
        vm.prank(m);
        c.refundUnfilled();
        assertEq(usdc.balanceOf(m), bal);
        assertEq(uint256(c.state()), uint256(Circle.State.Cancelled));
        vm.prank(m);
        vm.expectRevert(Circle.NothingOwed.selector);
        c.refundUnfilled();
    }

    function test_PrepayCoversFutureRoundsWithoutBotAction() public {
        Circle c = _newCircle(3);
        address[] memory bots = _members("bot", 2);
        for (uint256 i; i < 2; ++i) {
            _fund(bots[i], address(c));
            vm.prank(bots[i]);
            c.joinWithPrepay(3);
        }
        address human = makeAddr("human");
        _fund(human, address(c));
        vm.prank(human);
        c.join();
        _reveal(c);

        for (uint256 r = 1; r <= 3; ++r) {
            vm.warp(c.roundStart(r) + 10);
            address recipient = c.recipientOf(r);
            uint256 before = usdc.balanceOf(recipient);
            // Only the human acts; the bots' prepayment completes each round.
            vm.prank(human);
            c.contribute();
            uint256 expected = recipient == human ? before - C + 3 * C : before + 3 * C;
            if (r < 3) assertEq(usdc.balanceOf(recipient), expected);
        }
        assertEq(uint256(c.state()), uint256(Circle.State.Completed));
        assertEq(registry.passportOf(bots[0]).onTimePayments, 3);
    }

    function test_FullyPrepaidRoundWaitsForItsSchedule() public {
        Circle c = _newCircle(3);
        _joinAllPrepaid(c, _members("m", 3));
        _reveal(c);
        // Round 1 opened at the draw and was fully prepaid, so it paid out immediately.
        assertEq(c.currentRound(), 2);
        // Round 2 has not opened yet, so nothing more can happen early.
        vm.expectRevert(Circle.NothingToSettle.selector);
        c.settleRound();
        vm.warp(c.roundStart(2));
        c.settleRound();
        assertEq(c.currentRound(), 3);
    }

    function test_PrepayDuringActiveAndContributeRejectsDoublePay() public {
        Circle c = _newCircle(3);
        address[] memory ms = _members("m", 3);
        _joinAll(c, ms);
        _reveal(c);
        vm.prank(ms[0]);
        c.prepay(3);
        assertEq(c.paidRounds(ms[0]), 3);
        vm.prank(ms[0]);
        vm.expectRevert(Circle.AlreadyPaid.selector);
        c.contribute();
        vm.prank(ms[0]);
        vm.expectRevert(Circle.InvalidRounds.selector);
        c.prepay(1);
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Circle.NotMember.selector);
        c.prepay(1);
    }

    function test_ViewInterfaceIsHonest() public {
        Circle c = _newCircle(7);
        assertEq(c.feeBps(), 0);
        assertEq(c.FEE_BPS(), 0);
        assertEq(c.promisedReturnBps(), 0);
        assertEq(c.payoutPerRound(), C * 7);
        assertEq(c.memberCap(), 7);
        address m = makeAddr("m");
        _fund(m, address(c));
        vm.prank(m);
        c.join();
        assertEq(c.depositOf(m), C);
        assertEq(c.members().length, 1);
    }

    function testFuzz_PayoutNeverExceedsPaidIn(uint8 cap, uint256 payMask, uint96 contribution) public {
        cap = uint8(bound(cap, 2, 8));
        contribution = uint96(bound(contribution, 1, 50e6));
        CircleConfig memory cfg = _cfg(cap);
        cfg.contribution = contribution;
        Circle c = _newCircle(cfg);
        address[] memory ms = _members("f", cap);
        _joinAll(c, ms);
        _reveal(c);

        for (uint256 r = 1; r <= cap; ++r) {
            vm.warp(c.roundStart(r));
            for (uint256 i; i < cap; ++i) {
                if ((payMask >> ((r * cap + i) % 256)) & 1 == 1 && c.paidRounds(ms[i]) < r) {
                    vm.prank(ms[i]);
                    c.contribute();
                }
            }
            if (c.currentRound() == r) {
                vm.warp(c.graceEnd(r) + 1);
                c.settleRound();
            }
            assertLe(c.totalPaidOut() + c.totalDepositsReturned(), c.totalPaidIn());
            assertGe(usdc.balanceOf(address(c)), c.outstanding());
        }
        assertEq(uint256(c.state()), uint256(Circle.State.Completed));
        assertEq(c.totalPaidOut() + c.totalDepositsReturned(), c.totalPaidIn());
    }
}
