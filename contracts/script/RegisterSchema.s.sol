// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DeployBase} from "./DeployBase.sol";
import {SavingsRegistry} from "../src/SavingsRegistry.sol";

interface ISchemaRegistryFull {
    struct SchemaRecord {
        bytes32 uid;
        address resolver;
        bool revocable;
        string schema;
    }

    function register(string calldata schema, address resolver, bool revocable) external returns (bytes32);
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory);
}

/// Registers the payment schema on EAS (non-revocable, no resolver) and locks its UID into
/// the SavingsRegistry through the one-time setter.
contract RegisterSchema is DeployBase {
    function run() external {
        string memory json = vm.readFile(DEPLOYMENTS);
        SavingsRegistry registry = SavingsRegistry(vm.parseJsonAddress(json, ".SavingsRegistry"));
        ISchemaRegistryFull schemas = ISchemaRegistryFull(vm.parseJsonAddress(json, ".SchemaRegistry"));
        string memory schema = registry.SCHEMA();
        bytes32 uid = keccak256(abi.encodePacked(schema, address(0), false));

        vm.startBroadcast(_deployerKey());
        // The UID is content-addressed, so someone may already have registered the same schema.
        if (schemas.getSchema(uid).uid == bytes32(0)) {
            require(schemas.register(schema, address(0), false) == uid, "uid mismatch");
        }
        if (registry.schemaUID() == bytes32(0)) registry.setSchemaUID(uid);
        vm.stopBroadcast();

        require(registry.schemaUID() == uid, "registry schema mismatch");
        vm.writeJson(vm.toString(uid), DEPLOYMENTS, ".schemaUID");
    }
}
