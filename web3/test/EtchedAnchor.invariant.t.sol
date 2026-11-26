// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";

/// @dev Anchors heads from a small pool (zero and repeats included) from several senders,
///      and records what the contract should hold for each head that was anchored.
contract AnchorHandler is Test {
    EtchedAnchor public immutable anchor;

    uint256 internal constant POOL = 6;
    address[3] internal senders = [address(0xA11CE), address(0xB0B), address(0xCA401)];

    /// The pool of heads the handler uses. Index 0 is the zero head.
    bytes32[POOL] public pool;

    mapping(bytes32 => bool) public ghostAnchored;
    mapping(bytes32 => uint256) public ghostTimestamp;
    mapping(bytes32 => address) public ghostSender;

    constructor(EtchedAnchor a) {
        anchor = a;
        pool[0] = bytes32(0);
        for (uint256 i = 1; i < POOL; i++) {
            pool[i] = keccak256(abi.encode("head", i));
        }
    }

    function poolSize() external pure returns (uint256) {
        return POOL;
    }

    function anchorHead(uint256 headSeed, uint256 senderSeed, uint256 timeStep) external {
        bytes32 head = pool[headSeed % POOL];
        address sender = senders[senderSeed % senders.length];
        uint256 now_ = vm.getBlockTimestamp() + bound(timeStep, 0, 1 days);
        vm.warp(now_);

        vm.prank(sender);
        try anchor.anchor(head) {
            // A success on a head already recorded, or on zero, is itself a violation.
            assertFalse(ghostAnchored[head], "re-anchored a head");
            assertTrue(head != bytes32(0), "anchored zero");
            ghostAnchored[head] = true;
            ghostTimestamp[head] = now_;
            ghostSender[head] = sender;
        } catch {
            assertTrue(head == bytes32(0) || ghostAnchored[head], "fresh head rejected");
        }
    }
}

contract EtchedAnchorInvariantTest is StdInvariant, Test {
    EtchedAnchor internal anchor;
    AnchorHandler internal handler;

    function setUp() public {
        anchor = new EtchedAnchor();
        handler = new AnchorHandler(anchor);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = AnchorHandler.anchorHead.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// The zero head is never anchored.
    function invariant_ZeroHeadNeverAnchored() public view {
        assertFalse(anchor.isAnchored(bytes32(0)));
        (uint256 ts, address by) = anchor.anchorOf(bytes32(0));
        assertEq(ts, 0);
        assertEq(by, address(0));
    }

    /// Once anchored, a head's timestamp and sender never change.
    function invariant_AnchorRecordsNeverChange() public view {
        for (uint256 i = 0; i < handler.poolSize(); i++) {
            bytes32 head = handler.pool(i);
            if (!handler.ghostAnchored(head)) continue;
            (uint256 ts, address by) = anchor.anchorOf(head);
            assertEq(ts, handler.ghostTimestamp(head));
            assertEq(by, handler.ghostSender(head));
        }
    }

    /// isAnchored holds exactly for the heads the handler anchored successfully.
    function invariant_IsAnchoredMatchesGhostSet() public view {
        for (uint256 i = 0; i < handler.poolSize(); i++) {
            bytes32 head = handler.pool(i);
            assertEq(anchor.isAnchored(head), handler.ghostAnchored(head));
        }
    }
}
