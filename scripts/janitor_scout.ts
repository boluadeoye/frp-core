import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

/**
 * GHOST JANITOR SCOUT v1.2
 * Fixed for Vercel compatibility.
 */

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MIN_PROFIT_ETH = "0.0001"; 

async function scout() {
    if (!RPC_URL || !PRIVATE_KEY) {
        console.error("[-] Missing Environment Variables.");
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const registryPath = path.join(process.cwd(), 'lib', 'mercenary', 'registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

    console.log(`[+] SCOUT ACTIVE. WALLET: ${wallet.address}`);

    for (const target of registry) {
        console.log(`[~] Checking ${target.name}...`);

        try {
            const contract = new ethers.Contract(
                target.address,
                [`function ${target.function}() external`],
                wallet
            );

            await contract[target.function].staticCall();

            const gasEstimate = await contract[target.function].estimateGas();
            const feeData = await provider.getFeeData();
            
            // Use BigInt constructor instead of literal 0n
            const gasPrice = feeData.gasPrice || BigInt(0);
            const gasCost = gasEstimate * gasPrice;

            console.log(`[+] Potential Gas Cost: ${ethers.formatEther(gasCost)} ETH`);

            if (gasCost < ethers.parseEther(MIN_PROFIT_ETH)) {
                console.log(`[!!!] PROFITABLE TARGET FOUND. EXECUTING STRIKE...`);
                const tx = await contract[target.function]({
                    gasLimit: (gasEstimate * BigInt(120)) / BigInt(100)
                });
                console.log(`[+] Strike Sent: ${tx.hash}`);
                await tx.wait();
                console.log(`[+] Strike Confirmed.`);
            } else {
                console.log(`[-] Margin too thin. Skipping.`);
            }

        } catch (e: any) {
            console.log(`[-] ${target.name} skipped: ${e.message.substring(0, 60)}...`);
        }
    }
}

scout();
