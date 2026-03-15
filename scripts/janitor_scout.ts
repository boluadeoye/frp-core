import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MIN_PROFIT_ETH = "0.00001"; 

async function scout() {
    if (!RPC_URL || !PRIVATE_KEY) return;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/mercenary/registry.json'), 'utf8'));

    console.log(`[+] SCOUT ACTIVE. WALLET: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`[+] CURRENT BALANCE: ${ethers.formatEther(balance)} ETH`);

    for (const target of registry) {
        try {
            const cleanAddress = ethers.getAddress(target.address);
            console.log(`[~] Checking ${target.name}...`);
            const contract = new ethers.Contract(cleanAddress, [`function ${target.function}() external`], wallet);

            await contract[target.function].staticCall();
            const gasEstimate = await contract[target.function].estimateGas();
            const feeData = await provider.getFeeData();
            const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0));

            if (balance > gasCost) {
                console.log(`[!!!] PROFITABLE TARGET FOUND. EXECUTING STRIKE...`);
                const tx = await contract[target.function]({ gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) });
                console.log(`[+] Strike Sent: ${tx.hash}`);
                await tx.wait();
                console.log(`[+] Strike Confirmed.`);
            } else {
                console.log(`[-] Insufficient funds for ${target.name}. Need ${ethers.formatEther(gasCost)} ETH`);
            }
        } catch (e: any) {
            console.log(`[-] ${target.name} skipped: ${e.message.substring(0, 50)}`);
        }
    }
}
scout();
