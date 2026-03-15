import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function scout() {
    if (!PRIVATE_KEY) {
        console.error("[-] PRIVATE_KEY missing.");
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`[+] SCOUT v1.4 ACTIVE. WALLET: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`[+] CURRENT BALANCE: ${ethers.formatEther(balance)} ETH`);

    const registry = [
        { name: "AERO-USDC", address: "0x207369c34CCd2559b4910df6f5162F297A0389e7", func: "getReward" },
        { name: "VELO-WETH", address: "0x7f71069345C99089646A3C18f9020756A934453D", func: "claimFees" }
    ];

    for (const target of registry) {
        try {
            // FIX: Force lowercase then getAddress to bypass checksum traps
            const cleanAddress = ethers.getAddress(target.address.toLowerCase());
            console.log(`[~] Checking ${target.name}...`);

            const contract = new ethers.Contract(cleanAddress, [`function ${target.func}() external`], wallet);

            // Simulate the call
            await contract[target.func].staticCall();
            
            const gasEstimate = await contract[target.func].estimateGas();
            const feeData = await provider.getFeeData();
            const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0));

            if (balance > gasCost) {
                console.log(`[!!!] PROFITABLE TARGET. EXECUTING...`);
                const tx = await contract[target.func]({ gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) });
                console.log(`[+] Strike Sent: ${tx.hash}`);
            } else {
                console.log(`[-] Need ${ethers.formatEther(gasCost)} ETH. Skipping.`);
            }
        } catch (e: any) {
            console.log(`[-] ${target.name} skipped: ${e.message.substring(0, 40)}`);
        }
    }
}
scout();
