"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Crosshair, Activity, AlertTriangle, Terminal, 
  Database, Globe, Cpu, ChevronRight, Upload, 
  Zap, Lock, Fingerprint, BarChart3, Scan, Radio,
  Target, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import exifr from "exifr/dist/lite.esm.js";

const BlazingLogo = () => (
  <div className="relative flex items-center justify-center w-14 h-14">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute inset-0 border border-emerald-500/10 rounded-full" />
    <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-black border border-emerald-500/30 overflow-hidden shadow-inner">
      <span className="text-emerald-400 font-light text-2xl font-sans tracking-tighter z-10">F</span>
      <motion.div animate={{ left: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="absolute top-0 bottom-0 w-[2px] bg-emerald-400/40 skew-x-12 blur-[2px]" />
    </div>
  </div>
);

const HUDInput = ({ label, value, onChange, type = "text", placeholder = "", icon: Icon }: any) => (
  <div className="relative group">
    <label className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] mb-1 block ml-1 group-focus-within:text-emerald-500 transition-colors">{label}</label>
    <div className="relative flex items-center">
      <input type={type} value={value} onChange={onChange} required placeholder={placeholder} className="w-full bg-transparent border-b border-white/5 py-2 text-sm text-white focus:border-emerald-500/50 transition-all outline-none font-mono placeholder:text-gray-800" />
      {Icon && <Icon className="absolute right-0 w-3 h-3 text-gray-700 group-focus-within:text-emerald-500/50 transition-colors" />}
    </div>
  </div>
);

export default function CommandDeck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [burnedHashes, setBurnedHashes] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [iso, setIso] = useState("");
  const [exposure, setExposure] = useState("");

  useEffect(() => {
    const fetchBurned = async () => {
      try {
        const res = await fetch('/api/v1/status/latest');
        const data = await res.json();
        if (data.burned) setBurnedHashes(data.burned);
      } catch (e) {
        console.error("Failed to fetch registry");
      }
    };
    fetchBurned();
    const interval = setInterval(fetchBurned, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [terminalLogs]);

  const addLog = (msg: string) => setTerminalLogs(prev => [...prev, msg.toUpperCase()]);

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
    setError("");
    setTerminalLogs([]);
    try {
      addLog("INITIALIZING_ORACLE_V1.2...");
      const payload = { imageUrl, agentId: "web-node", clientExif: { latitude: parseFloat(lat), longitude: parseFloat(lon), timestamp, iso: parseInt(iso), exposureTime: exposure } };
      const res = await fetch("/api/v1/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog(`AUDIT_COMPLETE: ${data.traceId.substring(0,8)}`);
      router.push(`/cert/${data.traceId}`);
    } catch (err: any) {
      setError(err.message);
      addLog(`FATAL: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-6 md:p-16 font-sans selection:bg-emerald-900/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#10b98108_0%,transparent_50%)]" />
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        <header className="flex justify-between items-center border-b border-white/5 pb-8">
          <div className="flex items-center gap-6">
            <BlazingLogo />
            <div className="space-y-1">
              <h1 className="text-2xl font-light text-white tracking-[0.15em] uppercase">Forensic <span className="font-black text-emerald-500">Reality</span></h1>
              <p className="text-[9px] font-mono text-gray-600 tracking-[0.4em] uppercase">Sovereign Truth Infrastructure</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono text-white uppercase tracking-[0.4em] flex items-center gap-3"><Target className="w-4 h-4 text-emerald-500" /> Target_Acquisition</h2>
                <button type="button" onClick={() => { setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg"); setLat("43.467448"); setLon("11.885126"); setTimestamp("2008-10-22T10:28:39Z"); setIso("100"); setExposure("1/500"); }} className="text-[9px] font-mono text-gray-600 hover:text-emerald-400 transition-colors uppercase tracking-widest">[ Load_Test_Vector ]</button>
              </div>
              <div className="relative group/upload">
                <input type="file" accept="image/jpeg" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <div className="border border-white/5 rounded-2xl p-10 bg-white/[0.01] group-hover/upload:bg-white/[0.03] group-hover/upload:border-emerald-500/20 transition-all flex flex-col items-center justify-center gap-4 text-center">
                  <Upload className="w-4 h-4 text-emerald-500/60" />
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Initialize Local Scan</p>
                </div>
              </div>
              <form onSubmit={executeAudit} className="space-y-8">
                <HUDInput label="Target_Source_URL" value={imageUrl} onChange={(e: any) => setImageUrl(e.target.value)} placeholder="HTTPS://DATA_STREAM_ORIGIN" icon={Lock} />
                <div className="grid grid-cols-2 gap-10">
                  <HUDInput label="Latitude" value={lat} onChange={(e: any) => setLat(e.target.value)} type="number" />
                  <HUDInput label="Longitude" value={lon} onChange={(e: any) => setLon(e.target.value)} type="number" />
                </div>
                <HUDInput label="Temporal_Anchor" value={timestamp} onChange={(e: any) => setTimestamp(e.target.value)} />
                <div className="grid grid-cols-2 gap-10">
                  <HUDInput label="ISO_Sensitivity" value={iso} onChange={(e: any) => setIso(e.target.value)} type="number" />
                  <HUDInput label="Exposure_Value" value={exposure} onChange={(e: any) => setExposure(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="w-full mt-6 bg-white text-black font-black py-4 rounded-xl transition-all flex justify-center items-center gap-4 disabled:opacity-20 hover:bg-emerald-500 hover:text-white">
                  {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  <span className="tracking-[0.3em] uppercase text-[11px]">Execute Forensic Audit</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-10">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 h-[450px] flex flex-col relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-red-500" />
                  <h3 className="text-[9px] font-mono text-white uppercase tracking-[0.3em]">Live_Burn_Registry</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[8px] font-mono text-red-500/60 uppercase">Monitoring</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-4 scrollbar-hide">
                {burnedHashes.length === 0 ? (
                  <p className="text-gray-800 italic">_ SCANNING_NETWORK_FOR_FRAUD...</p>
                ) : (
                  burnedHashes.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 border border-red-900/20 bg-red-950/5 rounded-lg space-y-1">
                      <div className="flex justify-between text-[8px]">
                        <span className="text-red-500/50">HASH_ID: {item.requestId.substring(0,8)}</span>
                        <span className="text-gray-600">{new Date(item.startedAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-300 break-all leading-tight">{item.headerHash}</p>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[8px] text-red-400 bg-red-400/10 px-1 rounded">FCS: {item.fcsScore}</span>
                        <button onClick={() => router.push(`/cert/${item.requestId}`)} className="text-[8px] text-gray-500 hover:text-white underline">VIEW_PROOF</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
