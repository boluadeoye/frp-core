// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FRPVerifier
 * @dev Verifies Forensic Reality Protocol (FRP) ECDSA signatures on-chain.
 * This contract allows DePIN protocols to automate reward slashing based on FRP audits.
 */
contract FRPVerifier {
    address public oraclePublicKey;
    address public owner;

    event VerificationPerformed(bytes32 indexed auditHash, bool isValid, uint256 fcsScore);

    constructor(address _initialOracleKey) {
        oraclePublicKey = _initialOracleKey;
        owner = msg.sender;
    }

    function updateOracleKey(address _newKey) external {
        require(msg.sender == owner, "UNAUTHORIZED");
        oraclePublicKey = _newKey;
    }

    /**
     * @dev Verifies an FRP signature.
     * @param auditHash The SHA-256 hash of the full manifest.
     * @param v, r, s The components of the ECDSA signature.
     */
    function verifyAudit(
        bytes32 auditHash,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 fcsScore
    ) external returns (bool) {
        address signer = ecrecover(auditHash, v, r, s);
        bool isValid = (signer == oraclePublicKey);
        
        emit VerificationPerformed(auditHash, isValid, fcsScore);
        return isValid;
    }
}
