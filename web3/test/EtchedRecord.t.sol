// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {EtchedRecord} from "../src/EtchedRecord.sol";

contract EtchedRecordTest is Test {
    EtchedRecord internal records;

    event Published(
        uint256 indexed id, bytes32 indexed root, address indexed publisher, uint256 timestamp, bytes bundle
    );

    // Shared test vector with ui/src/lib/web3/disclosure.test.ts: record
    // {status: "delivered", client: "Ada Lovelace", design: {patent: "pending"}}, salts 0x11.., 0x22.., 0x33..
    // for client, design, status. Values hash as canonical JSON (jq -S -c).
    bytes32 internal constant ROOT = 0x99e2f8cc8681e2b207d3b8862993558ddbbb031bbd4f8cde53ddc5875911591d;
    bytes32 internal constant SALT_CLIENT = 0x1111111111111111111111111111111111111111111111111111111111111111;
    bytes32 internal constant SALT_DESIGN = 0x2222222222222222222222222222222222222222222222222222222222222222;
    bytes32 internal constant SALT_STATUS = 0x3333333333333333333333333333333333333333333333333333333333333333;

    function setUp() public {
        records = new EtchedRecord();
    }

    function _leaves() internal view returns (bytes32 client, bytes32 design, bytes32 status) {
        client = records.leafHash("client", SALT_CLIENT, keccak256('"Ada Lovelace"'));
        design = records.leafHash("design", SALT_DESIGN, keccak256('{"patent":"pending"}'));
        status = records.leafHash("status", SALT_STATUS, keccak256('"delivered"'));
    }

    function test_TreeMatchesTheTypeScriptBuilder() public view {
        (bytes32 client, bytes32 design, bytes32 status) = _leaves();
        // Leaves in path order: client, design, status. Pair left to right; status is carried up.
        bytes32 left = records.nodeHash(client, design);
        assertEq(records.nodeHash(left, status), ROOT);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = left;
        assertTrue(records.verifyLeaf(ROOT, status, proof));

        bytes32[] memory clientProof = new bytes32[](2);
        clientProof[0] = design;
        clientProof[1] = status;
        assertTrue(records.verifyLeaf(ROOT, client, clientProof));
    }

    function test_ChangedValueDoesNotProve() public view {
        (bytes32 client, bytes32 design,) = _leaves();
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = records.nodeHash(client, design);
        bytes32 forged = records.leafHash("status", SALT_STATUS, keccak256('"cancelled"'));
        assertFalse(records.verifyLeaf(ROOT, forged, proof));
    }

    function test_LeafIsNotANode() public view {
        bytes32 a = keccak256("a");
        bytes32 b = keccak256("b");
        assertTrue(records.leafHash("x", a, b) != records.nodeHash(a, b));
        assertEq(records.nodeHash(a, b), records.nodeHash(b, a));
    }

    function test_PublishStoresAndEmits() public {
        bytes memory bundle = bytes('{"fields":[],"root":"0x99e2","version":"subsidiary.record/1","withheld":3}');
        vm.warp(1_000);
        vm.roll(42);
        vm.expectEmit(true, true, true, true, address(records));
        emit Published(1, ROOT, address(this), 1_000, bundle);
        uint256 id = records.publish(ROOT, bundle);
        assertEq(id, 1);
        assertEq(records.recordCount(), 1);
        assertEq(records.recordIdOf(ROOT), 1);
        EtchedRecord.Record memory r = records.getRecord(1);
        assertEq(r.root, ROOT);
        assertEq(r.bundleHash, keccak256(bundle));
        assertEq(r.publisher, address(this));
        assertEq(r.timestamp, 1_000);
        assertEq(r.blockNumber, 42);
    }

    function test_IdsCount() public {
        assertEq(records.publish(keccak256("one"), "a"), 1);
        assertEq(records.publish(keccak256("two"), "b"), 2);
        assertEq(records.recordCount(), 2);
        assertEq(records.recordIdOf(keccak256("never")), 0);
    }

    function test_Reverts() public {
        vm.expectRevert(EtchedRecord.ZeroRoot.selector);
        records.publish(bytes32(0), "x");
        vm.expectRevert(EtchedRecord.EmptyBundle.selector);
        records.publish(ROOT, "");
        records.publish(ROOT, "x");
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(EtchedRecord.AlreadyPublished.selector, ROOT, uint256(1)));
        records.publish(ROOT, "y");
        vm.expectRevert(abi.encodeWithSelector(EtchedRecord.UnknownRecord.selector, uint256(0)));
        records.getRecord(0);
        vm.expectRevert(abi.encodeWithSelector(EtchedRecord.UnknownRecord.selector, uint256(2)));
        records.getRecord(2);
    }

    /// Property: any nonzero root publishes once, under the next id, and keeps its first record.
    function testFuzz_AnyRootPublishesOnce(bytes32 root, address publisher, bytes calldata bundle) public {
        vm.assume(root != bytes32(0) && bundle.length > 0);
        vm.prank(publisher);
        uint256 id = records.publish(root, bundle);
        assertEq(id, 1);
        assertEq(records.getRecord(id).publisher, publisher);
        assertEq(records.getRecord(id).bundleHash, keccak256(bundle));
        vm.expectRevert(abi.encodeWithSelector(EtchedRecord.AlreadyPublished.selector, root, id));
        records.publish(root, bundle);
    }

    /// Property: a leaf proves into a two-leaf root only with its sibling, and nothing else does.
    function testFuzz_ProofIsSpecific(bytes32 a, bytes32 b, bytes32 c) public view {
        vm.assume(c != a && c != b);
        bytes32 root = records.nodeHash(a, b);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = b;
        assertTrue(records.verifyLeaf(root, a, proof));
        assertFalse(records.verifyLeaf(root, c, proof));
    }
}
