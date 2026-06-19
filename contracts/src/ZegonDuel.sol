// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ZegonDuel {
    struct Round {
        bytes32 commit;
        bool revealed;
        uint8 zegonMove;
        uint64 commitTs;
        uint64 revealTs;
    }

    struct Duel {
        address operator;
        bytes32 attestationHash;
        uint8 result;
        uint64 recordedTs;
        bool recorded;
    }

    mapping(uint256 => mapping(uint256 => Round)) public rounds;
    mapping(uint256 => Duel) public duels;

    address public operator;

    event Committed(
        uint256 indexed duelId,
        uint256 indexed roundId,
        bytes32 commit,
        uint64 ts
    );
    event Revealed(
        uint256 indexed duelId,
        uint256 indexed roundId,
        uint8 move,
        uint64 ts
    );
    event DuelRecorded(
        uint256 indexed duelId,
        bytes32 attestationHash,
        uint8 result,
        uint64 ts
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address _operator) {
        operator = _operator;
    }

    function commitMove(
        uint256 duelId,
        uint256 roundId,
        bytes32 commit
    ) external onlyOperator {
        Round storage r = rounds[duelId][roundId];
        require(r.commit == bytes32(0), "Already committed");
        r.commit = commit;
        r.commitTs = uint64(block.timestamp);
        emit Committed(duelId, roundId, commit, r.commitTs);
    }

    function revealMove(
        uint256 duelId,
        uint256 roundId,
        uint8 move,
        bytes32 salt
    ) external onlyOperator {
        Round storage r = rounds[duelId][roundId];
        require(r.commit != bytes32(0), "No commit");
        require(!r.revealed, "Already revealed");
        bytes32 expected = keccak256(abi.encodePacked(move, salt));
        require(expected == r.commit, "Invalid reveal");
        r.revealed = true;
        r.zegonMove = move;
        r.revealTs = uint64(block.timestamp);
        emit Revealed(duelId, roundId, move, r.revealTs);
    }

    function recordDuel(
        uint256 duelId,
        bytes32 attestationHash,
        uint8 result
    ) external onlyOperator {
        Duel storage d = duels[duelId];
        require(!d.recorded, "Already recorded");
        d.operator = msg.sender;
        d.attestationHash = attestationHash;
        d.result = result;
        d.recordedTs = uint64(block.timestamp);
        d.recorded = true;
        emit DuelRecorded(duelId, attestationHash, result, d.recordedTs);
    }

    function getRound(
        uint256 duelId,
        uint256 roundId
    )
        external
        view
        returns (
            bytes32 commit,
            bool revealed,
            uint8 zegonMove,
            uint64 commitTs,
            uint64 revealTs
        )
    {
        Round storage r = rounds[duelId][roundId];
        return (r.commit, r.revealed, r.zegonMove, r.commitTs, r.revealTs);
    }
}
