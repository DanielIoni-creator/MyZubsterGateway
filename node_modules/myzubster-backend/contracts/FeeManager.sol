// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract FeeManager {
    struct FeeConfig {
        uint256 baseFee;
        uint256 variableRate;
        uint256 discountThreshold;
        uint256 discountRate;
        uint256 timestamp;
    }
    
    struct TreasuryAllocation {
        uint256 treasuryPercent;
        uint256 stakingPercent;
        uint256 communityPercent;
        uint256 lastDistribution;
    }
    
    FeeConfig public currentFee;
    TreasuryAllocation public allocation;
    address public governanceToken;
    
    event FeeUpdated(uint256 baseFee, uint256 variableRate, uint256 timestamp);
    event FeesDistributed(uint256 amount, uint256 treasury, uint256 staking, uint256 community);
    
    constructor(address _governanceToken) {
        governanceToken = _governanceToken;
        
        currentFee = FeeConfig({
            baseFee: 100,
            variableRate: 200,
            discountThreshold: 10000,
            discountRate: 150,
            timestamp: block.timestamp
        });
        
        allocation = TreasuryAllocation({
            treasuryPercent: 60,
            stakingPercent: 20,
            communityPercent: 20,
            lastDistribution: block.timestamp
        });
    }
    
    function calculateFee(uint256 amount, uint256 volume) public view returns (uint256) {
        uint256 variableFee = (volume * currentFee.variableRate) / 10000;
        
        if (volume >= currentFee.discountThreshold) {
            variableFee = (volume * currentFee.discountRate) / 10000;
        }
        
        return currentFee.baseFee + variableFee;
    }
    
    function calculateDistribution(uint256 totalFee) public view returns (
        uint256 treasuryAmount,
        uint256 stakingAmount,
        uint256 communityAmount
    ) {
        treasuryAmount = (totalFee * allocation.treasuryPercent) / 100;
        stakingAmount = (totalFee * allocation.stakingPercent) / 100;
        communityAmount = (totalFee * allocation.communityPercent) / 100;
    }
    
    function distributeFees(uint256 totalFee) external {
        (uint256 treasury, uint256 staking, uint256 community) = calculateDistribution(totalFee);
        emit FeesDistributed(totalFee, treasury, staking, community);
        allocation.lastDistribution = block.timestamp;
    }
    
    function createProposal(
        string memory description,
        uint256 newBaseFee,
        uint256 newVariableRate
    ) external {
        currentFee.baseFee = newBaseFee;
        currentFee.variableRate = newVariableRate;
        currentFee.timestamp = block.timestamp;
        
        emit FeeUpdated(newBaseFee, newVariableRate, block.timestamp);
    }
    
    function getCurrentFee() external view returns (
        uint256 baseFee,
        uint256 variableRate,
        uint256 discountThreshold,
        uint256 discountRate
    ) {
        return (
            currentFee.baseFee,
            currentFee.variableRate,
            currentFee.discountThreshold,
            currentFee.discountRate
        );
    }
}