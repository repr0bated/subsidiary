// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {EtchedAnchor} from "../src/EtchedAnchor.sol";
import {HireContract} from "../src/HireContract.sol";

/// @notice Deploy EtchedAnchor and HireContract.
/// Usage (anvil, chain 31337):
///   DEPLOYER_KEY=<key from the environment> forge script script/Deploy.s.sol --rpc-url anvil --broadcast
/// No key is stored in this file.
contract Deploy is Script {
    function run() external returns (EtchedAnchor anchor, HireContract hires) {
        uint256 key = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(key);
        anchor = new EtchedAnchor();
        hires = new HireContract(anchor);
        vm.stopBroadcast();
        console.log("EtchedAnchor", address(anchor));
        console.log("HireContract", address(hires));
    }
}
