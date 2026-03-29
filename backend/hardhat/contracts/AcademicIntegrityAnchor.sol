// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AcademicIntegrityAnchor
 * @notice 学业预警与干预记录的链上存证，与后台 Warning / Intervention 文档对应。
 *
 * 链下约定（与 Node 端一致即可）：
 * - recordKey：对业务主键做确定性哈希，例如
 *   keccak256(abi.encodePacked("warning:", mongoObjectId))、
 *   keccak256(abi.encodePacked("intervention:", mongoObjectId))。
 * - contentHash：对「需要防篡改的一快照」做 keccak256，例如规范序列化后的 JSON，
 *   或 keccak256(abi.encode(studentId, type, level, course, message, createdBy, createdAt)) 等。
 *
 * 后台可将交易哈希或区块哈希写入 `blockHash` 字段便于核对。
 */
contract AcademicIntegrityAnchor {
    struct Anchor {
        bytes32 contentHash;
        address submitter;
        uint64 anchoredAt;
        bool exists;
    }

    mapping(bytes32 => Anchor) public warnings;
    mapping(bytes32 => Anchor) public interventions;

    event WarningAnchored(
        bytes32 indexed recordKey,
        bytes32 contentHash,
        address indexed submitter,
        uint64 anchoredAt
    );

    event InterventionAnchored(
        bytes32 indexed recordKey,
        bytes32 contentHash,
        address indexed submitter,
        uint64 anchoredAt
    );

    /// @notice 干预状态变更（审核、撤销等）单独上链的步骤摘要，仅产生事件便于审计。
    event InterventionAuditStep(
        bytes32 indexed recordKey,
        bytes32 stepHash,
        address indexed submitter,
        uint64 ts
    );

    /// @notice 预警取消/撤销（不要求该预警曾 anchorWarning，便于与后台删除操作配套留痕）
    event WarningCancellationLogged(
        bytes32 indexed recordKey,
        bytes32 payloadHash,
        address indexed submitter,
        uint64 ts
    );

    error AlreadyAnchored();
    error InterventionNotAnchored();

    /// @notice 锚定一条预警记录（每条 recordKey 仅允许一次）。
    function anchorWarning(bytes32 recordKey, bytes32 contentHash) external {
        if (warnings[recordKey].exists) revert AlreadyAnchored();
        uint64 t = uint64(block.timestamp);
        warnings[recordKey] = Anchor(contentHash, msg.sender, t, true);
        emit WarningAnchored(recordKey, contentHash, msg.sender, t);
    }

    /// @notice 锚定一条干预记录（每条 recordKey 仅允许一次）。
    function anchorIntervention(bytes32 recordKey, bytes32 contentHash) external {
        if (interventions[recordKey].exists) revert AlreadyAnchored();
        uint64 t = uint64(block.timestamp);
        interventions[recordKey] = Anchor(contentHash, msg.sender, t, true);
        emit InterventionAnchored(recordKey, contentHash, msg.sender, t);
    }

    /**
     * @notice 为已锚定的干预追加审计步骤（状态变更、审核结果、撤销等可各算一个 stepHash）。
     */
    function appendInterventionAudit(bytes32 recordKey, bytes32 stepHash) external {
        if (!interventions[recordKey].exists) revert InterventionNotAnchored();
        emit InterventionAuditStep(recordKey, stepHash, msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice 干预尚未 anchorIntervention 时，仍可通过本函数上链留痕（审核、撤销等），仅发出与 append 相同的事件。
     */
    function logInterventionTrace(bytes32 recordKey, bytes32 stepHash) external {
        emit InterventionAuditStep(recordKey, stepHash, msg.sender, uint64(block.timestamp));
    }

    /**
     * @notice 记录预警取消操作；payloadHash 建议为链下对 (warningId, reason) 等的确定性哈希。
     */
    function logWarningCancellation(bytes32 recordKey, bytes32 payloadHash) external {
        emit WarningCancellationLogged(recordKey, payloadHash, msg.sender, uint64(block.timestamp));
    }
}
