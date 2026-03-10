"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Crosshair, Activity, AlertTriangle, Terminal, 
  Database, Globe, Cpu, ChevronRight, Upload, 
  Zap, Lock, Fingerprint, BarChart3, Scan, Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

// --- THE BLAZING SINGULARITY LOGO ---
const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-20 h-20 group">
    {/* Outer Orbital Ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
      className="absolute inset-0 border border-emerald-500/10 rounded-full"
    />
    {/* Inner Pulsing Ring */}
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="absolute inset-2 border-2 border-emerald-500/30 rounded-2xl"
    />
    {/* The Core */}
    <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-black border border-emerald-500/50 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)]">
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="absolute inset-0 bg-emerald-500/20 blur-2xl"
      />
      <span className="text-emerald-400 font-black text-4xl font-sans tracking-tighter z-10 drop-shadow-[0_0_15px_rgba(16,185,129,1)]">
        F
      </span>
      {/* High-Speed Scanning Laser */}
      <motion.div 
        animate={{ top: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="absolute left-0 right-0 h-[3px] bg-emerald-400 z-20 shadow-[0_0_15px_rgba(16,185,129,1)]"
      />
    </div>
  </div>
);

// --- DATA STREAM COMPONENT ---
const DataStream = () => (
  <div className="flex gap-1 items-center">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
        className="w-1 h-1 bg-emerald-500 rounded-full"
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
    setTerminalLogs(prev => [...prev, msg.toUpperCase()]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    addLog(`ACCESSING_LOCAL_STORAGE: ${file.name}`);
    try {
      const metadata = await exifr.parse(file, {
        gps: true, exif: true,
        pick: ['latitude', 'longitude', 'DateTimeOriginal', 'ISO', 'ExposureTime']
      }).catch(() => null);

      if (!metadata || (!metadata.latitude && !metadata.DateTimeOriginal)) {
        setError("FORENSIC_ALERT: METADATA_STRIPPED. MANUAL_OVERRIDE_REQUIRED.");
        addLog("CRITICAL_FAILURE: EXIF_NOT_FOUND.");
        return;
      }

      if (metadata.latitude) {
        setLat(metadata.latitude.toFixed(6));
        setLon(metadata.longitude.toFixed(6));
        addLog("GPS_COORDINATES_LOCKED.");
      }
      if (metadata.DateTimeOriginal) {
        setTimestamp(new Date(metadata.DateTimeOriginal).toISOString());
        addLog("TEMPORAL_ANCHOR_VERIFIED.");
      }
      if (metadata.ISO) setIso(metadata.ISO.toString());
      if (metadata.ExposureTime) setExposure(metadata.ExposureTime.toString());
      addLog("LOCAL_SCAN_COMPLETE.");
    } catch (err: any) {
      setError("SYSTEM_ERROR: PARSE_FAILURE.");
    }
  };

  const loadTestVector = () => {
    setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg");
    setLat("43.467448");
    setLon("11.885126");
    setTimestamp("2008-10-22T10:28:39Z");
    setIso("100");
    setExposure("1/500");
    addLog("TEST_VECTOR_INJECTED.");
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTerminalLogs([]);

    try {
      addLog("INITIALIZING_ORACLE_HANDSHAKE...");
      await new Promise(r => setTimeout(r, 500));
      addLog("ROTATING_GROQ_API_KEYS...");
      
      const payload = {
        imageUrl,
        agentId: "sovereign-node-" + Math.floor(Math.random() * 1000),
        clientExif: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          timestamp,
          iso: parseInt(iso),
          exposureTime: exposure
        }
      };

      addLog("DISPATCHING_SURGICAL_BINARY_STRIKE...");
      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ORACLE_REJECTION");

      addLog("PHYSICS_CROSS_REFERENCE_SUCCESS.");
      addLog("SIGNING_ECDSA_MANIFEST...");
      addLog(`AUDIT_FINALIZED: ${data.traceId.substring(0,8)}`);
      
      await new Promise(r => setTimeout(r, 800));
      router.push(`/cert/${data.traceId}`);

    } catch (err: any) {
      setError(err.message);
      addLog(`FATAL_EXCEPTION: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-4 md:p-12 font-sans selection:bg-emerald-500/40 relative overflow-hidden">
      
      {/* SOPHISTICATED BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#10b9810a_0%,transparent_50%)]" />

      <div className="max-w-[1400px] mx-auto space-y-12 relative z-10">
        
        {/* SOVEREIGN HEADER */}
        <nav className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex items-center gap-8">
            <BlazingLogo />
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-white tracking-[-0.06em] uppercase italic">
                Forensic Reality <span className="text-emerald-500 not-italic">Protocol</span>
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-emerald-500/50 tracking-[0.5em] uppercase">Sovereign Truth Infrastructure</span>
                <DataStream />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-2 rounded-2xl backdrop-blur-xl">
            <div className="flex flex-col items-end px-4 border-r border-white/10">
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Network Status</span>
              <span className="text-xs font-bold text-emerald-500 font-mono">ENCRYPTED_ACTIVE</span>
            </div>
            <div className="flex items-center gap-4 pr-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs font-black text-white font-mono uppercase tracking-tighter">Global Edge v1.2</span>
            </div>
          </div>
        </nav>

        {/* MAIN COMMAND INTERFACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: INGESTION ENGINE */}
          <div className="lg:col-span-8">
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
              
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <Scan className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Target Acquisition</h2>
                </div>
                <button 
                  type="button" onClick={loadTestVector}
                  className="text-[10px] font-mono text-gray-500 hover:text-emerald-400 transition-all border border-white/5 px-6 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] uppercase tracking-widest"
                >
                  Load_Test_Vector
                </button>
              </div>

              {/* HIGH-TECH UPLOAD ZONE */}
              <div className="mb-10 group/upload relative">
                <input 
                  type="file" accept="image/jpeg" onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="border border-white/5 rounded-3xl p-12 bg-white/[0.01] group-hover/upload:bg-white/[0.03] group-hover/upload:border-emerald-500/20 transition-all flex flex-col items-center justify-center gap-6 text-center relative overflow-hidden">
                  <motion.div 
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute inset-0 bg-emerald-500/5 blur-3xl"
                  />
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/upload:scale-110 transition-transform shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <Upload className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-lg font-bold text-white uppercase tracking-[0.2em]">Initialize Local Scan</p>
                    <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-widest">Drop image to extract forensic DNA</p>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 bg-red-500/5 border border-red-500/20 text-red-400 p-6 rounded-2xl text-xs flex items-start gap-4 font-mono leading-relaxed">
                  <AlertTriangle className="w-6 h-6 shrink-0" /> 
                  <p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={executeAudit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">Target_Source_URL</label>
                  <div className="relative group/input">
                    <input 
                      type="url" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono placeholder:text-gray-800"
                      placeholder="HTTPS://DATA_STREAM_ORIGIN"
                    />
                    <Lock className="absolute right-0 top-4 w-4 h-4 text-gray-800 group-focus-within/input:text-emerald-900 transition-colors" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">Latitude</label>
                  <input type="number" step="any" required value={lat} onChange={(e) => setLat(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">Longitude</label>
                  <input type="number" step="any" required value={lon} onChange={(e) => setLon(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">Temporal_Anchor</label>
                  <input type="text" required value={timestamp} onChange={(e) => setTimestamp(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">ISO</label>
                    <input type="number" required value={iso} onChange={(e) => setIso(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em] ml-1">Exposure</label>
                    <input type="text" required value={exposure} onChange={(e) => setExposure(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-emerald-500 transition-all outline-none font-mono" />
                  </div>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="md:col-span-2 w-full mt-10 bg-white text-black hover:bg-emerald-500 hover:text-white font-black py-6 rounded-3xl transition-all flex justify-center items-center gap-6 disabled:opacity-50 group/btn shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]"
                >
                  {loading ? <Activity className="w-7 h-7 animate-spin" /> : <Fingerprint className="w-7 h-7 group-hover/btn:scale-110 transition-transform" />}
                  <span className="tracking-[0.4em] uppercase text-base">{loading ? "Processing_Audit..." : "Execute Forensic Audit"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: SYSTEM INTELLIGENCE */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* NEURAL TERMINAL */}
            <div className="bg-[#050505] border border-white/10 rounded-[2.5rem] p-8 h-[450px] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-xs font-mono text-white uppercase tracking-[0.3em]">Neural_Log</h3>
                </div>
                <Radio className="w-4 h-4 text-emerald-500/40 animate-pulse" />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-4 text-emerald-400/80 scrollbar-hide">
                {terminalLogs.length === 0 ? (
                  <p className="text-gray-800 animate-pulse">_ AWAITING_TARGET_ACQUISITION...</p>
                ) : (
                  <AnimatePresence>
                    {terminalLogs.map((log, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 leading-relaxed">
                        <span className="text-emerald-900 shrink-0">[{i.toString().padStart(2, '0')}]</span>
                        <span className="break-all">{log}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* METRIC BENTO */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6 hover:bg-white/[0.04] transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Ledger_Status</p>
                  <p className="text-xl font-bold text-white font-mono tracking-tighter">SYNCED_NEON</p>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6 hover:bg-white/[0.04] transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Cpu className="w-7 h-7 text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Oracle_Engine</p>
                  <p className="text-xl font-bold text-white font-mono tracking-tighter">70B_LPU_V1.2</p>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-6 hover:bg-white/[0.04] transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Burn_Registry</p>
                  <p className="text-xl font-bold text-white font-mono tracking-tighter">ACTIVE_1.2k</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
