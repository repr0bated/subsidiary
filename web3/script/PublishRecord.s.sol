// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EtchedRecord} from "../src/EtchedRecord.sol";

/// @notice Publish one record. Called by publish-record.sh.
/// Environment: RECORD_ADDRESS, PUBLISH_KEY, ROOT (bytes32), BUNDLE (the bundle's bytes, hex).
/// No key is stored in this file or passed on a command line.
contract PublishRecord is Script {
    function run() external {
        EtchedRecord records = EtchedRecord(vm.envAddress("RECORD_ADDRESS"));
        bytes32 root = vm.envBytes32("ROOT");
        bytes memory bundle = vm.envBytes("BUNDLE");
        uint256 existing = records.recordIdOf(root);
        if (existing != 0) {
            console.log("already published", existing);
            return;
        }
        vm.startBroadcast(vm.envUint("PUBLISH_KEY"));
        uint256 id = records.publish(root, bundle);
        vm.stopBroadcast();
        console.log("published", id);
    }
}
