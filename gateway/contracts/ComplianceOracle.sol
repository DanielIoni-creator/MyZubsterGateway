// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ComplianceOracle {
    address public owner;
    bytes32 public dataRoot;
    uint256 public transactionLimit;
    uint256 public updatedAt;

    mapping(address => bool) public sanctioned;
    mapping(address => uint256) public kycValidUntil;

    event SnapshotPublished(bytes32 indexed dataRoot, uint256 transactionLimit, uint256 updatedAt);
    event WalletComplianceUpdated(address indexed wallet, bool sanctioned, uint256 kycValidUntil);

    modifier onlyOwner() {
        require(msg.sender == owner, "not oracle owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function publishSnapshot(bytes32 root, uint256 limit) external onlyOwner {
        dataRoot = root;
        transactionLimit = limit;
        updatedAt = block.timestamp;
        emit SnapshotPublished(root, limit, block.timestamp);
    }

    function updateWallet(address wallet, bool isSanctioned, uint256 validUntil) external onlyOwner {
        sanctioned[wallet] = isSanctioned;
        kycValidUntil[wallet] = validUntil;
        emit WalletComplianceUpdated(wallet, isSanctioned, validUntil);
    }

    function verify(address wallet, uint256 amount) external view returns (bool, string memory) {
        if (sanctioned[wallet]) return (false, "SANCTIONED");
        if (kycValidUntil[wallet] < block.timestamp) return (false, "KYC_REQUIRED");
        if (amount > transactionLimit) return (false, "TRANSACTION_LIMIT_EXCEEDED");
        return (true, "APPROVED");
    }
}
