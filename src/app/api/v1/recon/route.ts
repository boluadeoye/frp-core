import { NextResponse } from 'next/server';

// REMOVED: export const runtime = 'edge';
// We are now using the Node.js Serverless Runtime for full network authority.

export async function GET() {
  const startTime = Date.now();
  console.log("[RECON] INITIALIZING DEEP SCAN: HIVEMAPPER_NETWORK...");

  try {
    // Target the Map-Backend (Permissive Public Feed)
    const targetUrl = "https://map-backend.hivemapper.com/footprint?limit=15&zoom=12";
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://hivemapper.com/explorer",
        "Origin": "https://hivemapper.com"
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RECON] NETWORK_REJECTION: ${response.status}`);
      return NextResponse.json({ 
        error: "TARGET_ACCESS_DENIED", 
        status: response.status,
        details: errorText.substring(0, 50)
      }, { status: 502 });
    }

    const data = await response.json();
    
    // Sophisticated Data Extraction
    const targets = data.features
      .filter((f: any) => f.properties && f.properties.preview_url)
      .map((feature: any) => {
        const p = feature.properties;
        const c = feature.geometry.coordinates;
        
        return {
          id: p.id || Math.random().toString(36).substring(7),
          image: p.preview_url,
          metadata: {
            lat: c[1],
            lon: c[0],
            time: p.timestamp || new Date().toISOString(),
            iso: 100, // Baseline for the strike
            exp: "1/500"
          }
        };
      });

    const latency = Date.now() - startTime;
    console.log(`[RECON] SCAN_COMPLETE. LATENCY: ${latency}ms. TARGETS_ACQUIRED: ${targets.length}`);

    return NextResponse.json({
      status: "ACTIVE",
      network: "HIVEMAPPER_SOLANA",
      scan_latency: `${latency}ms`,
      payload: targets
    });

  } catch (error: any) {
    console.error("[RECON] FATAL_EXCEPTION:", error.message);
    return NextResponse.json({ 
      error: "INTERNAL_PROXY_FAILURE", 
      message: error.message 
    }, { status: 500 });
  }
}
