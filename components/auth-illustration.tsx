import Image from "next/image";

export function AuthIllustration() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center p-8 bg-slate-100/60 border-l border-slate-200/80 min-h-screen">
      <div className="w-full max-w-lg flex flex-col items-center justify-center text-center space-y-6">
        {/* Modern Illustration Container */}
        <div className="relative w-full aspect-[16/10] rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-white p-3 hover:shadow-xl transition-all duration-300">
          <Image
            src="/hr_rag_concept.png"
            alt="HR RAG Concept"
            fill
            className="object-cover rounded-2xl"
            priority
          />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">ISRE</h2>
          <p className="text-xs text-sky-600 font-bold mt-1 uppercase tracking-widest">
            HR Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  );
}
