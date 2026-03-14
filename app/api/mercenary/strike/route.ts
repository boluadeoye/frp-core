import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

/**
 * GHOST STRIKE EXECUTIONER
 * Triggered by Vercel Cron to execute the Harvester.
 */

export async function POST(request: Request) {
  const { targetAsset, rewardAmount, callData } = await request.json();

  // 1. Connect to Base RPC
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  const harvesterAddress = process.env.HARVESTER_ADDRESS!;
  const harvesterAbi = ["function executeStrike(address token, uint256 amount, bytes calldata data) external"];
  const harvester = new ethers.Contract(harvesterAddress, harvesterAbi, wallet);

  try {
    // 2. Execute the Atomic Strike
    // We borrow WETH (0x4200000000000000000000000000000000000006 on Base)
    const tx = await harvester.executeStrike(
      "0x4200000000000000000000000000000000000006", 
      ethers.parseEther("1.0"), 
      callData
    );
    
    const receipt = await tx.wait();
    return NextResponse.json({ status: "Strike Successful", tx: receipt.hash });
  } catch (error: any) {
    return NextResponse.json({ status: "Strike Failed", error: error.message }, { status: 500 });
  }
}
