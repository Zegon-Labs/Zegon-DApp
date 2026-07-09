// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ZegonMatchPool {
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MAX_STAKE = 1 ether;

    address public operator;

    struct Match {
        address challenger;
        address defender;
        uint256 challengerStake;
        uint256 defenderStake;
        bool settled;
        address winner;
    }

    mapping(bytes32 => Match) public matches;

    event ChallengerStaked(bytes32 indexed matchId, address indexed challenger, uint256 amount);
    event DefenderStaked(bytes32 indexed matchId, address indexed defender, uint256 amount);
    event MatchSettled(bytes32 indexed matchId, address indexed winner, uint256 payout);

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address _operator) {
        operator = _operator;
    }

    function enterAsChallenger(bytes32 matchId) external payable {
        Match storage m = matches[matchId];
        require(m.challenger == address(0), "Challenger set");
        require(msg.value >= MIN_STAKE && msg.value <= MAX_STAKE, "Invalid stake");

        m.challenger = msg.sender;
        m.challengerStake = msg.value;

        emit ChallengerStaked(matchId, msg.sender, msg.value);
    }

    function enterAsDefender(bytes32 matchId) external payable {
        Match storage m = matches[matchId];
        require(m.challenger != address(0), "No challenger");
        require(m.defender == address(0), "Defender set");
        require(!m.settled, "Settled");
        require(msg.value >= MIN_STAKE && msg.value <= MAX_STAKE, "Invalid stake");
        require(msg.value == m.challengerStake, "Stake mismatch");

        m.defender = msg.sender;
        m.defenderStake = msg.value;

        emit DefenderStaked(matchId, msg.sender, msg.value);
    }

    function settle(bytes32 matchId, address winner) external onlyOperator {
        Match storage m = matches[matchId];
        require(!m.settled, "Already settled");
        require(m.challenger != address(0) && m.defender != address(0), "Incomplete match");
        require(winner == m.challenger || winner == m.defender, "Invalid winner");

        m.settled = true;
        m.winner = winner;

        uint256 payout = m.challengerStake + m.defenderStake;
        (bool ok, ) = winner.call{value: payout}("");
        require(ok, "Transfer failed");

        emit MatchSettled(matchId, winner, payout);
    }

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
}
