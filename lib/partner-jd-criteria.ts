/**
 * Kriteria / Job Description mitra — PT Sosro Gunung Slamet.
 * Data aktif disimpan di `data/jd-criteria.json` dan dikelola via dashboard Admin.
 * Array `PARTNER_JD_CRITERIA` di bawah dipakai sebagai seed awal saat file belum ada.
 */

export type PartnerJobCriteria = {
  id: string;
  department: string;
  title: string;
  level: string;
  location: string;
  employmentType: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  /** Teks penuh untuk konteks RAG */
  fullText: string;
  /** Status persetujuan HR saat Admin ubah/tambah kriteria */
  approvalStatus?: "approved" | "pending";
  /** Alasan HR jika memilih status pending */
  pendingReason?: string;
  /** ISO timestamp saat diajukan Admin */
  pendingAt?: string;
  /** ISO timestamp saat HR memberikan respons (Setuju / Pending) */
  hrRespondedAt?: string;
};

export const PARTNER_NAME = "PT Sosro Gunung Slamet";

export function buildFullText(c: Omit<PartnerJobCriteria, "fullText">): string {
  const lines = [
    `[JOB DESCRIPTION - ${c.title}]`,
    `Perusahaan: ${PARTNER_NAME}`,
    `Departemen / Bagian: ${c.department}`,
    `Posisi: ${c.title}`,
    `Level: ${c.level}`,
    `Lokasi: ${c.location}`,
    `Tipe: ${c.employmentType}`,
    "",
    "Ringkasan:",
    c.summary,
    "",
    "Tanggung Jawab:",
    ...c.responsibilities.map((r) => `- ${r}`),
    "",
    "Persyaratan:",
    ...c.requirements.map((r) => `- ${r}`),
    "",
    "Nice to have:",
    ...c.niceToHave.map((r) => `- ${r}`),
  ];
  return lines.join("\n");
}

function withFullText(
  c: Omit<PartnerJobCriteria, "fullText">
): PartnerJobCriteria {
  return { ...c, fullText: buildFullText(c) };
}

/** Dokumen resmi U&KJ mitra — isi `officialBody` persis seperti sumber, tanpa diubah */
function withOfficialDocument(
  c: Omit<PartnerJobCriteria, "fullText">,
  officialBody: string
): PartnerJobCriteria {
  const fullText = [
    `[JOB DESCRIPTION - ${c.title}]`,
    `Perusahaan: ${PARTNER_NAME}`,
    `Departemen / Bagian: ${c.department}`,
    "",
    officialBody.trim(),
  ].join("\n");
  return { ...c, fullText };
}

const MODERN_PACKAGING_PBK_UKJ = `URAIAN & KUALIFIKASI JABATAN

Nama Jabatan           : Modern Packaging Technition PBK

I. FUNGSI JABATAN

Bertanggung jawab melakukan operasional kerja perawatan & perbaikan mesin-mesin dan alat bantu pengemasan.

II. RINCIAN TUGAS

1. Tugas Utama :

a. Melakukan operasional kerja untuk perawatan/perbaikan mesin pengemasan & peralatan pendukung kerja mesin pengemasan.

b. Melakukan pencatatan/pendataan yang benar terkait dengan operasional mesin & peralatan bantu pengemasan pada setiap shift kerja pengemasan mesin.

c. Membuat laporan terkait tugas dan lingkup kerjanya.

2. Tugas Tambahan :

a. Melaksanakan kegiatan lain yang ditugaskan atasan terkait selama tidak bertentangan dengan fungsi jabatan dan kepentingan Perusahaan.

III. WEWENANG

1. Menghentikan operasional kerja mesin, sekiranya diindikasikan adanya potensi yang bisa merusak mesin, mempengaruhi keamanan/kehalalan produk & membahayakan personal.

2. Mengambil tindakan langsung terkait dengan kepersonaliaan yang sekiranya akan menghambat/merusak kinerja mesin, untuk kemudian melaporkannya kepada atasan terkait.

IV. HUBUNGAN KERJA

1. Internal

a. Atasan terkait.
b. Kepala Lini PBK
c. Modern Packaging Technician Supervisor PBK
d. Packaging Assistant Manager PBK
e. Seluruh divisi internal Pabrik

2. Eksternal

a. -

V. URAIAN & KUALIFIKASI JABATAN :

1. Pendidikan Formal :

D3 dengan jurusan yang relevan

2. Pengetahuan Dasar :

a. Communication
b. Teamwork

3. Ketrampilan Khusus :

a. Quality Management System
b. HSSE
c. Sistem Jaminan Halal

4. Profil Kepribadian :

a. Inisiatif, Kritis, Logis, dan Analitis
b. Komunikatif dan bisa bekerja sama

VI. PERSYARATAN TAMBAHAN

1. Kursus / Pelatihan

a. SGS Core Competence

2. Pengalaman Kerja`;

