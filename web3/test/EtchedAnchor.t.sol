// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";

contract EtchedAnchorTest is Test {
    EtchedAnchor internal anchor;

    event Anchored(bytes32 indexed head, uint256 timestamp, address indexed sender);

    function setUp() public {
        anchor = new EtchedAnchor();
    }

    function test_AnchorStoresAndEmits() public {
        bytes32 head = keccak256("head-1");
        vm.warp(1_000);
        vm.expectEmit(true, true, false, true, address(anchor));
        emit Anchored(head, 1_000, address(this));
        anchor.anchor(head);
        assertTrue(anchor.isAnchored(head));
        (uint256 ts, address by) = anchor.anchorOf(head);
        assertEq(ts, 1_000);
        assertEq(by, address(this));
    }

    function test_ZeroHeadReverts() public {
        vm.expectRevert(EtchedAnchor.ZeroHead.selector);
        anchor.anchor(bytes32(0));
    }

    function test_UnknownHeadIsNotAnchored() public view {
        assertFalse(anchor.isAnchored(keccak256("never")));
        (uint256 ts, address by) = anchor.anchorOf(keccak256("never"));
        assertEq(ts, 0);
        assertEq(by, address(0));
    }

    function test_FirstAnchoringStands() public {
        bytes32 head = keccak256("head-2");
        vm.warp(10);
        anchor.anchor(head);
        vm.warp(20);
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(EtchedAnchor.AlreadyAnchored.selector, head, uint256(10)));
        anchor.anchor(head);
        (uint256 ts, address by) = anchor.anchorOf(head);
        assertEq(ts, 10);
        assertEq(by, address(this));
    }

    /// Property: any nonzero head anchors once, is then reported anchored, and records its sender.
    function testFuzz_AnyNonzeroHeadAnchorsOnce(bytes32 head, address sender, uint64 when) public {
        vm.assume(head != bytes32(0));
        vm.assume(when > 0);
        vm.warp(when);
        vm.prank(sender);
        anchor.anchor(head);
        assertTrue(anchor.isAnchored(head));
        (uint256 ts, address by) = anchor.anchorOf(head);
        assertEq(ts, when);
        assertEq(by, sender);
        vm.expectRevert();
        anchor.anchor(head);
    }

    /// Property: anchoring one head never makes a different head anchored.
    function testFuzz_AnchoringIsSpecific(bytes32 a, bytes32 b) public {
        vm.assume(a != bytes32(0) && a != b);
        vm.warp(1);
        anchor.anchor(a);
        assertFalse(anchor.isAnchored(b));
    }
}
