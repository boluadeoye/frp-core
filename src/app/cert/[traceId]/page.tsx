import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, Cpu, Sun, Hash, Key, Globe, Terminal, ExternalLink, FileSearch } from "lucide-react";

export const runtime = 'edge';

export default async function CertificatePage({ params }: { params: Promise<{ traceId: string }> }) {
  const resolvedParams = await params;
  const { traceId } = resolvedParams;

  const audit = await db.query.auditLedger.findFirst({
    where: or(eq(auditLedger.requestId, traceId), eq(auditLedger.agentId, traceId)),
    orderBy: (auditLedger, { desc }) => [desc(auditLedger.startedAt)],
  });

  if (!audit) return notFound();

  const isVerified = audit.status === "verified";
  const fcsScore = parseFloat(audit.fcsScore || "0");
  const manifest = audit.forensicManifest as any;
  const physics = manifest?.physics_report;
  const binaryAnalysis = manifest?.visual || "ERR_BINARY_INSUFFICIENT_DATA";

  // Verification Links
  const noaaLink = `https://www.esrl.noaa.gov/gmd/grad/solcalc/azel.html`;
  const hashCommand = `curl -sL "${audit.imageUrlRef}" | head -c 8192 | sha256sum`;

  return (
    <main className="min-h-screen bg-[#000000] text-gray-400 p-6 md:p-16 font-sans selection:bg-emerald-500/20 relative overflow-hidden">
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none ${isVerified ? 'bg-emerald-900/10' : 'bg-red-900/10'}`} />
      
      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        
        <header className="flex justify-between items-center border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">FRP // <span className="text-emerald-500 not-italic">ORACLE</span></h1>
            <p className="text-[9px] font-mono text-gray-600 tracking-[0.4em] uppercase mt-1">Cryptographic Attestation of Physical Reality</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Audit_Status</p>
            <p className={`text-xs font-bold font-mono mt-1 ${isVerified ? 'text-emerald-500' : 'text-red-500'}`}>{audit.status?.toUpperCase()}</p>
          </div>
        </header>

        {/* THE VERDICT */}
        <section className={`p-10 rounded-[2.5rem] border backdrop-blur-2xl flex flex-col md:flex-row items-center gap-10 ${isVerified ? 'bg-emerald-950/5 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.05)]' : 'bg-red-950/5 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)]'}`}>
          <div className={`p-6 rounded-3xl ${isVerified ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {isVerified ? <ShieldCheck className="w-20 h-20 text-emerald-500" /> : <ShieldAlert className="w-20 h-20 text-red-500" />}
          </div>
          <div className="text-center md:text-left space-y-2">
            <h2 className={`text-4xl font-black tracking-tighter uppercase ${isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
              {isVerified ? "Reality Verified" : "Physical Lie Detected"}
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-[0.2em]">Forensic Confidence Score:</p>
              <div className={`text-3xl font-black font-mono px-6 py-1 rounded-2xl border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {fcsScore.toFixed(3)}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* PHYSICS PANEL */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-5">
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-amber-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Spatial Physics</h3>
              </div>
              <a href={noaaLink} target="_blank" className="text-[9px] font-mono text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                VERIFY_NOAA <ExternalLink className="w-2 h-2" />
              </a>
            </div>
            {physics && !physics.error ? (
              <ul className="space-y-5 text-xs font-mono">
                <li className="flex justify-between items-center border-b border-white/5 pb-3"><span className="text-gray-600">GPS_COORD</span> <span className="text-gray-300">{physics.lat}, {physics.lon}</span></li>
                <li className="flex justify-between items-center border-b border-white/5 pb-3"><span className="text-gray-600">SOLAR_ALT</span> <span className={`font-bold ${parseFloat(physics.sunAltitude) < 0 ? "text-red-400" : "text-emerald-400"}`}>{physics.sunAltitude}°</span></li>
                <li className="flex justify-between items-center border-b border-white/5 pb-3"><span className="text-gray-600">ISO_SENSE</span> <span className="text-gray-300">{physics.iso}</span></li>
                <li className="flex justify-between items-center"><span className="text-gray-600">EXP_TIME</span> <span className="text-gray-300">{physics.exposure}</span></li>
              </ul>
            ) : (
              <p className="text-[10px] font-mono text-red-400 bg-red-500/5 p-4 rounded-xl border border-red-500/10 uppercase tracking-widest">Physics_Data_Corrupted</p>
            )}
          </div>

          {/* BINARY PANEL */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-5">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-blue-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Binary DNA</h3>
              </div>
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">SHA-256_Anchored</span>
            </div>
            <p className={`text-[11px] font-mono leading-relaxed p-5 rounded-2xl border ${binaryAnalysis.includes('ERR_') ? 'text-amber-400 bg-amber-500/5 border-amber-500/10' : 'text-gray-500 bg-black/40 border-white/5'}`}>
              {binaryAnalysis}
            </p>
          </div>
        </div>

        {/* OPEN VERIFICATION SECTION (THE RECEIPTS) */}
        <section className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-white/5 pb-5">
            <FileSearch className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Forensic Verification Source</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">1. Independent Hash Verification</p>
              <div className="bg-black p-4 rounded-xl border border-white/5 space-y-2">
                <p className="text-[9px] text-gray-600 font-mono uppercase">Run this command to verify the header fingerprint:</p>
                <code className="text-[10px] text-emerald-500/70 break-all block bg-white/5 p-2 rounded">{hashCommand}</code>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">2. Cryptographic Signature</p>
              <div className="bg-black p-4 rounded-xl border border-white/5 space-y-2">
                <p className="text-[9px] text-gray-600 font-mono uppercase">secp256k1 Oracle Seal:</p>
                <p className="text-[10px] text-purple-400/80 break-all font-mono">{audit.oracleSignature || "UNSIGNED"}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center pt-10 pb-10 opacity-20">
          <p className="text-[9px] font-mono tracking-[0.5em] uppercase">FRP // Sovereign Truth Infrastructure // v1.2</p>
          <p className="text-[8px] mt-4">Architect: Bolu Adeoye • Deloitte Forensic Standard</p>
        </footer>

      </div>
    </main>
  );
}