const MODERN_PACKAGING_WORKER_PBK_UKJ = `URAIAN & KUALIFIKASI JABATAN

Nama Jabatan           : Modern Packaging Worker PBK

I. FUNGSI JABATAN

Bertanggungjawab dalam menjalankan operasional produksi pengemasan modern sesuai penempatan area kerja yang telah ditentukan.

II. RINCIAN TUGAS

1. Tugas Utama :

a. Melaksanakan proses produksi pengemasan mesin sesuai dengan rencana kerja.

b. Melakukan pencatatan / pendataan terkait hasil produksi mesin dan penggunaan material selama operasional produksi berjalan ditiap shift kerjanya.

c. Menjaga kebersihan lingkungan/Peralatan/mesin & higiene pribadi.

2. Tugas Tambahan :

a. Melakukan tugas lain sesuai perintah atasan terkait.

b. Melakukan koordinasi dengan Kepala Lini PBK dan Modern Packaging Technician PBK dalam pengoperasian mesin operasional produksi.

III. WEWENANG

1. Menghentikan mesin dalam lingkup tugas dan tanggung jawabnya, dan melaporkan kepada atasan terkait selama proses produksi pengemasan mesin yang sekiranya diindikasikan dapat menimbulkan bahaya terkait dengan keamanan produk, kehalalan produk, dan personal.

IV. HUBUNGAN KERJA

1. Internal

a. Atasan terkait.

b. Modern Packaging worker

2. Eksternal

a. -

V. URAIAN & KUALIFIKASI JABATAN :

1. Pendidikan Formal :

SLTA sederajat

2. Pengetahuan Dasar :

Personal Hygiene.

3. Ketrampilan Khusus :

a.

b.

4. Profil Kepribadian :

a. Bisa bekerja sama dalam tim.

b. Tegas dan komunikatif

c. Tekun, teliti, sistematis


VI. PERSYARATAN TAMBAHAN

1. Kursus / Pelatihan

a. Operator mesin.

2. Pengalaman Kerja

Minimal 1 tahun di perusahaan makanan dan minuman.`;

