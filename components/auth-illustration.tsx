import Image from "next/image";

export function AuthIllustration() {
  return (
    <div className="hidden md:flex items-center justify-center p-8 bg-slate-50/10 border-l border-slate-100/50">
      <div className="relative w-full max-w-sm flex flex-col items-center justify-center text-center">
        {/* Modern Illustration Container */}
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-white p-4 hover:shadow-md transition-shadow duration-300">
          <Image
            src="/hr_rag_concept.png"
            alt="HR RAG Concept"
            fill
            className="object-cover rounded-2xl"
            priority
          />
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">HR Intelligence Platform</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-widest">
            Enterprise Document Analysis
          </p>
        </div>
      </div>
    </div>
  );
}

