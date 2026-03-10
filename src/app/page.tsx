"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Crosshair, Activity, AlertTriangle } from "lucide-react";

export default function CommandDeck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const[lon, setLon] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const[iso, setIso] = useState("");
  const [exposure, setExposure] = useState("");

  // The "Truth" Test Vector
  const loadTestVector = () => {
    setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg");
    setLat("43.467448");
    setLon("11.885126");
    setTimestamp("2008-10-22T10:28:39Z");
    setIso("100");
    setExposure("1/500");
    setError("");
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        imageUrl,
        agentId: "web-portal-" + Math.floor(Math.random() * 1000),
        clientExif: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          timestamp,
          iso: parseInt(iso),
          exposureTime: exposure
        }
      };

      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Audit failed to execute.");

      // Redirect to the Reality Seal (Certificate)
      router.push(`/cert/${data.traceId}`);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-gray-300 p-4 md:p-8 font-mono selection:bg-emerald-900">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-white tracking-tighter flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-500" />
            FRP // COMMAND DECK
          </h1>
          <p className="text-sm text-gray-500 mt-2">Forensic Reality Protocol • Ingestion Portal</p>
        </header>

        {/* INGESTION FORM */}
        <form onSubmit={executeAudit} className="space-y-6 bg-gray-900/30 p-6 rounded-lg border border-gray-800">
          
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-blue-500" /> Target Acquisition
            </h2>
            <button 
              type="button" 
              onClick={loadTestVector}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
            >
              LOAD TEST VECTOR
            </button>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 p-3 rounded text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">TARGET IMAGE URL</label>
              <input 
                type="url" required
                value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">LATITUDE</label>
                <input 
                  type="number" step="any" required
                  value={lat} onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">LONGITUDE</label>
                <input 
                  type="number" step="any" required
                  value={lon} onChange={(e) => setLon(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">TIMESTAMP (ISO 8601)</label>
              <input 
                type="text" required
                value={timestamp} onChange={(e) => setTimestamp(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                placeholder="YYYY-MM-DDTHH:mm:ssZ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">CAMERA ISO</label>
                <input 
                  type="number" required
                  value={iso} onChange={(e) => setIso(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">EXPOSURE TIME</label>
                <input 
                  type="text" required
                  value={exposure} onChange={(e) => setExposure(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., 1/500"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Activity className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? "EXECUTING FORENSIC AUDIT..." : "EXECUTE AUDIT"}
          </button>
        </form>

      </div>
    </main>
  );
}
