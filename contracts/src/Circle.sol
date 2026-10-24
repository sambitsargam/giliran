// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICircleView} from "./interfaces/ICircleView.sol";
import {SavingsRegistry} from "./SavingsRegistry.sol";

/// @notice Parameters fixed when a circle is created.
struct CircleConfig {
    address token;
    uint256 contribution;
    uint8 memberCap;
    uint32 roundDuration;
    uint32 graceDuration;
    uint64 joinDeadline;
    bool demo;
}

/// @title Circle
/// @notice One rotating savings circle (paluwagan, arisan, kutu, chit, susu, tanda). The contract
///         holds the pot. There is no owner, no admin, no pause, no upgrade and no withdraw path:
///         money leaves only as a round payout to that round's member or as a member's own deposit.
/// @dev Lifecycle: Joining -> Drawing -> Active -> Completed (or Joining -> Cancelled if it never fills).
///      Rounds follow a fixed schedule from the draw: round r opens at startTime + (r-1)*roundDuration.
contract Circle is ICircleView, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        Joining,
        Drawing,
        Active,
        Completed,
        Cancelled
    }

    /// @notice The organiser fee. Hard-coded to zero; chit-fund law draws the line at fees.
    uint256 public constant FEE_BPS = 0;
    uint256 public constant MAX_MEMBERS = 20;
    uint256 public constant DEMO_REVEAL_TIMEOUT = 10 minutes;

    IERC20 public immutable token;
    uint256 public immutable contribution;
    uint8 internal immutable _memberCap;
    uint32 public immutable roundDuration;
    uint32 public immutable graceDuration;
    uint64 public immutable joinDeadline;
    bool public immutable demo;
    address public immutable organiser;
    bytes32 public immutable orderCommit;
    SavingsRegistry public immutable registry;
    address public immutable factory;

    State public state;
    uint256 public fillBlock;
    uint256 public fillTime;
    uint256 public startTime;
    /// @notice The round that has not been paid out yet (1-based). 0 before the draw.
    uint256 public currentRound;
    bool public orderFromFallback;

    address[] internal _members;
    address[] internal _order;
    mapping(address => bool) public isMember;
    mapping(address => uint256) internal _deposit;
    /// @notice Rounds 1..paidRounds[m] are settled for m (paid, prepaid, or covered by the deposit).
    mapping(address => uint256) public paidRounds;
    mapping(address => bool) public hadShortfall;
    /// @notice Amounts whose push transfer failed, claimable by the owner of the funds.
    mapping(address => uint256) public owed;
    mapping(uint256 => mapping(address => uint64)) internal _paidAt;
    mapping(uint256 => mapping(address => bool)) public paidLate;

    uint256 public totalPaidIn;
    uint256 public totalPaidOut;
    uint256 public totalDepositsReturned;

    event Joined(address indexed member, uint256 prepaidRounds);
    event Filled(uint256 fillBlock);
    event OrderDrawn(address[] order);
    event Contributed(address indexed member, uint256 indexed round, uint8 status);
    event Prepaid(address indexed member, uint256 rounds, uint256 paidThrough);
    event MissedPayment(address indexed member, uint256 indexed round, uint256 takenFromDeposit);
    event Shortfall(address indexed member, uint256 indexed round, uint256 amount);
    event RoundPaidOut(uint256 indexed round, address indexed recipient, uint256 amount);
    event Completed();
    event DepositReturned(address indexed member, uint256 amount);
    event Credited(address indexed account, uint256 amount);
    event Claimed(address indexed account, uint256 amount);
    event Cancelled();
    event Refunded(address indexed member, uint256 amount);

    error NoOneCanWithdraw();
    error WrongState(State expected, State actual);
    error CircleFull();
    error JoinClosed();
    error AlreadyMember();
    error NotMember();
    error InvalidRounds();
    error BadSecret();
    error RevealTooEarly();
    error RevealExpired();
    error FallbackTooEarly();
    error AlreadyPaid();
    error RoundOverdue();
    error NothingToSettle();
    error NothingOwed();
    error StillOpen();

    constructor(CircleConfig memory cfg, bytes32 orderCommit_, address organiser_, SavingsRegistry registry_) {
        token = IERC20(cfg.token);
        contribution = cfg.contribution;
        _memberCap = cfg.memberCap;
        roundDuration = cfg.roundDuration;
        graceDuration = cfg.graceDuration;
        joinDeadline = cfg.joinDeadline;
        demo = cfg.demo;
        orderCommit = orderCommit_;
        organiser = organiser_;
        registry = registry_;
        factory = msg.sender;
    }

    // ---------------------------------------------------------------------
    // "Nobody can run with the money"
    // ---------------------------------------------------------------------

    /// @notice Always reverts. There is no withdraw path for the organiser or anyone else.
    /// @dev Exists only so the UI can send a real transaction that visibly fails on-chain with
    ///      `NoOneCanWithdraw`, proving there is no key that can take the pot.
    function organiserWithdraw() external pure {
        revert NoOneCanWithdraw();
    }

    receive() external payable {
        revert NoOneCanWithdraw();
    }

    fallback() external payable {
        revert NoOneCanWithdraw();
    }

    // ---------------------------------------------------------------------
    // Joining
    // ---------------------------------------------------------------------

    /// @notice Join the circle, paying one contribution as a security deposit.
    function join() external nonReentrant {
        _join(0);
    }

    /// @notice Join and prepay `rounds` contributions up front (paying ahead on payday).
    /// @param rounds Number of rounds to prepay, at most `memberCap`.
    function joinWithPrepay(uint8 rounds) external nonReentrant {
        if (rounds == 0 || rounds > _memberCap) revert InvalidRounds();
        _join(rounds);
    }

    function _join(uint256 rounds) internal {
        if (state != State.Joining) revert WrongState(State.Joining, state);
        if (block.timestamp > joinDeadline) revert JoinClosed();
        if (isMember[msg.sender]) revert AlreadyMember();
        if (_members.length >= _memberCap) revert CircleFull();

        uint256 amount = contribution * (1 + rounds);
        token.safeTransferFrom(msg.sender, address(this), amount);
        totalPaidIn += amount;

        isMember[msg.sender] = true;
        _members.push(msg.sender);
        _deposit[msg.sender] = contribution;
        if (rounds > 0) {
            paidRounds[msg.sender] = rounds;
            for (uint256 r = 1; r <= rounds; ++r) {
                _paidAt[r][msg.sender] = uint64(block.timestamp);
            }
        }

        registry.recordJoin(msg.sender);
        emit Joined(msg.sender, rounds);

        if (_members.length == _memberCap) {
            state = State.Drawing;
            fillBlock = block.number;
            fillTime = block.timestamp;
            emit Filled(block.number);
        }
    }

    /// @notice If the circle did not fill before the join deadline, each member takes back
    ///         their own deposit and prepayments. Nothing else is ever refundable this way.
    function refundUnfilled() external nonReentrant {
        if (state == State.Joining) {
            if (block.timestamp <= joinDeadline) revert StillOpen();
            state = State.Cancelled;
            emit Cancelled();
        } else if (state != State.Cancelled) {
            revert WrongState(State.Cancelled, state);
        }
        uint256 amount = _deposit[msg.sender] + paidRounds[msg.sender] * contribution;
        if (amount == 0) revert NothingOwed();
        _deposit[msg.sender] = 0;
        paidRounds[msg.sender] = 0;
        totalDepositsReturned += amount;
        token.safeTransfer(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Drawing (commit-reveal, reputation-tiered)
    // ---------------------------------------------------------------------

    /// @notice Reveal the organiser's secret to draw the payout order.
    /// @dev seed = keccak256(secret, blockhash(fillBlock + 1)). The organiser committed before
    ///      anyone joined and cannot know the hash of the block after the circle filled.
    function revealOrder(bytes32 secret) external nonReentrant {
        if (state != State.Drawing) revert WrongState(State.Drawing, state);
        if (keccak256(abi.encode(secret, organiser)) != orderCommit) revert BadSecret();
        if (block.number <= fillBlock + 1) revert RevealTooEarly();
        bytes32 bh = blockhash(fillBlock + 1);
        // Past 256 blocks the hash reads as zero; the organiser could then predict the seed.
        if (bh == bytes32(0)) revert RevealExpired();
        _draw(keccak256(abi.encode(secret, bh)), false);
    }

    /// @notice If the organiser has not revealed in time, anyone can draw from a later block.
    ///         The organiser loses the right to reveal.
    function fallbackDraw() external nonReentrant {
        if (state != State.Drawing) revert WrongState(State.Drawing, state);
        if (block.timestamp <= fillTime + revealTimeout()) revert FallbackTooEarly();
        _draw(keccak256(abi.encode(blockhash(block.number - 1), block.prevrandao, address(this), fillBlock)), true);
    }

    /// @notice How long the organiser has to reveal after the circle fills.
    function revealTimeout() public view returns (uint256) {
        return demo ? DEMO_REVEAL_TIMEOUT : roundDuration;
    }

    function _draw(bytes32 seed, bool viaFallback) internal {
        address[] memory order_ = tieredOrder(_members, seed);
        _order = order_;
        orderFromFallback = viaFallback;
        state = State.Active;
        startTime = block.timestamp;
        currentRound = 1;
        emit OrderDrawn(order_);
        _payoutReadyRounds();
    }

    /// @notice Order `list` by reputation tier (highest first), shuffling within each tier with
    ///         Fisher-Yates from `seed`. Tier-0 newcomers always take the last slots, where they
    ///         are net savers and cannot default on anyone.
    function tieredOrder(address[] memory list, bytes32 seed) public view returns (address[] memory out) {
        uint256 n = list.length;
        out = new address[](n);
        uint8[] memory tiers = new uint8[](n);
        for (uint256 i; i < n; ++i) {
            tiers[i] = registry.tierOf(list[i]);
        }
        uint256 k;
        for (uint256 t = 3; t > 0;) {
            --t;
            uint256 start = k;
            for (uint256 i; i < n; ++i) {
                if (tiers[i] == t) out[k++] = list[i];
            }
            for (uint256 j = k - start; j > 1; --j) {
                uint256 r = uint256(keccak256(abi.encode(seed, t, j))) % j;
                (out[start + j - 1], out[start + r]) = (out[start + r], out[start + j - 1]);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Active
    // ---------------------------------------------------------------------

    /// @notice Pay this round's contribution. On time before the deadline, late within grace.
    ///         If this is the last payment the round needs, the pot goes to the recipient now.
    function contribute() external nonReentrant {
        if (state != State.Active) revert WrongState(State.Active, state);
        if (!isMember[msg.sender]) revert NotMember();
        uint256 round = currentRound;
        if (paidRounds[msg.sender] >= round) revert AlreadyPaid();
        if (block.timestamp > graceEnd(round)) revert RoundOverdue();

        token.safeTransferFrom(msg.sender, address(this), contribution);
        totalPaidIn += contribution;
        paidRounds[msg.sender] = round;
        _paidAt[round][msg.sender] = uint64(block.timestamp);
        bool late = block.timestamp > roundDeadline(round);
        if (late) paidLate[round][msg.sender] = true;
        emit Contributed(msg.sender, round, late ? 1 : 0);

        _payoutReadyRounds();
    }

    /// @notice Pay `rounds` future contributions ahead of time.
    function prepay(uint8 rounds) external nonReentrant {
        if (state == State.Completed || state == State.Cancelled) revert WrongState(State.Active, state);
        if (!isMember[msg.sender]) revert NotMember();
        uint256 from = paidRounds[msg.sender] + 1;
        uint256 to = paidRounds[msg.sender] + rounds;
        if (rounds == 0 || to > _memberCap) revert InvalidRounds();

        if (state == State.Active && from <= currentRound) {
            // The first prepaid round is the open one: same timing rules as contribute().
            if (block.timestamp > graceEnd(from)) revert RoundOverdue();
            if (block.timestamp > roundDeadline(from)) paidLate[from][msg.sender] = true;
        }

        uint256 amount = contribution * rounds;
        token.safeTransferFrom(msg.sender, address(this), amount);
        totalPaidIn += amount;
        paidRounds[msg.sender] = to;
        for (uint256 r = from; r <= to; ++r) {
            _paidAt[r][msg.sender] = uint64(block.timestamp);
        }
        emit Prepaid(msg.sender, rounds, to);

        if (state == State.Active) _payoutReadyRounds();
    }

    /// @notice Close the current round. Callable by anyone once deadline + grace has passed
    ///         (unpaid members are covered from their deposits), or earlier once the round has
    ///         opened and every member has already paid it.
    function settleRound() external nonReentrant {
        if (state != State.Active) revert WrongState(State.Active, state);
        uint256 round = currentRound;
        if (block.timestamp > graceEnd(round)) {
            _finalizeRound(round);
            _payoutReadyRounds();
        } else if (_roundReady(round)) {
            _payoutReadyRounds();
        } else {
            revert NothingToSettle();
        }
    }

    /// @notice Withdraw an amount credited to you because a push transfer failed.
    function claimOwed() external nonReentrant {
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert NothingOwed();
        owed[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function _roundReady(uint256 round) internal view returns (bool) {
        if (block.timestamp < roundStart(round)) return false;
        uint256 n = _members.length;
        for (uint256 i; i < n; ++i) {
            if (paidRounds[_members[i]] < round) return false;
        }
        return true;
    }

    function _payoutReadyRounds() internal {
        while (state == State.Active && _roundReady(currentRound)) {
            _finalizeRound(currentRound);
        }
    }

    function _finalizeRound(uint256 round) internal {
        uint256 pot;
        uint256 n = _members.length;
        for (uint256 i; i < n; ++i) {
            address m = _members[i];
            uint8 status;
            uint64 at;
            if (paidRounds[m] >= round) {
                pot += contribution;
                status = paidLate[round][m] ? 1 : 0;
                at = _paidAt[round][m];
            } else {
                status = 2;
                at = uint64(block.timestamp);
                uint256 dep = _deposit[m];
                uint256 taken = dep >= contribution ? contribution : dep;
                _deposit[m] = dep - taken;
                pot += taken;
                paidRounds[m] = round;
                emit MissedPayment(m, round, taken);
                if (taken < contribution) {
                    hadShortfall[m] = true;
                    emit Shortfall(m, round, contribution - taken);
                }
            }
            registry.recordPayment(m, uint32(round), status, at);
        }

        address recipient = _order[round - 1];
        currentRound = round + 1;
        totalPaidOut += pot;
        _push(recipient, pot);
        emit RoundPaidOut(round, recipient, pot);

        if (round == n) _complete();
    }

    function _complete() internal {
        state = State.Completed;
        uint256 n = _members.length;
        for (uint256 i; i < n; ++i) {
            address m = _members[i];
            if (!hadShortfall[m]) registry.recordCompletion(m);
            uint256 dep = _deposit[m];
            if (dep > 0) {
                _deposit[m] = 0;
                totalDepositsReturned += dep;
                _push(m, dep);
                emit DepositReturned(m, dep);
            }
        }
        emit Completed();
    }

    // A blocked recipient (e.g. a blacklisted USDC address) must not freeze everyone else.
    function _push(address to, uint256 amount) internal {
        if (amount == 0) return;
        if (!token.trySafeTransfer(to, amount)) {
            owed[to] += amount;
            emit Credited(to, amount);
        }
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice When round `round` opens.
    function roundStart(uint256 round) public view returns (uint256) {
        return startTime + (round - 1) * roundDuration;
    }

    /// @notice On-time deadline for round `round`.
    function roundDeadline(uint256 round) public view returns (uint256) {
        return roundStart(round) + roundDuration;
    }

    /// @notice End of the grace period for round `round`; after this anyone may settle it.
    function graceEnd(uint256 round) public view returns (uint256) {
        return roundDeadline(round) + graceDuration;
    }

    /// @notice Payout order (empty until drawn). Index 0 receives round 1.
    function order() external view returns (address[] memory) {
        return _order;
    }

    /// @notice Recipient of round `round` (1-based).
    function recipientOf(uint256 round) external view returns (address) {
        return _order[round - 1];
    }

    /// @notice When `member` paid round `round` (0 if not paid by them).
    function paidAt(uint256 round, address member) external view returns (uint64) {
        return _paidAt[round][member];
    }

    /// @notice Total number of rounds (one per member).
    function totalRounds() external view returns (uint256) {
        return _memberCap;
    }

    /// @notice Tokens the contract still owes: deposits, prepaid future rounds, and credits.
    function outstanding() external view returns (uint256 total) {
        uint256 n = _members.length;
        uint256 settledThrough = currentRound == 0 ? 0 : currentRound - 1;
        for (uint256 i; i < n; ++i) {
            address m = _members[i];
            total += _deposit[m] + owed[m];
            uint256 p = paidRounds[m];
            if (state != State.Completed && p > settledThrough) total += (p - settledThrough) * contribution;
        }
    }

    // ICircleView

    /// @inheritdoc ICircleView
    function memberCount() external view returns (uint256) {
        return _members.length;
    }

    /// @inheritdoc ICircleView
    function memberCap() external view returns (uint256) {
        return _memberCap;
    }

    /// @inheritdoc ICircleView
    function depositOf(address member) external view returns (uint256) {
        return _deposit[member];
    }

    /// @inheritdoc ICircleView
    function feeBps() external pure returns (uint256) {
        return FEE_BPS;
    }

    /// @inheritdoc ICircleView
    function payoutPerRound() external view returns (uint256) {
        return contribution * _memberCap;
    }

    /// @inheritdoc ICircleView
    function promisedReturnBps() external pure returns (uint256) {
        return 0;
    }

    /// @inheritdoc ICircleView
    function members() external view returns (address[] memory) {
        return _members;
    }
}
