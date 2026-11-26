// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";
import {HireContract} from "../src/HireContract.sol";

/// @dev Drives HireContract through every action from four actors, with bounded ids and inputs,
///      and keeps ghost state for what the contract must hold. Every call is wrapped in
///      try/catch, so a revert is an allowed outcome; a success is checked against the rules.
contract HireHandler is Test {
    HireContract public immutable hire;
    EtchedAnchor public immutable anchor;

    uint256 internal constant ACTORS = 4;
    uint256 internal constant HEADS = 6;
    address[ACTORS] internal actors = [address(0xA11CE), address(0xB0B), address(0xCA401), address(0xD0D0)];

    /// Heads the handler may anchor or use. Index 0 is the zero head.
    bytes32[HEADS] public heads;

    struct Ghost {
        address client;
        address provider;
        bytes32 termsHash;
        uint64 warrantyPeriod;
        HireContract.Status status;
    }

    uint256 public ghostCount;
    mapping(uint256 hireId => Ghost) internal _ghost;
    mapping(uint256 hireId => uint256) public ghostClaims;
    mapping(uint256 hireId => mapping(uint256 claimId => bool)) public ghostResolvedClaim;
    mapping(address provider => uint64) public ghostCompleted;
    mapping(address provider => uint64) public ghostFiled;
    mapping(address provider => uint64) public ghostResolved;

    constructor(HireContract h) {
        hire = h;
        anchor = h.anchor();
        for (uint256 i = 1; i < HEADS; i++) {
            heads[i] = keccak256(abi.encode("head", i));
        }
    }

    function actorAt(uint256 i) external view returns (address) {
        return actors[i];
    }

    function ghostOf(uint256 hireId) external view returns (Ghost memory) {
        return _ghost[hireId];
    }

    // ---- actions ----

    function warp(uint256 dt) external {
        vm.warp(vm.getBlockTimestamp() + bound(dt, 0, 20 days));
    }

    function anchorHead(uint256 headSeed, uint256 callerSeed) external {
        vm.prank(actors[callerSeed % ACTORS]);
        try anchor.anchor(heads[headSeed % HEADS]) {} catch {}
    }

    function createHire(uint256 clientSeed, uint256 providerSeed, uint256 termsSeed, uint256 warranty) external {
        address client = actors[clientSeed % ACTORS];
        address provider = actors[providerSeed % ACTORS];
        bytes32 terms = termsSeed % 8 == 0 ? bytes32(0) : keccak256(abi.encode("terms", termsSeed));
        // forge-lint: disable-next-line(unsafe-typecast) -- bounded to 30 days
        uint64 period = uint64(bound(warranty, 0, 30 days));

        vm.prank(client);
        try hire.createHire(provider, terms, period) returns (uint256 id) {
            assertEq(id, ghostCount + 1, "hire ids are sequential");
            assertTrue(terms != bytes32(0) && provider != client, "invalid hire created");
            ghostCount = id;
            _ghost[id] = Ghost(client, provider, terms, period, HireContract.Status.Created);
        } catch {
            assertTrue(terms == bytes32(0) || provider == client, "valid hire rejected");
        }
    }

    function accept(uint256 idSeed, uint256 callerSeed) external {
        (uint256 id, HireContract.Status before) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        vm.prank(caller);
        try hire.accept(id) {
            assertEq(uint8(before), uint8(HireContract.Status.Created), "accept from wrong status");
            assertEq(caller, _ghost[id].provider, "accept by non-provider");
            _sync(id, before);
        } catch {}
    }

    function cancel(uint256 idSeed, uint256 callerSeed) external {
        (uint256 id, HireContract.Status before) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        vm.prank(caller);
        try hire.cancel(id) {
            assertEq(uint8(before), uint8(HireContract.Status.Created), "cancel from wrong status");
            assertEq(caller, _ghost[id].client, "cancel by non-client");
            _sync(id, before);
        } catch {}
    }

    function deliver(uint256 idSeed, uint256 callerSeed, uint256 headSeed) external {
        (uint256 id, HireContract.Status before) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        bytes32 head = heads[headSeed % HEADS];
        vm.prank(caller);
        try hire.deliver(id, head) {
            assertEq(uint8(before), uint8(HireContract.Status.Accepted), "deliver from wrong status");
            assertEq(caller, _ghost[id].provider, "deliver by non-provider");
            assertTrue(head != bytes32(0) && anchor.isAnchored(head), "delivered an unanchored head");
            _sync(id, before);
        } catch {}
    }

    function confirm(uint256 idSeed, uint256 callerSeed) external {
        (uint256 id, HireContract.Status before) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        vm.prank(caller);
        try hire.confirm(id) {
            assertEq(uint8(before), uint8(HireContract.Status.Delivered), "confirm from wrong status");
            assertTrue(caller == _ghost[id].client || caller == _ghost[id].provider, "confirm by non-party");
            _sync(id, before);
        } catch {}
    }

    function fileClaim(uint256 idSeed, uint256 callerSeed, uint256 claimSeed) external {
        (uint256 id, HireContract.Status before) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        bytes32 claimHash = claimSeed % 8 == 0 ? bytes32(0) : keccak256(abi.encode("claim", claimSeed));
        vm.prank(caller);
        try hire.fileClaim(id, claimHash) returns (uint256 claimId) {
            assertEq(uint8(before), uint8(HireContract.Status.Completed), "claim on a hire not completed");
            assertEq(caller, _ghost[id].client, "claim by non-client");
            assertTrue(claimHash != bytes32(0), "zero claim accepted");
            assertLe(block.timestamp, uint256(hire.getHire(id).completedAt) + _ghost[id].warrantyPeriod, "late claim");
            assertEq(claimId, ghostClaims[id], "claim ids are sequential");
            ghostClaims[id] += 1;
            ghostFiled[_ghost[id].provider] += 1;
        } catch {}
    }

    function resolveClaim(uint256 idSeed, uint256 callerSeed, uint256 claimSeed, uint256 headSeed) external {
        (uint256 id,) = _pick(idSeed);
        address caller = actors[callerSeed % ACTORS];
        uint256 claimId = bound(claimSeed, 0, ghostClaims[id] + 1);
        bytes32 head = heads[headSeed % HEADS];
        vm.prank(caller);
        try hire.resolveClaim(id, claimId, head) {
            assertEq(caller, _ghost[id].provider, "resolve by non-provider");
            assertLt(claimId, ghostClaims[id], "resolved an unknown claim");
            assertFalse(ghostResolvedClaim[id][claimId], "resolved a claim twice");
            assertTrue(head != bytes32(0) && anchor.isAnchored(head), "remedy not anchored");
            ghostResolvedClaim[id][claimId] = true;
            ghostResolved[_ghost[id].provider] += 1;
        } catch {}
    }

    // ---- helpers ----

    /// Pick a hire id from 1 to count + 1 (the last one does not exist) and read its status.
    function _pick(uint256 idSeed) internal view returns (uint256 id, HireContract.Status status) {
        id = bound(idSeed, 1, ghostCount + 1);
        status = id <= ghostCount ? hire.getHire(id).status : HireContract.Status.None;
    }

    /// After a successful call: the move must be one the contract allows, then update the ghost.
    function _sync(uint256 id, HireContract.Status before) internal {
        HireContract.Status nowStatus = hire.getHire(id).status;
        assertTrue(_allowed(before, nowStatus), "status moved along a forbidden transition");
        if (nowStatus == HireContract.Status.Completed && before != HireContract.Status.Completed) {
            ghostCompleted[_ghost[id].provider] += 1;
        }
        _ghost[id].status = nowStatus;
    }

    function _allowed(HireContract.Status from, HireContract.Status to) internal pure returns (bool) {
        if (from == HireContract.Status.Created) {
            return to == HireContract.Status.Accepted || to == HireContract.Status.Cancelled;
        }
        if (from == HireContract.Status.Accepted) return to == HireContract.Status.Delivered;
        if (from == HireContract.Status.Delivered) {
            return to == HireContract.Status.Delivered || to == HireContract.Status.Completed;
        }
        return false;
    }
}

