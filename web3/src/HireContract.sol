// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {EtchedAnchor} from "./EtchedAnchor.sol";

/// @title HireContract
/// @notice Records, as hashes only, that a client hired a provider, that the work was delivered
///         with an anchored receipt-chain head as proof, that both sides confirmed completion,
///         and whether the provider stood behind the work under warranty. Records delivery,
///         not payment.
/// @dev Terms, claims and deliverables stay off-chain; only their hashes are stored. Party
///      addresses must not be derived from 3tched identity IDs (see the service-contract spec).
contract HireContract {
    enum Status {
        None,
        Created,
        Accepted,
        Cancelled,
        Delivered,
        Completed
    }

    struct Hire {
        address client;
        address provider;
        bytes32 termsHash;
        bytes32 workHead;
        uint64 warrantyPeriod;
        uint64 createdAt;
        uint64 acceptedAt;
        uint64 deliveredAt;
        uint64 completedAt;
        Status status;
        bool clientConfirmed;
        bool providerConfirmed;
    }

    struct Claim {
        bytes32 claimHash;
        bytes32 remedyHead;
        uint64 filedAt;
        uint64 resolvedAt;
    }

    /// @notice A provider's public track record.
    struct Record {
        uint64 completed;
        uint64 claimsFiled;
        uint64 claimsResolved;
    }

    /// @notice The anchor whose heads prove delivered work and remedies.
    EtchedAnchor public immutable anchor;

    uint256 public hireCount;
    mapping(uint256 hireId => Hire) private _hires;
    mapping(uint256 hireId => Claim[]) private _claims;
    mapping(address provider => Record) private _records;

    event HireCreated(
        uint256 indexed hireId,
        address indexed client,
        address indexed provider,
        bytes32 termsHash,
        uint64 warrantyPeriod
    );
    event HireAccepted(uint256 indexed hireId, uint256 timestamp);
    event HireCancelled(uint256 indexed hireId);
    event WorkDelivered(uint256 indexed hireId, bytes32 workHead);
    event CompletionConfirmed(uint256 indexed hireId, address indexed party);
    event HireCompleted(uint256 indexed hireId, bytes32 termsHash, bytes32 workHead);
    event WarrantyClaimed(uint256 indexed hireId, uint256 indexed claimId, bytes32 claimHash);
    event WarrantyResolved(uint256 indexed hireId, uint256 indexed claimId, bytes32 remedyHead);

    error ZeroAnchor();
    error ZeroHash();
    error ZeroAddress();
    error SelfHire();
    error UnknownHire(uint256 hireId);
    error WrongStatus(uint256 hireId, Status actual);
    error NotClient(uint256 hireId);
    error NotProvider(uint256 hireId);
    error NotParty(uint256 hireId);
    error AlreadyConfirmed(uint256 hireId);
    error NotAnchored(bytes32 head);
    error WarrantyExpired(uint256 hireId);
    error UnknownClaim(uint256 hireId, uint256 claimId);
    error ClaimClosed(uint256 hireId, uint256 claimId);

    /// @param anchor_ The EtchedAnchor that records receipt-chain heads.
    constructor(EtchedAnchor anchor_) {
        if (address(anchor_) == address(0)) revert ZeroAnchor();
        anchor = anchor_;
    }

    /// @notice Create a hire. The caller is the client.
    /// @param provider The hired party's address.
    /// @param termsHash Hash of the off-chain terms document (salted, no personal data).
    /// @param warrantyPeriod Seconds after completion during which the client may file claims.
    /// @return hireId The new hire's id, starting at 1.
    function createHire(address provider, bytes32 termsHash, uint64 warrantyPeriod) external returns (uint256 hireId) {
        if (provider == address(0)) revert ZeroAddress();
        if (provider == msg.sender) revert SelfHire();
        if (termsHash == bytes32(0)) revert ZeroHash();
        hireId = ++hireCount;
        Hire storage h = _hires[hireId];
        h.client = msg.sender;
        h.provider = provider;
        h.termsHash = termsHash;
        h.warrantyPeriod = warrantyPeriod;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        h.createdAt = uint64(block.timestamp);
        h.status = Status.Created;
        emit HireCreated(hireId, msg.sender, provider, termsHash, warrantyPeriod);
    }

    /// @notice The provider accepts a created hire.
    function accept(uint256 hireId) external {
        Hire storage h = _hire(hireId);
        if (msg.sender != h.provider) revert NotProvider(hireId);
        _expect(hireId, h, Status.Created);
        h.status = Status.Accepted;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        h.acceptedAt = uint64(block.timestamp);
        emit HireAccepted(hireId, block.timestamp);
    }

    /// @notice The client cancels a hire that has not been accepted.
    function cancel(uint256 hireId) external {
        Hire storage h = _hire(hireId);
        if (msg.sender != h.client) revert NotClient(hireId);
        _expect(hireId, h, Status.Created);
        h.status = Status.Cancelled;
        emit HireCancelled(hireId);
    }

    /// @notice The provider delivers, pointing at the anchored receipt-chain head that proves the work.
    /// @param workHead A head already anchored in `anchor`.
    function deliver(uint256 hireId, bytes32 workHead) external {
        Hire storage h = _hire(hireId);
        if (msg.sender != h.provider) revert NotProvider(hireId);
        _expect(hireId, h, Status.Accepted);
        if (workHead == bytes32(0)) revert ZeroHash();
        if (!anchor.isAnchored(workHead)) revert NotAnchored(workHead);
        h.workHead = workHead;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        h.deliveredAt = uint64(block.timestamp);
        h.status = Status.Delivered;
        emit WorkDelivered(hireId, workHead);
    }

    /// @notice A party confirms a delivered hire. When both have confirmed, it is completed.
    function confirm(uint256 hireId) external {
        Hire storage h = _hire(hireId);
        _expect(hireId, h, Status.Delivered);
        if (msg.sender == h.client) {
            if (h.clientConfirmed) revert AlreadyConfirmed(hireId);
            h.clientConfirmed = true;
        } else if (msg.sender == h.provider) {
            if (h.providerConfirmed) revert AlreadyConfirmed(hireId);
            h.providerConfirmed = true;
        } else {
            revert NotParty(hireId);
        }
        emit CompletionConfirmed(hireId, msg.sender);
        if (h.clientConfirmed && h.providerConfirmed) {
            h.status = Status.Completed;
            // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
            h.completedAt = uint64(block.timestamp);
            _records[h.provider].completed += 1;
            emit HireCompleted(hireId, h.termsHash, h.workHead);
        }
    }

    /// @notice The client files a warranty claim on a completed hire.
    /// @param claimHash Hash of the off-chain claim document citing the disputed receipt.
    /// @return claimId The claim's index for this hire, starting at 0.
    function fileClaim(uint256 hireId, bytes32 claimHash) external returns (uint256 claimId) {
        Hire storage h = _hire(hireId);
        if (msg.sender != h.client) revert NotClient(hireId);
        _expect(hireId, h, Status.Completed);
        if (claimHash == bytes32(0)) revert ZeroHash();
        // forge-lint: disable-next-line(block-timestamp) -- seconds of validator drift do not matter for a warranty window
        if (block.timestamp > uint256(h.completedAt) + h.warrantyPeriod) revert WarrantyExpired(hireId);
        claimId = _claims[hireId].length;
        _claims[hireId].push(
            // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
            Claim({claimHash: claimHash, remedyHead: 0, filedAt: uint64(block.timestamp), resolvedAt: 0})
        );
        _records[h.provider].claimsFiled += 1;
        emit WarrantyClaimed(hireId, claimId, claimHash);
    }

    /// @notice The provider resolves an open claim with the anchored head of the fix.
    /// @param remedyHead A head already anchored in `anchor`.
    function resolveClaim(uint256 hireId, uint256 claimId, bytes32 remedyHead) external {
        Hire storage h = _hire(hireId);
        if (msg.sender != h.provider) revert NotProvider(hireId);
        if (claimId >= _claims[hireId].length) revert UnknownClaim(hireId, claimId);
        Claim storage c = _claims[hireId][claimId];
        if (c.resolvedAt != 0) revert ClaimClosed(hireId, claimId);
        if (remedyHead == bytes32(0)) revert ZeroHash();
        if (!anchor.isAnchored(remedyHead)) revert NotAnchored(remedyHead);
        c.remedyHead = remedyHead;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        c.resolvedAt = uint64(block.timestamp);
        _records[h.provider].claimsResolved += 1;
        emit WarrantyResolved(hireId, claimId, remedyHead);
    }

    /// @notice A hire's full record.
    function getHire(uint256 hireId) external view returns (Hire memory) {
        return _hire(hireId);
    }

    /// @notice When the warranty on a completed hire ends; zero before completion.
    function warrantyEnd(uint256 hireId) external view returns (uint256) {
        Hire storage h = _hire(hireId);
        return h.completedAt == 0 ? 0 : uint256(h.completedAt) + h.warrantyPeriod;
    }

    /// @notice Number of claims filed on a hire.
    function claimCount(uint256 hireId) external view returns (uint256) {
        _hire(hireId);
        return _claims[hireId].length;
    }

    /// @notice One claim on a hire.
    function getClaim(uint256 hireId, uint256 claimId) external view returns (Claim memory) {
        _hire(hireId);
        if (claimId >= _claims[hireId].length) revert UnknownClaim(hireId, claimId);
        return _claims[hireId][claimId];
    }

    /// @notice A provider's public track record: hires completed, claims filed, claims resolved.
    function providerRecord(address provider) external view returns (Record memory) {
        return _records[provider];
    }

    function _hire(uint256 hireId) private view returns (Hire storage h) {
        h = _hires[hireId];
        if (h.status == Status.None) revert UnknownHire(hireId);
    }

    function _expect(uint256 hireId, Hire storage h, Status want) private view {
        if (h.status != want) revert WrongStatus(hireId, h.status);
    }
}
