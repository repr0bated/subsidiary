## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Test evidence

Gas per test is in `.gas-snapshot` (`forge snapshot`). Coverage from `forge coverage --report summary`, 2026-11-26 (39 tests pass; the optimizer is off for coverage runs). The scripts are exercised by the demo, not by tests.

| File | % Lines | % Statements | % Branches | % Funcs |
|---|---|---|---|---|
| src/EtchedAnchor.sol | 100.00% (11/11) | 100.00% (11/11) | 100.00% (2/2) | 100.00% (3/3) |
| src/HireContract.sol | 100.00% (96/96) | 97.30% (108/111) | 86.21% (25/29) | 100.00% (15/15) |
| script/AnchorHead.s.sol | 0.00% (0/10) | 0.00% (0/11) | 0.00% (0/1) | 0.00% (0/1) |
| script/DemoHire.s.sol | 0.00% (0/24) | 0.00% (0/31) | 0.00% (0/1) | 0.00% (0/1) |
| script/Deploy.s.sol | 0.00% (0/8) | 0.00% (0/8) | N/A (0/0) | 0.00% (0/1) |
| test/EtchedAnchor.invariant.t.sol | 90.48% (19/21) | 95.45% (21/22) | 100.00% (2/2) | 66.67% (2/3) |
| test/HireContract.invariant.t.sol | 82.52% (85/103) | 85.19% (92/108) | 100.00% (19/19) | 86.67% (13/15) |
| Total | 77.29% (211/273) | 76.82% (232/302) | 88.89% (48/54) | 84.62% (33/39) |
