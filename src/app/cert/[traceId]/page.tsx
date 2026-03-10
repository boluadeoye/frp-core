import { db } from "@/db";
import { auditLedger } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, Cpu, Sun, Hash, Key } from "lucide-react";

export const runtime = 'edge';

export default async function CertificatePage({ params }: { params: Promise<{ traceId: string }> }) {
  const resolvedParams = await params;
  const { traceId } = resolvedParams;

  // Search by either the exact traceId OR the agentId for easier testing
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

  return (
    <main className="min-h-screen bg-black text-gray-300 p-4 md:p-8 font-mono selection:bg-emerald-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="border-b border-gray-800 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tighter">FRP // ORACLE</h1>
            <p className="text-sm text-gray-500 mt-1">Cryptographic Attestation of Physical Reality</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">TRACE ID</p>
            <p className="text-sm text-gray-400">{audit.requestId}</p>
          </div>
        </header>

        {/* THE VERDICT */}
        <section className={`p-6 rounded-lg border ${isVerified ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'} flex items-center gap-6`}>
          {isVerified ? <ShieldCheck className="w-16 h-16 text-emerald-500" /> : <ShieldAlert className="w-16 h-16 text-red-500" />}
          <div>
            <h2 className={`text-2xl font-bold ${isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
              {isVerified ? "PHYSICAL REALITY VERIFIED" : "PHYSICAL LIE DETECTED"}
            </h2>
            <p className="text-gray-400 mt-1">Forensic Confidence Score (FCS): <span className="text-white font-bold">{fcsScore.toFixed(3)}</span></p>
          </div>
        </section>

        {/* THE EVIDENCE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* PHYSICS ENGINE */}
          <div className="border border-gray-800 rounded-lg p-5 bg-gray-900/30">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-white">Spatial-Temporal Physics</h3>
            </div>
            {physics && !physics.error ? (
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-gray-500">Claimed GPS:</span> <span>{physics.lat}, {physics.lon}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Claimed Time:</span> <span>{new Date(physics.timestamp).toLocaleString()}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Calculated Sun Altitude:</span> <span className={parseFloat(physics.sunAltitude) < 0 ? "text-red-400" : "text-emerald-400"}>{physics.sunAltitude}°</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Camera ISO:</span> <span>{physics.iso}</span></li>
                <li className="flex justify-between"><span className="text-gray-500">Exposure Time:</span> <span>{physics.exposureTime}</span></li>
              </ul>
            ) : (
              <p className="text-sm text-red-400">Physics Data Missing or Corrupted</p>
            )}
          </div>

          {/* BINARY FORENSICS */}
          <div className="border border-gray-800 rounded-lg p-5 bg-gray-900/30">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-white">Binary Inspection</h3>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              {manifest?.visual || "No binary analysis available."}
            </p>
          </div>
        </div>

        {/* CRYPTOGRAPHIC ANCHOR */}
        <section className="border border-gray-800 rounded-lg p-5 bg-gray-900/30">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
            <Key className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-white">Cryptographic Anchor</h3>
          </div>
          <div className="space-y-4 text-xs break-all">
            <div>
              <p className="text-gray-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3"/> SHA-256 Header Fingerprint</p>
              <p className="text-gray-300 bg-black p-2 rounded border border-gray-800">{audit.headerHash || "N/A"}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1 flex items-center gap-1"><Key className="w-3 h-3"/> ECDSA secp256k1 Oracle Signature</p>
              <p className="text-purple-400 bg-black p-2 rounded border border-gray-800">{audit.oracleSignature || "UNSIGNED"}</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-gray-600 pt-8 border-t border-gray-800">
          <p>Forensic Reality Protocol (FRP) • Architect: Bolu Adeoye</p>
          <p className="mt-1">This manifest is mathematically verifiable using the FRP Public Key.</p>
        </footer>

      </div>
    </main>
  );
}
