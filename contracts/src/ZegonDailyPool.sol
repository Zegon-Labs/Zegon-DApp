// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ZegonDailyPool {
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MAX_STAKE = 1 ether;

    address public operator;

    struct Pool {
        uint256 totalStaked;
        uint256 entrants;
        bool closed;
    }

    struct Entry {
        address player;
        uint256 amount;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => Entry)) public entries;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event Entered(bytes32 indexed daySeed, address indexed player, uint256 amount);
    event PoolClosed(bytes32 indexed daySeed, uint256 totalStaked);
    event Claimed(bytes32 indexed daySeed, address indexed player, uint256 amount, uint8 rank);

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address _operator) {
        operator = _operator;
    }

    function enterDaily(bytes32 daySeed) external payable {
        Pool storage pool = pools[daySeed];
        require(!pool.closed, "Pool closed");
        require(msg.value >= MIN_STAKE && msg.value <= MAX_STAKE, "Invalid stake");
        require(entries[daySeed][msg.sender].amount == 0, "Already entered");

        entries[daySeed][msg.sender] = Entry({
            player: msg.sender,
            amount: msg.value
        });
        pool.totalStaked += msg.value;
        pool.entrants += 1;

        emit Entered(daySeed, msg.sender, msg.value);
    }

    function closePool(bytes32 daySeed) external onlyOperator {
        Pool storage pool = pools[daySeed];
        require(!pool.closed, "Already closed");
        pool.closed = true;
        emit PoolClosed(daySeed, pool.totalStaked);
    }

    function claimFor(
        bytes32 daySeed,
        address player,
        uint256 amount,
        uint8 rank
    ) external onlyOperator {
        Pool storage pool = pools[daySeed];
        require(pool.closed, "Pool not closed");
        require(entries[daySeed][player].amount > 0, "Not entered");
        require(!claimed[daySeed][player], "Already claimed");
        require(amount <= pool.totalStaked, "Amount too high");

        claimed[daySeed][player] = true;
        (bool ok, ) = player.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Claimed(daySeed, player, amount, rank);
    }

    function getEntry(bytes32 daySeed, address player) external view returns (Entry memory) {
        return entries[daySeed][player];
    }

    function poolInfo(bytes32 daySeed) external view returns (Pool memory) {
        return pools[daySeed];
    }
}
