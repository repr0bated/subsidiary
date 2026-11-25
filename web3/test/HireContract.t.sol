// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";
import {HireContract} from "../src/HireContract.sol";

contract HireContractTest is Test {
    EtchedAnchor internal anchor;
    HireContract internal hires;

    address internal client = address(0xC11E);
    address internal provider = address(0x9A0D);
    address internal stranger = address(0x5EE);

    bytes32 internal constant TERMS = keccak256("terms-v1|salt");
    bytes32 internal constant WORK = keccak256("work-head");
    bytes32 internal constant REMEDY = keccak256("remedy-head");
    bytes32 internal constant CLAIM = keccak256("claim-doc|salt");
    uint64 internal constant WARRANTY = 7 days;

    event HireCreated(
        uint256 indexed hireId,
        address indexed client,
        address indexed provider,
        bytes32 termsHash,
        uint64 warrantyPeriod
    );
    event HireCompleted(uint256 indexed hireId, bytes32 termsHash, bytes32 workHead);
    event WarrantyClaimed(uint256 indexed hireId, uint256 indexed claimId, bytes32 claimHash);
    event WarrantyResolved(uint256 indexed hireId, uint256 indexed claimId, bytes32 remedyHead);

    function setUp() public {
        vm.warp(1_000_000);
        anchor = new EtchedAnchor();
        hires = new HireContract(anchor);
        anchor.anchor(WORK);
        anchor.anchor(REMEDY);
    }

    // ---- helpers ----

    function _create() internal returns (uint256 id) {
        vm.prank(client);
        id = hires.createHire(provider, TERMS, WARRANTY);
    }

    function _accepted() internal returns (uint256 id) {
        id = _create();
        vm.prank(provider);
        hires.accept(id);
    }

    function _delivered() internal returns (uint256 id) {
        id = _accepted();
        vm.prank(provider);
        hires.deliver(id, WORK);
    }

    function _completed() internal returns (uint256 id) {
        id = _delivered();
        vm.prank(client);
        hires.confirm(id);
        vm.prank(provider);
        hires.confirm(id);
    }

    // ---- happy path ----

    function test_FullHireLifecycle() public {
        vm.expectEmit(true, true, true, true, address(hires));
        emit HireCreated(1, client, provider, TERMS, WARRANTY);
        uint256 id = _create();
        assertEq(id, 1);
        assertEq(uint8(hires.getHire(id).status), uint8(HireContract.Status.Created));

        vm.prank(provider);
        hires.accept(id);
        assertEq(uint8(hires.getHire(id).status), uint8(HireContract.Status.Accepted));

        vm.prank(provider);
        hires.deliver(id, WORK);
        assertEq(hires.getHire(id).workHead, WORK);

        vm.prank(client);
        hires.confirm(id);
        assertEq(uint8(hires.getHire(id).status), uint8(HireContract.Status.Delivered));

        vm.expectEmit(true, false, false, true, address(hires));
        emit HireCompleted(id, TERMS, WORK);
        vm.prank(provider);
        hires.confirm(id);

        HireContract.Hire memory h = hires.getHire(id);
        assertEq(uint8(h.status), uint8(HireContract.Status.Completed));
        assertEq(h.completedAt, block.timestamp);
        assertEq(hires.warrantyEnd(id), block.timestamp + WARRANTY);
        assertEq(hires.providerRecord(provider).completed, 1);
    }

    function test_WarrantyClaimAndRemedy() public {
        uint256 id = _completed();
        vm.expectEmit(true, true, false, true, address(hires));
        emit WarrantyClaimed(id, 0, CLAIM);
        vm.prank(client);
        uint256 claimId = hires.fileClaim(id, CLAIM);
        assertEq(claimId, 0);
        assertEq(hires.claimCount(id), 1);

        vm.expectEmit(true, true, false, true, address(hires));
        emit WarrantyResolved(id, 0, REMEDY);
        vm.prank(provider);
        hires.resolveClaim(id, 0, REMEDY);

        HireContract.Claim memory c = hires.getClaim(id, 0);
        assertEq(c.remedyHead, REMEDY);
        HireContract.Record memory r = hires.providerRecord(provider);
        assertEq(r.claimsFiled, 1);
        assertEq(r.claimsResolved, 1);
    }

    function test_CancelBeforeAccept() public {
        uint256 id = _create();
        vm.prank(client);
        hires.cancel(id);
        assertEq(uint8(hires.getHire(id).status), uint8(HireContract.Status.Cancelled));
    }

    // ---- create reverts ----

    function test_CreateRevertsOnZeroTerms() public {
        vm.prank(client);
        vm.expectRevert(HireContract.ZeroHash.selector);
        hires.createHire(provider, bytes32(0), WARRANTY);
    }

    function test_CreateRevertsOnZeroProvider() public {
        vm.prank(client);
        vm.expectRevert(HireContract.ZeroAddress.selector);
        hires.createHire(address(0), TERMS, WARRANTY);
    }

    function test_CreateRevertsOnSelfHire() public {
        vm.prank(client);
        vm.expectRevert(HireContract.SelfHire.selector);
        hires.createHire(client, TERMS, WARRANTY);
    }

    function test_ConstructorRevertsOnZeroAnchor() public {
        vm.expectRevert(HireContract.ZeroAnchor.selector);
        new HireContract(EtchedAnchor(address(0)));
    }

    // ---- role reverts ----

    function test_OnlyProviderAccepts() public {
        uint256 id = _create();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotProvider.selector, id));
        hires.accept(id);
    }

    function test_OnlyClientCancels() public {
        uint256 id = _create();
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotClient.selector, id));
        hires.cancel(id);
    }

    function test_CannotCancelAfterAccept() public {
        uint256 id = _accepted();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.WrongStatus.selector, id, HireContract.Status.Accepted));
        hires.cancel(id);
    }

    function test_DeliverNeedsAnchoredHead() public {
        uint256 id = _accepted();
        bytes32 unanchored = keccak256("not-anchored");
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotAnchored.selector, unanchored));
        hires.deliver(id, unanchored);
    }

    function test_DeliverRejectsZeroHead() public {
        uint256 id = _accepted();
        vm.prank(provider);
        vm.expectRevert(HireContract.ZeroHash.selector);
        hires.deliver(id, bytes32(0));
    }

    function test_DeliverBeforeAcceptReverts() public {
        uint256 id = _create();
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.WrongStatus.selector, id, HireContract.Status.Created));
        hires.deliver(id, WORK);
    }

    function test_StrangerCannotConfirm() public {
        uint256 id = _delivered();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotParty.selector, id));
        hires.confirm(id);
    }

    function test_DoubleConfirmReverts() public {
        uint256 id = _delivered();
        vm.prank(client);
        hires.confirm(id);
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.AlreadyConfirmed.selector, id));
        hires.confirm(id);
    }

    function test_ConfirmBeforeDeliveryReverts() public {
        uint256 id = _accepted();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.WrongStatus.selector, id, HireContract.Status.Accepted));
        hires.confirm(id);
    }

    function test_UnknownHireReverts() public {
        vm.expectRevert(abi.encodeWithSelector(HireContract.UnknownHire.selector, uint256(42)));
        hires.getHire(42);
    }

    // ---- warranty reverts ----

    function test_ClaimAfterWarrantyReverts() public {
        uint256 id = _completed();
        vm.warp(block.timestamp + WARRANTY + 1);
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.WarrantyExpired.selector, id));
        hires.fileClaim(id, CLAIM);
    }

    function test_ClaimOnLastWarrantySecondSucceeds() public {
        uint256 id = _completed();
        vm.warp(block.timestamp + WARRANTY);
        vm.prank(client);
        hires.fileClaim(id, CLAIM);
        assertEq(hires.claimCount(id), 1);
    }

    function test_OnlyClientClaims() public {
        uint256 id = _completed();
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotClient.selector, id));
        hires.fileClaim(id, CLAIM);
    }

    function test_ClaimBeforeCompletionReverts() public {
        uint256 id = _delivered();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.WrongStatus.selector, id, HireContract.Status.Delivered));
        hires.fileClaim(id, CLAIM);
    }

    function test_ZeroClaimHashReverts() public {
        uint256 id = _completed();
        vm.prank(client);
        vm.expectRevert(HireContract.ZeroHash.selector);
        hires.fileClaim(id, bytes32(0));
    }

    function test_RemedyNeedsAnchoredHead() public {
        uint256 id = _completed();
        vm.prank(client);
        hires.fileClaim(id, CLAIM);
        bytes32 unanchored = keccak256("no");
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotAnchored.selector, unanchored));
        hires.resolveClaim(id, 0, unanchored);
    }

    function test_OnlyProviderResolves() public {
        uint256 id = _completed();
        vm.prank(client);
        hires.fileClaim(id, CLAIM);
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotProvider.selector, id));
        hires.resolveClaim(id, 0, REMEDY);
    }

    function test_ResolveTwiceReverts() public {
        uint256 id = _completed();
        vm.prank(client);
        hires.fileClaim(id, CLAIM);
        vm.prank(provider);
        hires.resolveClaim(id, 0, REMEDY);
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.ClaimClosed.selector, id, uint256(0)));
        hires.resolveClaim(id, 0, REMEDY);
    }

    function test_UnknownClaimReverts() public {
        uint256 id = _completed();
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.UnknownClaim.selector, id, uint256(0)));
        hires.resolveClaim(id, 0, REMEDY);
    }

    // ---- properties (fuzz) ----

    /// Property: no address other than the provider can accept a hire.
    function testFuzz_NonProviderCannotAccept(address caller) public {
        vm.assume(caller != provider);
        uint256 id = _create();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotProvider.selector, id));
        hires.accept(id);
    }

    /// Property: no non-party can confirm a delivered hire.
    function testFuzz_NonPartyCannotConfirm(address caller) public {
        vm.assume(caller != client && caller != provider);
        uint256 id = _delivered();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotParty.selector, id));
        hires.confirm(id);
    }

    /// Property: delivery succeeds exactly when the head is anchored and nonzero.
    function testFuzz_DeliveryRequiresAnchoredHead(bytes32 head) public {
        vm.assume(head != bytes32(0) && head != WORK && head != REMEDY);
        uint256 id = _accepted();
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(HireContract.NotAnchored.selector, head));
        hires.deliver(id, head);
        anchor.anchor(head);
        vm.prank(provider);
        hires.deliver(id, head);
        assertEq(hires.getHire(id).workHead, head);
    }

    /// Property: a claim is accepted exactly within the warranty window.
    function testFuzz_ClaimWindow(uint64 warranty, uint64 delay) public {
        warranty = uint64(bound(warranty, 0, 365 days));
        delay = uint64(bound(delay, 0, 400 days));
        vm.prank(client);
        uint256 id = hires.createHire(provider, TERMS, warranty);
        vm.prank(provider);
        hires.accept(id);
        vm.prank(provider);
        hires.deliver(id, WORK);
        vm.prank(client);
        hires.confirm(id);
        vm.prank(provider);
        hires.confirm(id);
        vm.warp(block.timestamp + delay);
        vm.prank(client);
        if (delay <= warranty) {
            hires.fileClaim(id, CLAIM);
            assertEq(hires.claimCount(id), 1);
        } else {
            vm.expectRevert(abi.encodeWithSelector(HireContract.WarrantyExpired.selector, id));
            hires.fileClaim(id, CLAIM);
        }
    }

    /// Property: any terms hash and warranty round-trip into the stored hire.
    function testFuzz_CreateStoresTerms(bytes32 terms, uint64 warranty, address p) public {
        vm.assume(terms != bytes32(0) && p != address(0) && p != client);
        vm.prank(client);
        uint256 id = hires.createHire(p, terms, warranty);
        HireContract.Hire memory h = hires.getHire(id);
        assertEq(h.termsHash, terms);
        assertEq(h.warrantyPeriod, warranty);
        assertEq(h.client, client);
        assertEq(h.provider, p);
    }
}
