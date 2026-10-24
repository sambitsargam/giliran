// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEAS, AttestationRequest, AttestationRequestData} from "./interfaces/IEAS.sol";

interface ICircleFactoryLike {
    function isCircle(address) external view returns (bool);
}

/// @title SavingsRegistry
/// @notice Source of truth for the Savings Passport. Only circles deployed by the Giliran factory
///         can write, so a record here means real money moved through a real circle. Each payment
///         event is also attested on EAS so lenders can verify it without trusting this app.
contract SavingsRegistry {
    struct Passport {
        uint32 onTimePayments;
        uint32 latePayments;
        uint32 missedPayments;
        uint32 circlesCompleted;
        uint32 circlesJoined;
        uint64 firstSeen;
    }

    uint8 public constant STATUS_ON_TIME = 0;
    uint8 public constant STATUS_LATE = 1;
    uint8 public constant STATUS_MISSED = 2;

    string public constant SCHEMA = "address circle,uint32 round,uint8 status,uint64 paidAt";

    // Bounded so a misbehaving attestation call can never eat the gas a payout needs.
    uint256 internal constant ATTEST_GAS = 400_000;

    ICircleFactoryLike public immutable factory;
    IEAS public immutable eas;
    /// @notice The only address allowed to set the schema UID, exactly once.
    address public immutable schemaSetter;

    bytes32 public schemaUID;

    mapping(address => Passport) internal _passports;

    event SchemaSet(bytes32 indexed uid);
    event Joined(address indexed member, address indexed circle);
    event PaymentRecorded(address indexed member, address indexed circle, uint32 round, uint8 status, uint64 paidAt);
    event Attested(address indexed member, address indexed circle, uint32 round, bytes32 uid);
    event AttestationFailed(address indexed member, address indexed circle, uint32 round, uint8 status);
    event CircleCompleted(address indexed member, address indexed circle);

    error NotCircle();
    error NotSchemaSetter();
    error SchemaAlreadySet();
    error InvalidStatus();
    error ZeroSchema();

    modifier onlyCircle() {
        if (!factory.isCircle(msg.sender)) revert NotCircle();
        _;
    }

    /// @param factory_ The CircleFactory (its address is predicted before deployment).
    /// @param eas_ EAS contract; on Base Sepolia the OP-Stack predeploy 0x4200…0021.
    constructor(address factory_, address eas_) {
        factory = ICircleFactoryLike(factory_);
        eas = IEAS(eas_);
        schemaSetter = msg.sender;
    }

    /// @notice One-time setter for the EAS schema UID. Locks after first use.
    function setSchemaUID(bytes32 uid) external {
        if (msg.sender != schemaSetter) revert NotSchemaSetter();
        if (schemaUID != bytes32(0)) revert SchemaAlreadySet();
        if (uid == bytes32(0)) revert ZeroSchema();
        schemaUID = uid;
        emit SchemaSet(uid);
    }

    /// @notice Records that `member` joined a circle. Callable by factory circles only.
    function recordJoin(address member) external onlyCircle {
        Passport storage p = _passports[member];
        if (p.firstSeen == 0) p.firstSeen = uint64(block.timestamp);
        p.circlesJoined += 1;
        emit Joined(member, msg.sender);
    }

    /// @notice Records one round's payment outcome for `member` and attests it on EAS.
    /// @dev A failing attestation never blocks the payment; it emits `AttestationFailed` instead.
    function recordPayment(address member, uint32 round, uint8 status, uint64 paidAt) external onlyCircle {
        Passport storage p = _passports[member];
        if (status == STATUS_ON_TIME) p.onTimePayments += 1;
        else if (status == STATUS_LATE) p.latePayments += 1;
        else if (status == STATUS_MISSED) p.missedPayments += 1;
        else revert InvalidStatus();
        if (p.firstSeen == 0) p.firstSeen = uint64(block.timestamp);
        emit PaymentRecorded(member, msg.sender, round, status, paidAt);
        _attest(member, round, status, paidAt);
    }

    /// @notice Records that `member` finished a circle without a shortfall.
    function recordCompletion(address member) external onlyCircle {
        _passports[member].circlesCompleted += 1;
        emit CircleCompleted(member, msg.sender);
    }

    /// @notice Aggregate record for `member`. Contains counts only, never amounts or circles.
    function passportOf(address member) external view returns (Passport memory) {
        return _passports[member];
    }

    /// @notice Reputation tier used to order payouts.
    /// @return 2 = at least 12 on-time, none missed, at least 1 completed;
    ///         1 = at least 1 completed and at most 1 missed; 0 = newcomer.
    function tierOf(address member) public view returns (uint8) {
        Passport memory p = _passports[member];
        if (p.onTimePayments >= 12 && p.missedPayments == 0 && p.circlesCompleted >= 1) return 2;
        if (p.circlesCompleted >= 1 && p.missedPayments <= 1) return 1;
        return 0;
    }

    function _attest(address member, uint32 round, uint8 status, uint64 paidAt) internal {
        bytes32 schema = schemaUID;
        // try/catch cannot catch a call to an address without code, so check first.
        if (schema == bytes32(0) || address(eas).code.length == 0) {
            emit AttestationFailed(member, msg.sender, round, status);
            return;
        }
        AttestationRequest memory req = AttestationRequest({
            schema: schema,
            data: AttestationRequestData({
                recipient: member,
                expirationTime: 0,
                revocable: false,
                refUID: bytes32(0),
                data: abi.encode(msg.sender, round, status, paidAt),
                value: 0
            })
        });
        try eas.attest{gas: ATTEST_GAS}(req) returns (bytes32 uid) {
            emit Attested(member, msg.sender, round, uid);
        } catch {
            emit AttestationFailed(member, msg.sender, round, status);
        }
    }
}
