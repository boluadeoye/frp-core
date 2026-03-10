"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Crosshair, Activity, AlertTriangle, Terminal, 
  Database, Globe, Cpu, ChevronRight, Upload, 
  Zap, Lock, Fingerprint, BarChart3, Map as MapIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

// --- THE BLAZING REACTOR LOGO ---
const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-16 h-16 group">
    <motion.div
      animate={{ 
        rotate: [0, 90, 180, 270, 360],
        borderColor: ["rgba(16,185,129,0.2)", "rgba(16,185,129,0.8)", "rgba(16,185,129,0.2)"]
      }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      className="absolute inset-0 border-2 border-dashed rounded-2xl"
    />
    <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-black border border-emerald-500/40 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)]">
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute inset-0 bg-emerald-500/10 blur-xl"
      />
      <span className="text-emerald-400 font-black text-3xl font-sans tracking-tighter z-10 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
        F
      </span>
      <motion.div 
        animate={{ top: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] bg-emerald-400/40 z-20 shadow-[0_0_10px_rgba(16,185,129,1)]"
      />
    </div>
  </div>
);

// --- SYSTEM PULSE WAVEFORM ---
const SystemPulse = () => (
  <div className="flex items-end gap-1 h-4">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ height: [2, Math.random() * 16 + 2, 2] }}
        transition={{ repeat: Infinity, duration: 0.5 + Math.random(), ease: "easeInOut" }}
        className="w-[2px] bg-emerald-500/40 rounded-full"
      />
    ))}
  </div>
);

