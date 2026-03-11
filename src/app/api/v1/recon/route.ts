import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // Target: Hivemapper Public API (Coverage Tiles)
    // We use Vercel's Edge network to bypass mobile IP blocks
    const response = await fetch("https://api.hivemapper.com/public/v1/footprint?limit=10", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Target WAF rejected proxy: ${response.status}`);
    }

    const data = await response.json();
    
    // Format the raw data into FRP Target Vectors
    const targets = data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; //[longitude, latitude]
      
      return {
        targetId: props.id || crypto.randomUUID().substring(0,8),
        imageUrl: props.preview_url || null,
        clientExif: {
          latitude: coords[1],
          longitude: coords[0],
          timestamp: props.timestamp || new Date().toISOString(),
          iso: 100, // Baseline assumption for testing
          exposureTime: "1/500"
        }
      };
    }).filter((t: any) => t.imageUrl !== null); // Only keep targets with images

    return NextResponse.json({ 
      status: "success", 
      target_count: targets.length,
      targets 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
