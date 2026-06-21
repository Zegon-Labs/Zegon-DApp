// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Global duel score leaderboard — best score per player, one submit per duelId.
contract ZegonLeaderboard {
    uint256 public constant MAX_RANKED = 100;

    mapping(address => uint256) public bestScores;
    mapping(bytes32 => bool) public submittedDuels;

    address[] private rankedAddresses;
    uint256[] private rankedScores;

    event ScoreSubmitted(
        address indexed player,
        uint256 score,
        bytes32 indexed duelId,
        bool isNewBest
    );

    function submitScore(uint256 score, bytes32 duelId) external {
        require(duelId != bytes32(0), "Invalid duelId");
        require(!submittedDuels[duelId], "Duel already submitted");

        submittedDuels[duelId] = true;
        address player = msg.sender;
        uint256 prev = bestScores[player];

        if (score <= prev) {
            emit ScoreSubmitted(player, score, duelId, false);
            return;
        }

        bestScores[player] = score;
        _upsertRanked(player, score);
        emit ScoreSubmitted(player, score, duelId, true);
    }

    function getScore(address player) external view returns (uint256) {
        return bestScores[player];
    }

    function getTopN(uint256 n)
        external
        view
        returns (address[] memory addrs, uint256[] memory scores)
    {
        uint256 len = rankedAddresses.length;
        if (n > len) {
            n = len;
        }
        addrs = new address[](n);
        scores = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            addrs[i] = rankedAddresses[i];
            scores[i] = rankedScores[i];
        }
    }

    function rankedCount() external view returns (uint256) {
        return rankedAddresses.length;
    }

    function _upsertRanked(address player, uint256 score) private {
        uint256 len = rankedAddresses.length;
        uint256 idx = type(uint256).max;

        for (uint256 i = 0; i < len; i++) {
            if (rankedAddresses[i] == player) {
                rankedScores[i] = score;
                idx = i;
                break;
            }
        }

        if (idx == type(uint256).max) {
            if (len >= MAX_RANKED && score <= rankedScores[len - 1]) {
                return;
            }
            rankedAddresses.push(player);
            rankedScores.push(score);
            idx = rankedAddresses.length - 1;
        }

        while (idx > 0 && rankedScores[idx] > rankedScores[idx - 1]) {
            (rankedAddresses[idx], rankedAddresses[idx - 1]) = (
                rankedAddresses[idx - 1],
                rankedAddresses[idx]
            );
            (rankedScores[idx], rankedScores[idx - 1]) = (
                rankedScores[idx - 1],
                rankedScores[idx]
            );
            idx -= 1;
        }

        if (rankedAddresses.length > MAX_RANKED) {
            rankedAddresses.pop();
            rankedScores.pop();
        }
    }
}