export default function CommandDeck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [iso, setIso] = useState("");
  const [exposure, setExposure] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `> ${msg}`]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    addLog(`MOUNTING LOCAL VOLUME: ${file.name.toUpperCase()}`);
    addLog("SCANNING BINARY STRUCTURE...");
    
    try {
      const metadata = await exifr.parse(file, {
        gps: true, exif: true,
        pick: ['latitude', 'longitude', 'DateTimeOriginal', 'ISO', 'ExposureTime']
      }).catch(() => null);

      if (!metadata || (!metadata.latitude && !metadata.DateTimeOriginal)) {
        setError("METADATA STRIPPED OR MISSING. PROCEED WITH MANUAL OVERRIDE.");
        addLog("CRITICAL: EXIF DIRECTORY NOT FOUND. SWITCHING TO MANUAL INGESTION.");
        return;
      }

      if (metadata.latitude) {
        setLat(metadata.latitude.toFixed(6));
        setLon(metadata.longitude.toFixed(6));
        addLog("GEOSPATIAL COORDINATES DECODED.");
      }
      if (metadata.DateTimeOriginal) {
        setTimestamp(new Date(metadata.DateTimeOriginal).toISOString());
        addLog("TEMPORAL ANCHOR ESTABLISHED.");
      }
      if (metadata.ISO) setIso(metadata.ISO.toString());
      if (metadata.ExposureTime) setExposure(metadata.ExposureTime.toString());

      addLog("EXTRACTION SUCCESSFUL. AWAITING TARGET URL.");
    } catch (err: any) {
      setError("FORENSIC PARSE FAILURE.");
      addLog(`ERROR: ${err.message}`);
    }
  };

  const loadTestVector = () => {
    setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg");
    setLat("43.467448");
    setLon("11.885126");
    setTimestamp("2008-10-22T10:28:39Z");
    setIso("100");
    setExposure("1/500");
    addLog("TEST VECTOR INJECTED INTO BUFFER.");
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTerminalLogs([]);

    try {
      addLog("INITIALIZING FRP ORACLE V1.2...");
      await new Promise(r => setTimeout(r, 600));
      addLog("CHECKING OUT GROQ LPU KEY FROM POOL...");
      
      const payload = {
        imageUrl,
        agentId: "mercenary-node-" + Math.floor(Math.random() * 1000),
        clientExif: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          timestamp,
          iso: parseInt(iso),
          exposureTime: exposure
        }
      };

      addLog("DISPATCHING SURGICAL BINARY STRIKE...");
      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ORACLE_REJECTION");

      addLog("ASTRONOMICAL CROSS-REFERENCE COMPLETE.");
      addLog("GENERATING ECDSA SECP256K1 SIGNATURE...");
      addLog(`AUDIT FINALIZED. TRACE: ${data.traceId.substring(0,8)}...`);
      
      await new Promise(r => setTimeout(r, 800));
      router.push(`/cert/${data.traceId}`);

    } catch (err: any) {
      setError(err.message);
      addLog(`FATAL: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-4 md:p-10 font-sans selection:bg-emerald-500/30 relative overflow-hidden">
      
      {/* GRID OVERLAY */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* TOP NAVIGATION BAR */}
        <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <BlazingLogo />
            <div>
              <h1 className="text-3xl font-black text-white tracking-[ -0.05em] uppercase leading-none">
                Forensic Reality <span className="text-emerald-500">Protocol</span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-mono text-emerald-500/60 tracking-[0.3em] uppercase">Sovereign Truth Infrastructure</span>
                <SystemPulse />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end font-mono">
              <span className="text-[10px] text-gray-600 uppercase tracking-tighter">Network Load</span>
              <span className="text-xs text-emerald-500/80">0.042ms Latency</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10 hidden md:block" />
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md flex items-center gap-3">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-white font-mono uppercase">Global Edge</span>
            </div>
          </div>
        </nav>

        {/* MAIN BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* TARGET ACQUISITION CARD */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#080808] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Crosshair className="w-32 h-32 text-emerald-500" />
              </div>

              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Target Acquisition</h2>
                </div>
                <button 
                  type="button" onClick={loadTestVector}
                  className="text-[10px] font-mono text-gray-500 hover:text-emerald-400 transition-all border border-white/5 px-4 py-2 rounded-full bg-white/[0.02]"
                >
                  LOAD_TEST_VECTOR.EXE
                </button>
              </div>

              {/* UPLOAD ZONE */}
              <div className="mb-8 group/upload relative">
                <input 
                  type="file" accept="image/jpeg" onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="border-2 border-dashed border-white/5 rounded-2xl p-10 bg-white/[0.01] group-hover/upload:bg-white/[0.03] group-hover/upload:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/upload:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Initialize Local Scan</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">Drop image to auto-extract forensic metadata</p>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 bg-red-500/5 border border-red-500/20 text-red-400 p-5 rounded-2xl text-xs flex items-start gap-4 font-mono">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> 
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}

              <form onSubmit={executeAudit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">Target URL</label>
                  <div className="relative">
                    <input 
                      type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono placeholder:text-gray-800"
                      placeholder="HTTPS://SOURCE_IMAGE_PATH"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">Latitude</label>
                  <input type="number" step="any" required value={lat} onChange={(e) => setLat(e.target.value)} className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">Longitude</label>
                  <input type="number" step="any" required value={lon} onChange={(e) => setLon(e.target.value)} className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">Timestamp</label>
                  <input type="text" required value={timestamp} onChange={(e) => setTimestamp(e.target.value)} className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">ISO</label>
                    <input type="number" required value={iso} onChange={(e) => setIso(e.target.value)} className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] ml-1">Exposure</label>
                    <input type="text" required value={exposure} onChange={(e) => setExposure(e.target.value)} className="w-full bg-black border-b border-white/10 p-3 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                  </div>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="md:col-span-2 w-full mt-6 bg-white text-black hover:bg-emerald-500 hover:text-white font-black py-5 rounded-2xl transition-all flex justify-center items-center gap-4 disabled:opacity-50 group/btn"
                >
                  {loading ? <Activity className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />}
                  <span className="tracking-[0.2em] uppercase text-sm">{loading ? "Processing Audit..." : "Execute Forensic Audit"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: SYSTEM STATUS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* TERMINAL CARD */}
            <div className="bg-[#080808] border border-white/5 rounded-[2rem] p-6 h-[400px] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[10px] font-mono text-white uppercase tracking-[0.2em]">Execution Log</h3>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-3 text-emerald-500/70 scrollbar-hide">
                {terminalLogs.length === 0 ? (
                  <p className="text-gray-800 animate-pulse">_ AWAITING_TARGET_ACQUISITION...</p>
                ) : (
                  <AnimatePresence>
                    {terminalLogs.map((log, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                        <span className="text-emerald-900">[{i}]</span>
                        <span className="break-all">{log}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* STATS BENTO */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Database className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Ledger Status</p>
                  <p className="text-lg font-bold text-white font-mono">SYNCED_NEON</p>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Cpu className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Oracle Engine</p>
                  <p className="text-lg font-bold text-white font-mono">70B_LPU_V1</p>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <BarChart3 className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Burn Registry</p>
                  <p className="text-lg font-bold text-white font-mono">ACTIVE_1.2k</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
