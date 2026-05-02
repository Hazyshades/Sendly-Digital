// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal TIP-20-like token that exposes `transferFromWithMemo` / `transferWithMemo`
 * (the selector depends only on argument types, return value is ignored by callers).
 *
 * This mock intentionally omits `transferFrom` to ensure our GiftCard TIP-20 path is exercised.
 */
contract MockTip20WithMemo {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TransferWithMemo(address indexed from, address indexed to, uint256 value, bytes32 memo);

    constructor(string memory _name, string memory _symbol, uint8 _decimals, address initialHolder, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _mint(initialHolder, initialSupply);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // TIP-20 style: memo-enabled transfer
    function transferWithMemo(address to, uint256 value, bytes32 memo) external {
        _transfer(msg.sender, to, value);
        emit TransferWithMemo(msg.sender, to, value, memo);
    }

    // TIP-20 style: memo-enabled transferFrom
    function transferFromWithMemo(address from, address to, uint256 value, bytes32 memo) external {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        emit TransferWithMemo(from, to, value, memo);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "to=0");
        uint256 bal = balanceOf[from];
        require(bal >= value, "balance");
        balanceOf[from] = bal - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "to=0");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}

