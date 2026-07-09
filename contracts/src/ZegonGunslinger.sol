// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ZEGON Gunslinger identity NFT — one per wallet, operator-minted, URI updatable.
contract ZegonGunslinger {
    string public name = "ZEGON Gunslinger";
    string public symbol = "ZGUN";

    address public operator;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) public tokenOfOwner;
    mapping(uint256 => string) private _tokenURIs;

    event GunslingerMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);
    event GunslingerUpdated(uint256 indexed tokenId, string tokenURI);
    event GunslingerBurned(address indexed owner, uint256 indexed tokenId);
    event OperatorTransferred(address indexed previousOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address operator_) {
        require(operator_ != address(0), "Invalid operator");
        operator = operator_;
    }

    function transferOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "Invalid operator");
        emit OperatorTransferred(operator, newOperator);
        operator = newOperator;
    }

    function mint(address to, string calldata uri) external onlyOperator returns (uint256 tokenId) {
        require(to != address(0), "Invalid recipient");
        require(tokenOfOwner[to] == 0, "Already minted");

        tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        tokenOfOwner[to] = tokenId;
        _tokenURIs[tokenId] = uri;

        emit GunslingerMinted(to, tokenId, uri);
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOperator {
        require(_owners[tokenId] != address(0), "Invalid token");
        _tokenURIs[tokenId] = uri;
        emit GunslingerUpdated(tokenId, uri);
    }

    /// @notice Operator burn — clears wallet slot so a fresh Gunslinger NFT can be minted.
    function burn(address owner) external onlyOperator {
        require(owner != address(0), "Invalid owner");
        uint256 tokenId = tokenOfOwner[owner];
        require(tokenId != 0, "No token");

        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        tokenOfOwner[owner] = 0;

        emit GunslingerBurned(owner, tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Invalid token");
        return _tokenURIs[tokenId];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Invalid token");
        return owner;
    }
}