contract HireContractInvariantTest is StdInvariant, Test {
    EtchedAnchor internal anchor;
    HireContract internal hire;
    HireHandler internal handler;

    function setUp() public {
        anchor = new EtchedAnchor();
        hire = new HireContract(anchor);
        handler = new HireHandler(hire);
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = HireHandler.warp.selector;
        selectors[1] = HireHandler.anchorHead.selector;
        selectors[2] = HireHandler.createHire.selector;
        selectors[3] = HireHandler.accept.selector;
        selectors[4] = HireHandler.cancel.selector;
        selectors[5] = HireHandler.deliver.selector;
        selectors[6] = HireHandler.confirm.selector;
        selectors[7] = HireHandler.fileClaim.selector;
        selectors[8] = HireHandler.resolveClaim.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// The contract's status always equals the ghost status, which only the allowed transitions
    /// (checked in the handler on every success) can change. Hire ids are exactly 1..count.
    function invariant_StatusFollowsAllowedTransitions() public view {
        assertEq(hire.hireCount(), handler.ghostCount());
        for (uint256 id = 1; id <= handler.ghostCount(); id++) {
            assertEq(uint8(hire.getHire(id).status), uint8(handler.ghostOf(id).status));
        }
    }

    /// Client, provider, terms and warranty period never change after creation.
    function invariant_CreationFieldsNeverChange() public view {
        for (uint256 id = 1; id <= handler.ghostCount(); id++) {
            HireContract.Hire memory h = hire.getHire(id);
            HireHandler.Ghost memory g = handler.ghostOf(id);
            assertEq(h.client, g.client);
            assertEq(h.provider, g.provider);
            assertEq(h.termsHash, g.termsHash);
            assertEq(h.warrantyPeriod, g.warrantyPeriod);
        }
    }

    /// Every Delivered or Completed hire has a nonzero, anchored work head. Others have none.
    function invariant_DeliveredWorkIsAnchored() public view {
        for (uint256 id = 1; id <= handler.ghostCount(); id++) {
            HireContract.Hire memory h = hire.getHire(id);
            bool delivered = h.status == HireContract.Status.Delivered || h.status == HireContract.Status.Completed;
            if (delivered) {
                assertTrue(h.workHead != bytes32(0));
                assertTrue(anchor.isAnchored(h.workHead));
            } else {
                assertEq(h.workHead, bytes32(0));
            }
        }
    }

    /// A Completed hire has both confirmations; a Delivered one does not have both.
    function invariant_CompletionNeedsBothConfirmations() public view {
        for (uint256 id = 1; id <= handler.ghostCount(); id++) {
            HireContract.Hire memory h = hire.getHire(id);
            if (h.status == HireContract.Status.Completed) {
                assertTrue(h.clientConfirmed && h.providerConfirmed);
                assertGt(h.completedAt, 0);
            } else if (h.status == HireContract.Status.Delivered) {
                assertFalse(h.clientConfirmed && h.providerConfirmed);
            } else {
                assertFalse(h.clientConfirmed || h.providerConfirmed);
            }
        }
    }

    /// Each provider's public record equals the counts the handler saw succeed.
    function invariant_ProviderRecordMatchesGhostCounts() public view {
        for (uint256 i = 0; i < 4; i++) {
            address p = handler.actorAt(i);
            HireContract.Record memory r = hire.providerRecord(p);
            assertEq(r.completed, handler.ghostCompleted(p));
            assertEq(r.claimsFiled, handler.ghostFiled(p));
            assertEq(r.claimsResolved, handler.ghostResolved(p));
            assertLe(r.claimsResolved, r.claimsFiled);
        }
    }

    /// Claims exist only on Completed hires; a resolved claim has an anchored remedy head, an
    /// open one has none; resolution matches the ghost.
    function invariant_ClaimsOnlyOnCompletedAndRemediesAnchored() public view {
        for (uint256 id = 1; id <= handler.ghostCount(); id++) {
            uint256 n = hire.claimCount(id);
            assertEq(n, handler.ghostClaims(id));
            if (n > 0) assertEq(uint8(hire.getHire(id).status), uint8(HireContract.Status.Completed));
            for (uint256 c = 0; c < n; c++) {
                HireContract.Claim memory cl = hire.getClaim(id, c);
                assertTrue(cl.claimHash != bytes32(0));
                if (cl.resolvedAt != 0) {
                    assertTrue(cl.remedyHead != bytes32(0));
                    assertTrue(anchor.isAnchored(cl.remedyHead));
                    assertTrue(handler.ghostResolvedClaim(id, c));
                } else {
                    assertEq(cl.remedyHead, bytes32(0));
                    assertFalse(handler.ghostResolvedClaim(id, c));
                }
            }
        }
    }
}
