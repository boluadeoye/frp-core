"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Crosshair, Activity, AlertTriangle, Terminal, 
  Database, Globe, Cpu, ChevronRight, Upload, 
  Zap, Lock, Fingerprint, BarChart3, Scan, Radio,
  Target, Search, Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

// --- THE BLAZING SINGULARITY LOGO ---
const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-16 h-16">
    <motion.div 
      animate={{ rotate: 360 }} 
      transition={{ repeat: Infinity, duration: 15, ease: "linear" }} 
      className="absolute inset-0 border border-emerald-500/20 rounded-full" 
    />
    <motion.div 
      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} 
      transition={{ repeat: Infinity, duration: 3 }} 
      className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full" 
    />
    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-black border border-emerald-500/40 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)]">
      <span className="text-emerald-400 font-black text-3xl font-sans tracking-tighter z-10">F</span>
      <motion.div 
        animate={{ top: ["-100%", "200%"] }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
        className="absolute left-0 right-0 h-[2px] bg-emerald-400/60 z-20 shadow-[0_0_15px_rgba(16,185,129,1)]" 
      />
    </div>
  </div>
);

// --- HUD INPUT COMPONENT (FIXED: RESTORED DEFINITION) ---
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
  const [reconLoading, setReconLoading] = useState(false);
  const [error, setError] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [reconTargets, setReconTargets] = useState<any[]>([]);
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

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev, msg.toUpperCase()]);

  const runRecon = async () => {
    setReconLoading(true);
    addLog("INITIATING_ON-CHAIN_RECON...");
    try {
      const res = await fetch('/api/v1/recon');
      const data = await res.json();
      if (data.payload) {
        setReconTargets(data.payload);
        addLog(`ACQUIRED_${data.payload.length}_TARGETS_FROM_SOLANA_RPC`);
      }
    } catch (e) {
      addLog("RECON_CONNECTION_ERROR");
    }
    setReconLoading(false);
  };

  const selectTarget = (target: any) => {
    setImageUrl(target.image);
    setLat(target.metadata.lat);
    setLon(target.metadata.lon);
    setTimestamp(target.metadata.time);
    setIso(target.metadata.iso.toString());
    setExposure(target.metadata.exp);
    addLog(`TARGET_LOCKED: ${target.id}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addLog(`SCANNING_LOCAL_NODE: ${file.name}`);
    try {
      const metadata = await exifr.parse(file, { gps: true, exif: true }).catch(() => null);
      if (!metadata) {
        setError("FORENSIC_GAP: METADATA_STRIPPED.");
        return;
      }
      if (metadata.latitude) setLat(metadata.latitude.toFixed(6));
      if (metadata.longitude) setLon(metadata.longitude.toFixed(6));
      if (metadata.DateTimeOriginal) setTimestamp(new Date(metadata.DateTimeOriginal).toISOString());
      if (metadata.ISO) setIso(metadata.ISO.toString());
      if (metadata.ExposureTime) setExposure(metadata.ExposureTime.toString());
      addLog("DNA_EXTRACTION_SUCCESS.");
    } catch (err) { setError("SYSTEM_ERROR: PARSE_FAILURE."); }
  };

  const executeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addLog("EXECUTING_FORENSIC_STRIKE...");
    try {
      const payload = { imageUrl, agentId: "sovereign-node", clientExif: { latitude: parseFloat(lat), longitude: parseFloat(lon), timestamp, iso: parseInt(iso), exposureTime: exposure } };
      const res = await fetch("/api/v1/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/cert/${data.traceId}`);
    } catch (err: any) {
      addLog(`FATAL: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-6 md:p-16 font-sans selection:bg-emerald-500/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#10b9810a_0%,transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        <header className="flex justify-between items-center border-b border-white/5 pb-8">
          <div className="flex items-center gap-8">
            <BlazingLogo />
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Forensic <span className="text-emerald-500 not-italic">Reality</span></h1>
              <p className="text-[10px] font-mono text-gray-600 tracking-[0.5em] uppercase">Sovereign Truth Infrastructure</p>
            </div>
          </div>
          <button 
            onClick={runRecon}
            disabled={reconLoading}
            className="bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 backdrop-blur-xl flex items-center gap-4 hover:bg-white/[0.06] transition-all group"
          >
            <Search className={`w-4 h-4 text-blue-500 ${reconLoading ? 'animate-spin' : 'group-hover:scale-110'}`} />
            <span className="text-xs font-black text-white font-mono uppercase tracking-widest">Run_Recon</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-8 h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
                  <h3 className="text-xs font-mono text-white uppercase tracking-[0.3em]">Live_RPC_Feed</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-600 uppercase">Solana_Mainnet</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                {reconTargets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                    <Box className="w-12 h-12" />
                    <p className="text-[10px] font-mono uppercase tracking-widest">Awaiting_Recon_Command</p>
                  </div>
                ) : (
                  reconTargets.map((target, i) => (
                    <motion.div 
                      key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => selectTarget(target)}
                      className="p-4 border border-white/5 bg-white/[0.01] rounded-2xl hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-tighter">{target.id}</span>
                        <ChevronRight className="w-3 h-3 text-gray-700 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div className="aspect-video rounded-lg bg-black border border-white/5 overflow-hidden mb-3">
                        <img src={target.image} alt="target" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-gray-500 uppercase">
                        <span>LAT: {target.metadata.lat}</span>
                        <span>LON: {target.metadata.lon}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Crosshair className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic">Strike_Engine</h2>
              </div>

              <div className="mb-8 relative group/upload">
                <input type="file" accept="image/jpeg" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className="border border-white/5 rounded-2xl p-6 bg-white/[0.01] group-hover/upload:bg-white/[0.03] group-hover/upload:border-emerald-500/20 transition-all flex flex-col items-center justify-center gap-2 text-center">
                  <Upload className="w-4 h-4 text-emerald-500/60" />
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">Initialize Local Scan</p>
                </div>
              </div>

              <form onSubmit={executeAudit} className="space-y-8">
                <HUDInput label="Target_URL" value={imageUrl} onChange={(e: any) => setImageUrl(e.target.value)} placeholder="HTTPS://DATA_STREAM" icon={Lock} />
                <div className="grid grid-cols-2 gap-8">
                  <HUDInput label="Latitude" value={lat} onChange={(e: any) => setLat(e.target.value)} type="number" />
                  <HUDInput label="Longitude" value={lon} onChange={(e: any) => setLon(e.target.value)} type="number" />
                </div>
                <HUDInput label="Temporal_Anchor" value={timestamp} onChange={(e: any) => setTimestamp(e.target.value)} />
                <div className="grid grid-cols-2 gap-8">
                  <HUDInput label="ISO_Sensitivity" value={iso} onChange={(e: any) => setIso(e.target.value)} type="number" />
                  <HUDInput label="Exposure_Value" value={exposure} onChange={(e: any) => setExposure(e.target.value)} />
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full mt-6 bg-white text-black font-black py-6 rounded-3xl transition-all flex justify-center items-center gap-4 hover:bg-emerald-500 hover:text-white shadow-2xl disabled:opacity-20"
                >
                  {loading ? <Activity className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
                  <span className="tracking-[0.4em] uppercase text-sm">Execute_Audit</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] p-6 h-[350px] flex flex-col shadow-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[10px] font-mono text-white uppercase tracking-[0.2em]">Neural_Log</h3>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[9px] space-y-3 text-emerald-400/60 scrollbar-hide">
                {terminalLogs.length === 0 ? <p className="text-gray-800 animate-pulse">_ AWAITING_COMMAND...</p> : terminalLogs.map((log, i) => <div key={i} className="flex gap-2"><span className="text-emerald-900">[{i}]</span><span className="break-all">{log}</span></div>)}
              </div>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-4">
              <Database className="w-5 h-5 text-blue-500/50" />
              <div>
                <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Ledger</p>
                <p className="text-xs font-bold text-white font-mono">SYNCED_NEON</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
