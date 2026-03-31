// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./HoneyTraceRoleControl.sol";

contract HoneyTraceRegistry is HoneyTraceRoleControl {
    struct BatchRecord {
        bytes32 dataHash;
        uint256 timestamp;
        address recorder;
        string bizStep;
        string location;
        bool exists;
    }

    struct RecallRecord {
        uint8 tier;
        string reason;
        address officer;
        uint256 timestamp;
        bool active;
    }

    struct LabRecord {
        bytes32 labHash;
        address lab;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => BatchRecord) private _batches;
    mapping(string => RecallRecord) private _recalls;
    mapping(string => LabRecord) private _labs;

    event BatchRecorded(
        string indexed batchId,
        bytes32 dataHash,
        address indexed recorder,
        uint256 timestamp,
        string bizStep,
        string location
    );

    event LabResultLinked(
        string indexed batchId,
        bytes32 indexed labHash,
        address indexed lab,
        uint256 timestamp
    );

    event RecallInitiated(
        string indexed batchId,
        uint8 tier,
        address indexed officer,
        uint256 timestamp,
        string reason
    );

    function recordBatch(
        string calldata batchId,
        bytes32 dataHash,
        string calldata bizStep,
        string calldata location
    ) external onlyRole(ROLE_RECORDER) {
        require(bytes(batchId).length > 0, "EMPTY_BATCH_ID");

        BatchRecord storage existing = _batches[batchId];
        if (existing.exists) {
            require(existing.dataHash == dataHash, "BATCH_HASH_MISMATCH");
        }

        _batches[batchId] = BatchRecord({
            dataHash: dataHash,
            timestamp: block.timestamp,
            recorder: msg.sender,
            bizStep: bizStep,
            location: location,
            exists: true
        });

        emit BatchRecorded(batchId, dataHash, msg.sender, block.timestamp, bizStep, location);
    }

    function linkLabResult(string calldata batchId, bytes32 labHash) external onlyRole(ROLE_RECORDER) {
        require(_batches[batchId].exists, "BATCH_NOT_FOUND");
        _labs[batchId] = LabRecord({
            labHash: labHash,
            lab: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit LabResultLinked(batchId, labHash, msg.sender, block.timestamp);
    }

    function initRecall(string calldata batchId, uint8 tier, string calldata reason) external onlyRole(ROLE_OFFICER) {
        require(_batches[batchId].exists, "BATCH_NOT_FOUND");
        require(tier >= 1 && tier <= 3, "INVALID_RECALL_TIER");

        _recalls[batchId] = RecallRecord({
            tier: tier,
            reason: reason,
            officer: msg.sender,
            timestamp: block.timestamp,
            active: true
        });

        emit RecallInitiated(batchId, tier, msg.sender, block.timestamp, reason);
    }

    function getBatch(string calldata batchId)
        external
        view
        returns (bytes32 dataHash, uint256 timestamp, address recorder, string memory bizStep)
    {
        BatchRecord memory b = _batches[batchId];
        require(b.exists, "BATCH_NOT_FOUND");
        return (b.dataHash, b.timestamp, b.recorder, b.bizStep);
    }

    function getBatchDetails(string calldata batchId)
        external
        view
        returns (
            bytes32 dataHash,
            uint256 timestamp,
            address recorder,
            string memory bizStep,
            string memory location,
            bool recalled,
            uint8 recallTier,
            string memory recallReason,
            bytes32 labHash
        )
    {
        BatchRecord memory b = _batches[batchId];
        require(b.exists, "BATCH_NOT_FOUND");
        RecallRecord memory r = _recalls[batchId];
        LabRecord memory l = _labs[batchId];

        return (
            b.dataHash,
            b.timestamp,
            b.recorder,
            b.bizStep,
            b.location,
            r.active,
            r.tier,
            r.reason,
            l.labHash
        );
    }

    function isRecalled(string calldata batchId) external view returns (bool) {
        return _recalls[batchId].active;
    }
}