// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBalancerVault {
    function flashLoan(address recipient, address[] memory tokens, uint256[] memory amounts, bytes memory userData) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract GhostHarvester {
    address private constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function executeStrike(address token, uint256 amount, bytes calldata data) external {
        require(msg.sender == owner, "Unauthorized");
        
        address[] memory tokens = new address[](1);
        tokens[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        IBalancerVault(BALANCER_VAULT).flashLoan(address(this), tokens, amounts, data);
    }

    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Not Vault");

        // ATOMIC LOGIC: 
        // The 'userData' will contain the encoded instructions for the specific 
        // pregnant asset (Buy -> Claim -> Sell).
        (bool success, ) = address(this).call(userData);
        require(success, "Strike Failed");

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 amountToRepay = amounts[i] + feeAmounts[i];
            IERC20(tokens[i]).transfer(BALANCER_VAULT, amountToRepay);
        }

        uint256 profit = IERC20(tokens[0]).balanceOf(address(this));
        if (profit > 0) {
            IERC20(tokens[0]).transfer(owner, profit);
        }
    }

    // Fallback to receive ETH if necessary
    receive() external payable {}
}
