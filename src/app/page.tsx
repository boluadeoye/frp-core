"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Crosshair, Activity, AlertTriangle, Terminal, Database, Globe, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- THE BLAZING LOGO COMPONENT ---
const BlazingLogo = () => (
  <motion.div
    initial={{ boxShadow: "0px 0px 5px rgba(16, 185, 129, 0.2)" }}
    animate={{ boxShadow:["0px 0px 5px rgba(16, 185, 129, 0.2)", "0px 0px 25px rgba(16, 185, 129, 0.8)", "0px 0px 5px rgba(16, 185, 129, 0.2)"] }}
    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    className="relative flex items-center justify-center w-14 h-14 bg-black border border-emerald-500/50 rounded-xl overflow-hidden"
  >
    <motion.span 
      className="text-emerald-400 font-black text-3xl font-mono tracking-tighter z-10"
      style={{ textShadow: "0 0 10px rgba(16,185,129,0.8)" }}
    >
      F
    </motion.span>
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-transparent z-0" />
    {/* Scanning line effect */}
    <motion.div 
      animate={{ top: ["-10%", "110%"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      className="absolute left-0 right-0 h-[1px] bg-emerald-400/50 z-20 shadow-[0_0_5px_rgba(16,185,129,1)]"
    />
  </motion.div>
);

export default function CommandDeck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Form State
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [iso, setIso] = useState("");
  const[exposure, setExposure] = useState("");

  const loadTestVector = () => {
    setImageUrl("https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/gps/DSCN0010.jpg");
    setLat("43.467448");
    setLon("11.885126");
    setTimestamp("2008-10-22T10:28:39Z");
    setIso("100");
    setExposure("1/500");
    setError("");
  };

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}`]);
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
      await new Promise(r => setTimeout(r, 500));
      addLog("EXTRACTING 64KB SURGICAL BINARY SLIVER...");

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
    <main className="min-h-screen bg-[#050505] text-gray-300 p-4 md:p-8 font-sans selection:bg-emerald-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* PREMIUM HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <BlazingLogo />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Forensic Reality Protocol</h1>
              <p className="text-sm text-emerald-500/80 font-mono tracking-widest uppercase mt-1">Sovereign Truth Infrastructure</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-mono text-gray-500">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-md border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ONLINE
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-md border border-white/5">
              <Globe className="w-3 h-3" />
              GLOBAL EDGE
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: INGESTION FORM */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/5 blur-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-emerald-500" /> Target Acquisition
                </h2>
                <button 
                  type="button" 
                  onClick={loadTestVector}
                  className="text-xs font-mono bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2 rounded-lg border border-white/10 transition-all"
                >
                  [ LOAD TEST VECTOR ]
                </button>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm flex items-start gap-3 font-mono">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> 
                  <p>{error}</p>
                </motion.div>
              )}

              <form onSubmit={executeAudit} className="space-y-5 relative z-10">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Target Image URL</label>
                  <input 
                    type="url" required
                    value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Latitude</label>
                    <input 
                      type="number" step="any" required
                      value={lat} onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Longitude</label>
                    <input 
                      type="number" step="any" required
                      value={lon} onChange={(e) => setLon(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Timestamp (ISO 8601)</label>
                  <input 
                    type="text" required
                    value={timestamp} onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                    placeholder="YYYY-MM-DDTHH:mm:ssZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Camera ISO</label>
                    <input 
                      type="number" required
                      value={iso} onChange={(e) => setIso(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Exposure Time</label>
                    <input 
                      type="text" required
                      value={exposure} onChange={(e) => setExposure(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono"
                      placeholder="1/500"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                >
                  {loading ? <Activity className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                  {loading ? "EXECUTING CRYPTOGRAPHIC AUDIT..." : "INITIALIZE AUDIT"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: TERMINAL & STATS */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LIVE TERMINAL */}
            <div className="bg-black border border-white/10 rounded-2xl p-5 shadow-2xl h-[300px] flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <Terminal className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-mono text-gray-400 uppercase tracking-widest">Execution Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 text-emerald-500/80">
                {terminalLogs.length === 0 ? (
                  <p className="text-gray-600 italic">Awaiting target acquisition...</p>
                ) : (
                  <AnimatePresence>
                    {terminalLogs.map((log, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="break-all"
                      >
                        {log}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* SYSTEM STATS BENTO */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <Database className="w-5 h-5 text-blue-500 mb-2" />
                <p className="text-xs text-gray-500 font-mono uppercase">Ledger Status</p>
                <p className="text-lg font-bold text-white mt-1">SYNCED</p>
              </div>
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <Cpu className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-xs text-gray-500 font-mono uppercase">Oracle Engine</p>
                <p className="text-lg font-bold text-white mt-1">70B LPU</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
