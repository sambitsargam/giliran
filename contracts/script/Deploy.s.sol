// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DeployBase} from "./DeployBase.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {FakeCircleDemo} from "../src/demo/FakeCircleDemo.sol";

/// Deploys MockUSDC, SavingsRegistry, CircleFactory and FakeCircleDemo, then writes the
/// addresses to deployments/base-sepolia.json.
contract Deploy is DeployBase {
    address internal constant EAS = 0x4200000000000000000000000000000000000021;
    address internal constant SCHEMA_REGISTRY = 0x4200000000000000000000000000000000000020;
    address internal constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 key = _deployerKey();
        address deployer = vm.addr(key);
        uint256 startBlock = block.number;

        vm.startBroadcast(key);
        MockUSDC tusdc = new MockUSDC();
        // The registry needs the factory address and the factory needs the registry, so
        // predict the factory's address from the deployer nonce (registry is next, factory after).
        address predictedFactory = vm.computeCreateAddress(deployer, vm.getNonce(deployer) + 1);
        SavingsRegistry registry = new SavingsRegistry(predictedFactory, EAS);
        CircleFactory factory = new CircleFactory(registry, address(tusdc), USDC);
        require(address(factory) == predictedFactory, "factory address mismatch");

        address[3] memory real;
        for (uint256 i; i < 3; ++i) {
            real[i] = address(uint160(uint256(keccak256(abi.encode("giliran.fake.real", i)))));
        }
        FakeCircleDemo fake = new FakeCircleDemo(address(tusdc), 10e6, real);
        vm.stopBroadcast();

        string memory o = "deployments";
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeUint(o, "deployBlock", startBlock);
        vm.serializeAddress(o, "deployer", deployer);
        vm.serializeAddress(o, "MockUSDC", address(tusdc));
        vm.serializeAddress(o, "SavingsRegistry", address(registry));
        vm.serializeAddress(o, "CircleFactory", address(factory));
        vm.serializeAddress(o, "FakeCircleDemo", address(fake));
        vm.serializeAddress(o, "USDC", USDC);
        vm.serializeAddress(o, "EAS", EAS);
        vm.serializeAddress(o, "SchemaRegistry", SCHEMA_REGISTRY);
        string memory json = vm.serializeBytes32(o, "schemaUID", bytes32(0));
        vm.writeJson(json, DEPLOYMENTS);
    }
}
