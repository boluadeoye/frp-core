import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    console.log("[RECON] Initiating Hivemapper Data Acquisition...");
    
    const response = await fetch("https://api.hivemapper.com/public/v1/footprint?limit=10", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      },
      next: { revalidate: 0 } // Disable caching for fresh data
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[RECON] Target Error: ${response.status} - ${errBody.substring(0, 100)}`);
      return NextResponse.json({ error: `Target_Rejection: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    
    if (!data || !data.features || !Array.isArray(data.features)) {
      console.error("[RECON] Schema Mismatch: 'features' array missing.");
      return NextResponse.json({ error: "SCHEMA_MISMATCH", raw: data }, { status: 502 });
    }

    const targets = data.features.map((feature: any) => {
      const props = feature.properties || {};
      const geom = feature.geometry || {};
      const coords = geom.coordinates || [0, 0];
      
      return {
        targetId: props.id || Math.random().toString(36).substring(7),
        imageUrl: props.preview_url || null,
        clientExif: {
          latitude: coords[1],
          longitude: coords[0],
          timestamp: props.timestamp || new Date().toISOString(),
          iso: 100,
          exposureTime: "1/500"
        }
      };
    }).filter((t: any) => t.imageUrl !== null);

    console.log(`[RECON] Successfully mapped ${targets.length} targets.`);

    return NextResponse.json({ 
      status: "success", 
      count: targets.length,
      targets 
    });

  } catch (error: any) {
    console.error("[RECON] Fatal Proxy Crash:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
