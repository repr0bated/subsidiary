// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @title EtchedAnchor
/// @notice Public record of 3tched receipt-chain heads. Only a 32-byte head hash is stored,
///         never a payload, receipt, identifier or tenant data. The first anchoring of a head
///         is kept: its time and the address that anchored it.
/// @dev The head is the hash 3tched's own receipt chain produces. This contract does not
///      compute or check chains; a holder recomputes the head off-chain and checks it here.
contract EtchedAnchor {
    /// @notice When and by whom a head was first anchored.
    struct Anchor {
        uint64 timestamp;
        address anchoredBy;
    }

    mapping(bytes32 head => Anchor) private _anchors;

    /// @notice Emitted once, the first time a head is anchored.
    event Anchored(bytes32 indexed head, uint256 timestamp, address indexed sender);

    /// @notice The head was zero.
    error ZeroHead();
    /// @notice The head was already anchored; its first anchoring stands.
    error AlreadyAnchored(bytes32 head, uint256 timestamp);

    /// @notice Anchor a receipt-chain head.
    /// @param head The chain head hash. Must not be zero.
    function anchor(bytes32 head) external {
        if (head == bytes32(0)) revert ZeroHead();
        Anchor storage existing = _anchors[head];
        if (existing.timestamp != 0) revert AlreadyAnchored(head, existing.timestamp);
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        _anchors[head] = Anchor({timestamp: uint64(block.timestamp), anchoredBy: msg.sender});
        emit Anchored(head, block.timestamp, msg.sender);
    }

    /// @notice Whether a head has been anchored.
    function isAnchored(bytes32 head) external view returns (bool) {
        return _anchors[head].timestamp != 0;
    }

    /// @notice When and by whom a head was first anchored; zero values if never.
    function anchorOf(bytes32 head) external view returns (uint256 timestamp, address anchoredBy) {
        Anchor storage a = _anchors[head];
        return (a.timestamp, a.anchoredBy);
    }
}
