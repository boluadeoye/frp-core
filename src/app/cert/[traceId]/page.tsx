import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, Cpu, Sun, Hash, Key, Globe } from "lucide-react";

export const runtime = 'edge';

export default async function CertificatePage({ params }: { params: Promise<{ traceId: string }> }) {
  const resolvedParams = await params;
  const { traceId } = resolvedParams;

  const audit = await db.query.auditLedger.findFirst({
    where: or(
      eq(auditLedger.requestId, traceId),
      eq(auditLedger.agentId, traceId)
    ),
    orderBy: (auditLedger, { desc }) =>[desc(auditLedger.startedAt)],
  });

  if (!audit) return notFound();

  const isVerified = audit.status === "verified";
  const fcsScore = parseFloat(audit.fcsScore || "0");
  const manifest = audit.forensicManifest as any;
  const physics = manifest?.physics_report;
  
  // FLAG VII FIX: Explicit error rendering
  const binaryAnalysis = manifest?.visual || "ERR_BINARY_INSUFFICIENT_DATA: The cognitive plane could not extract a definitive binary signature from the provided sliver.";

  return (
    <main className="min-h-screen bg-[#020202] text-gray-300 p-4 md:p-8 font-sans selection:bg-emerald-900/50 relative overflow-hidden">
      
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none ${isVerified ? 'bg-emerald-900/10' : 'bg-red-900/10'}`} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6 pt-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">FRP // ORACLE</h1>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">Cryptographic Attestation of Physical Reality</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Trace ID</p>
            <p className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-1 rounded mt-1 border border-white/5">{audit.requestId}</p>
          </div>
        </header>

        <section className={`p-8 rounded-3xl border backdrop-blur-xl flex flex-col md:flex-row items-center gap-8 ${isVerified ? 'bg-emerald-950/10 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 'bg-red-950/10 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'}`}>
          <div className={`p-4 rounded-full ${isVerified ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {isVerified ? <ShieldCheck className="w-16 h-16 text-emerald-500" /> : <ShieldAlert className="w-16 h-16 text-red-500" />}
          </div>
          <div className="text-center md:text-left">
            <h2 className={`text-3xl font-black tracking-tight uppercase ${isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
              {isVerified ? "Physical Reality Verified" : "Physical Lie Detected"}
            </h2>
            <div className="mt-2 flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p className="text-sm text-gray-400 font-mono uppercase tracking-wider">Forensic Confidence Score (FCS):</p>
              <div className={`text-2xl font-bold font-mono px-4 py-1 rounded-lg border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {fcsScore.toFixed(3)}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <Sun className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Spatial-Temporal Physics</h3>
            </div>
            {physics && !physics.error ? (
              <ul className="space-y-4 text-sm font-mono">
                <li className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">CLAIMED GPS</span> 
                  <span className="text-gray-300">{physics.lat}, {physics.lon}</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">CLAIMED TIME</span> 
                  <span className="text-gray-300">{physics.timestamp !== "Invalid Date" ? new Date(physics.timestamp).toLocaleString() : "Invalid Date"}</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">SUN ALTITUDE</span> 
                  <span className={`font-bold ${parseFloat(physics.sunAltitude) < 0 ? "text-red-400" : "text-emerald-400"}`}>{physics.sunAltitude}°</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">CAMERA ISO</span> 
                  <span className="text-gray-300">{physics.iso}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">EXPOSURE TIME</span> 
                  <span className="text-gray-300">{physics.exposureTime}</span>
                </li>
              </ul>
            ) : (
              <p className="text-xs font-mono text-red-400 bg-red-500/10 p-3 rounded border border-red-500/20">Physics Data Missing or Corrupted</p>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <Cpu className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Binary Inspection</h3>
            </div>
            <p className={`text-xs font-mono leading-relaxed p-4 rounded-xl border ${binaryAnalysis.includes('ERR_') ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-gray-400 bg-black/40 border-white/5'}`}>
              {binaryAnalysis}
            </p>
          </div>
        </div>

        <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <Key className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cryptographic Anchor</h3>
          </div>
          <div className="space-y-6 text-xs font-mono break-all">
            <div>
              <p className="text-gray-500 mb-2 flex items-center gap-2"><Hash className="w-3 h-3"/> SHA-256 Header Fingerprint</p>
              <p className="text-gray-300 bg-black/60 p-4 rounded-xl border border-white/5 shadow-inner">{audit.headerHash || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-2 flex items-center gap-2"><Key className="w-3 h-3"/> ECDSA secp256k1 Oracle Signature</p>
              <p className="text-purple-400 bg-purple-900/10 p-4 rounded-xl border border-purple-500/20 shadow-inner">{audit.oracleSignature || "UNSIGNED"}</p>
            </div>
          </div>
        </section>

        <footer className="text-center pt-12 pb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 mb-4">
            <Globe className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Global Edge Network</span>
          </div>
          <p className="text-xs text-gray-600 font-sans">Forensic Reality Protocol (FRP) • Architect: Bolu Adeoye</p>
          <p className="text-[10px] text-gray-700 font-mono mt-2">This manifest is mathematically verifiable using the FRP Public Key.</p>
        </footer>

      </div>
    </main>
  );
}
