import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  // Using Cloudflare's high-performance IPFS gateway
  const gateway = "https://cloudflare-ipfs.com/ipfs/";

  const liveFeed = [
    {
      id: "NODE_ALPHA_NYC",
      network: "IPFS_MAINNET",
      image: `${gateway}QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`,
      metadata: {
        lat: "40.7128",
        lon: "-74.0060",
        time: new Date().toISOString(),
        iso: 100,
        exp: "1/1000"
      }
    },
    {
      id: "NODE_BETA_LAGOS",
      network: "IPFS_MAINNET",
      image: `${gateway}QmZ86v7X6p7M3p7M3p7M3p7M3p7M3p7M3p7M3p7M3p7M3`,
      metadata: {
        lat: "6.5244",
        lon: "3.3792",
        time: new Date().toISOString(),
        iso: 3200, // The intentional lie for testing
        exp: "1/10"
      }
    }
  ];

  return NextResponse.json({
    status: "ACTIVE",
    source: "CLOUDFLARE_IPFS_V3",
    scan_latency: `${Date.now() - startTime}ms`,
    payload: liveFeed
  });
}
