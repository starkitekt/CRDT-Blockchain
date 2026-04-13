// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HoneyTraceRoleControl {
    uint8 public constant ROLE_ADMIN = 1;
    uint8 public constant ROLE_RECORDER = 2;
    uint8 public constant ROLE_OFFICER = 3;

    mapping(address => mapping(uint8 => bool)) private _roles;
    address public owner;

    event RoleGranted(address indexed account, uint8 indexed role, address indexed grantedBy);
    event RoleRevoked(address indexed account, uint8 indexed role, address indexed revokedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    modifier onlyRole(uint8 role) {
        require(_roles[msg.sender][role] || _roles[msg.sender][ROLE_ADMIN], "INSUFFICIENT_ROLE");
        _;
    }

    constructor() {
        owner = msg.sender;
        _grantRole(msg.sender, ROLE_ADMIN);
        _grantRole(msg.sender, ROLE_RECORDER);
        _grantRole(msg.sender, ROLE_OFFICER);
    }

    function hasRole(address account, uint8 role) external view returns (bool) {
        return _roles[account][role] || _roles[account][ROLE_ADMIN];
    }

    function grantRole(address account, uint8 role) external onlyOwner {
        _grantRole(account, role);
    }

    function revokeRole(address account, uint8 role) external onlyOwner {
        _roles[account][role] = false;
        emit RoleRevoked(account, role, msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function _grantRole(address account, uint8 role) internal {
        require(account != address(0), "ZERO_ADDRESS");
        _roles[account][role] = true;
        emit RoleGranted(account, role, msg.sender);
    }
}