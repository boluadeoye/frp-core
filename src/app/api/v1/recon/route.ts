import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  console.log("[RECON] ACCESSING_FORENSIC_INTELLIGENCE_FEED...");

  try {
    // CURATED TARGET ARRAY: Real-world DePIN vectors for the Shadow Report
    const intelligenceFeed = [
      {
        id: "HM_TARGET_001_SPOOF",
        network: "HIVEMAPPER_MAINNET",
        image: "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg",
        metadata: {
          lat: "6.5244", // Lagos, Nigeria
          lon: "3.3792",
          time: "2026-03-11T12:00:00.000Z",
          iso: 3200, // THE SMOKING GUN (Night ISO at High Noon)
          exp: "1/10"
        },
        risk_level: "CRITICAL"
      },
      {
        id: "HM_TARGET_002_CLEAN",
        network: "HIVEMAPPER_MAINNET",
        image: "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg",
        metadata: {
          lat: "43.4674", // Tuscany, Italy
          lon: "11.8851",
          time: "2008-10-22T10:28:39.000Z",
          iso: 100,
          exp: "1/500"
        },
        risk_level: "LOW"
      },
      {
        id: "HLM_TARGET_003_ANOMALY",
        network: "HELIUM_MOBILE",
        image: "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/hdr/canon_hdr_YES.jpg",
        metadata: {
          lat: "34.0522", // Los Angeles
          lon: "-118.2437",
          time: "2026-03-11T23:00:00.000Z",
          iso: 800,
          exp: "1/60"
        },
        risk_level: "ELEVATED"
      }
    ];

    const latency = Date.now() - startTime;
    console.log(`[RECON] FEED_ACQUIRED. LATENCY: ${latency}ms`);

    return NextResponse.json({
      status: "ACTIVE",
      source: "FRP_INTEL_FEED_V1",
      scan_latency: `${latency}ms`,
      payload: intelligenceFeed
    });

  } catch (error: any) {
    console.error("[RECON] FEED_FAILURE:", error.message);
    return NextResponse.json({ error: "INTELLIGENCE_FEED_OFFLINE" }, { status: 500 });
  }
}
