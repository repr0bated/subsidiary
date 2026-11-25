// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";

/// @notice Anchor one receipt-chain head. Called by anchor-head.sh after the backend verifies the chain.
/// Environment: ANCHOR_ADDRESS, ANCHOR_KEY, HEAD (bytes32). No key is stored in this file or
/// passed on a command line.
contract AnchorHead is Script {
    function run() external {
        EtchedAnchor anchor = EtchedAnchor(vm.envAddress("ANCHOR_ADDRESS"));
        bytes32 head = vm.envBytes32("HEAD");
        if (anchor.isAnchored(head)) {
            console.log("already anchored");
            return;
        }
        vm.startBroadcast(vm.envUint("ANCHOR_KEY"));
        anchor.anchor(head);
        vm.stopBroadcast();
        console.log("anchored");
    }
}
