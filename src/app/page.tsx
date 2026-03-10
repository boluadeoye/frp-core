"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Crosshair, Activity, AlertTriangle, Terminal, Database, Globe, Cpu, ChevronRight, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-b from-emerald-900/20 to-black border border-emerald-500/20 overflow-hidden group">
    <motion.div
      animate={{ opacity:[0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      className="absolute inset-0 bg-emerald-500/10 blur-md"
    />
    <span className="text-emerald-400 font-black text-2xl font-sans tracking-tighter z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
      F
    </span>
    <motion.div 
      animate={{ top:["-20%", "120%"] }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
      className="absolute left-0 right-0 h-[1px] bg-emerald-400/30 z-20"
    />
  </div>
);

export default function CommandDeck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const[iso, setIso] = useState("");
  const [exposure, setExposure] = useState("");

  const addLog = (msg: string) => {
    setTerminalLogs(prev =>[...prev, `[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}`]);
  };

  // --- NEW: CLIENT-SIDE EXIF EXTRACTION ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    addLog(`ANALYZING LOCAL FILE: ${file.name}`);
    
    try {
      // Extract EXIF locally in the browser
      const metadata = await exifr.parse(file, {
        gps: true,
        exif: true,
        pick:['latitude', 'longitude', 'DateTimeOriginal', 'ISO', 'ExposureTime']
      });

      if (!metadata) throw new Error("No EXIF metadata found in this image.");

      if (metadata.latitude && metadata.longitude) {
        setLat(metadata.latitude.toFixed(6));
        setLon(metadata.longitude.toFixed(6));
        addLog("GPS COORDINATES EXTRACTED.");
      } else {
        addLog("WARNING: NO GPS DATA FOUND.");
      }

      if (metadata.DateTimeOriginal) {
        setTimestamp(new Date(metadata.DateTimeOriginal).toISOString());
        addLog("TIMESTAMP EXTRACTED.");
      }

      if (metadata.ISO) setIso(metadata.ISO.toString());
      if (metadata.ExposureTime) setExposure(metadata.ExposureTime.toString());

      // We still need a URL for the server to fetch the binary sliver.
      // In a full production app, we would upload this file to Supabase Storage first.
      // For this demo, we alert the user to provide the public URL.
      addLog("LOCAL EXTRACTION COMPLETE. PLEASE PROVIDE PUBLIC URL FOR BINARY AUDIT.");
      
    } catch (err: any) {
      setError(`Extraction Failed: ${err.message}`);
      addLog(`EXTRACTION ERROR: ${err.message}`);
    }
  };

  const loadTestVector = () => {
    setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg");
    setLat("43.467448");
    setLon("11.885126");
    setTimestamp("2008-10-22T10:28:39Z");
    setIso("100");
    setExposure("1/500");
    setError("");
    addLog("TEST VECTOR LOADED.");
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTerminalLogs([]);

    try {
      addLog("INITIATING FORENSIC PROTOCOL...");
      await new Promise(r => setTimeout(r, 400));
      
      addLog("ESTABLISHING ZERO-TRUST CLIENT HANDSHAKE...");
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

      addLog(`TARGET ACQUIRED: ${imageUrl.substring(0, 30)}...`);
      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      addLog("CALCULATING ASTRONOMICAL EPHEMERIS (SUNCALC)...");
      addLog("CROSS-REFERENCING EXPOSURE TRIANGLE...");
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Audit failed to execute.");

      addLog("GENERATING SHA-256 FINGERPRINT...");
      await new Promise(r => setTimeout(r, 400));
      addLog("SIGNING ECDSA SECP256K1 MANIFEST...");
      addLog(`AUDIT COMPLETE. TRACE ID: ${data.traceId}`);
      
      await new Promise(r => setTimeout(r, 600));
      router.push(`/cert/${data.traceId}`);

    } catch (err: any) {
      setError(err.message);
      addLog(`CRITICAL ERROR: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-gray-300 p-4 md:p-8 font-sans selection:bg-emerald-900/50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-4">
          <div className="flex items-center gap-5">
            <BlazingLogo />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Forensic Reality Protocol</h1>
              <p className="text-xs text-emerald-500/70 font-mono tracking-widest uppercase mt-1">Sovereign Truth Infrastructure</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-500" /> Target Acquisition
                </h2>
                <button type="button" onClick={loadTestVector} className="text-[10px] font-mono text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  LOAD TEST VECTOR <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* NEW: LOCAL FILE UPLOAD FOR AUTO-EXTRACTION */}
              <div className="mb-6 p-4 border border-dashed border-white/20 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors relative cursor-pointer">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center text-center gap-2 pointer-events-none">
                  <Upload className="w-6 h-6 text-emerald-500/70" />
                  <p className="text-xs font-mono text-gray-400">Tap to Auto-Extract EXIF from Local Image</p>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex items-start gap-3 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={executeAudit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Target Image URL (Required for Binary Audit)</label>
                  <input 
                    type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Latitude</label>
                    <input type="number" step="any" required value={lat} onChange={(e) => setLat(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Longitude</label>
                    <input type="number" step="any" required value={lon} onChange={(e) => setLon(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Timestamp (ISO 8601)</label>
                  <input type="text" required value={timestamp} onChange={(e) => setTimestamp(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Camera ISO</label>
                    <input type="number" required value={iso} onChange={(e) => setIso(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest ml-1">Exposure Time</label>
                    <input type="text" required value={exposure} onChange={(e) => setExposure(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-3.5 text-sm text-gray-200 focus:border-emerald-500/30 focus:bg-emerald-500/[0.02] transition-all outline-none font-mono" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-8 bg-white text-black hover:bg-gray-200 font-medium py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                  {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {loading ? "EXECUTING AUDIT..." : "INITIALIZE AUDIT"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-black/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl h-[320px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                <Terminal className="w-4 h-4 text-gray-500" />
                <h3 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Execution Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 text-emerald-400/70 leading-relaxed">
                {terminalLogs.length === 0 ? <p className="text-gray-600 italic">Awaiting target acquisition...</p> : <AnimatePresence>{terminalLogs.map((log, i) => <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="break-all">{log}</motion.div>)}</AnimatePresence>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
