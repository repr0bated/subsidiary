// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @title EtchedRecord
/// @notice The public record, where a record starts. Each record is one root: a salted Merkle tree
///         over all of the record's fields. Only the fields 3tched classifies as safe to show are
///         published in the clear; private fields appear only as a salted leaf hash, and secret
///         fields (intellectual property, personal information) appear nowhere except inside the
///         root. The full record, with every salt, is then taken into 3tched's hash chain, which can
///         prove any field against this root later without the public chain ever holding it.
/// @dev Leaf and node encoding (ui/src/lib/web3/disclosure.ts builds the same tree):
///        leaf = keccak256(0x00 || keccak256(path) || salt || keccak256(canonical JSON value))
///        node = keccak256(0x01 || min(a, b) || max(a, b))
///      The 0x00 and 0x01 prefixes keep a leaf from ever passing as an inner node. Pairs are sorted,
///      so a proof is just the sibling hashes from leaf to root. The contract does not read the
///      bundle; it keeps the bundle's hash so anyone holding the bundle can check it is the one
///      that was published, and emits the bundle so it is public.
contract EtchedRecord {
    /// @notice One published record.
    struct Record {
        bytes32 root;
        bytes32 bundleHash;
        address publisher;
        uint64 timestamp;
        uint64 blockNumber;
    }

    uint256 private _count;
    mapping(uint256 id => Record) private _records;
    mapping(bytes32 root => uint256 id) private _idOf;

    /// @notice A record was published. `bundle` is the public part, as canonical JSON.
    event Published(
        uint256 indexed id, bytes32 indexed root, address indexed publisher, uint256 timestamp, bytes bundle
    );

    /// @notice The root was zero.
    error ZeroRoot();
    /// @notice The bundle was empty.
    error EmptyBundle();
    /// @notice The root was already published; its first record stands.
    error AlreadyPublished(bytes32 root, uint256 id);
    /// @notice No record has this id.
    error UnknownRecord(uint256 id);

    /// @notice Publish a record.
    /// @param root The salted Merkle root over every field of the record. Must not be zero.
    /// @param bundle The public part (shown fields with salts and proofs, redacted leaves), canonical JSON.
    /// @return id The record id, counting from 1.
    function publish(bytes32 root, bytes calldata bundle) external returns (uint256 id) {
        if (root == bytes32(0)) revert ZeroRoot();
        if (bundle.length == 0) revert EmptyBundle();
        uint256 existing = _idOf[root];
        if (existing != 0) revert AlreadyPublished(root, existing);
        id = ++_count;
        _idOf[root] = id;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds last ~584 billion years
        uint64 time = uint64(block.timestamp);
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 block numbers outlast any chain
        uint64 blockNumber = uint64(block.number);
        _records[id] = Record({
            root: root, bundleHash: keccak256(bundle), publisher: msg.sender, timestamp: time, blockNumber: blockNumber
        });
        emit Published(id, root, msg.sender, block.timestamp, bundle);
    }

    /// @notice How many records have been published.
    function recordCount() external view returns (uint256) {
        return _count;
    }

    /// @notice A published record.
    function getRecord(uint256 id) external view returns (Record memory) {
        if (id == 0 || id > _count) revert UnknownRecord(id);
        return _records[id];
    }

    /// @notice The id a root was published under; zero if never.
    function recordIdOf(bytes32 root) external view returns (uint256) {
        return _idOf[root];
    }

    /// @notice The leaf for one field.
    /// @param path The field's name in the record.
    /// @param salt The field's 32-byte salt.
    /// @param valueHash keccak256 of the field value's canonical JSON.
    function leafHash(string calldata path, bytes32 salt, bytes32 valueHash) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x00), keccak256(bytes(path)), salt, valueHash));
    }

    /// @notice The inner node over two children, in sorted order.
    function nodeHash(bytes32 a, bytes32 b) public pure returns (bytes32) {
        return a < b
            ? keccak256(abi.encodePacked(bytes1(0x01), a, b))
            : keccak256(abi.encodePacked(bytes1(0x01), b, a));
    }

    /// @notice Whether a leaf is in the tree with this root.
    /// @param proof Sibling hashes from the leaf up to the root.
    function verifyLeaf(bytes32 root, bytes32 leaf, bytes32[] calldata proof) external pure returns (bool) {
        bytes32 h = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            h = nodeHash(h, proof[i]);
        }
        return h == root;
    }
}
