import Image from "next/image";

export function AuthIllustration() {
  return (
    <div className="hidden md:flex items-center justify-center relative overflow-hidden p-8 text-white">

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Top icons (3.png left, 2.png right) */}
        <div className="absolute top-8 left-8 drop-shadow-2xl">
          <Image src="/3.png" alt="Flow arrow" width={150} height={150} priority />
        </div>
        <div className="absolute top-6 right-8 drop-shadow-2xl">
          <Image src="/2.png" alt="Document search" width={150} height={150} />
        </div>

        {/* Center title & markers */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#2f6bff]" />
          <span className="w-14 h-1 rounded-full bg-gradient-to-r from-[#2f6bff] to-[#1d45f3]" />
          <span className="w-2 h-2 rounded-full bg-white/50" />
          <span className="w-14 h-1 rounded-full bg-gradient-to-r from-[#1d45f3] to-[#2f6bff]" />
          <span className="w-3 h-3 rounded-full bg-[#2f6bff]/80" />
        </div>
        <div className="text-center z-10 mt-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#2f6bff] to-[#1d45f3] text-transparent bg-clip-text drop-shadow-lg">
            RAG Dokumen AI
          </h2>
        </div>

        {/* Bottom icons (4.png left, 1.png right) */}
        <div className="absolute bottom-16 left-10 drop-shadow-2xl">
          <Image src="/4.png" alt="Book to brain" width={140} height={140} />
        </div>
        <div className="absolute bottom-12 right-10 drop-shadow-2xl">
          <Image src="/1.png" alt="AI documents" width={150} height={150} />
        </div>
      </div>
    </div>
  );
}

