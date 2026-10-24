// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockUSDC ("Test USD Coin", tUSDC)
/// @notice 6-decimal test stablecoin with a rate-limited public faucet. Nobody, including the
///         deployer, can mint outside the faucet.
contract MockUSDC {
    string public constant name = "Test USD Coin";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;

    uint256 public constant FAUCET_AMOUNT = 100e6;
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastFaucetAt;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error FaucetCooldown(uint256 availableAt);
    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();

    /// @notice Mints 100 tUSDC to the caller, at most once every 24 hours per address.
    function faucet() external {
        uint256 last = lastFaucetAt[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) revert FaucetCooldown(last + FAUCET_COOLDOWN);
        lastFaucetAt[msg.sender] = block.timestamp;
        totalSupply += FAUCET_AMOUNT;
        unchecked {
            balanceOf[msg.sender] += FAUCET_AMOUNT;
        }
        emit Transfer(address(0), msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Timestamp from which `account` may call the faucet again (0 if available now).
    function faucetAvailableAt(address account) external view returns (uint256) {
        uint256 last = lastFaucetAt[account];
        if (last == 0 || block.timestamp >= last + FAUCET_COOLDOWN) return 0;
        return last + FAUCET_COOLDOWN;
    }

    /// @notice Standard ERC-20 approve.
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @notice Standard ERC-20 transfer.
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /// @notice Standard ERC-20 transferFrom.
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
