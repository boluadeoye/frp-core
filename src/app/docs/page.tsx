import { Shield, Book, Zap, Cpu, Sun, Lock } from "lucide-react";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black text-gray-400 p-8 md:p-20 font-sans selection:bg-emerald-500/20">
      <div className="max-w-4xl mx-auto space-y-16">
        
        <header className="space-y-4 border-b border-white/5 pb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Technical Documentation</h1>
          <p className="text-emerald-500 font-mono text-xs tracking-[0.3em]">FRP_PROTOCOL_SPEC_V1.2</p>
        </header>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-white">
            <Sun className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-bold tracking-tight">L1: Spatial-Temporal Physics</h2>
          </div>
          <p className="leading-relaxed">
            The FRP Physics Engine utilizes the <code className="text-emerald-400">SunCalc</code> algorithm to calculate the precise position of the sun (Azimuth and Altitude) for any given GPS coordinate and ISO 8601 timestamp. 
          </p>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl font-mono text-xs space-y-2">
            <p className="text-gray-500">// Deterministic Verification Logic</p>
            <p className="text-emerald-500/80">IF (SunAltitude &lt; -2.0 && CameraISO &lt; 400) THEN FLAG_PHYSICAL_LIE</p>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-white">
            <Cpu className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold tracking-tight">L2: Binary Forensic Analysis</h2>
          </div>
          <p className="leading-relaxed">
            FRP performs a surgical 8KB-64KB binary strike on the image header. This allows for the detection of post-processing signatures (e.g., Adobe Photoshop, Canva, GIMP) without the computational overhead of full-file parsing.
          </p>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-white">
            <Lock className="w-6 h-6 text-purple-500" />
            <h2 className="text-2xl font-bold tracking-tight">L3: Cryptographic Finality</h2>
          </div>
          <p className="leading-relaxed">
            Every audit is anchored using <code className="text-purple-400">ECDSA secp256k1</code>. This generates a detached cryptographic manifest that binds the image fingerprint to the forensic verdict.
          </p>
        </section>

        <footer className="pt-20 opacity-20 text-center">
          <p className="text-[10px] font-mono tracking-[0.5em]">Sovereign Truth Infrastructure // 2026</p>
        </footer>
      </div>
    </main>
  );
}
