export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tighter">
          Forensic Reality Protocol
        </h1>
        <p className="text-xl text-gray-400">
          The Truth Oracle for the Agentic Web.
        </p>
        <div className="p-6 border border-gray-800 rounded-lg bg-gray-900/50 text-left font-mono text-sm text-gray-300">
          <p>{">"} SYSTEM STATUS: INITIALIZING</p>
          <p>{">"} ENGINE: LLAMA 4 SCOUT</p>
          <p>{">"} ARCHITECT: BOLU ADEOYE</p>
          <p>{">"} BACKGROUND: GLOBAL FORENSIC CONSULTING (DELOITTE)</p>
        </div>
      </div>
    </main>
  );
}
