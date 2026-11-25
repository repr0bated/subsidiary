// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";
import {HireContract} from "../src/HireContract.sol";

/// @notice One full hire, end to end, on anvil: create, accept, anchor the work head,
///         deliver, confirm by both parties. Prints the hire id and its hashes.
/// Environment (all required, nothing stored here):
///   ANCHOR_ADDRESS, HIRE_ADDRESS   deployed contracts (see Deploy.s.sol)
///   CLIENT_KEY, PROVIDER_KEY       the two parties' keys
///   TERMS_HASH                     hash of the salted off-chain terms document
///   WORK_HEAD                      3tched receipt-chain head after the work
///   WARRANTY_SECONDS               optional, default 604800 (7 days)
/// Usage:
///   forge script script/DemoHire.s.sol --rpc-url anvil --broadcast
contract DemoHire is Script {
    function run() external returns (uint256 hireId) {
        EtchedAnchor anchor = EtchedAnchor(vm.envAddress("ANCHOR_ADDRESS"));
        HireContract hires = HireContract(vm.envAddress("HIRE_ADDRESS"));
        uint256 clientKey = vm.envUint("CLIENT_KEY");
        uint256 providerKey = vm.envUint("PROVIDER_KEY");
        bytes32 terms = vm.envBytes32("TERMS_HASH");
        bytes32 workHead = vm.envBytes32("WORK_HEAD");
        uint64 warranty = uint64(vm.envOr("WARRANTY_SECONDS", uint256(7 days)));
        address provider = vm.addr(providerKey);

        vm.startBroadcast(clientKey);
        hireId = hires.createHire(provider, terms, warranty);
        vm.stopBroadcast();

        vm.startBroadcast(providerKey);
        hires.accept(hireId);
        if (!anchor.isAnchored(workHead)) anchor.anchor(workHead);
        hires.deliver(hireId, workHead);
        hires.confirm(hireId);
        vm.stopBroadcast();

        vm.startBroadcast(clientKey);
        hires.confirm(hireId);
        vm.stopBroadcast();

        console.log("hireId", hireId);
        console.logBytes32(terms);
        console.logBytes32(workHead);
    }
}
