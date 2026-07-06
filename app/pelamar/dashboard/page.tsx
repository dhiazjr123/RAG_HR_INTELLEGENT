"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  FileUp,
  CheckCircle2,
  Loader2,
  Upload,
  User,
  Briefcase,
  LogOut,
  AlertCircle,
  FileText,
  Calendar,
  FileCheck,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Mail,
  Phone,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buildIndexForDocument, retrieveTopK } from "@/lib/ragLocal";
import { PARTNER_JD_CRITERIA } from "@/lib/partner-jd-criteria";
import { Badge } from "@/components/ui/badge";

export default function PelamarDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("Pelamar");
  const [userId, setUserId] = useState("");

  const [selectedJd, setSelectedJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);

  // Multi-step form state
  const [step, setStep] = useState<1 | 2>(1);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEducation, setProfileEducation] = useState("");
  const [profileMajor, setProfileMajor] = useState("");

  const jds = [
    { id: "tech", title: "Modern Packaging Technition PBK" },
    { id: "worker", title: "Modern Packaging Worker PBK" }
  ];

  // Load user submissions from localStorage
  const loadUserSubmissions = (uId: string) => {
    const subsStr = localStorage.getItem("rag_applicant_submissions");
    if (subsStr) {
      try {
        const allSubs = JSON.parse(subsStr);
        if (Array.isArray(allSubs)) {
          // Filter only submissions by this logged-in applicant
          const filtered = allSubs.filter((s: any) => s.userId === uId);
          setUserSubmissions(filtered);
        }
      } catch (e) { }
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || "Pelamar";
        setUserName(name);
        setUserId(data.user.id);
        loadUserSubmissions(data.user.id);

        // Check for saved profile in localStorage
        const savedProfile = localStorage.getItem(`rag_profile_${data.user.id}`);
        if (savedProfile) {
          try {
            const p = JSON.parse(savedProfile);
            setProfileName(p.name || name);
            setProfileEmail(p.email || data.user.email || "");
            setProfilePhone(p.phone || "");
            setProfileEducation(p.education || "");
            setProfileMajor(p.major || "");
            // If profile is fully filled, proceed directly to Step 2 (CV upload)
            if (p.name && p.email && p.phone && p.education && p.major) {
              setStep(2);
            }
          } catch (e) { }
        } else {
          // Pre-fill defaults
          setProfileName(name);
          setProfileEmail(data.user.email || "");
        }
      } else {
        router.push("/login?next=/pelamar/dashboard");
      }
    });
  }, [supabase, router]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMsg("Nama Lengkap harus diisi.");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes("@")) {
      setErrorMsg("Email tidak valid.");
      return;
    }
    if (!profilePhone.trim()) {
      setErrorMsg("No. Handphone harus diisi.");
      return;
    }
    if (!profileEducation) {
      setErrorMsg("Silakan pilih pendidikan terakhir.");
      return;
    }
    if (!profileMajor.trim()) {
      setErrorMsg("Jurusan/Program Studi harus diisi.");
      return;
    }

    setErrorMsg("");
    const profile = {
      name: profileName.trim(),
      email: profileEmail.trim(),
      phone: profilePhone.trim(),
      education: profileEducation,
      major: profileMajor.trim(),
    };
    localStorage.setItem(`rag_profile_${userId}`, JSON.stringify(profile));
    setUserName(profile.name);
    setStep(2);
  };


  useEffect(() => {
    document.body.classList.add("theme-dark-applicant");
    return () => {
      document.body.classList.remove("theme-dark-applicant");
    };
  }, []);

  // Listen to storage changes to refresh candidate submissions list
  useEffect(() => {
    const handleStorage = () => {
      if (userId) loadUserSubmissions(userId);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (status === "uploading" || status === "analyzing") return;

    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setErrorMsg("Hanya file PDF yang diperbolehkan.");
      setFile(null);
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran maksimal file adalah 5MB.");
      setFile(null);
      return;
    }

    setErrorMsg("");
    setFile(f);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const idbPutFile = (id: string, blob: Blob, targetUserId: string): Promise<void> => {
    const dbName = `rag-docs-db-${targetUserId}`;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("files", "readwrite");
        tx.objectStore("files").put(blob, id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      req.onerror = () => reject(req.error);
    });
  };

  const handleUpload = async () => {
    if (!selectedJd) {
      setErrorMsg("Silakan pilih posisi yang dilamar.");
      return;
    }
    if (!file) {
      setErrorMsg("Silakan pilih file CV Anda.");
      return;
    }

    try {
      setStatus("uploading");
      setErrorMsg("");

      // 1. Upload & Extract text via ingest API
      const formData = new FormData();
      formData.append("file", file);

      const ingestRes = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData
      });

      if (!ingestRes.ok) throw new Error("Gagal membaca dokumen CV.");

      const ingestData = await ingestRes.json();
      const blocks = ingestData.parsedBlocks || [];
      const cvText = blocks.map((b: any) => b.content || b.label || "").join("\n\n");

      if (!cvText || cvText.length < 50) {
        throw new Error("Teks tidak terdeteksi atau terlalu sedikit di CV Anda.");
      }

      setStatus("analyzing");

      const docId = crypto.randomUUID();
      const submissionId = crypto.randomUUID();

      // RAG: Save file blob & build embedding index first to generate Cosine Similarity scores
      await idbPutFile(docId, file, "shared");
      await buildIndexForDocument(docId, file, undefined, "shared");

      // 2. Analyze CV vs JD
      const jdTitle = jds.find(j => j.id === selectedJd)?.title || selectedJd;
      const targetJdId = selectedJd === "tech" ? "sgs-pbk-modern-packaging-tech" : selectedJd === "worker" ? "sgs-pbk-modern-packaging-worker" : "";
      const matchJd = PARTNER_JD_CRITERIA.find(c => c.id === targetJdId);
      const jdCriteria = matchJd?.fullText || "";

      // RAG: Retrieve top 3 matching chunks of CV against the JD criteria
      const retrieved = await retrieveTopK(jdCriteria, 3, { docId, userId: "shared" });
      const avgSimilarity = retrieved.length > 0
        ? (retrieved.reduce((sum, r) => sum + r.score, 0) / retrieved.length)
        : 0.0;
      const retrievedContext = retrieved.map((r, i) => `[Konteks CV #${i + 1} - Score: ${(r.score * 100).toFixed(1)}%]:\n${r.chunk.text}`).join("\n\n");

      const analyzeRes = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          jdTitle,
          jdCriteria,
          retrievedContext,
          avgSimilarity
        })
      });

      if (!analyzeRes.ok) throw new Error("Gagal menganalisis CV.");
      const analyzeData = await analyzeRes.json();

      const cleanApplicantName = (fileName: string, fallback: string): string => {
        let name = fileName.replace(/\.[^/.]+$/, ""); // strip extension
        name = name.replace(/[-_]/g, " "); // replace dashes/underscores with space
        name = name.replace(/\b(cv|resume|biodata|lamaran|pdf|docx|doc)\b/gi, ""); // strip words like CV
        name = name.trim().replace(/\s+/g, " "); // collapse spaces
        if (!name || name.length < 3) return fallback;
        return name
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      };

      const finalApplicantName = profileName || cleanApplicantName(file.name, userName);

      // 3. Save to global mock DB in localStorage for Dashboard Overview
      const submissionsStr = localStorage.getItem("rag_applicant_submissions");
      let submissions = [];
      if (submissionsStr) {
        try {
          submissions = JSON.parse(submissionsStr);
        } catch (e) { }
      }

      // Filter out previous submission with the same CV file name to allow replacing/updating the same file
      submissions = submissions.filter((s: any) => s.cvFileName !== file.name);

      submissions.push({
        id: submissionId,
        userId,
        applicantName: finalApplicantName,
        jdTitle,
        cvFileName: file.name,
        strengths: analyzeData.strengths || [],
        weaknesses: analyzeData.weaknesses || [],
        suitabilityScore: analyzeData.suitabilityScore || 50,
        alasanLolos: analyzeData.alasanLolos || "Memenuhi kualifikasi dasar untuk posisi yang dilamar.",
        uploadDate: new Date().toISOString(),
        profileEmail,
        profilePhone,
        profileEducation,
        profileMajor,
      });

      localStorage.setItem("rag_applicant_submissions", JSON.stringify(submissions));

      // 4. Save to shared documents list for HR Workspace
      const today = new Date().toISOString().slice(0, 10);
      const newDocMeta = {
        id: docId,
        name: file.name,
        type: "PDF",
        size: formatBytes(file.size),
        uploadDate: today,
        status: "Processed" as const,
        uploadedBy: userId,
        parsedText: cvText,
        appliedJd: jdTitle,
      };

      const docsKey = "rag_docs_v1";
      const existingDocsJson = localStorage.getItem(docsKey);
      let existingDocs = [];
      if (existingDocsJson) {
        try {
          existingDocs = JSON.parse(existingDocsJson);
        } catch (e) { }
      }
      // Filter out duplicate filename
      existingDocs = existingDocs.filter((d: any) => d.name !== file.name);
      existingDocs.unshift(newDocMeta);
      localStorage.setItem(docsKey, JSON.stringify(existingDocs));

      setStatus("success");
      setFile(null);
      loadUserSubmissions(userId);

      // dispatch storage event manually for any other open tabs
      window.dispatchEvent(new Event("storage"));
    } catch (e: any) {
      setErrorMsg(e.message || "Terjadi kesalahan saat memproses CV.");
      setStatus("error");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#070c17] text-slate-100 flex flex-col font-sans antialiased relative overflow-hidden">
      {/* Decorative background glow spots */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Glass header */}
      <header className="sticky top-0 z-50 bg-[#0d131f]/60 backdrop-blur-md border-b border-[#1b253b] px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">PELAMAR</span>
            </div>
            <h1 className="font-extrabold text-white text-base tracking-wide mt-0.5">Portal Karir PT Sosro</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-white">{userName}</span>
            <span className="text-[10px] text-slate-400">Kandidat Aktif</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="border-slate-800 bg-[#0f172a] hover:bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </Button>
        </div>
      </header>

      {/* Content wrapper */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 relative z-10">

        {/* Welcome banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#0f1b2f]/90 via-[#0d2138]/85 to-[#0b1626]/90 border border-[#1e2f4d] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Selamat datang kembali, <span className="text-emerald-400">{userName}</span>!
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Unggah CV terbaik Anda di bawah ini. AI Asisten HR kami akan langsung membaca pengalaman, keterampilan, dan mencocokkan Anda dengan posisi impian di PT Sosro.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#080d1a] border border-[#1b2b48] px-4 py-2 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-slate-300">Sistem Seleksi AI Aktif</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Form Upload Area (3 Columns) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-[#0d131f]/70 border-[#1f2d47] shadow-2xl backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-[#1b2b48] bg-[#111927]/60 pb-5">
                <CardTitle className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Kirim Lamaran Pekerjaan Baru
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Lengkapi data diri Anda dan unggah berkas CV format PDF
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#1b2b48]/60">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${step === 1
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}>
                      1
                    </div>
                    <div>
                      <span className={`text-[10px] block font-bold tracking-widest uppercase ${step === 1 ? "text-emerald-400" : "text-slate-400"}`}>Langkah 1</span>
                      <span className={`text-xs font-bold ${step === 1 ? "text-white" : "text-slate-400"}`}>Isi Data Diri</span>
                    </div>
                  </div>
                  <div className="h-px bg-[#1e2f4d] flex-1 mx-4" />
                  <div className="flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${step === 2
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/20"
                        : "bg-slate-800 text-slate-500"
                      }`}>
                      2
                    </div>
                    <div>
                      <span className={`text-[10px] block font-bold tracking-widest uppercase ${step === 2 ? "text-emerald-400" : "text-slate-500"}`}>Langkah 2</span>
                      <span className={`text-xs font-bold ${step === 2 ? "text-white" : "text-slate-500"}`}>Unggah CV</span>
                    </div>
                  </div>
                </div>

                {/* Form Render based on Step */}
                {step === 1 ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Nama Lengkap */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Masukkan nama lengkap sesuai KTP"
                        className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-emerald-400" />
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {/* No. HP */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        Nomor Handphone
                      </label>
                      <input
                        type="tel"
                        required
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {/* Pendidikan Terakhir */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                        Pendidikan Terakhir
                      </label>
                      <div className="relative">
                        <select
                          value={profileEducation}
                          onChange={(e) => setProfileEducation(e.target.value)}
                          required
                          className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 appearance-none"
                        >
                          <option value="" disabled className="bg-[#070c17]">Pilih Pendidikan Terakhir...</option>
                          <option value="SMA/SMK" className="bg-[#070c17]">SMA / SMK / Sederajat</option>
                          <option value="D3" className="bg-[#070c17]">D3 (Diploma 3)</option>
                          <option value="S1" className="bg-[#070c17]">S1 (Sarjana 1)</option>
                          <option value="S2" className="bg-[#070c17]">S2 (Magister)</option>
                          <option value="S3" className="bg-[#070c17]">S3 (Doktor)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <ChevronRight className="h-4 w-4 transform rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Jurusan */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                        Jurusan / Program Studi
                      </label>
                      <input
                        type="text"
                        required
                        value={profileMajor}
                        onChange={(e) => setProfileMajor(e.target.value)}
                        placeholder="Contoh: Teknik Informatika, Manajemen"
                        className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>

                    {errorMsg && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-[#1b253b] hover:bg-[#1f2c48] active:scale-98 font-bold text-white shadow-lg transition-all border border-[#2c3d61] h-11 text-xs uppercase tracking-widest rounded-lg mt-6"
                    >
                      Simpan & Lanjut ke Upload CV
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Ringkasan Data Diri (Readonly with Edit button) */}
                    <div className="p-4 bg-[#0a1122]/90 border border-[#1d2d49] rounded-xl relative shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          Data Diri Pelamar
                        </h3>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-[#152037] hover:bg-[#1d2b49] py-1 px-2.5 rounded border border-[#273a62] transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          <span>Ubah Data</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Nama Lengkap</span>
                          <span className="text-white font-semibold">{profileName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Email</span>
                          <span className="text-white font-semibold">{profileEmail}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">No. Handphone</span>
                          <span className="text-white font-semibold">{profilePhone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Pendidikan Terakhir</span>
                          <span className="text-white font-semibold">{profileEducation} — {profileMajor}</span>
                        </div>
                      </div>
                    </div>

                    {/* 1. Select Position */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase block">
                        Pilih Posisi Jabatan Sosro
                      </label>
                      <div className="relative">
                        <select
                          value={selectedJd}
                          onChange={(e) => setSelectedJd(e.target.value)}
                          disabled={status === "uploading" || status === "analyzing"}
                          className="w-full h-11 rounded-lg border border-[#1e2f4d] bg-[#090d16] px-3.5 text-sm text-white font-medium shadow-inner transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 appearance-none"
                        >
                          <option value="" disabled className="bg-[#070c17]">Pilih Posisi yang Ingin Dilamar...</option>
                          {jds.map(jd => (
                            <option key={jd.id} value={jd.id} className="bg-[#070c17] py-2">
                              {jd.title}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                          <ChevronRight className="h-4 w-4 transform rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* 2. Drag & Drop File Upload */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-300 tracking-wider uppercase block">
                        Unggah CV Format PDF
                      </label>

                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 ${dragActive
                            ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                            : "border-[#1e2f4d] bg-[#080d16] hover:bg-[#0a1122]/70 hover:border-slate-700"
                          }`}
                      >
                        <input
                          type="file"
                          id="cv-upload"
                          accept="application/pdf"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={status === "uploading" || status === "analyzing"}
                        />

                        {!file ? (
                          <>
                            <div className="h-12 w-12 rounded-full bg-slate-800/40 text-slate-400 flex items-center justify-center border border-slate-700/50 mb-3 group-hover:scale-110 transition-transform">
                              <Upload className="h-5 w-5 text-slate-300 animate-bounce" />
                            </div>
                            <p className="text-xs text-slate-300 font-bold mb-1 text-center">
                              Tarik dan taruh berkas CV Anda di sini, atau klik tombol di bawah
                            </p>
                            <p className="text-[10px] text-slate-500 mb-4 text-center">
                              Hanya berkas PDF dengan ukuran maksimal 5 megabyte (5MB)
                            </p>

                            <label
                              htmlFor="cv-upload"
                              className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-[#1b253b] text-slate-200 hover:bg-slate-800 shadow-md h-9 px-4 py-2 border border-slate-700/80 active:scale-95"
                            >
                              Pilih Berkas CV
                            </label>
                          </>
                        ) : (
                          <div className="w-full max-w-sm flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 mb-3">
                              <FileCheck className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-bold text-white text-center truncate w-full mb-1">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mb-4">
                              Ukuran Berkas: {formatBytes(file.size)}
                            </p>

                            <div className="flex gap-2">
                              <label
                                htmlFor="cv-upload"
                                className="cursor-pointer text-[10px] font-bold text-slate-400 hover:text-white bg-[#0e1626] border border-[#1e2f4d] py-1.5 px-3 rounded-md transition-colors"
                              >
                                Ubah Berkas
                              </label>
                              <button
                                type="button"
                                onClick={() => setFile(null)}
                                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-[#1f121d] border border-rose-950 py-1.5 px-3 rounded-md transition-colors"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Banner */}
                    {errorMsg && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Processing Steps Checklist (Interactive loader) */}
                    {(status === "uploading" || status === "analyzing") && (
                      <div className="p-4 bg-[#0a1122] border border-[#1c2c47] rounded-xl space-y-3.5">
                        <div className="flex items-center gap-2 border-b border-[#1b2b48] pb-2">
                          <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                          <span className="text-xs font-bold text-white tracking-wide">AI Engine Processing Checklist</span>
                        </div>

                        <div className="space-y-2">
                          {/* Step 1: Upload */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-300">
                              {status === "uploading" ? (
                                <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              )}
                              <span className={status !== "uploading" ? "text-slate-400 line-through" : "font-semibold text-white"}>
                                Mengambil data & Ingest berkas CV
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {status === "uploading" ? "Berjalan..." : "Selesai"}
                            </span>
                          </div>

                          {/* Step 2: AI suit */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              {status === "uploading" ? (
                                <div className="h-2 w-2 rounded-full bg-slate-700 ml-0.5" />
                              ) : status === "analyzing" ? (
                                <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              )}
                              <span className={status === "analyzing" ? "font-semibold text-white" : ""}>
                                Analisis Kecocokan Karir (AI Screening)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {status === "uploading" ? "Menunggu" : status === "analyzing" ? "Mengekstrak..." : "Selesai"}
                            </span>
                          </div>

                          {/* Step 3: Synced */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-400">
                              <div className="h-2 w-2 rounded-full bg-slate-700 ml-0.5" />
                              <span>Penyelarasan Indeks Dokumen HR</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Menunggu</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Success Banner */}
                    {status === "success" && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3.5 animate-fadeIn">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Lamaran Berhasil Dikirim!</h4>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Dokumen CV Anda telah berhasil kami unggah dan dianalisis kecocokannya oleh AI. Lamaran Anda saat ini telah masuk ke dalam antrean review oleh tim HR PT Sosro.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    <Button
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all border-0 h-11 text-xs uppercase tracking-widest rounded-lg disabled:bg-slate-800 disabled:text-slate-500"
                      onClick={handleUpload}
                      disabled={!file || !selectedJd || status === "uploading" || status === "analyzing"}
                    >
                      Kirim Lamaran Pekerjaan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History / Status Area (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#0d131f]/70 border-[#1f2d47] shadow-2xl backdrop-blur-sm">
              <CardHeader className="border-b border-[#1b2b48] bg-[#111927]/60 pb-5">
                <CardTitle className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6fb7ff]" />
                  Riwayat Lamaran Anda
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Daftar CV dan posisi jabatan yang telah Anda lamar
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                {userSubmissions.length > 0 ? (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {userSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-[#080d16] border border-[#1b2b48] flex flex-col gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate max-w-[170px]" title={sub.jdTitle}>
                              {sub.jdTitle}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3 shrink-0" />
                              {new Date(sub.uploadDate).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })}
                            </p>
                          </div>

                          <Badge className="bg-[#6fb7ff]/10 text-[#6fb7ff] border border-[#6fb7ff]/20 text-[9px] font-semibold py-0.5 px-2 rounded">
                            Terdokumentasi
                          </Badge>
                        </div>

                        <div className="pt-2.5 border-t border-[#131d2e] flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]" title={sub.cvFileName}>
                              {sub.cvFileName}
                            </span>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] py-0 px-1.5">
                            Dalam Review
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center rounded-xl border border-dashed border-[#1e2f4d] bg-[#070c17]/50">
                    <FileUp className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                    <p className="text-xs font-bold text-slate-400">Belum Ada Lamaran Aktif</p>
                    <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
                      Silakan pilih posisi dan unggah berkas CV Anda untuk melihat riwayat proses seleksi di sini.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 mt-12 bg-[#050912] border-t border-[#131d30] text-center text-[10px] text-slate-500">
        <p>© 2026 PT Sinar Sosro - RAG Recruitment System. Seluruh hak cipta dilindungi.</p>
      </footer>
    </div>
  );
}
