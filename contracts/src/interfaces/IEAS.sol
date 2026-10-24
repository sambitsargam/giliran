// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimal slices of the EAS interfaces (https://github.com/ethereum-attestation-service/eas-contracts).

struct AttestationRequestData {
    address recipient;
    uint64 expirationTime;
    bool revocable;
    bytes32 refUID;
    bytes data;
    uint256 value;
}

struct AttestationRequest {
    bytes32 schema;
    AttestationRequestData data;
}

interface IEAS {
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

interface ISchemaRegistry {
    function register(string calldata schema, address resolver, bool revocable) external returns (bytes32);
}
