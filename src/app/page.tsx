"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Crosshair, Activity, AlertTriangle, Terminal, 
  Database, Globe, Cpu, ChevronRight, Upload, 
  Zap, Lock, Fingerprint, BarChart3, Scan, Radio,
  Target, Info, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

// --- THE REFINED SINGULARITY LOGO ---
const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-14 h-14">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      className="absolute inset-0 border border-emerald-500/10 rounded-full"
    />
    <motion.div
      animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.3, 0.1] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      className="absolute inset-[-4px] bg-emerald-500/20 blur-xl rounded-full"
    />
    <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-black border border-emerald-500/30 overflow-hidden shadow-inner">
      <span className="text-emerald-400 font-light text-2xl font-sans tracking-tighter z-10">
        F
      </span>
      <motion.div 
        animate={{ left: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="absolute top-0 bottom-0 w-[2px] bg-emerald-400/40 skew-x-12 blur-[2px]"
      />
    </div>
  </div>
);

// --- HUD INPUT COMPONENT ---
const HUDInput = ({ label, value, onChange, type = "text", placeholder = "", icon: Icon }: any) => (
  <div className="relative group">
    <label className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] mb-1 block ml-1 group-focus-within:text-emerald-500 transition-colors">
      {label}
    </label>
    <div className="relative flex items-center">
      <input 
        type={type}
        value={value}
        onChange={onChange}
        required
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-white/5 py-2 text-sm text-white focus:border-emerald-500/50 transition-all outline-none font-mono placeholder:text-gray-800"
      />
      {Icon && <Icon className="absolute right-0 w-3 h-3 text-gray-700 group-focus-within:text-emerald-500/50 transition-colors" />}
    </div>
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
    addLog(`SCANNING_LOCAL_NODE: ${file.name}`);
    try {
      const metadata = await exifr.parse(file, {
        gps: true, exif: true,
        pick: ['latitude', 'longitude', 'DateTimeOriginal', 'ISO', 'ExposureTime']
      }).catch(() => null);

      if (!metadata || (!metadata.latitude && !metadata.DateTimeOriginal)) {
        setError("FORENSIC_GAP: METADATA_STRIPPED.");
        addLog("ALERT: EXIF_NOT_FOUND. MANUAL_OVERRIDE_ACTIVE.");
        return;
      }

      if (metadata.latitude) setLat(metadata.latitude.toFixed(6));
      if (metadata.longitude) setLon(metadata.longitude.toFixed(6));
      if (metadata.DateTimeOriginal) setTimestamp(new Date(metadata.DateTimeOriginal).toISOString());
      if (metadata.ISO) setIso(metadata.ISO.toString());
      if (metadata.ExposureTime) setExposure(metadata.ExposureTime.toString());
      addLog("DNA_EXTRACTION_SUCCESS.");
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
    addLog("TEST_VECTOR_LOADED.");
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTerminalLogs([]);

    try {
      addLog("INITIALIZING_ORACLE_V1.2...");
      await new Promise(r => setTimeout(r, 400));
      
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

      addLog("DISPATCHING_BINARY_STRIKE...");
      const res = await fetch("/api/v1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ORACLE_REJECTION");

      addLog("PHYSICS_VERIFIED.");
      addLog("SIGNING_ECDSA_MANIFEST...");
      addLog(`AUDIT_COMPLETE: ${data.traceId.substring(0,8)}`);
      
      await new Promise(r => setTimeout(r, 600));
      router.push(`/cert/${data.traceId}`);

    } catch (err: any) {
      setError(err.message);
      addLog(`FATAL: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-6 md:p-16 font-sans selection:bg-emerald-500/20 relative overflow-hidden">
      
      {/* AMBIENT HUD ELEMENTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#10b98108_0%,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        
        {/* SOVEREIGN HEADER */}
        <header className="flex justify-between items-center border-b border-white/5 pb-8">
          <div className="flex items-center gap-6">
            <BlazingLogo />
            <div className="space-y-1">
              <h1 className="text-2xl font-light text-white tracking-[0.15em] uppercase">
                Forensic <span className="font-black text-emerald-500">Reality</span>
              </h1>
              <p className="text-[9px] font-mono text-gray-600 tracking-[0.4em] uppercase">Sovereign Truth Infrastructure</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 font-mono text-[10px] tracking-widest text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              NODE_ACTIVE
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              US_EAST_1
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT: INGESTION ENGINE */}
          <div className="lg:col-span-7 space-y-10">
            
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono text-white uppercase tracking-[0.4em] flex items-center gap-3">
                  <Target className="w-4 h-4 text-emerald-500" /> Target_Acquisition
                </h2>
                <button 
                  type="button" onClick={loadTestVector}
                  className="text-[9px] font-mono text-gray-600 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                >
                  [ Load_Test_Vector ]
                </button>
              </div>

              {/* MINIMALIST SENSOR AREA */}
              <div className="relative group/upload">
                <input 
                  type="file" accept="image/jpeg" onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="border border-white/5 rounded-2xl p-10 bg-white/[0.01] group-hover/upload:bg-white/[0.03] group-hover/upload:border-emerald-500/20 transition-all flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover/upload:scale-110 transition-transform">
                    <Upload className="w-4 h-4 text-emerald-500/60" />
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Initialize Local Scan</p>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/5 border border-red-500/10 text-red-400/80 p-4 rounded-xl text-[10px] font-mono flex items-center gap-3">
                  <AlertTriangle className="w-3 h-3" /> {error}
                </motion.div>
              )}

              <form onSubmit={executeAudit} className="space-y-8">
                <HUDInput 
                  label="Target_Source_URL" 
                  value={imageUrl} 
                  onChange={(e: any) => setImageUrl(e.target.value)} 
                  placeholder="HTTPS://DATA_STREAM_ORIGIN"
                  icon={Lock}
                />

                <div className="grid grid-cols-2 gap-10">
                  <HUDInput label="Latitude" value={lat} onChange={(e: any) => setLat(e.target.value)} type="number" />
                  <HUDInput label="Longitude" value={lon} onChange={(e: any) => setLon(e.target.value)} type="number" />
                </div>

                <HUDInput label="Temporal_Anchor" value={timestamp} onChange={(e: any) => setTimestamp(e.target.value)} />

                <div className="grid grid-cols-2 gap-10">
                  <HUDInput label="ISO_Sensitivity" value={iso} onChange={(e: any) => setIso(e.target.value)} type="number" />
                  <HUDInput label="Exposure_Value" value={exposure} onChange={(e: any) => setExposure(e.target.value)} />
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full mt-6 bg-emerald-500 text-black font-black py-4 rounded-xl transition-all flex justify-center items-center gap-4 disabled:opacity-20 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  <span className="tracking-[0.3em] uppercase text-[11px]">Execute Forensic Audit</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: SYSTEM HUD */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* GHOST TERMINAL */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 h-[350px] flex flex-col relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h3 className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.3em]">Neural_Log_Stream</h3>
                <Radio className="w-3 h-3 text-emerald-500/20 animate-pulse" />
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-3 text-emerald-500/60 scrollbar-hide">
                {terminalLogs.length === 0 ? (
                  <p className="text-gray-800 italic">_ AWAITING_TARGET...</p>
                ) : (
                  terminalLogs.map((log, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <span className="text-emerald-900">[{i.toString().padStart(2, '0')}]</span>
                      <span className="break-all">{log}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* METRIC HUD */}
            <div className="space-y-4">
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <Database className="w-4 h-4 text-blue-500/50" />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Ledger</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">SYNCED</span>
              </div>
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <Cpu className="w-4 h-4 text-purple-500/50" />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Engine</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">70B_LPU</span>
              </div>
            </div>

          </div>
        </div>

        <footer className="text-center pt-12 opacity-30">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.5em]">FRP // Sovereign Truth Infrastructure // v1.2</p>
        </footer>

      </div>
    </main>
  );
}
