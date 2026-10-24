// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {Circle, CircleConfig} from "../src/Circle.sol";
import {AttestationRequest} from "../src/interfaces/IEAS.sol";

contract MockEAS {
    uint256 public count;
    AttestationRequest internal _last;

    function attest(AttestationRequest calldata req) external payable returns (bytes32) {
        count++;
        _last = req;
        return keccak256(abi.encode(count));
    }

    function lastRecipient() external view returns (address) {
        return _last.data.recipient;
    }

    function lastData() external view returns (bytes memory) {
        return _last.data.data;
    }

    function lastRevocable() external view returns (bool) {
        return _last.data.revocable;
    }
}

contract RevertingEAS {
    function attest(AttestationRequest calldata) external payable returns (bytes32) {
        revert("eas down");
    }
}

abstract contract Base is Test {
    bytes32 internal constant SECRET = keccak256("organiser secret");
    uint256 internal constant C = 10e6; // 10 tUSDC
    address internal constant FAKE_USDC = address(0xC1C1E);

    MockUSDC internal usdc;
    SavingsRegistry internal registry;
    CircleFactory internal factory;
    MockEAS internal eas;
    address internal organiser = makeAddr("organiser");

    function setUp() public virtual {
        eas = new MockEAS();
        _deploy(address(eas));
    }

    function _deploy(address eas_) internal {
        usdc = new MockUSDC();
        address predicted = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        registry = new SavingsRegistry(predicted, eas_);
        factory = new CircleFactory(registry, address(usdc), FAKE_USDC);
        registry.setSchemaUID(keccak256("schema"));
    }

    function _cfg(uint8 cap) internal view returns (CircleConfig memory) {
        return CircleConfig({
            token: address(usdc),
            contribution: C,
            memberCap: cap,
            roundDuration: 1 days,
            graceDuration: 1 days,
            joinDeadline: uint64(block.timestamp + 7 days),
            demo: false
        });
    }

    function _commit(bytes32 secret, address org) internal pure returns (bytes32) {
        return keccak256(abi.encode(secret, org));
    }

    function _newCircle(uint8 cap) internal returns (Circle) {
        return _newCircle(_cfg(cap));
    }

    function _newCircle(CircleConfig memory cfg) internal returns (Circle c) {
        vm.prank(organiser);
        c = Circle(payable(factory.createCircle(cfg, _commit(SECRET, organiser))));
    }

    function _members(string memory prefix, uint256 n) internal returns (address[] memory ms) {
        ms = new address[](n);
        for (uint256 i; i < n; ++i) {
            ms[i] = makeAddr(string.concat(prefix, vm.toString(i)));
        }
    }

    function _fund(address m, address spender) internal {
        // Faucet has a 24h cooldown; tests need more than one drip per member.
        if (usdc.balanceOf(m) < 500e6) deal(address(usdc), m, 1_000e6);
        vm.prank(m);
        usdc.approve(spender, type(uint256).max);
    }

    function _joinAll(Circle c, address[] memory ms) internal {
        for (uint256 i; i < ms.length; ++i) {
            _fund(ms[i], address(c));
            vm.prank(ms[i]);
            c.join();
        }
    }

    function _joinAllPrepaid(Circle c, address[] memory ms) internal {
        uint8 cap = uint8(c.memberCap());
        for (uint256 i; i < ms.length; ++i) {
            _fund(ms[i], address(c));
            vm.prank(ms[i]);
            c.joinWithPrepay(cap);
        }
    }

    function _reveal(Circle c) internal {
        _revealWith(c, keccak256(abi.encode("bh", address(c))));
    }

    function _revealWith(Circle c, bytes32 bh) internal {
        uint256 fb = c.fillBlock();
        vm.roll(fb + 2);
        vm.setBlockhash(fb + 1, bh);
        c.revealOrder(SECRET);
    }

    /// Runs a fully prepaid circle to completion, building reputation for `ms`.
    function _runPrepaidCircle(address[] memory ms) internal returns (Circle c) {
        c = _newCircle(uint8(ms.length));
        _joinAllPrepaid(c, ms);
        _reveal(c);
        while (c.state() == Circle.State.Active) {
            vm.warp(c.roundStart(c.currentRound()));
            c.settleRound();
        }
    }

    function _contributeAll(Circle c, address[] memory ms) internal {
        for (uint256 i; i < ms.length; ++i) {
            if (c.paidRounds(ms[i]) < c.currentRound()) {
                vm.prank(ms[i]);
                c.contribute();
            }
        }
    }
}