function extractOfficialJdSections(fullText: string): { title: string; content: string }[] {
  const body = fullText.includes("URAIAN & KUALIFIKASI JABATAN")
    ? fullText.slice(fullText.indexOf("URAIAN & KUALIFIKASI JABATAN"))
    : fullText;

  const headers: { title: string; marker: string }[] = [
    { title: "Fungsi Jabatan", marker: "I. FUNGSI JABATAN" },
    { title: "Rincian Tugas", marker: "II. RINCIAN TUGAS" },
    { title: "Wewenang", marker: "III. WEWENANG" },
    { title: "Hubungan Kerja", marker: "IV. HUBUNGAN KERJA" },
    { title: "Uraian & Kualifikasi Jabatan", marker: "V. URAIAN & KUALIFIKASI JABATAN" },
    { title: "Persyaratan Tambahan", marker: "VI. PERSYARATAN TAMBAHAN" },
  ];

  const sections: { title: string; content: string }[] = [];
  const namaMatch = body.match(/Nama Jabatan\s*:\s*(.+)/);
  if (namaMatch) {
    sections.push({
      title: "Identitas Jabatan",
      content: `Nama Jabatan: ${namaMatch[1].trim()}`,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const start = body.indexOf(headers[i].marker);
    if (start < 0) continue;
    const contentStart = start + headers[i].marker.length;
    const nextMarker = headers[i + 1]?.marker;
    const end = nextMarker ? body.indexOf(nextMarker, contentStart) : body.length;
    const content = body.slice(contentStart, end < 0 ? body.length : end).trim();
    if (content) sections.push({ title: headers[i].title, content });
  }

  return sections;
}

/** Dummy — ganti array ini saat data resmi dari mitra sudah ada */
export const PARTNER_JD_CRITERIA: PartnerJobCriteria[] = [
  withFullText({
    id: "sgs-produksi-staff",
    department: "Produksi",
    title: "Staff Produksi",
    level: "Staff",
    location: "Pabrik Sosro — Tegal",
    employmentType: "Full-time",
    summary:
      "Memastikan proses produksi minuman/teh berjalan sesuai SOP, standar keamanan pangan, dan target output harian.",
    responsibilities: [
      "Mengoperasikan dan memantau lini produksi sesuai jadwal",
      "Melakukan pengecekan kualitas produk in-process",
      "Mencatat laporan produksi harian (output, reject, downtime)",
      "Mematuhi prosedur K3 dan GMP di area pabrik",
    ],
    requirements: [
      "Minimal SMA/SMK sederajat; D3 Teknik Industri lebih disukai",
      "Pengalaman di manufaktur/FMCG min. 1 tahun",
      "Mampu bekerja shift",
      "Teliti dan disiplin dokumentasi",
    ],
    niceToHave: ["Pengalaman di industri minuman", "Sertifikasi K3 dasar"],
  }),
  withOfficialDocument(
    {
      id: "sgs-pbk-modern-packaging-tech",
      department: "Produksi & Packaging (PBK)",
      title: "Modern Packaging Technition PBK",
      level: "Technician",
      location: "Pabrik Sosro — Tegal",
      employmentType: "Full-time",
      summary:
        "Bertanggung jawab melakukan operasional kerja perawatan & perbaikan mesin-mesin dan alat bantu pengemasan.",
      responsibilities: [
        "Melakukan operasional kerja untuk perawatan/perbaikan mesin pengemasan & peralatan pendukung kerja mesin pengemasan",
        "Melakukan pencatatan/pendataan yang benar terkait operasional mesin & peralatan bantu pengemasan pada setiap shift kerja",
        "Membuat laporan terkait tugas dan lingkup kerjanya",
        "Melaksanakan kegiatan lain yang ditugaskan atasan terkait selama tidak bertentangan dengan fungsi jabatan dan kepentingan Perusahaan",
      ],
      requirements: [
        "Pendidikan formal: D3 dengan jurusan yang relevan",
        "Pengetahuan dasar: Communication, Teamwork",
        "Ketrampilan khusus: Quality Management System, HSSE, Sistem Jaminan Halal",
        "Profil kepribadian: Inisiatif, Kritis, Logis, Analitis, Komunikatif, dan bisa bekerja sama",
      ],
      niceToHave: ["Kursus/pelatihan: SGS Core Competence", "Pengalaman kerja (sesuai persyaratan tambahan dokumen resmi)"],
    },
    MODERN_PACKAGING_PBK_UKJ
  ),
  withOfficialDocument(
    {
      id: "sgs-pbk-modern-packaging-worker",
      department: "Produksi & Packaging (PBK)",
      title: "Modern Packaging Worker PBK",
      level: "Worker",
      location: "Pabrik Sosro — Tegal",
      employmentType: "Full-time",
      summary:
        "Bertanggungjawab dalam menjalankan operasional produksi pengemasan modern sesuai penempatan area kerja yang telah ditentukan.",
      responsibilities: [
        "Melaksanakan proses produksi pengemasan mesin sesuai dengan rencana kerja",
        "Melakukan pencatatan/pendataan terkait hasil produksi mesin dan penggunaan material selama operasional produksi berjalan ditiap shift kerjanya",
        "Menjaga kebersihan lingkungan/Peralatan/mesin & higiene pribadi",
        "Melakukan tugas lain sesuai perintah atasan terkait",
        "Melakukan koordinasi dengan Kepala Lini PBK dan Modern Packaging Technician PBK dalam pengoperasian mesin operasional produksi",
      ],
      requirements: [
        "Pendidikan formal: SLTA sederajat",
        "Pengetahuan dasar: Personal Hygiene",
        "Ketrampilan khusus: a. / b. (sesuai dokumen resmi)",
        "Profil kepribadian: Bisa bekerja sama dalam tim, tegas dan komunikatif, tekun, teliti, sistematis",
      ],
      niceToHave: [
        "Kursus/pelatihan: Operator mesin",
        "Pengalaman kerja: Minimal 1 tahun di perusahaan makanan dan minuman",
      ],
    },
    MODERN_PACKAGING_WORKER_PBK_UKJ
  ),
  withFullText({
    id: "sgs-qa-analyst",
    department: "Quality Assurance",
    title: "QA Analyst",
    level: "Staff",
    location: "Pabrik Sosro — Tegal",
    employmentType: "Full-time",
    summary:
      "Melakukan pengujian dan audit kualitas bahan baku, proses, dan produk jadi sesuai standar perusahaan dan regulasi.",
    responsibilities: [
      "Sampling dan pengujian laboratorium produk",
      "Audit kepatuhan GMP/HACCP di lini produksi",
      "Menyusun laporan deviasi dan rekomendasi perbaikan",
      "Berkoordinasi dengan Produksi dan R&D",
    ],
    requirements: [
      "S1 Kimia, Biologi, Teknik Industri, atau Teknologi Pangan",
      "Memahami sistem mutu ISO/HACCP",
      "Mahir dokumentasi dan analisis data dasar",
      "Perhatian tinggi terhadap detail",
    ],
    niceToHave: ["Pengalaman audit internal", "Statistik dasar (Excel)"],
  }),
  withFullText({
    id: "sgs-it-backend",
    department: "IT & Digital",
    title: "Backend Developer",
    level: "Junior–Middle",
    location: "Kantor Pusat — Tegal / Hybrid",
    employmentType: "Full-time",
    summary:
      "Membangun dan memelihara layanan backend untuk sistem internal (ERP, integrasi produksi, portal HR) dan aplikasi digital perusahaan.",
    responsibilities: [
      "Mengembangkan REST API dan integrasi antar sistem",
      "Memelihara database dan performa query",
      "Menulis unit test dan dokumentasi teknis",
      "Berpartisipasi dalam code review",
    ],
    requirements: [
      "Pengalaman backend min. 1–2 tahun",
      "Node.js atau Java (Spring Boot) atau Python (FastAPI/Django)",
      "Database relasional (PostgreSQL/MySQL)",
      "Git, REST API, pemahaman keamanan dasar",
    ],
    niceToHave: ["Docker", "Redis", "Pengalaman ERP/manufacturing system"],
  }),
  withFullText({
    id: "sgs-it-frontend",
    department: "IT & Digital",
    title: "Frontend Developer",
    level: "Junior–Middle",
    location: "Kantor Pusat — Tegal / Hybrid",
    employmentType: "Full-time",
    summary:
      "Mengembangkan antarmuka web internal dan dashboard operasional yang responsif dan mudah dipakai tim bisnis.",
    responsibilities: [
      "Implementasi UI dari desain Figma ke kode produksi",
      "Integrasi dengan REST API backend",
      "Optimasi performa dan aksesibilitas dasar",
      "Maintenance modul React/Next.js existing",
    ],
    requirements: [
      "React atau Next.js min. 1 tahun",
      "HTML, CSS, JavaScript/TypeScript",
      "Pengalaman state management (React Query/Zustand dll.)",
      "Komunikasi baik dengan tim produk",
    ],
    niceToHave: ["Tailwind CSS", "Testing Library", "PWA"],
  }),
  withFullText({
    id: "sgs-game-dev",
    department: "Digital & Innovation",
    title: "Game Developer (Unity)",
    level: "Junior–Middle",
    location: "Tegal / Remote partial",
    employmentType: "Full-time / Kontrak",
    summary:
      "Mengembangkan game edukasi/promosi brand (mobile/PC) menggunakan Unity untuk kampanye digital Sosro.",
    responsibilities: [
      "Membangun gameplay dan integrasi asset 2D/3D",
      "Optimasi performa untuk perangkat mobile",
      "Berkolaborasi dengan desainer dan sound",
      "Maintenance build dan publish ke store internal/demo",
    ],
    requirements: [
      "Pengalaman Unity (C#) min. 1 tahun",
      "Portofolio game yang pernah dibuat (2D/top-down/mobile)",
      "Memahami game loop, UI in-game, build pipeline",
      "Problem solving dan dokumentasi proyek",
    ],
    niceToHave: ["Godot/Unreal", "Multiplayer dasar", "Gamification marketing"],
  }),
  withFullText({
    id: "sgs-rnd-food-tech",
    department: "R&D",
    title: "Food Technologist",
    level: "Staff",
    location: "Pabrik & Lab — Tegal",
    employmentType: "Full-time",
    summary:
      "Mengembangkan formulasi produk minuman/teh baru, uji coba rasa, dan scale-up ke produksi.",
    responsibilities: [
      "Riset formulasi dan uji shelf-life",
      "Koordinasi trial produksi dengan tim QA & Produksi",
      "Dokumentasi formula dan spesifikasi bahan",
      "Monitoring tren pasar dan regulasi pangan",
    ],
    requirements: [
      "S1 Teknologi Pangan / Kimia / Bioteknologi",
      "Pengalaman formulasi minuman/FMCG",
      "Mahir alat lab dan analisis sensorik",
      "Kreatif dan analitis",
    ],
    niceToHave: ["Sertifikasi HACCP", "Pengalaman produk ready-to-drink"],
  }),
  withFullText({
    id: "sgs-supply-chain",
    department: "Supply Chain & Logistik",
    title: "Staff Supply Chain",
    level: "Staff",
    location: "Tegal",
    employmentType: "Full-time",
    summary:
      "Mengelola perencanaan bahan baku, inventory, dan distribusi untuk mendukung operasional pabrik dan distribusi nasional.",
    responsibilities: [
      "Perencanaan kebutuhan bahan baku (MRP dasar)",
      "Monitoring stok dan lead time supplier",
      "Koordinasi gudang dan expedisi",
      "Pelaporan KPI supply chain",
    ],
    requirements: [
      "S1 Industri, Manajemen, atau Logistik",
      "Pengalaman supply chain min. 1 tahun",
      "Excel/ERP dasar",
      "Negosiasi dan koordinasi lintas divisi",
    ],
    niceToHave: ["SAP/Oracle module MM", "Sertifikasi logistik"],
  }),
  withFullText({
    id: "sgs-marketing-digital",
    department: "Marketing",
    title: "Digital Marketing Specialist",
    level: "Staff",
    location: "Jakarta / Tegal",
    employmentType: "Full-time",
    summary:
      "Merencanakan dan mengeksekusi kampanye digital brand Teh Sosro di media sosial, performance ads, dan konten kreatif.",
    responsibilities: [
      "Menyusun kalender konten dan brief kreatif",
      "Mengelola iklan Meta/Google dengan KPI ROAS/CPL",
      "Analisis insight dan laporan bulanan",
      "Koordinasi dengan agency dan tim kreatif",
    ],
    requirements: [
      "Pengalaman digital marketing min. 2 tahun",
      "Meta Ads, Google Ads, analytics tools",
      "Copywriting dan dasar desain konten",
      "FMCG/consumer goods experience preferred",
    ],
    niceToHave: ["Influencer marketing", "Video editing dasar"],
  }),
  withFullText({
    id: "sgs-hr-recruiter",
    department: "Human Resources",
    title: "HR Recruitment Specialist",
    level: "Staff",
    location: "Tegal",
    employmentType: "Full-time",
    summary:
      "Menangani end-to-end rekrutmen untuk kebutuhan operasional dan korporat PT Sosro Gunung Slamet.",
    responsibilities: [
      "Sourcing, screening, dan interview kandidat",
      "Koordinasi dengan user department untuk kebutuhan role",
      "Onboarding karyawan baru",
      "Update pipeline di ATS/spreadsheet",
    ],
    requirements: [
      "S1 Psikologi/Manajemen/HRM",
      "Pengalaman rekrutmen min. 1 tahun",
      "Komunikasi dan organisasi kuat",
      "Mahir interview struktur/kompetensi",
    ],
    niceToHave: ["Pengalaman manufacturing/FMCG", "Employer branding"],
  }),
];

/** Bangun fullText dari dokumen resmi U&KJ */
export function buildOfficialFullText(
  c: Omit<PartnerJobCriteria, "fullText">,
  officialBody: string
): string {
  return [
    `[JOB DESCRIPTION - ${c.title}]`,
    `Perusahaan: ${PARTNER_NAME}`,
    `Departemen / Bagian: ${c.department}`,
    "",
    officialBody.trim(),
  ].join("\n");
}

export function getCriteriaById(
  id: string | null,
  list: PartnerJobCriteria[] = PARTNER_JD_CRITERIA
): PartnerJobCriteria | undefined {
  if (!id) return undefined;
  return list.find((c) => c.id === id);
}

export function criteriaToParsedBlocks(
  criteria: PartnerJobCriteria
): { id: string; label: string; content: string }[] {
  const fileLabel = `${criteria.title} (${PARTNER_NAME})`;

  if (criteria.fullText.includes("URAIAN & KUALIFIKASI JABATAN")) {
    const sections = extractOfficialJdSections(criteria.fullText);
    const blocks = sections.map((s, i) => ({
      id: `jd-${i + 1}`,
      label: `[JOB DESCRIPTION - ${fileLabel}] ${s.title}`,
      content: s.content,
    }));
    blocks.push({
      id: "jd-full",
      label: `[JOB DESCRIPTION - ${fileLabel}] Dokumen lengkap`,
      content: criteria.fullText,
    });
    return blocks;
  }

  return [
    {
      id: "jd-1",
      label: `[JOB DESCRIPTION - ${fileLabel}] Ringkasan`,
      content: criteria.summary,
    },
    {
      id: "jd-2",
      label: `[JOB DESCRIPTION - ${fileLabel}] Tanggung Jawab`,
      content: criteria.responsibilities.map((r) => `- ${r}`).join("\n"),
    },
    {
      id: "jd-3",
      label: `[JOB DESCRIPTION - ${fileLabel}] Persyaratan`,
      content: criteria.requirements.map((r) => `- ${r}`).join("\n"),
    },
    {
      id: "jd-4",
      label: `[JOB DESCRIPTION - ${fileLabel}] Nice to have`,
      content: criteria.niceToHave.map((r) => `- ${r}`).join("\n"),
    },
    {
      id: "jd-full",
      label: `[JOB DESCRIPTION - ${fileLabel}] Dokumen lengkap`,
      content: criteria.fullText,
    },
  ];
}

export const JD_CRITERIA_STORAGE_KEY = "sgs_selected_jd_criteria_v1";
