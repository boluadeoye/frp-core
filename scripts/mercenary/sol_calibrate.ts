import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

/**
 * SOLANA CALIBRATION STRIKE (HARDENED)
 * Purpose: Verify signing using a local key file to bypass shell errors.
 */

async function calibrate() {
    console.log("[+] INITIATING HARDENED SOLANA CALIBRATION...");

    try {
        // Load key from file
        const keyPath = path.join(__dirname, 'solana.key');
        if (!fs.existsSync(keyPath)) {
            throw new Error(`Key file not found at ${keyPath}`);
        }
        
        const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
        const wallet = Keypair.fromSecretKey(new Uint8Array(keyData));
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");

        console.log(`[+] WALLET: ${wallet.publicKey.toBase58()}`);

        const balance = await connection.getBalance(wallet.publicKey);
        console.log(`[+] DEVNET BALANCE: ${balance / LAMPORTS_PER_SOL} SOL`);

        if (balance === 0) {
            console.log("[-] Error: Devnet balance is 0. Claim from faucet first.");
            return;
        }

        console.log("[~] Building Atomic Instruction...");
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: wallet.publicKey,
                lamports: 1000,
            })
        );

        console.log("[~] Signing and Sending...");
        const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
        
        console.log(`[!!!] CALIBRATION SUCCESSFUL.`);
        console.log(`[+] Signature: ${signature}`);
        console.log(`[+] The Harvester is ready for Mainnet Extraction.`);

    } catch (e: any) {
        console.error(`[-] CALIBRATION FAILED: ${e.message}`);
    }
}

calibrate();
