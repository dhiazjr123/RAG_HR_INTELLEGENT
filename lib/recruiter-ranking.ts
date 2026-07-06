/** Peringkat objektif dari segmen CV_ONLY + format jawaban top-N */

export type CvSegment = { filename: string; text: string };

export type RankedCandidate = {
  filename: string;
  name: string;
  score: number;
  quotes: string[];
  reason: string;
  cvBody?: string;
  depthMeta?: { matchedReqs: number; expCount: number; skillCount: number };
};

type RoleSignal = { re: RegExp; w: number; label: string };

// PERBAIKAN: Pemisahan packaging_tech dan packaging_worker
type RoleDomain =
  | "backend"
  | "frontend"
  | "mobile"
  | "game"
  | "fullstack"
  | "packaging_tech"
  | "packaging_worker"
  | "qa"
  | "marketing"
  | "produksi"
  | "rnd"
  | "supplychain"
  | "hr"
  | "general";

/** Skor minimum untuk masuk "Rekomendasi utama". Di bawah ini masuk "Kandidat lain". */
const MIN_SCORE_FOR_RECOMMENDATION = 12; // Dilonggarkan

/** Skor minimum mutlak agar kandidat disebut "layak dipertimbangkan". */
const MIN_SCORE_ABSOLUTE = 5;

// PERBAIKAN: Penambahan C#, 3D, 2D, Mobile Game
const GAME_SIGNALS: RoleSignal[] = [
  { re: /game\s*development/i, w: 28, label: "Game Development" },
  { re: /membangun\s+game|membuat\s+game|pengembang\s+game/i, w: 26, label: "pengalaman membangun game" },
  { re: /unity/i, w: 24, label: "Unity" },
  { re: /\bc#\b|\bcsharp\b/i, w: 22, label: "C#" },
  { re: /unreal|godot|cocos/i, w: 22, label: "engine game" },
  { re: /\b2d\b|\b3d\b/i, w: 18, label: "2D/3D" },
  { re: /\bmobile\s*game\b/i, w: 18, label: "Mobile Game" },
  { re: /\bmultiplayer\b/i, w: 16, label: "Multiplayer" },
  { re: /top[- ]?down/i, w: 14, label: "game top-down" },
  { re: /\bgame\b/i, w: 16, label: "game" },
  { re: /gameplay|level\s*design/i, w: 14, label: "gameplay/level design" },
];

// PERBAIKAN: Penambahan Python, Java, SQL, API, Database
const BACKEND_SIGNALS: RoleSignal[] = [
  { re: /\bbackend\b|\bback[- ]?end\b/i, w: 28, label: "backend" },
  { re: /\bserver[- ]?side\b/i, w: 22, label: "server-side" },
  { re: /\brest\s*api\b|\brestful\b/i, w: 20, label: "REST API" },
  { re: /\bapi\b/i, w: 16, label: "API" },
  { re: /\bnode\.?js\b/i, w: 24, label: "Node.js" },
  { re: /\bexpress\.?js\b/i, w: 18, label: "Express.js" },
  { re: /\bspring\s*boot\b/i, w: 24, label: "Spring Boot" },
  { re: /\bjava\b/i, w: 20, label: "Java" },
  { re: /\bfastapi\b/i, w: 22, label: "FastAPI" },
  { re: /\bdjango\b/i, w: 20, label: "Django" },
  { re: /\bpython\b/i, w: 20, label: "Python" },
  { re: /\bflask\b/i, w: 18, label: "Flask" },
  { re: /\blaravel\b/i, w: 18, label: "Laravel" },
  { re: /\bpostgresql\b|\bmysql\b|\bmongodb\b|\bredis\b/i, w: 18, label: "Database Relasional/NoSQL" },
  { re: /\bsql\b/i, w: 16, label: "SQL" },
  { re: /\bdatabase\b/i, w: 14, label: "Database" },
  { re: /\bmicroservices\b/i, w: 16, label: "microservices" },
  { re: /\bgo(lang)?\b/i, w: 14, label: "Go" },
  { re: /\b\.net\b|\bc#\b/i, w: 14, label: ".NET/C#" },
  { re: /\bphp\b/i, w: 12, label: "PHP" },
];

const FRONTEND_SIGNALS: RoleSignal[] = [
  { re: /\bfrontend\b|\bfront[- ]?end\b/i, w: 28, label: "frontend" },
  { re: /\breact\.?js\b|\breact\b/i, w: 22, label: "React" },
  { re: /\bvue\.?js\b|\bvue\b/i, w: 20, label: "Vue" },
  { re: /\bangular\b/i, w: 20, label: "Angular" },
  { re: /\bnext\.?js\b/i, w: 18, label: "Next.js" },
  { re: /\btypescript\b|\bjavascript\b/i, w: 14, label: "JS/TS" },
  { re: /\bhtml\b|\bcss\b|\btailwind\b/i, w: 10, label: "HTML/CSS" },
  { re: /\bui\/?ux\b|\buser\s*interface\b/i, w: 14, label: "UI/UX" },
];

const MOBILE_SIGNALS: RoleSignal[] = [
  { re: /\bmobile\b/i, w: 24, label: "mobile" },
  { re: /\bflutter\b/i, w: 26, label: "Flutter" },
  { re: /\bandroid\b/i, w: 20, label: "Android" },
  { re: /\bios\b|\bswift\b/i, w: 20, label: "iOS/Swift" },
  { re: /\bkotlin\b/i, w: 18, label: "Kotlin" },
  { re: /\bfirebase\b/i, w: 12, label: "Firebase" },
];

// PERBAIKAN: Pemisahan Packaging Tech
const PACKAGING_TECH_SIGNALS: RoleSignal[] = [
  { re: /\bpackaging\b|\bpengemasan\b|\bPBK\b/i, w: 26, label: "packaging/pengemasan" },
  { re: /perawatan\s*mesin\s*pengemas|perbaikan\s*mesin\s*pengemas/i, w: 30, label: "perawatan/perbaikan mesin pengemasan" },
  { re: /\btechnician\b|\btechnition\b|\bteknisi\b/i, w: 28, label: "Technician" },
  { re: /\bD3\b|diploma/i, w: 20, label: "D3/diploma" },
  { re: /\bHSSE\b/i, w: 22, label: "HSSE" },
  { re: /quality\s*management\s*system|\bQMS\b/i, w: 20, label: "Quality Management System" },
  { re: /jaminan\s*halal|sistem\s*jaminan\s*halal/i, w: 20, label: "Sistem Jaminan Halal" },
  { re: /SGS\s*Core\s*Competence/i, w: 18, label: "SGS Core Competence" },
];

// PERBAIKAN: Pemisahan Packaging Worker
const PACKAGING_WORKER_SIGNALS: RoleSignal[] = [
  { re: /\bpackaging\b|\bpengemasan\b|\bPBK\b/i, w: 26, label: "packaging/pengemasan" },
  { re: /operator\s*mesin\s*pengemas|operasional\s*mesin\s*pengemas/i, w: 30, label: "operator mesin pengemasan" },
  { re: /\bworker\b|\boperator\b/i, w: 28, label: "Worker/Operator" },
  { re: /\bSLTA\b|SMA\s*sederajat/i, w: 20, label: "SLTA/sederajat" },
  { re: /produksi\s*pengemasan|lini\s*pengemasan|line\s*pengemasan/i, w: 24, label: "produksi pengemasan" },
  { re: /personal\s*hygiene|higiene\s*pribadi/i, w: 22, label: "Personal Hygiene" },
  { re: /makanan\s*dan\s*minuman|industri\s*FMCG|pabrik\s*minuman/i, w: 16, label: "pengalaman FMCG/makanan minuman" },
  { re: /shift\s*kerja\s*produksi|operasional\s*shift/i, w: 16, label: "shift kerja produksi" },
];

const QA_SIGNALS: RoleSignal[] = [
  { re: /\bquality\s*assurance\b|\bQA\b/i, w: 28, label: "Quality Assurance" },
  { re: /\btesting\b|\btest\s*case\b/i, w: 24, label: "Testing" },
  { re: /\bmanual\s*testing\b/i, w: 22, label: "Manual Testing" },
  { re: /\bautomation\s*testing\b|\bselenium\b|\bappium\b/i, w: 26, label: "Automation Testing" },
  { re: /\bbugs?\s*report\b|\bbug\s*tracking\b|\bjira\b/i, w: 20, label: "Bug Tracking" },
  { re: /\btest\s*plan\b|\btest\s*scenario\b/i, w: 22, label: "Test Plan" },
  { re: /\bpostman\b|\bapi\s*testing\b/i, w: 18, label: "API Testing" },
  { re: /\bregression\b/i, w: 18, label: "Regression Testing" },
  { re: /\bperformance\s*testing\b|\bjmeter\b/i, w: 16, label: "Performance Testing" },
  { re: /\buat\b|\buser\s*acceptance\b/i, w: 16, label: "UAT" },
  { re: /\biso\s*9001\b|\bstandar\s*kualitas\b/i, w: 14, label: "ISO/Quality Standard" },
  { re: /\bdokumentasi\s*teknis\b|\btest\s*documentation\b/i, w: 14, label: "Test Documentation" },
];

const MARKETING_SIGNALS: RoleSignal[] = [
  { re: /\bdigital\s*marketing\b/i, w: 30, label: "Digital Marketing" },
  { re: /\bsocial\s*media\b|\bsosmed\b|\bmedia\s*sosial\b/i, w: 24, label: "Social Media" },
  { re: /\bseo\b|\bsem\b|\bsearch\s*engine\b/i, w: 22, label: "SEO/SEM" },
  { re: /\bmeta\s*ads\b|\bfacebook\s*ads\b|\bfb\s*ads\b|\big\s*ads\b/i, w: 26, label: "Meta/FB Ads" },
  { re: /\bgoogle\s*ads\b/i, w: 26, label: "Google Ads" },
  { re: /\bcopywriting\b|\bcopywriter\b/i, w: 24, label: "Copywriting" },
  { re: /\bcontent\b|\bkonten\b|\bcontent\s*creator\b/i, w: 20, label: "Content Creation" },
  { re: /\bkampanye\b|\bcampaign\b/i, w: 22, label: "Campaign Management" },
  { re: /\bROAS\b|\bCPL\b|\bKPI\b|\bconversion\b/i, w: 26, label: "ROAS/CPL/KPI Analysis" },
  { re: /\bFMCG\b|\bconsumer\s*goods\b/i, w: 26, label: "FMCG Experience" },
  { re: /\binfluencer\b|\bKOL\b/i, w: 18, label: "Influencer/KOL" },
  { re: /\bvideo\s*editing\b|\bcapcut\b|\btiktok\b/i, w: 16, label: "Video Editing" },
  { re: /\bgoogle\s*analytics\b|\banalytics\s*tools\b/i, w: 18, label: "Analytics Tools" },
];

const PRODUKSI_SIGNALS: RoleSignal[] = [
  { re: /\bproduksi\b|\bproduction\b/i, w: 28, label: "Produksi" },
  { re: /\bmanufaktur\b|\bmanufacturing\b/i, w: 24, label: "Manufaktur" },
  { re: /\bFMCG\b|\bconsumer\s*goods\b/i, w: 24, label: "FMCG" },
  { re: /\bSOP\b|\bstandar\s*operasional\b/i, w: 20, label: "SOP" },
  { re: /\bGMP\b|\bgood\s*manufacturing\b/i, w: 22, label: "GMP" },
  { re: /\bK3\b|\bkeselamatan\s*kerja\b|\bHSE\b|\bOHSAS\b/i, w: 22, label: "K3/HSE" },
  { re: /\bminuman\b|\bteh\b|\bbeverage\b/i, w: 18, label: "Industri Minuman" },
  { re: /\bshift\b/i, w: 16, label: "Shift Kerja" },
  { re: /\boutput\b|\breject\b|\bdowntime\b|\btarget\s*produksi\b/i, w: 20, label: "Target/Output Produksi" },
  { re: /\bquality\s*check\b|\bquality\s*control\b|\bpengecekan\s*kualitas\b/i, w: 22, label: "Quality Control / Check" },
  { re: /\blini\s*produksi\b|\bmesin\s*produksi\b|\bproduction\s*line\b/i, w: 24, label: "Lini Produksi" },
];

const RND_SIGNALS: RoleSignal[] = [
  { re: /\brnd\b|\br\s*&\s*d\b|\bresearch\s*and\s*development\b/i, w: 30, label: "R&D" },
  { re: /\bfood\s*tech\b|\bteknologi\s*pangan\b|\bkimia\b|\bbiologi\b/i, w: 26, label: "Teknologi Pangan/Kimia" },
  { re: /\bformulasi\b|\bformula\b/i, w: 24, label: "Formulasi" },
  { re: /\bsensorik\b|\bsensory\b|\buji\s*rasa\b/i, w: 22, label: "Uji Sensorik" },
  { re: /\blab\b|\blaboratorium\b/i, w: 20, label: "Laboratorium" },
  { re: /\bHACCP\b/i, w: 22, label: "HACCP" },
  { re: /\bscale[- ]?up\b/i, w: 18, label: "Scale-up Produksi" },
  { re: /\bshelf[- ]?life\b/i, w: 16, label: "Shelf-life" },
];

const SUPPLY_CHAIN_SIGNALS: RoleSignal[] = [
  { re: /\bsupply\s*chain\b|\brantai\s*pasok\b/i, w: 30, label: "Supply Chain" },
  { re: /\blogistik\b|\blogistics\b/i, w: 28, label: "Logistik" },
  { re: /\binventory\b|\bgudang\b|\bwarehouse\b|\bstok\b/i, w: 24, label: "Inventory/Warehouse" },
  { re: /\bmrp\b|\bmaterial\s*requirement\b/i, w: 22, label: "MRP/Perencanaan" },
  { re: /\bsupplier\b|\bvendor\b/i, w: 20, label: "Supplier Management" },
  { re: /\bdistribusi\b|\bexpedisi\b/i, w: 18, label: "Distribusi/Expedisi" },
  { re: /\berp\b|\bsap\b|\boracle\b/i, w: 22, label: "ERP/SAP/Oracle" },
  { re: /\blead\s*time\b/i, w: 16, label: "Lead Time" },
];

const HR_SIGNALS: RoleSignal[] = [
  { re: /\bhr\b|\bhuman\s*resources?\b|\bhrm\b/i, w: 30, label: "Human Resources" },
  { re: /\brekrutmen\b|\brecruitment\b|\brecruiter\b/i, w: 28, label: "Rekrutmen" },
  { re: /\bsourcing\b|\bscreening\b|\binterview\b/i, w: 26, label: "Sourcing/Interview" },
  { re: /\bpsikologi\b/i, w: 22, label: "Psikologi" },
  { re: /\bats\b|\bapplicant\s*tracking\b/i, w: 20, label: "ATS" },
  { re: /\bonboarding\b/i, w: 18, label: "Onboarding" },
  { re: /\bemployer\s*branding\b/i, w: 18, label: "Employer Branding" },
  { re: /\bpipeline\b/i, w: 14, label: "Pipeline Kandidat" },
];

const QUERY_KW_STOP = new Set([
  "yang", "dengan", "untuk", "dari", "pada", "adalah", "akan", "atau", "dan", "di", "ke",
  "ini", "itu", "saya", "kami", "anda", "mereka", "cocok", "kandidat", "rekomendasi",
  "siapa", "mana", "bagaimana", "berapa", "antara", "lebih", "paling", "terbaik", "bagian",
  "the", "and", "for", "with", "from", "dev", "developer", "development", "posisi", "role",
]);

function inferRoleDomainFromQuery(query: string): RoleDomain {
  const s = query.toLowerCase();
  if (/game|gaming|unity|unreal|godot|gamedev|permainan/.test(s)) return "game";
  if (/backend|back[- ]?end|server[- ]?side|api\s*dev/.test(s)) return "backend";
  if (/frontend|front[- ]?end|react\s*dev|ui\s*dev|web\s*dev|next\.?js/.test(s)) return "frontend";
  if (/mobile|flutter|android|ios|kotlin|swift/.test(s)) return "mobile";
  if (/fullstack|full[- ]?stack/.test(s)) return "fullstack";

  // PERBAIKAN: Routing akurat untuk packaging tech vs worker
  if (/technician|technition|teknisi/i.test(s) && /packaging|pengemasan|pbk/i.test(s)) return "packaging_tech";
  if (/worker|operator/i.test(s) && /packaging|pengemasan|pbk/i.test(s)) return "packaging_worker";
  if (/packaging|pengemasan|\bPBK\b/i.test(s)) return "packaging_worker";

  if (/\bqa\b|quality\s*assurance|software\s*testing|qa\s*analyst|qa\s*engineer/i.test(s)) return "qa";
  if (/\bmarketing\b|digital\s*marketing|seo|sosmed|social\s*media|content\s*creator|copywriter/i.test(s)) return "marketing";
  if (/\bproduksi\b|staff\s*produksi/i.test(s)) return "produksi";
  if (/\brnd\b|\br\s*&\s*d\b|food\s*tech|teknologi\s*pangan/i.test(s)) return "rnd";
  if (/\bsupply\s*chain\b|logistik|inventory|gudang/i.test(s)) return "supplychain";
  if (/\bhr\b|human\s*resource|rekrutmen|recruitment/i.test(s)) return "hr";
  return "general";
}

function inferRoleDomainFromCriteriaId(id: string): RoleDomain {
  const s = id.toLowerCase();
  if (/frontend|front-end|front_end/.test(s)) return "frontend";
  if (/backend|back-end|back_end/.test(s)) return "backend";
  if (/game|unity|gamedev/.test(s)) return "game";
  if (/mobile|flutter|android|ios/.test(s)) return "mobile";

  // PERBAIKAN: Routing akurat
  if (/packaging/i.test(s) && /tech/i.test(s)) return "packaging_tech";
  if (/packaging/i.test(s) && /worker/i.test(s)) return "packaging_worker";
  if (/packaging|pbk|pengemasan/.test(s)) return "packaging_worker";

  if (/qa|quality.assurance|testing/.test(s)) return "qa";
  if (/marketing|digital.marketing|content/.test(s)) return "marketing";
  if (/produksi|production/.test(s)) return "produksi";
  if (/rnd|food|research/.test(s)) return "rnd";
  if (/supply|chain|logistik/.test(s)) return "supplychain";
  if (/hr|recruitment|human.resource/.test(s)) return "hr";
  return "general";
}

/** Domain JD: prioritas judul kriteria (bukan fullText — sering menyebut stack lain) */
function inferRoleDomainForCriteria(criteria: ActiveCriteriaMeta): RoleDomain {
  const fromTitle = inferRoleDomainFromQuery(criteria.title);
  if (fromTitle !== "general") return fromTitle;
  if (criteria.id) {
    const fromId = inferRoleDomainFromCriteriaId(criteria.id);
    if (fromId !== "general") return fromId;
  }
  return inferRoleDomainFromQuery(criteria.fullText);
}

/** Metadata kriteria/JD yang dipilih HR di panel kiri */
export type ActiveCriteriaMeta = {
  id: string;
  title: string;
  department: string;
  fullText: string;
};

function queryMentionsExplicitDifferentRole(query: string, criteriaTitle: string): boolean {
  const qDomain = inferRoleDomainFromQuery(query);
  if (qDomain === "general") return false;
  const cDomain = inferRoleDomainFromQuery(criteriaTitle);
  if (cDomain === "general") return false;
  return qDomain !== cDomain;
}

function extractJdFullTextFromContext(context: string): string {
  const fullDoc = context.match(
    /\[JOB DESCRIPTION - [^\]]+\] Dokumen lengkap\]\s*([\s\S]*?)(?=\n\n---|\n\[\[\[CV_ONLY|\n=== AKHIR KRITERIA|$)/
  );
  if (fullDoc?.[1]?.trim()) return fullDoc[1].trim();

  const activeBlock = context.match(
    /=== KRITERIA LOWONGAN AKTIF[\s\S]*?=== AKHIR KRITERIA AKTIF ===/
  );
  if (activeBlock) return activeBlock[0];

  const jdChunks: string[] = [];
  const re = /\[JOB DESCRIPTION - [^\]]+\][^\n]*\n([\s\S]*?)(?=\n\n\[JOB DESCRIPTION|\n\[\[\[CV_ONLY|\n===|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(context)) !== null) {
    if (m[1]?.trim()) jdChunks.push(m[1].trim());
  }
  return jdChunks.join("\n\n");
}

/** Ambil kriteria aktif dari konteks RAG (fallback jika metadata API tidak ada) */
export function extractActiveCriteriaFromContext(context: string): ActiveCriteriaMeta | null {
  const activeLine = context.match(
    /Kriteria aktif:\s*\*\*([^*]+)\*\*\s*\(([^,]+),\s*([^)]+)\)/i
  );
  if (activeLine) {
    return {
      id: activeLine[3].trim(),
      title: activeLine[1].trim(),
      department: activeLine[2].trim(),
      fullText: extractJdFullTextFromContext(context) || activeLine[1].trim(),
    };
  }

  const selectedLine = context.match(/Kriteria dipilih:\s*([^\n(]+)\s*\(([^)]+)\)/i);
  if (selectedLine) {
    const title = selectedLine[1].trim();
    return {
      id: "",
      title,
      department: selectedLine[2].trim(),
      fullText: extractJdFullTextFromContext(context) || title,
    };
  }

  const jdHeader = context.match(/\[JOB DESCRIPTION - ([^\]]+)\]/);
  if (jdHeader) {
    const fileLabel = jdHeader[1];
    const title = fileLabel.replace(/\s*\(PT Sosro[^)]*\)\s*$/i, "").trim();
    return {
      id: "",
      title,
      department: "",
      fullText: extractJdFullTextFromContext(context) || title,
    };
  }

  return null;
}

export function resolveActiveCriteria(
  activeCriteria?: ActiveCriteriaMeta | null,
  context?: string
): ActiveCriteriaMeta | null {
  if (activeCriteria?.title && activeCriteria.fullText) return activeCriteria;
  if (activeCriteria?.title) {
    return {
      ...activeCriteria,
      fullText: activeCriteria.fullText || activeCriteria.title,
    };
  }
  if (context) return extractActiveCriteriaFromContext(context);
  return null;
}

/** Tentukan role screening: prioritas kriteria panel > kata kunci di pertanyaan */
export function resolveScreeningRole(
  query: string,
  activeCriteria?: ActiveCriteriaMeta | null,
  context?: string
): { domain: RoleDomain; roleLabel: string; jdText: string; criteria: ActiveCriteriaMeta | null } {
  const criteria = resolveActiveCriteria(activeCriteria, context);
  if (criteria && !queryMentionsExplicitDifferentRole(query, criteria.title)) {
    const domain = inferRoleDomainForCriteria(criteria);
    return {
      domain,
      roleLabel: criteria.title,
      jdText: criteria.fullText,
      criteria,
    };
  }
  const domain = inferRoleDomainFromQuery(query);
  return { domain, roleLabel: roleDomainLabel(domain), jdText: "", criteria: null };
}

function signalsFromJdText(jdText: string, domain: RoleDomain): RoleSignal[] {
  const domainBase = signalsForDomain(domain, "");
  const allKnown =
    domain === "general"
      ? [
        ...FRONTEND_SIGNALS, ...BACKEND_SIGNALS, ...GAME_SIGNALS, ...MOBILE_SIGNALS,
        ...PACKAGING_TECH_SIGNALS, ...PACKAGING_WORKER_SIGNALS, ...QA_SIGNALS, ...MARKETING_SIGNALS,
        ...PRODUKSI_SIGNALS, ...RND_SIGNALS, ...SUPPLY_CHAIN_SIGNALS, ...HR_SIGNALS
      ]
      : domainBase;
  const signals: RoleSignal[] = [];
  const seen = new Set<string>();

  for (const sig of allKnown) {
    if (sig.re.test(jdText) && !seen.has(sig.label)) {
      signals.push(sig);
      seen.add(sig.label);
    }
  }

  return signals;
}

function mergeScoringSignals(domain: RoleDomain, jdText: string, query: string): RoleSignal[] {
  const base = signalsForDomain(domain, query);
  if (!jdText) return base.length > 0 ? base : signalsForDomain("general", query);

  const jdSignals = signalsFromJdText(jdText, domain);
  const seen = new Set(base.map((s) => s.label));
  const merged = [...base];
  for (const s of jdSignals) {
    if (!seen.has(s.label)) {
      merged.push(s);
      seen.add(s.label);
    }
  }
  return merged.length > 0 ? merged : signalsForDomain("general", query);
}

const OFF_DOMAIN_EVIDENCE: Partial<Record<RoleDomain, RegExp>> = {
  backend: /\b(unity|unreal|godot|game\s*2d|gameplay|top[- ]?down|game\s*dev|cocos|game\s*edukasi)\b/i,
  frontend: /\b(unity|unreal|godot|game\s*2d|spring\s*boot|django|fastapi|laravel|express\.?js|postgresql|mysql)\b/i,
  game: /\b(spring\s*boot|django|fastapi|erp|manufacturing|seo|sem|fmcg)\b/i,
  mobile: /\b(spring\s*boot|django|fastapi|unity|unreal|godot)\b/i,
  packaging_tech: /\b(unity|react|vue|spring\s*boot|node\.?js|flutter|game\s*dev)\b/i,
  packaging_worker: /\b(unity|react|vue|spring\s*boot|node\.?js|flutter|game\s*dev)\b/i,
  qa: /\b(unity|unreal|godot|game\s*2d|gameplay)\b/i,
  marketing: /\b(unity|unreal|godot|spring\s*boot|django|fastapi|flutter|node\.?js)\b/i,
  produksi: /\b(unity|react|spring|django|marketing|seo|hr|recruitment)\b/i,
  rnd: /\b(unity|react|spring|django|marketing|seo|hr|recruitment)\b/i,
  supplychain: /\b(unity|react|spring|django|gameplay|marketing|seo)\b/i,
  hr: /\b(unity|react|spring|django|gameplay|produksi\s*mesin)\b/i,
};

function hasStrongFrontendEvidence(cvBody: string): boolean {
  return FRONTEND_SIGNALS.some((s) => s.re.test(cvBody));
}

function hasStrongMobileEvidence(cvBody: string): boolean {
  return MOBILE_SIGNALS.some((s) => s.re.test(cvBody));
}

function hasStrongGameEvidence(cvBody: string): boolean {
  return /\b(game|unity|unreal|godot|cocos|gameplay|c#|csharp|2d|3d)\b/i.test(cvBody);
}

function hasStrongPackagingEvidence(cvBody: string): boolean {
  const specificTerms = [
    /\bpackaging\b|\bpengemasan\b|\bPBK\b/i,
    /mesin\s*pengemas/i,
    /operator\s*mesin/i,
    /produksi\s*pengemasan/i,
    /lini\s*pengemasan/i,
    /shift\s*kerja\s*produksi/i,
    /FMCG|pabrik\s*minuman|makanan\s*dan\s*minuman/i,
    /\bHSSE\b/i,
  ];
  return specificTerms.some((re) => re.test(cvBody));
}

/** Batasi skor jika CV dominan stack/domain lain dari JD aktif */
function applyDomainScoreCaps(score: number, cvBody: string, domain: RoleDomain): number {
  let s = score;

  if (domain === "backend") {
    const hasBackend = hasStrongBackendEvidence(cvBody);
    const gameHeavy = hasStrongGameEvidence(cvBody);
    // PELONGGARAN: Jangan hukum developer multi-bahasa
    if (!hasBackend) s = Math.min(s, gameHeavy ? 45 : 70);
    else if (gameHeavy && !/\b(backend|spring|node|django|fastapi|python|java|sql|api)\b/i.test(cvBody)) {
      s = Math.min(s, 80);
    }
  }

  if (domain === "frontend") {
    const hasFe = hasStrongFrontendEvidence(cvBody);
    const backendHeavy = hasStrongBackendEvidence(cvBody) && !hasFe;
    const gameHeavy = hasStrongGameEvidence(cvBody) && !hasFe;
    if (!hasFe) s = Math.min(s, 50);
    else if (backendHeavy) s = Math.min(s, 65);
    else if (gameHeavy) s = Math.min(s, 55);
  }

  if (domain === "game") {
    const hasGame = hasStrongGameEvidence(cvBody);
    if (!hasGame) s = Math.min(s, 40);
    const backendOnly = hasStrongBackendEvidence(cvBody) && !hasGame;
    if (backendOnly) s = Math.min(s, 50);
    const feOnly = hasStrongFrontendEvidence(cvBody) && !hasGame && !/\bunity|game\b/i.test(cvBody);
    if (feOnly) s = Math.min(s, 45);
  }

  if (domain === "mobile") {
    const hasMobile = hasStrongMobileEvidence(cvBody);
    if (!hasMobile) s = Math.min(s, 40);
    else if (hasStrongBackendEvidence(cvBody) && !/\bflutter|android|ios|kotlin|swift|mobile\b/i.test(cvBody)) {
      s = Math.min(s, 55);
    }
  }

  if (domain === "packaging_tech" || domain === "packaging_worker") {
    const hasPack = hasStrongPackagingEvidence(cvBody);
    if (!hasPack) s = Math.min(s, 25);
    if (hasStrongGameEvidence(cvBody) && !hasPack) s = Math.min(s, 15);
    if (hasStrongBackendEvidence(cvBody) && !hasPack) s = Math.min(s, 15);
    if (hasStrongFrontendEvidence(cvBody) && !hasPack) s = Math.min(s, 15);
  }

  if (domain === "qa") {
    const hasQa = /\b(qa|quality\s*assurance|testing|test\s*case|selenium|appium|jira|bug\s*report|regression)\b/i.test(cvBody);
    if (!hasQa) s = Math.min(s, 30);
    if (hasStrongBackendEvidence(cvBody) && !hasQa) s = Math.min(s, 35);
    if (hasStrongGameEvidence(cvBody) && !hasQa) s = Math.min(s, 25);
  }

  if (domain === "marketing") {
    const hasMarketing = /\b(marketing|seo|sem|ads|sosmed|social\s*media|copywriting|content|kampanye|campaign|roas|fmcg)\b/i.test(cvBody);
    if (!hasMarketing) s = Math.min(s, 12);
    if (hasStrongBackendEvidence(cvBody) && !hasMarketing) s = Math.min(s, 10);
    if (hasStrongGameEvidence(cvBody) && !hasMarketing) s = Math.min(s, 10);
  }

  if (domain === "produksi") {
    const hasProd = /\b(produksi|manufaktur|fmcg|gmp|k3|lini|mesin)\b/i.test(cvBody);
    if (!hasProd) s = Math.min(s, 12);
  }

  if (domain === "rnd") {
    const hasRnd = /\b(r&d|rnd|food\s*tech|teknologi\s*pangan|formulasi|laboratorium|lab)\b/i.test(cvBody);
    if (!hasRnd) s = Math.min(s, 12);
  }

  if (domain === "supplychain") {
    const hasSc = /\b(supply\s*chain|logistik|inventory|gudang|mrp|sap)\b/i.test(cvBody);
    if (!hasSc) s = Math.min(s, 12);
  }

  if (domain === "hr") {
    const hasHr = /\b(hr|human\s*resources|rekrutmen|recruitment|psikologi|interview)\b/i.test(cvBody);
    if (!hasHr) s = Math.min(s, 12);
  }

  return s;
}

function hasStrongBackendEvidence(cvBody: string): boolean {
  // PERBAIKAN: Masukkan Python, Java, SQL, API ke dalam pendeteksi backend
  return /\b(backend|spring\s*boot|node\.?js|fastapi|django|flask|laravel|express\.?js|rest\s*api|restful|postgresql|mysql|python|java|sql|api)\b/i.test(
    cvBody
  );
}

function shouldSkipScoringSignal(sig: RoleSignal, cvBody: string, domain: RoleDomain): boolean {
  if (domain === "backend") {
    if (sig.label === ".NET/C#" && /\bunity\b/i.test(cvBody) && !hasStrongBackendEvidence(cvBody)) {
      return true;
    }
  }
  if (domain === "frontend" && BACKEND_SIGNALS.some((b) => b.label === sig.label)) return true;
  if (domain === "backend" && FRONTEND_SIGNALS.some((f) => f.label === sig.label)) return true;
  if (domain === "game" && BACKEND_SIGNALS.some((b) => b.label === sig.label) && !GAME_SIGNALS.some((g) => g.label === sig.label)) {
    return true;
  }
  if (domain === "mobile" && (GAME_SIGNALS.some((g) => g.label === sig.label) || BACKEND_SIGNALS.some((b) => b.label === sig.label))) {
    return true;
  }
  return false;
}

function isOffDomainSkillToken(token: string, domain: RoleDomain): boolean {
  const t = token.toLowerCase();
  if (domain === "backend" && /\b(unity|unreal|godot|game|gameplay|flutter|mobile|marketing|seo)\b/i.test(t)) {
    return true;
  }
  if (domain === "frontend" && /\b(unity|unreal|godot|spring\s*boot|marketing)\b/i.test(t)) {
    return true;
  }
  if (domain === "game" && /\b(spring\s*boot|django|fastapi|erp|marketing)\b/i.test(t) && !/\b(game|unity)\b/i.test(t)) {
    return true;
  }
  return false;
}

function bulletMatchesActiveDomain(text: string, domain: RoleDomain): boolean {
  const off = OFF_DOMAIN_EVIDENCE[domain];
  if (off?.test(text)) {
    if (domain === "backend") {
      return /\b(spring|node|fastapi|django|rest\s*api|backend|postgresql|mysql|java|python|sql|api)\b/i.test(text);
    }
    if (domain === "game") {
      return /\b(unity|game|unreal|godot|gameplay|2d|3d|c#|csharp|top[- ]?down)\b/i.test(text);
    }
    if (domain === "marketing") {
      return /\b(marketing|seo|sem|ads|sosmed|social\s*media|copywriting|content|campaign|roas|fmcg)\b/i.test(text);
    }
    if (domain === "produksi") {
      return /\b(produksi|manufaktur|fmcg|gmp|k3|sop|shift)\b/i.test(text);
    }
    if (domain === "rnd") {
      return /\b(r&d|rnd|food|pangan|kimia|biologi|formulasi|sensorik|lab|haccp)\b/i.test(text);
    }
    if (domain === "supplychain") {
      return /\b(supply|chain|logistik|inventory|gudang|mrp|erp|sap|oracle)\b/i.test(text);
    }
    if (domain === "hr") {
      return /\b(hr|rekrutmen|recruitment|sourcing|interview|psikologi|onboarding)\b/i.test(text);
    }
    return false;
  }
  return signalHitInText(text, domain);
}

function roleDomainLabel(domain: RoleDomain): string {
  const labels: Record<RoleDomain, string> = {
    backend: "backend development",
    frontend: "frontend development",
    mobile: "mobile development",
    game: "game development",
    fullstack: "full-stack development",
    packaging_tech: "Packaging Technician",
    packaging_worker: "Packaging Worker",
    qa: "QA / Quality Assurance",
    marketing: "Digital Marketing",
    produksi: "Staff Produksi / Manufaktur",
    rnd: "R&D / Food Technologist",
    supplychain: "Supply Chain & Logistik",
    hr: "Human Resources / Rekrutmen",
    general: "posisi yang ditanya HR",
  };
  return labels[domain];
}

function signalsForDomain(domain: RoleDomain, query: string): RoleSignal[] {
  switch (domain) {
    case "game": return [...GAME_SIGNALS, ...MOBILE_SIGNALS];
    case "backend": return BACKEND_SIGNALS;
    case "frontend": return FRONTEND_SIGNALS;
    case "mobile": return MOBILE_SIGNALS;
    case "fullstack": return [...BACKEND_SIGNALS, ...FRONTEND_SIGNALS];
    case "packaging_tech": return PACKAGING_TECH_SIGNALS;
    case "packaging_worker": return PACKAGING_WORKER_SIGNALS;
    case "qa": return QA_SIGNALS;
    case "marketing": return MARKETING_SIGNALS;
    case "produksi": return PRODUKSI_SIGNALS;
    case "rnd": return RND_SIGNALS;
    case "supplychain": return SUPPLY_CHAIN_SIGNALS;
    case "hr": return HR_SIGNALS;
    case "general": {
      const patterns = queryKeywordsAsPatterns(query);
      if (patterns.length === 0) return [];
      return patterns.map((re) => ({ re, w: 14, label: re.source }));
    }
  }
}

function queryKeywordsAsPatterns(query: string): RegExp[] {
  const patterns: RegExp[] = [];
  const s = query.toLowerCase();
  for (const w of s.split(/[^a-zA-Z0-9\u00C0-\u024F+#.]+/)) {
    if (w.length < 4 || QUERY_KW_STOP.has(w)) continue;
    patterns.push(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  return patterns;
}

function collectQuotesForSignals(text: string, signals: RoleSignal[], max = 3): string[] {
  void signals;
  return extractJdEvidenceBullets(text, "", "general").slice(0, max);
}

/** Bukti singkat terstruktur: skill + pengalaman/proyek sesuai JD aktif (bukan seluruh CV) */
function extractJdEvidenceBullets(
  cvBody: string,
  roleLabel: string,
  domain: RoleDomain
): string[] {
  const body = sanitizeCvSegmentText(cvBody);
  const bullets: string[] = [];
  const seen = new Set<string>();
  const signals = signalsForDomain(domain, roleLabel);

  const signalHit = (text: string) => signals.some((s) => s.re.test(text));

  const add = (raw: string, kind?: "skill" | "pengalaman" | "proyek") => {
    let t = normalizeEvidenceBullet(raw);
    if (!t || t.length < 4 || isEvidenceFluff(t)) return;
    const cleanContent = t.replace(/^(?:skill|pengalaman|proyek):\s*/i, "").trim();
    if (isExperienceHeaderLine(cleanContent)) return;
    if (!bulletMatchesActiveDomain(t, domain)) return;

    if (kind === "skill") {
      const inner = t.replace(/^skill:\s*/i, "").trim();
      t = /^skill:/i.test(t) ? t : `Skill: ${inner}`;
    } else if (kind === "pengalaman") {
      const inner = t.replace(/^pengalaman:\s*/i, "").trim();
      const lc = inner.charAt(0).toLowerCase() + inner.slice(1);
      t = /^pengalaman:/i.test(t) ? t : `Pengalaman: ${lc}`;
    } else if (kind === "proyek") {
      const inner = t.replace(/^proyek:\s*/i, "").trim();
      const lc = inner.charAt(0).toLowerCase() + inner.slice(1);
      t = /^proyek:/i.test(t) ? t : `Proyek: ${lc}`;
    }

    if (isIncompleteFragment(t.replace(/^(?:skill|pengalaman|proyek):\s*/i, ""))) return;

    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    bullets.push(t);
  };

  const skillBlock = extractCvSection(
    body,
    /^(?:keterampilan|keahlian|skills?|technical\s*skills?)\b/i
  );
  if (skillBlock) {
    const tokens = parseSkillTokens(skillBlock)
      .filter((tok) => signalHit(tok) && !isOffDomainSkillToken(tok, domain));
    if (tokens.length > 0) add(tokens.slice(0, 6).join(", "), "skill");
  }

  for (const line of body.split(/\n+/)) {
    const skillInline = line.match(/^(?:keterampilan|keahlian|skills?)\s*[:：]\s*(.+)$/i);
    if (skillInline) {
      const tokens = parseSkillTokens(skillInline[1])
        .filter((tok) => signalHit(tok) && !isOffDomainSkillToken(tok, domain));
      if (tokens.length) add(tokens.slice(0, 5).join(", "), "skill");
    }
  }

  for (const headerRe of [
    /^(?:pengalaman|experience|work\s*experience)\b/i,
    /^(?:proyek|projects?|portofolio)\b/i,
  ]) {
    const block = extractCvSection(body, headerRe);
    if (!block) continue;
    const isProyek = /proyek|project|portofolio/i.test(headerRe.source);

    const paragraphs = joinCvLinesToParagraphs(block);
    for (const p of paragraphs) {
      for (const line of splitIntoSentences(p)) {
        if (line.length >= 8 && !isLowValueRawCvLine(line) && !isEvidenceFluff(line)) {
          if (!signalHit(line)) continue;
          const compact = compactExperienceBullet(line, domain);
          if (compact) add(compact, isProyek ? "proyek" : "pengalaman");
          if (bullets.length >= 5) break;
        }
      }
      if (bullets.length >= 5) break;
    }
  }

  const fullNorm = body.replace(/\s+/g, " ");
  const verbRe =
    /(?:membangun|mengembangkan|membuat|mengerjakan|develop(?:ed|ing)?|merencanakan|menjalankan|mengelola|melakukan|mengoperasikan|memastikan|menyusun|mematuhi|menerapkan)\s+[^.!?\n]{5,150}/gi;
  let vm: RegExpExecArray | null;
  while ((vm = verbRe.exec(fullNorm)) !== null && bullets.length < 5) {
    const phrase = vm[0].trim();
    if (!signalHit(phrase) || isEvidenceFluff(phrase)) continue;
    const compact = compactExperienceBullet(phrase, domain);
    if (!compact) continue;
    const kind = /game|unity|aplikasi|mobile|chatbot|website|api|campaign|kampanye|iklan/i.test(phrase)
      ? "proyek"
      : "pengalaman";
    add(compact, kind);
  }

  addDomainEvidencePatterns(body, domain, add);

  if (bullets.length === 0) {
    const labels = Array.from(
      new Set(
        signals
          .filter((s) => s.re.test(body) && !shouldSkipScoringSignal(s, body, domain))
          .map((s) => s.label)
      )
    ).slice(0, 5);
    if (labels.length) add(labels.join(", "), "skill");
  }

  return prioritizeEvidenceBullets(bullets, domain, roleLabel).slice(0, 4);
}

function isEvidenceFluff(text: string): boolean {
  const t = text.toLowerCase();
  if (/laki[- ]?laki|perempuan|jenis kelamin|berkontri\b/.test(t)) return true;
  if (/^(saya|aku)\s+(antusias|ingin|senang|berkomitmen)/.test(t) && !/\b(unity|game|flutter|react|java|node|api)\b/.test(t))
    return true;
  if (/terus belajar|berkembang\s+agar|dapat berkontribusi/.test(t) && !/\b(unity|game|flutter|react|java)\b/.test(t))
    return true;
  return false;
}

function extractCvSection(body: string, headerRe: RegExp): string {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const parts: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (headerRe.test(line)) {
      capturing = true;
      const rest = line.replace(headerRe, "").replace(/^[:：\s]+/, "").trim();
      if (rest.length >= 3) parts.push(rest);
      continue;
    }
    if (capturing) {
      if (
        /^(?:keterampilan|keahlian|skills?|pengalaman|experience|pendidikan|education|proyek|projects?|ringkasan|profil)\b/i.test(
          line
        ) &&
        !headerRe.test(line)
      ) {
        break;
      }
      parts.push(line);
    }
  }
  return parts.join("\n");
}

function parseSkillTokens(text: string): string[] {
  return text
    .split(/[,;•|–—\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 36 && !isEvidenceFluff(s) && !looksLikePersonName(s));
}

function splitEvidenceLines(block: string): string[] {
  return block
    .split(/\n+/)
    .flatMap((line) => line.split(/\s*[•|]\s*/))
    .map((l) => l.trim())
    .filter((l) => l.length >= 8 && l.length <= 100 && !isLowValueRawCvLine(l) && !isEvidenceFluff(l));
}

function cleanPdfArtifacts(text: string): string {
  return text
    .replace(/\(cid:\d+\)/gi, " ")
    .replace(/[\u0000-\u0008\u000b\f\u000e-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function prepareEvidenceForDisplay(text: string): string {
  let t = cleanPdfArtifacts(text);
  t = collapseRepeatedPhrases(t);
  t = t.replace(/^\[(?:CV|TABLE|Section|Paragraph)[^\]]*\]\s*/i, "").replace(/^[-•*]\s*/, "").trim();
  // Bersihkan prefiks kategori/industri yang terikut di awal teks (misal: "Minuman. ", "Makanan. ", "FMCG. ")
  t = t.replace(/^(?:minuman|makanan|makanan\s+dan\s+minuman|fmcg|pengalaman\s+kerja|riwayat\s+kerja)\s*[:：.]\s*/i, "");
  if (!t || isEvidenceFluff(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function normalizeEvidenceBullet(text: string): string {
  let t = prepareEvidenceForDisplay(text);
  if (!t) return "";
  return t;
}

function compactExperienceBullet(line: string, domain: RoleDomain): string {
  const t = stripSectionHeaderPrefix(line).trim();
  if (!t || isEvidenceFluff(t)) return "";

  if (signalHitInText(t, domain) && t.length <= 240 && !isIncompleteFragment(t)) {
    return normalizeEvidenceBullet(t);
  }

  const gamePhrase = t.match(
    /(?:membangun|mengembangkan|membuat)\s+(?:game|aplikasi|chatbot|website|sistem)?\s*[^.!?]{0,95}(?:unity|2\s*d|2d|top[- ]?down|mobile|flutter)[^.!?]*/i
  );
  if (gamePhrase) {
    const phrase = gamePhrase[0].trim();
    if (domain === "game" || domain === "mobile") {
      if (!isIncompleteFragment(phrase)) return normalizeEvidenceBullet(phrase);
    }
    return "";
  }

  const verbPhrase = t.match(
    /(?:membangun|mengembangkan|membuat|mengerjakan|merencanakan|menjalankan|develop\w*|mengoperasikan|memastikan|menyusun|mematuhi|menerapkan)\s+[^.!?]{8,140}/i
  );
  if (verbPhrase) {
    const phrase = verbPhrase[0].trim();
    if (!isIncompleteFragment(phrase)) return normalizeEvidenceBullet(phrase);
  }

  if (t.length <= 120 && signalHitInText(t, domain) && !isIncompleteFragment(t)) {
    return normalizeEvidenceBullet(t);
  }
  return "";
}

function signalHitInText(text: string, domain: RoleDomain): boolean {
  const sigs =
    domain === "game" ? [...GAME_SIGNALS, ...MOBILE_SIGNALS] :
      domain === "backend" ? BACKEND_SIGNALS :
        domain === "frontend" ? FRONTEND_SIGNALS :
          domain === "packaging_tech" ? PACKAGING_TECH_SIGNALS :
            domain === "packaging_worker" ? PACKAGING_WORKER_SIGNALS :
              domain === "qa" ? QA_SIGNALS :
                domain === "marketing" ? MARKETING_SIGNALS :
                  domain === "produksi" ? PRODUKSI_SIGNALS :
                    domain === "rnd" ? RND_SIGNALS :
                      domain === "supplychain" ? SUPPLY_CHAIN_SIGNALS :
                        domain === "hr" ? HR_SIGNALS :
                          [...GAME_SIGNALS, ...BACKEND_SIGNALS, ...FRONTEND_SIGNALS, ...MOBILE_SIGNALS, ...PACKAGING_TECH_SIGNALS, ...PACKAGING_WORKER_SIGNALS, ...QA_SIGNALS, ...MARKETING_SIGNALS, ...PRODUKSI_SIGNALS, ...RND_SIGNALS, ...SUPPLY_CHAIN_SIGNALS, ...HR_SIGNALS];
  return sigs.some((s) => s.re.test(text));
}

function addDomainEvidencePatterns(
  body: string,
  domain: RoleDomain,
  add: (raw: string, kind?: "skill" | "pengalaman" | "proyek") => void
): void {
  const effective = domain === "general" ? inferRoleDomainFromQuery(body.slice(0, 800)) : domain;

  if (effective === "game") {
    if (/\bunity\b/i.test(body)) add("Unity", "skill");
    if (/c\s*#|\bcsharp\b/i.test(body)) add("C#", "skill");
    if (/game\s*2\s*d|2d\s*game|top[- ]?down/i.test(body)) add("Pernah membangun game 2D", "pengalaman");
    if (/game\s*edukasi|edukasi.*game/i.test(body)) add("Pengembangan game edukasi", "pengalaman");
    if (/\bflutter\b/i.test(body) && /\bmobile\b/i.test(body))
      add("Pengembangan aplikasi mobile", "pengalaman");
  }
  if (effective === "backend") {
    if (/\bspring\s*boot\b/i.test(body)) add("Spring Boot", "skill");
    if (/\bnode\.?js\b/i.test(body)) add("Node.js", "skill");
    if (/\brest\s*api\b/i.test(body)) add("REST API", "skill");
    if (/\bpython\b/i.test(body)) add("Python", "skill");
  }
  if (effective === "frontend") {
    if (/\breact\b/i.test(body)) add("React", "skill");
    if (/\bnext\.?js\b/i.test(body)) add("Next.js", "skill");
    if (/\btypescript\b/i.test(body)) add("TypeScript", "skill");
  }
  if (effective === "mobile") {
    if (/\bflutter\b/i.test(body)) add("Flutter", "skill");
    if (/\bandroid\b/i.test(body)) add("Android", "skill");
  }
  if (effective === "packaging_tech" || effective === "packaging_worker") {
    if (/\bHSSE\b/i.test(body)) add("HSSE", "skill");
    if (/quality\s*management\s*system|\bQMS\b/i.test(body)) add("Quality Management System", "skill");
    if (/jaminan\s*halal|sistem\s*halal/i.test(body)) add("Sistem Jaminan Halal", "skill");
    if (/mesin\s*pengemas|perawatan\s*mesin|perbaikan\s*mesin/i.test(body))
      add("Pengalaman perawatan/perbaikan mesin pengemasan", "pengalaman");
    if (/SGS\s*Core\s*Competence/i.test(body)) add("SGS Core Competence", "skill");
  }
  if (effective === "qa") {
    if (/\btesting\b|\btest\s*case\b/i.test(body)) add("Testing / Test Case", "skill");
    if (/\bautomation\b|\bselenium\b/i.test(body)) add("Automation Testing", "skill");
    if (/\bbug\b|\bjira\b/i.test(body)) add("Bug Tracking / Jira", "skill");
  }
  if (effective === "marketing") {
    if (/\b(meta\s*ads|facebook\s*ads|fb\s*ads)\b/i.test(body)) add("Meta/FB Ads", "skill");
    if (/\b(google\s*ads|seo|sem)\b/i.test(body)) add("Google Ads / SEO", "skill");
    if (/\bcopywriting\b/i.test(body)) add("Copywriting", "skill");
    if (/\bFMCG\b/i.test(body)) add("FMCG Industry", "pengalaman");
  }
  if (effective === "produksi") {
    if (/\b(SOP|GMP|K3)\b/i.test(body)) add("Memahami Standar K3/GMP/SOP", "skill");
    if (/\bFMCG\b/i.test(body)) add("Pengalaman di industri manufaktur/FMCG", "pengalaman");
    if (/\b(lini\s*produksi|mesin\s*produksi)\b/i.test(body)) add("Mengoperasikan Lini Produksi", "pengalaman");
    if (/\b(quality\s*check|pengecekan\s*kualitas)\b/i.test(body)) add("Quality Control / Check", "skill");
  }
  if (effective === "rnd") {
    if (/\bformulasi\b/i.test(body)) add("Formulasi Produk", "skill");
    if (/\blaboratorium\b|\blab\b/i.test(body)) add("Pengalaman Lab & Alat Analisis", "pengalaman");
  }
  if (effective === "supplychain") {
    if (/\berp\b|\bsap\b/i.test(body)) add("Sistem ERP / SAP", "skill");
    if (/\b(inventory|gudang|logistik)\b/i.test(body)) add("Pengelolaan inventory/logistik", "pengalaman");
  }
  if (effective === "hr") {
    if (/\brekrutmen\b|\bsourcing\b|\binterview\b/i.test(body)) add("Sourcing & Interview", "skill");
    if (/\bats\b/i.test(body)) add("Pengalaman menggunakan ATS", "skill");
  }
}

function prioritizeEvidenceBullets(
  bullets: string[],
  domain: RoleDomain,
  roleLabel: string
): string[] {
  const domainBoost =
    domain === "backend" ? /\b(spring|node|fastapi|django|rest\s*api|postgresql|mysql|backend|java|python|sql|api)\b/i :
      domain === "game" ? /\b(unity|game|unreal|godot|gameplay|2d|3d|c#|csharp|top[- ]?down)\b/i :
        domain === "frontend" ? /\b(react|vue|angular|next\.?js|typescript|frontend)\b/i :
          domain === "mobile" ? /\b(flutter|android|ios|kotlin|mobile)\b/i :
            domain === "packaging_tech" || domain === "packaging_worker" ? /\b(packaging|pengemasan|HSSE|halal|mesin|QMS|technician|PBK)\b/i :
              domain === "qa" ? /\b(qa|quality\s*assurance|testing|selenium|appium|test\s*case|bug\s*report)\b/i :
                domain === "marketing" ? /\b(marketing|seo|sem|ads|sosmed|social\s*media|copywriting|content|campaign|roas|fmcg)\b/i :
                  domain === "produksi" ? /\b(produksi|manufaktur|fmcg|gmp|k3|sop|shift|lini)\b/i :
                    domain === "rnd" ? /\b(r&d|rnd|food|pangan|kimia|biologi|formulasi|sensorik|lab|haccp)\b/i :
                      domain === "supplychain" ? /\b(supply|chain|logistik|inventory|gudang|mrp|erp|sap|oracle)\b/i :
                        domain === "hr" ? /\b(hr|rekrutmen|recruitment|sourcing|interview|psikologi|onboarding)\b/i :
                          /\b(unity|game|react|spring|node|api|packaging|pengemasan|qa|testing|marketing|produksi|hr|supply)\b/i;

  const domainPenalty =
    domain === "backend" ? /\b(unity|game\s*2d|godot|unreal|gameplay|top[- ]?down)\b/i :
      domain === "game" ? /\b(spring\s*boot|django|fastapi|erp)\b/i : null;

  const score = (b: string) => {
    let s = 0;
    if (/^skill:/i.test(b)) s += 6;
    if (/^pengalaman:|^proyek:/i.test(b)) s += 5;
    if (domainBoost.test(b)) s += 5;
    if (domainPenalty?.test(b)) s -= 15;
    if (b.length <= 55) s += 2;
    if (b.length > 75) s -= 3;
    if (isEvidenceFluff(b)) s -= 20;
    if (roleLabel && new RegExp(roleLabel.split(/\s+/)[0], "i").test(b)) s += 1;
    return s;
  };
  const sorted = [...bullets].sort((a, b) => score(b) - score(a));
  const skills = sorted.filter((b) => /^skill:/i.test(b));
  const rest = sorted.filter((b) => !/^skill:/i.test(b));
  const out: string[] = [];
  if (skills[0]) out.push(skills[0]);
  for (const b of rest) {
    if (out.length >= 4) break;
    if (out.some((x) => quoteWordOverlap(x, b) > 0.65)) continue;
    out.push(b);
  }
  return out.length > 0 ? out : sorted.slice(0, 4);
}

function quoteQualityScore(text: string, signals: RoleSignal[]): number {
  let s = 0;
  for (const sig of signals) {
    if (sig.re.test(text)) s += sig.w;
  }
  if (/[.!?]$/.test(text.trim())) s += 10;
  if (/\b(mengembangkan|membangun|pengalaman|pengalaman kerja|proyek)\b/i.test(text)) s += 8;
  if (/\b(mengembangkan\s+game|game\s+menggunakan|game\s+edukasi|game\s*2d|gameplay)\b/i.test(text)) s += 12;
  if (isIncompleteFragment(text)) s -= 50;
  if (/^[A-Z][a-z]+\.\s+Saya\b/.test(text)) s -= 20;
  if (text.length < 35) s -= 6;
  if (text.length > 200) s -= 4;
  return s;
}

function findBestEvidenceSentence(cvBody: string, signals: RoleSignal[]): string | null {
  const paragraphs = joinCvLinesToParagraphs(sanitizeCvSegmentText(cvBody));
  const fullText = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  if (!fullText) return null;

  let best: { text: string; score: number } | null = null;
  for (const sent of splitIntoSentences(fullText)) {
    if (isLowValueEvidence(sent) || isIncompleteFragment(sent) || isMergedCvBlob(sent)) continue;
    const score = quoteQualityScore(sent, signals);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { text: sent, score };
  }
  return best?.text ?? null;
}

/** CV tanpa tanda baca yang digabung jadi satu blok — jangan jadikan kutipan */
function isMergedCvBlob(text: string): boolean {
  const headerWithColon =
    text.match(
      /(?:^|\n|\s)(keterampilan|keahlian|skills?|pengalaman|experience|pendidikan|education|proyek|projects?)\s*[:：]/gi
    ) ?? [];
  if (headerWithColon.length >= 2) return true;
  if (headerWithColon.length >= 1 && text.length > 160) return true;

  const sectionTitles =
    text.match(/\b(Keterampilan|Keahlian|Skills?|Pengalaman|Experience|Pendidikan|Proyek|Projects?)\b/g) ??
    [];
  if (sectionTitles.length >= 2) return true;

  return false;
}

function stripSectionHeaderPrefix(text: string): string {
  return text
    .replace(/^(?:keterampilan|keahlian|skills?|pengalaman|experience|proyek|projects?)\s*[:：]?\s*/i, "")
    .trim();
}

/** Fragmen kalimat terpotong (wrap PDF) — bukan kutipan yang layak */
function isIncompleteFragment(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/\b(menggunakan|membangun|membuat|dalam|dengan|dan|atau|serta|untuk|pada)\s*$/i.test(t)) return true;
  if (/^(website|pengembangan|membangun|membuat|pada|dan|serta)\b/i.test(t) && !/[.!?]$/.test(t)) return true;
  if (/^[a-z\u00C0-\u024F]/.test(t) && t.length < 90 && !/[.!?]$/.test(t)) return true;
  if (/^[A-Z][a-z]+\.\s+Saya\b/.test(t) && !/\b(mengembangkan|membangun|pengalaman|game)\b/i.test(t)) return true;
  // Tambahan: Jika diakhiri dengan kata sambung + satu kata benda/keterangan yang menggantung (seperti "dan pengalaman", "dengan latar", "selama hampir")
  if (/\b(dan|serta|dengan|atau|untuk|pada|dalam|sebagai|selama|yang)\s+[a-z\u00C0-\u024F]{2,15}\s*$/i.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

/** Baris atau fragmen skill/proyek yang mengandung sinyal JD */
function collectSkillEvidenceUnits(body: string, signals: RoleSignal[]): string[] {
  const units: string[] = [];
  const lines = body.split(/\n+/).map((l) => l.trim()).filter((l) => l.length >= 6);

  for (const line of lines) {
    if (isLowValueRawCvLine(line)) continue;
    if (looksLikePersonName(line) && line.split(/\s+/).length <= 4) continue;
    const pieces = line
      .split(/\s*[•|–—]\s*|\s*;\s*/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 8);
    if (pieces.length > 1) units.push(...pieces);
    else units.push(line);
  }

  for (const p of joinCvLinesToParagraphs(body)) {
    if (isMergedCvBlob(p) || (looksLikePersonName(p) && p.split(/\s+/).length <= 4)) continue;
    if (!units.includes(p)) units.push(p);
  }

  const scored = units
    .map((u) => {
      let score = 0;
      for (const sig of signals) {
        if (sig.re.test(u)) score += sig.w;
      }
      const lenPenalty = Math.floor(u.length / 90);
      return { text: u, score: score - lenPenalty };
    })
    .filter((x) => x.score > 0 && !isLowValueEvidence(x.text) && !isMergedCvBlob(x.text) && x.text.length <= 280)
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length);

  return scored.map((x) => x.text);
}

function collapseRepeatedPhrases(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return t;

  t = t.replace(/(.{12,100}?)\s+\1/gi, "$1");

  const words = t.split(" ");
  if (words.length >= 8) {
    const half = Math.floor(words.length / 2);
    const first = words.slice(0, half).join(" ");
    const second = words.slice(half).join(" ");
    if (first === second || second.startsWith(first.slice(0, Math.min(30, first.length)))) {
      t = first;
    }
  }
  return t.trim();
}

/** Gabungkan baris CV yang terpotong (wrap PDF) menjadi paragraf utuh */
function joinCvLinesToParagraphs(body: string): string[] {
  const lines = body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !isLowValueRawCvLine(l));

  if (lines.length === 0) return [];

  const paragraphs: string[] = [];
  let buf = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const startsNewSection =
      /^(?:skills?|keahlian|keterampilan|technical|pengalaman|experience|education|pendidikan|proyek|projects?|sertifikat|ringkasan|profil|summary|tanggung\s+jawab)\b[:：]?/i.test(
        line
      );

    if (startsNewSection) {
      paragraphs.push(buf);
      buf = line;
      continue;
    }

    const endsSentence = /[.!?…]\s*$/.test(buf);
    if (!endsSentence) {
      buf = `${buf} ${line}`;
    } else if (/^[a-z\u00C0-\u024F]/.test(line)) {
      buf = `${buf} ${line}`;
    } else {
      paragraphs.push(buf);
      buf = line;
    }
  }
  paragraphs.push(buf);
  return paragraphs;
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const raw = normalized.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [normalized];
  return raw.map((s) => s.trim()).filter((s) => s.length >= 12);
}

function normalizeQuoteKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").slice(0, 100);
}

function isDuplicateQuote(text: string, seen: Set<string>): boolean {
  const key = normalizeQuoteKey(text);
  if (seen.has(key)) return true;
  for (const prev of Array.from(seen)) {
    if (prev.includes(key) || key.includes(prev)) return true;
  }
  return false;
}

function trimQuoteSentence(sentence: string, maxLen = 300): string {
  let t = sentence.replace(/\s+/g, " ").trim();
  t = t.replace(/^\[(?:CV|TABLE|Section|Paragraph)[^\]]*\]\s*/i, "");
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastPunct = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("?"),
    cut.lastIndexOf(";")
  );
  if (lastPunct > 80) return cut.slice(0, lastPunct + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut.trimEnd()) + "…";
}

function extractExcerptAroundMatch(text: string, signals: RoleSignal[]): string | null {
  const normalized = text.replace(/\s+/g, " ");
  for (const sig of signals) {
    const m = sig.re.exec(normalized);
    if (!m || m.index === undefined) continue;

    const before = normalized.slice(0, m.index);
    const sentStart = Math.max(
      before.lastIndexOf(". ") + 2,
      before.lastIndexOf("! ") + 2,
      before.lastIndexOf("? ") + 2,
      Math.max(0, m.index - 100)
    );
    const after = normalized.slice(m.index);
    const sentEndRel = after.search(/[.!?…](?:\s|$)/);
    const sentEnd =
      sentEndRel >= 0 ? m.index + sentEndRel + 1 : Math.min(normalized.length, m.index + 220);

    const excerpt = normalized.slice(sentStart, sentEnd).trim();
    if (excerpt.length >= 20) return trimQuoteSentence(excerpt);
  }
  return null;
}

const QUOTE_LINE_SKIP_RE =
  /^(>>>|INSTRUKSI|IDENTITAS|Cuplikan|lanjutan CV|bagian penting|\[\[\[|Selesai daftar|Cari nama|Dilarang|WAJIB disalin|INSTRUKSI UNTUK MODEL)/i;

/** Filter baris mentah CV (boleh batasi panjang ekstrem) */
function isLowValueRawCvLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 6) return true;
  if (QUOTE_LINE_SKIP_RE.test(t)) return true;
  if (/INSTRUKSI\s+UNTUK\s+MODEL/i.test(t)) return true;
  if (t.length > 600) return true;
  if (
    /^(politeknik|universitas|institut|sekolah|smk|sma|sdn|smp|akademi)\b/i.test(t) &&
    !/\b(java|python|node|react|spring|flutter|unity|api|sql|docker|git|game|mobile|c#)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

function isExperienceHeaderLine(text: string): boolean {
  const t = text.trim();

  // 1. Deteksi kata kunci perusahaan atau pola instansi umum
  const hasCompany = /\b(pt\b|cv\b|\btbk\b|\bcorp\b|\bltd\b|\binc\b|\bco\b|\bgroup\b|\bpt\.\s|cv\.\s|indonesia\b|beverage|manufacturing|tbk\.)/i.test(t);

  // 2. Deteksi rentang tahun / tanggal (misal: 2024-2026, 2024 – Sekarang, dsb)
  const hasDateRange = /\b(20\d{2}|19\d{2})\s*[-–—/]\s*(20\d{2}|19\d{2}|sekarang|present|current)\b/i.test(t) ||
    /\b(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|january|february|march|april|may|june|july|august|september|october|november|december)\b.*\b(20\d{2}|19\d{2})\b/i.test(t);

  // 3. Deteksi pemisah format header (misal: @, at, | , -, –)
  const hasSeparators = /[\s]+[@|–—\-\/]+[\s]+/i.test(t) || /\s+at\s+/i.test(t);

  // Jika memiliki indikator perusahaan atau kombinasi rentang tanggal dan pemisah
  if (hasCompany || hasDateRange || (hasSeparators && t.length < 120)) {
    return true;
  }

  // Tambahan deteksi jika baris sangat pendek dan diakhiri tahun
  if (/\b(20\d{2}|19\d{2})\b/.test(t) && t.length < 80) {
    return true;
  }

  return false;
}

/** Filter kutipan bukti — tanpa batas panjang agresif (kalimat panjang tetap valid) */
function isLowValueEvidence(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 10) return true;
  if (QUOTE_LINE_SKIP_RE.test(t)) return true;
  if (/INSTRUKSI\s+UNTUK\s+MODEL/i.test(t)) return true;
  if (
    /^(politeknik|universitas|institut|sekolah menengah)\b/i.test(t) &&
    !/\b(java|python|node|react|spring|flutter|unity|api|sql|docker|git|game|mobile|c#)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** @deprecated gunakan isLowValueRawCvLine / isLowValueEvidence */
function isLowValueQuoteLine(line: string): boolean {
  return isLowValueRawCvLine(line) || isLowValueEvidence(line);
}

function cleanQuoteLine(line: string, maxLen = 150): string {
  let t = line.trim().replace(/\s+/g, " ");
  t = t.replace(/^\[(?:CV|TABLE|Section|Paragraph)[^\]]*\]\s*/i, "");
  if (t.length > maxLen) {
    const cut = t.slice(0, maxLen);
    const lastPunct = Math.max(cut.lastIndexOf("."), cut.lastIndexOf(";"), cut.lastIndexOf(","));
    t = lastPunct > 50 ? cut.slice(0, lastPunct + 1) : cut.trimEnd() + "…";
  }
  return t;
}

/** Hapus boilerplate sistem dari teks segmen CV sebelum scoring/kutipan */
export function sanitizeCvSegmentText(text: string): string {
  let body = stripCvTextForNameExtraction(text);
  body = body.replace(/---\s*\[[^\]]+\]\s*---/g, "\n");
  body = body.replace(/\(cid:\d+\)/gi, " ").replace(/[\u0000-\u0008\u000b\f\u000e-\u001f]/g, "");
  return body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !isLowValueRawCvLine(l))
    .join("\n");
}

function normalizePersonKey(name: string, filename: string): string {
  if (/tidak tersurat/i.test(name)) return `__file__:${filename}`;
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Satu orang satu entri — file dengan skor tertinggi yang dipertahankan */
export function deduplicateRankedByPerson(ranked: RankedCandidate[]): RankedCandidate[] {
  const byKey = new Map<string, RankedCandidate>();
  for (const r of ranked) {
    const key = normalizePersonKey(r.name, r.filename);
    const prev = byKey.get(key);
    if (!prev || r.score > prev.score) byKey.set(key, r);
  }
  return Array.from(byKey.values()).sort((a, b) => b.score - a.score);
}

function nameMentionedInQuery(queryLower: string, personName: string): boolean {
  const full = personName.toLowerCase().trim();
  if (full.length < 3) return false;
  if (full.length >= 6 && queryLower.includes(full)) return true;

  const parts = full.split(/\s+/).filter((p) => p.length >= 2);
  if (parts.length === 0) return false;

  if (parts.length === 1) {
    return queryLower.includes(parts[0]);
  }

  const first = parts[0];
  const last = parts[parts.length - 1];
  if (queryLower.includes(first) && queryLower.includes(last)) return true;

  const matched = parts.filter((p) => p.length >= 3 && queryLower.includes(p));
  if (parts.length >= 3 && matched.length >= 2) return true;
  if (parts.length === 2 && matched.length >= 2) return true;

  return false;
}

/** HR menyebut nama tertentu (mis. Dhiaz dan Siti) → hanya mereka yang dibandingkan */
export function candidatesMentionedInQuery(
  query: string,
  ranked: RankedCandidate[]
): RankedCandidate[] {
  const q = query.toLowerCase();
  const found: RankedCandidate[] = [];
  const seen = new Set<string>();

  for (const r of ranked) {
    if (/tidak tersurat/i.test(r.name)) continue;
    const key = normalizePersonKey(r.name, r.filename);
    if (seen.has(key)) continue;

    if (nameMentionedInQuery(q, r.name)) {
      seen.add(key);
      found.push(r);
      continue;
    }

    const fromFile = extractNameFromFilename(r.filename);
    if (fromFile && nameMentionedInQuery(q, fromFile)) {
      seen.add(key);
      found.push(r);
    }
  }

  return found.sort((a, b) => b.score - a.score);
}

/** HR membandingkan kandidat yang disebutkan by name (bukan screening semua) */
export function isExplicitNamedComparison(query: string, mentionedCount: number): boolean {
  if (mentionedCount < 2) return false;
  const s = query.toLowerCase();
  return (
    /\b(antara|bandingkan|vs\.?|versus|lebih\s+cocok|dibandingkan|dibanding)\b/.test(s) ||
    (/\bkandidat\b/.test(s) && /\b(dan|atau|dengan)\b/.test(s)) ||
    /\b(siapa\s+(?:yang\s+)?(?:lebih|paling)\s+cocok)\b/.test(s)
  );
}

const SECTION_SKIP =
  /^(pengalaman|keterampilan|keahlian|skill|pendidikan|education|profil|profile|ringkasan|summary|cv|curriculum|email|phone|alamat|kontak|linkedin|github|portofolio)/i;

/** Kata yang bukan bagian nama orang (skill, institusi, role, teknologi) */
const NOT_NAME_WORDS = new Set([
  "staff", "karyawan", "pekerja", "operator", "teknisi", "cv", "resume", "profil", "profile", "portofolio", "portfolio", "skills", "skill", "pengalaman", "experience", "pendidikan", "education", "ringkasan", "summary",
  "jenis", "kelamin", "nama", "lengkap", "tempat", "lahir", "tanggal", "status", "pernikahan", "agama", "kewarganegaraan", "telepon", "alamat", "kontak", "hobi", "saya", "tentang", "kemampuan",
  "membangun", "membuat", "mengembangkan", "mendesain", "developed", "building", "created",
  "mobile", "game", "development", "website", "application", "flutter", "unity", "android",
  "backend", "frontend", "api", "pelamar", "identitas", "ekstraksi", "gunakan",
  "teks", "file", "lain", "intern", "studio", "developer", "engineer", "top", "down",
  "integrasi", "rekomendasi", "lowongan", "pekerjaan",
  "spring", "boot", "content", "writing", "machine", "learning", "data", "visualization",
  "visual", "analytics", "science", "software", "hardware", "network", "database", "cloud",
  "docker", "kubernetes", "react", "angular", "vue", "python", "java", "javascript",
  "typescript", "node", "express", "django", "flask", "mysql", "postgresql", "mongodb",
  "redis", "html", "css", "tailwind", "figma", "photoshop", "marketing", "sales", "design",
  "graphic", "digital", "social", "media", "project", "management", "business", "analysis",
  "politeknik", "universitas", "institut", "institute", "akademi", "academy", "sekolah",
  "harapan", "bersama", "tegal", "jakarta", "bandung", "surabaya", "yogyakarta", "semarang",
  "negara", "indonesia", "nasional", "internasional", "global", "local", "regional",
  "communication", "leadership", "teamwork", "problem", "solving", "critical", "thinking",
  "fullstack", "full", "stack", "devops", "agile", "scrum", "kanban", "testing", "quality",
  "assurance", "security", "cyber", "blockchain", "artificial", "intelligence", "deep",
  "neural", "natural", "language", "processing", "computer", "vision", "embedded", "iot",
  "microservices", "architecture", "administration", "administrator", "specialist",
  "consultant", "coordinator", "supervisor", "manager", "director", "officer", "associate",
  "assistant", "analyst", "architect", "technician", "trainer", "instructor",
  "writer", "editor", "translator", "interpreter", "researcher", "scientist", "statistician",
]);

/** Frasa dua+ kata yang pasti bukan nama orang */
const NOT_NAME_PHRASES = new Set([
  "spring boot", "content writing", "machine learning", "data visualization", "data science",
  "web development", "software engineering", "graphic design", "project management",
  "digital marketing", "social media", "business analysis", "cloud computing", "deep learning",
  "artificial intelligence", "politeknik harapan", "politeknik harapan bersama",
  "harapan bersama", "bersama tegal", "full stack", "front end", "back end", "ui ux",
  "user interface", "user experience", "quality assurance", "technical support",
  "customer service", "human resources", "public relations", "supply chain",
]);

export type HrQueryKind =
  | "list_names"
  | "top_n"
  | "single_candidate"
  | "greeting"
  | "general";

const GREETING_REPLIES = [
  "Halo! Saya asisten AI recruiter Anda. Ada yang bisa saya bantu — misalnya screening CV, membandingkan kandidat, atau melihat profil pelamar?",
  "Hai! Senang bisa membantu. Silakan tanyakan tentang kandidat, job description, atau unggah CV jika belum ada di sistem.",
  "Selamat datang! Saya siap membantu proses rekrutmen Anda. Mau mulai dari apa?",
];

function stripCvTextForNameExtraction(text: string): string {
  return text
    .replace(/^>>> IDENTITAS[\s\S]*?\n\n/gm, "")
    .replace(/INSTRUKSI UNTUK MODEL:[\s\S]*?\n\n/i, "")
    .replace(/\[\[\[\/CV_ONLY[\s\S]*$/m, "")
    .replace(/\[(?:CV|JOB DESCRIPTION)\s*-\s*[^\]]+\]\s*/gi, "")
    .replace(/^\[(?:TABLE|Section|Paragraph|Row|Text)\s*\d*\]\s*/gim, "")
    .replace(/\[TABLE\]/gi, "");
}

function isInstitutionOrSkillPhrase(n: string): boolean {
  const lower = n.toLowerCase().trim();
  if (NOT_NAME_PHRASES.has(lower)) return true;
  if (/^(politeknik|universitas|institut|institute|sekolah|smk|sma|sdn|smp|akademi|academy)\b/.test(lower)) {
    return true;
  }
  if (/\b(boot|learning|writing|visualization|development|engineering|framework|language|stack)\b/.test(lower)) {
    return true;
  }
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.every((w) => NOT_NAME_WORDS.has(w))) return true;
  return false;
}

export function looksLikePersonName(n: string): boolean {
  const words = n.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length < 1 || words.length > 5) return false;

  if (words.length === 1) {
    const w = words[0];
    if (w.length < 3) return false;
    if (NOT_NAME_WORDS.has(w)) return false;
    if (/^(cv|resume|profil|profile|portofolio|portfolio|skills?|pengalaman|experience|pendidikan|education|ringkasan|summary|tentang|about)$/i.test(w)) return false;
  }

  if (NOT_NAME_WORDS.has(words[0])) return false;
  if (words.some((w) => NOT_NAME_WORDS.has(w))) return false;
  if (isInstitutionOrSkillPhrase(n)) return false;
  if (/^\d|@|http|\.com|\.pdf|identitas|ekstraksi|table|section|paragraph|row|text/i.test(n)) {
    return false;
  }
  return words.every((w) => /^[a-z\u00C0-\u024F.'-]{2,}$/i.test(w));
}

/** Sapaan / obrolan ringan tanpa dokumen */
export function isGreetingQuery(query: string): boolean {
  const s = query.trim().toLowerCase();
  if (!s || s.length > 120) return false;
  if (/\b(cv|kandidat|jd|lowongan|lamaran|profil|skill|rekrut|screening|bandingkan)\b/.test(s)) {
    return false;
  }
  return (
    /^(halo|hai|hi|hello|hey|hola|yo)\b[!.,?\s]*$/i.test(query.trim()) ||
    /^(halo|hai|hi|hello|hey)[\s!,?.]+/i.test(s) ||
    /^(selamat\s+(pagi|siang|sore|malam)|pagi|siang|sore|malam)\b/i.test(s) ||
    /^(terima\s+kasih|makasih|thanks|thank\s+you)\b/i.test(s) ||
    /^(apa\s+kabar|how\s+are\s+you)\b/i.test(s) ||
    /^(test|ping)\b/i.test(s)
  );
}

export function buildGreetingReply(): string {
  const i = Math.floor(Math.random() * GREETING_REPLIES.length);
  return GREETING_REPLIES[i];
}

function pseudoRankedFromContext(context: string): RankedCandidate[] {
  return parseCvOnlySegments(context).map((seg) => ({
    filename: seg.filename,
    name: resolveApplicantName(seg.text, seg.filename) ?? "Nama tidak tersurat di CV",
    score: 0,
    quotes: [],
    reason: "",
  }));
}

/** Profil / data diri satu kandidat — bukan screening massal */
export function isSingleCandidateIntent(query: string, context?: string): boolean {
  const s = query.toLowerCase().trim();

  if (
    /\b(semua|seluruh|bandingkan|vs\.?|versus|antara|siapa\s+(?:yang\s+)?paling|top\s*\d|rekomendasi\s+utama)\b/.test(
      s
    )
  ) {
    return false;
  }

  const profileAsk =
    /\b(profil|profile|data\s*diri|biodata|identitas|riwayat\s+hidup|tentang\s+(?:kandidat|pelamar|dia|nya))\b/.test(
      s
    ) ||
    /\b(profil|data\s*diri|biodata)\s+(?:kandidat|pelamar|cv)\b/.test(s) ||
    /\b(kandidat|pelamar|cv)\s+(?:nya|dia)?\s*(?:profil|data\s*diri|biodata)\b/.test(s) ||
    /^(siapa|ceritakan|jelaskan|tampilkan|info(?:rmasi)?)\s+(?:tentang\s+)?/i.test(query.trim()) ||
    /\b(email|telepon|nomor\s+hp|kontak|pendidikan|pengalaman|keahlian)\s+(?:nya|dia|faisal|kandidat)/i.test(
      s
    );

  if (!profileAsk && s.split(/\s+/).length > 14) return false;

  if (context) {
    const pseudo = pseudoRankedFromContext(context);
    const mentioned = candidatesMentionedInQuery(query, pseudo);
    if (mentioned.length === 1) return true;
    if (mentioned.length >= 2) return false;
    if (profileAsk && parseCvOnlySegments(context).length === 1) return true;
  }

  if (profileAsk && s.split(/\s+/).filter(Boolean).length <= 12) return true;

  return false;
}

export type ChatHistoryTurn = { role: "user" | "assistant"; content: string };

const FOLLOW_UP_REF_MARKERS =
  /\b(tadi|sebelumnya|di atas|hasil(?:nya| di atas)?|lanjut(?:kan)?|jelaskan|kenapa|mengapa|detail|lebih|ringkas|singkat|saja|teratas|pertama|kedua|ketiga|ke[- ]?empat|nomor\s*\d|#1|#2|#3|kandidat tersebut|orang itu|skor(?:nya| itu)?|yang (?:baru|tadi)|dari (?:hasil|jawaban|daftar|atas))\b/i;

/** Pertanyaan lanjutan dalam sesi chat — jawaban harus singkat & merujuk riwayat */
export function isFollowUpQuery(query: string, hasHistory: boolean): boolean {
  if (!hasHistory) return false;
  const s = query.toLowerCase().trim();

  if (/\b(screening\s+ulang|evaluasi\s+ulang|ulangi\s+screening|bandingkan\s+semua\s+kandidat)\b/.test(s)) {
    return false;
  }

  const wantsFreshFullRanking =
    (/\b(screening|evaluasi)\s+(?:cv|kandidat|pelamar)\b/.test(s) ||
      /\bsiapa\s+(?:yang\s+)?(?:paling cocok|terbaik)\b/.test(s)) &&
    !/\b(tadi|saja|ringkas|dari|lanjut|jelaskan|di atas|hasil)\b/.test(s) &&
    !FOLLOW_UP_REF_MARKERS.test(s);

  if (wantsFreshFullRanking) return false;
  if (FOLLOW_UP_REF_MARKERS.test(s)) return true;

  const words = s.split(/\s+/).filter(Boolean).length;
  if (words <= 12 && !/\b(screening|semua kandidat|rekomendasi utama)\b/.test(s)) return true;

  return false;
}

/** Nama kandidat dari jawaban assistant sebelumnya (urutan peringkat) */
export function extractNamesFromAssistantAnswer(text: string): string[] {
  const names: string[] = [];
  const headingRe = /^###\s*(?:\d+\.\s*)?([^(#\n]+?)(?:\s*\(CV:|$)/gim;
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(text)) !== null) {
    const n = hm[1].replace(/\*\*/g, "").trim();
    if (n && !/^ringkasan|^rekomendasi|^kandidat|^penilaian|^profil|^perbandingan/i.test(n)) {
      names.push(n);
    }
  }
  if (names.length === 0) {
    const cvRe = /\*\*([^*]+)\*\*\s*\(CV:/g;
    let cm: RegExpExecArray | null;
    while ((cm = cvRe.exec(text)) !== null) {
      const n = cm[1].trim();
      if (n) names.push(n);
    }
  }
  return Array.from(new Set(names));
}

/** Selesaikan rujukan "pertama/teratas/kedua" dari riwayat chat */
export function resolveFollowUpCandidateName(
  query: string,
  history: ChatHistoryTurn[]
): string | null {
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return null;

  const names = extractNamesFromAssistantAnswer(lastAssistant.content);
  if (names.length === 0) return null;

  const s = query.toLowerCase();
  const idxMap: [RegExp, number][] = [
    [/\b(pertama|teratas|#1|nomor\s*1|paling\s+atas|rank\s*1)\b/, 0],
    [/\b(kedua|#2|nomor\s*2|rank\s*2)\b/, 1],
    [/\b(ketiga|#3|nomor\s*3|rank\s*3)\b/, 2],
    [/\b(ke[- ]?empat|#4|nomor\s*4)\b/, 3],
  ];

  for (const [re, idx] of idxMap) {
    if (re.test(s) && names[idx]) return names[idx];
  }

  if (/\b(kandidat tersebut|orang itu|skor(?:nya| itu))\b/.test(s) && names[0]) {
    return names[0];
  }

  return null;
}

export const CONCISE_FOLLOW_UP_TEMPLATE = `
[Format jawaban lanjutan — WAJIB singkat]
## [Judul 3–6 kata sesuai pertanyaan]
- Bullet poin "- " saja (maks 6–8 bullet, ~10 kata/bullet)
- Tanpa paragraf panjang, tanpa ## Ringkasan eksekutif, tanpa ulang semua kandidat
- Jika tidak ada bukti di CV: tulis "Tidak tercantum di CV"
`;

export const CONCISE_TOP_N_TEMPLATE = `
[Format screening singkat — pertanyaan lanjutan]
## Rekomendasi
### 1. [Nama] — **Skor:** XX/100
- Bukti: 1–2 bullet singkat (maks ~10 kata)
- Rekomendasi: satu kalimat
(Ulangi hanya untuk jumlah kandidat yang diminta HR)
_Tanpa Ringkasan eksekutif; tanpa daftar kandidat lain kecuali diminta._
`;

/** Instruksi tambahan untuk pertanyaan lanjutan */
export function buildFollowUpUserAddon(query: string, history: ChatHistoryTurn[]): string {
  if (history.length === 0) return "";

  let hint =
    `\n\n[WAJIB — PERTANYAAN LANJUTAN: jawab **singkat & akurat**.\n` +
    `- **Maks ~6–8 bullet** atau **≤100 kata** total.\n` +
    `- Satu ## judul → bullet "- " saja; **dilarang** paragraf panjang & kalimat penutup berulang.\n` +
    `- **Jangan** ulang screening penuh / semua kandidat kecuali diminta eksplisit.\n` +
    `- Hanya fakta dari CV/JD + riwayat chat; jangan mengarang.\n` +
    `- Rujuk jawaban sebelumnya untuk "tadi/pertama/teratas/skor itu".]`;

  const refName = resolveFollowUpCandidateName(query, history);
  if (refName) {
    hint += `\n[Rujukan HR: fokus pada kandidat **${refName}** dari percakapan sebelumnya. Jawab hanya tentang orang ini jika pertanyaan bersifat spesifik.]`;
  }

  return hint + CONCISE_FOLLOW_UP_TEMPLATE;
}

/** Rapikan jawaban lanjutan yang terlalu panjang */
export function polishConciseFollowUpAnswer(answer: string, query: string): string {
  let a = answer.trim();
  if (!a) return a;

  if (!/\b(ringkasan|summary|kesimpulan)\b/i.test(query)) {
    a = a.replace(/##\s*Ringkasan eksekutif[^\n]*\n[\s\S]*?(?=\n##\s+|\n*$)/i, "");
  }

  a = a.replace(/\n_[\s\S]*?(?:verifikasi|wawancara|portofolio)[\s\S]*?_\s*$/i, "");
  a = a.replace(/\n\n(?:Akhiri|Penutup)[\s\S]*$/i, "");

  const maxChars = 1200;
  if (a.length > maxChars) {
    const lines = a.split("\n");
    const kept: string[] = [];
    let chars = 0;
    for (const line of lines) {
      if (chars + line.length > maxChars && kept.length > 4) {
        kept.push("\n_… jawaban dipersingkat._");
        break;
      }
      kept.push(line);
      chars += line.length + 1;
    }
    a = kept.join("\n");
  }

  return a.replace(/\n{3,}/g, "\n\n").trim();
}

/** Fokuskan ke satu CV saat follow-up merujuk kandidat tertentu */
export function narrowContextForFollowUp(
  context: string,
  query: string,
  history: ChatHistoryTurn[]
): string {
  const refName = resolveFollowUpCandidateName(query, history);
  if (!refName) return context;

  const pseudo = pseudoRankedFromContext(context);
  const mentioned = candidatesMentionedInQuery(refName, pseudo);
  const targetFilename =
    mentioned[0]?.filename ??
    pseudo.find(
      (p) =>
        p.name.toLowerCase().includes(refName.toLowerCase()) ||
        refName.toLowerCase().includes(p.name.split(/\s+/)[0]?.toLowerCase() ?? "")
    )?.filename;

  if (!targetFilename) return context;

  const augmented = `${query} profil ${refName}`;
  return narrowContextForQuery(context, augmented, "single_candidate");
}

/** Jenis pertanyaan HR — menentukan format jawaban */
export function classifyHrQuery(query: string, context?: string): HrQueryKind {
  const s = query.toLowerCase().trim();

  if (isGreetingQuery(query)) return "greeting";

  const wantsRanking =
    extractRequestedCount(s) != null ||
    /\b(paling cocok|terbaik|teratas|prioritas|layak)\b/.test(s) ||
    /\bcocok\s+(untuk|di|ditempatkan|dalam|bagian)\b/.test(s) ||
    /\btop\s*\d+\b/.test(s) ||
    /\brekomendasi\s+(utama|kandidat|top)\b/.test(s) ||
    /\d+\s*kandidat\s+(terbaik|cocok|yang cocok)/.test(s);

  const wantsNameList =
    /(siapa\s+saja|daftar|list).{0,40}(nama|kandidat|pelamar)/.test(s) ||
    /(nama|namanya).{0,30}(semua|saja|kandidat|pelamar|cv|berdasarkan)/.test(s) ||
    /sebutkan\s+(semua\s+)?(nama|namanya)/.test(s) ||
    /nama-nama\s+kandidat/.test(s) ||
    /^siapa\s+(saja\s+)?nama/.test(s) ||
    /berapa\s+(banyak\s+)?(kandidat|pelamar|cv)/.test(s);

  if (wantsNameList && !wantsRanking) return "list_names";
  if (wantsRanking) return "top_n";
  if (isSingleCandidateIntent(query, context)) return "single_candidate";
  return "general";
}

/** Fokuskan konteks ke satu CV saat HR menanya profil satu orang */
export function narrowContextForQuery(context: string, query: string, kind: HrQueryKind): string {
  if (kind !== "single_candidate") return context;

  const segments = parseCvOnlySegments(context);
  if (segments.length === 0) return context;

  const pseudo = pseudoRankedFromContext(context);
  const mentioned = candidatesMentionedInQuery(query, pseudo);

  let target = mentioned.length >= 1 ? segments.find((s) => s.filename === mentioned[0].filename) : undefined;
  if (!target && segments.length === 1) target = segments[0];
  if (!target) return context;

  const name = resolveApplicantName(target.text, target.filename) ?? "kandidat";
  const rosterEnd = context.indexOf("[Selesai daftar]");
  const roster =
    rosterEnd > 0 ? context.slice(0, rosterEnd + "[Selesai daftar]".length) + "\n\n" : "";

  return (
    roster +
    `=== FOKUS: HR menanyakan profil/data diri **${name}** saja (file: ${target.filename}). ` +
    `Jawab hanya untuk orang ini; jangan ulang file yang sama; jangan bandingkan kandidat lain kecuali diminta.\n\n` +
    `[[[CV_ONLY filename:${target.filename}]]]\n${target.text}\n[[[/CV_ONLY filename:${target.filename}]]]`
  );
}

/** Konteks hanya CV kandidat yang disebutkan HR (perbandingan A vs B) */
export function narrowContextForNamedComparison(context: string, query: string): string {
  const ranked = deduplicateRankedByPerson(
    parseCvOnlySegments(context).map((seg) => ({
      filename: seg.filename,
      name: resolveApplicantName(seg.text, seg.filename) ?? "",
      score: 0,
      quotes: [],
      reason: "",
    }))
  );
  const mentioned = candidatesMentionedInQuery(query, ranked);
  if (mentioned.length < 2 || !isExplicitNamedComparison(query, mentioned.length)) {
    return context;
  }

  const segments = parseCvOnlySegments(context);
  const rosterEnd = context.indexOf("[Selesai daftar]");
  const roster =
    rosterEnd > 0 ? context.slice(0, rosterEnd + "[Selesai daftar]".length) + "\n\n" : "";

  const domain = roleDomainLabel(inferRoleDomainFromQuery(query));
  const names = mentioned.map((m) => m.name).join(" dan ");

  const cvBlocks = mentioned
    .map((m) => {
      const seg = segments.find((s) => s.filename === m.filename);
      if (!seg) return "";
      return (
        `[[[CV_ONLY filename:${seg.filename}]]]\n${seg.text}\n[[[/CV_ONLY filename:${seg.filename}]]]`
      );
    })
    .filter(Boolean);

  return (
    roster +
    `=== FOKUS PERBANDINGAN: HR hanya meminta penilaian untuk **${names}** — **bukan** kandidat lain. ` +
    `Bandingkan keduanya untuk **${domain}**. Dilarang menyebut pelamar lain.\n\n` +
    cvBlocks.join("\n\n----------\n\n")
  );
}

export const SINGLE_CANDIDATE_TEMPLATE = `
[Format untuk PROFIL / DATA DIRI satu kandidat — BUKAN screening massal]
## Profil [Nama dari CV]
- **File CV:** namafile.pdf
- **Data diri / identitas:** (nama, domisili, dll. jika ada di CV)
- **Kontak:** (email, telepon, LinkedIn jika tertulis)
- **Pendidikan:** bullet dari CV
- **Pengalaman kerja / proyek:** bullet dari CV
- **Keahlian / skill:** bullet dari CV
- **Catatan:** (opsional, jika data tidak lengkap)

**Dilarang:** skor kecocokan JD, Rekomendasi utama, atau blok untuk kandidat lain — kecuali HR secara eksplisit meminta penilaian terhadap JD.
`;

function extractSectionBullets(text: string, headingRe: RegExp, max = 8): string[] {
  const body = stripCvTextForNameExtraction(text);
  const m = body.match(headingRe);
  if (!m || m.index === undefined) return [];
  const start = m.index + m[0].length;
  const rest = body.slice(start);
  const end = rest.search(/\n[A-Z]{3,}[^a-z\n]{0,40}\n|\n##\s|\n###\s/);
  const block = (end > 0 ? rest.slice(0, end) : rest.slice(0, 2500)).trim();
  return block
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 220)
    .slice(0, max);
}

/** Profil terstruktur dari teks CV (fallback jika model salah format) */
export function buildSingleCandidateProfileMarkdown(context: string, query: string): string | null {
  const segments = parseCvOnlySegments(context);
  if (segments.length === 0) return null;

  const pseudo = pseudoRankedFromContext(context);
  const mentioned = candidatesMentionedInQuery(query, pseudo);
  let seg = mentioned.length >= 1 ? segments.find((s) => s.filename === mentioned[0].filename) : undefined;
  if (!seg && segments.length === 1) seg = segments[0];
  if (!seg) return null;

  const name = resolveApplicantName(seg.text, seg.filename) ?? "Nama tidak tersurat di CV";
  const body = stripCvTextForNameExtraction(seg.text);

  const email = body.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
  const phone = body.match(/(?:\+62|0)\d[\d\s\-]{8,14}\d/)?.[0];

  const edu = extractSectionBullets(
    seg.text,
    /\b(pendidikan|education)\b/i
  );
  const exp = extractSectionBullets(
    seg.text,
    /\b(pengalaman|experience|pekerjaan|work)\b/i
  );
  const skills = extractSectionBullets(
    seg.text,
    /\b(keterampilan|keahlian|skills?|kompetensi)\b/i
  );

  let md = `## Profil ${name}\n\n`;
  md += `- **File CV:** ${seg.filename}\n`;

  const headerLines = body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && l.length < 200)
    .slice(0, 6);
  if (headerLines.length > 0) {
    md += `- **Ringkasan identitas:** ${headerLines.slice(0, 3).join(" · ")}\n`;
  }
  if (email) md += `- **Email:** ${email}\n`;
  if (phone) md += `- **Telepon:** ${phone}\n`;

  md += `\n### Pendidikan\n`;
  md += edu.length ? edu.map((l) => `- ${l}`).join("\n") + "\n" : "- (tidak tercantum jelas di cuplikan CV)\n";

  md += `\n### Pengalaman\n`;
  md += exp.length ? exp.map((l) => `- ${l}`).join("\n") + "\n" : "- (tidak tercantum jelas di cuplikan CV)\n";

  md += `\n### Keahlian / skill\n`;
  if (skills.length) {
    md += skills.map((l) => `- ${l}`).join("\n") + "\n";
  } else {
    const skillLine = body.match(/(?:flutter|react|node|python|java|javascript|unity|figma)[^.!\n]{0,80}/gi);
    if (skillLine?.length) {
      md += skillLine
        .slice(0, 6)
        .map((l) => `- ${l.trim()}`)
        .join("\n");
      md += "\n";
    } else {
      md += "- (tidak tercantum jelas di cuplikan CV)\n";
    }
  }

  return md.trim();
}

function answerLooksLikeWrongScreening(query: string, answer: string): boolean {
  const q = query.toLowerCase();
  if (/\b(skor|cocok|jd|rekomendasi|bandingkan|top)\b/.test(q)) return false;
  const a = answer.toLowerCase();
  if (/skor\s+kecocokan\s+jd/i.test(a)) return true;
  const cvRefs = (answer.match(/\(CV:\s*[^)]+\)/gi) || []).length;
  if (cvRefs > 1) return true;
  if (/rekomendasi\s+utama/i.test(a) && !/rekomendasi/i.test(q)) return true;
  return false;
}

export function parseCvOnlySegments(context: string): CvSegment[] {
  const re = /\[\[\[CV_ONLY filename:([^\]]+)\]\]\]([\s\S]*?)\[\[\[\/CV_ONLY filename:\1\]\]\]/g;
  const out: CvSegment[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(context)) !== null) {
    out.push({ filename: m[1].trim(), text: m[2].trim() });
  }
  return out;
}

function cleanNameLine(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[|,].*$/, "").trim();
}

function titleCaseName(key: string): string {
  return key
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function gameProximityBonus(text: string, nameKey: string): number {
  const parts = nameKey.split(/\s+/).filter((p) => p.length > 2);
  if (parts.length === 0) return 0;
  const re = new RegExp(parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "i");
  let bonus = 0;
  const lower = text.toLowerCase();
  let idx = 0;
  while (idx < lower.length) {
    const m = lower.slice(idx).match(re);
    if (!m || m.index === undefined) break;
    const pos = idx + m.index;
    const window = text.slice(Math.max(0, pos - 120), Math.min(text.length, pos + 280));
    for (const g of GAME_SIGNALS) {
      if (g.re.test(window)) bonus += g.w / 4;
    }
    if (/pengalaman|keterampilan/i.test(window)) bonus += 8;
    idx = pos + m[0].length;
  }
  return bonus;
}

/** Ambil nama dari baris awal CV saja (nama biasanya di header, bukan di bagian skill) */
export function extractApplicantName(text: string): string | null {
  const body = stripCvTextForNameExtraction(text);

  const marker = body.match(/>>>\s*NAMA PELAMAR DI FILE INI:\s*([^\n]+)/i);
  if (marker) {
    const n = cleanNameLine(marker[1]);
    if (looksLikePersonName(n)) return titleCaseName(n);
  }

  const labeled = body.match(/(?:nama\s*(?:lengkap)?|name)\s*[:：]\s*([^\n]+)/i);
  if (labeled) {
    const n = cleanNameLine(labeled[1]);
    if (looksLikePersonName(n)) return titleCaseName(n);
  }

  const sectionCut = body.search(
    /\b(pengalaman|experience|keterampilan|skills?|keahlian|pendidikan|education|proyek|projects?|portofolio)\b/i
  );
  const headerBlob = sectionCut > 40 ? body.slice(0, sectionCut) : body.slice(0, 1200);

  const skipLine = (line: string) =>
    SECTION_SKIP.test(line) ||
    /@/.test(line) ||
    /\b\d{3,}\b/.test(line) ||
    /^(tel|phone|hp|email|alamat|address|linkedin|github|portfolio|table|section)\b/i.test(line) ||
    /^\d{1,2}[\/\-]\d{1,2}/.test(line) ||
    /\[cv\s*-/i.test(line) ||
    isInstitutionOrSkillPhrase(line);

  const scores = new Map<string, number>();
  const add = (raw: string, weight: number) => {
    const n = cleanNameLine(raw);
    if (!looksLikePersonName(n)) return;
    const key = n.toLowerCase();
    scores.set(key, (scores.get(key) ?? 0) + weight);
  };

  const lines = headerBlob.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  lines.slice(0, 12).forEach((line, idx) => {
    if (skipLine(line)) return;
    const w = 30 - idx * 3;
    if (/^[A-Z\u00C0-\u024F]{2,}(?:\s+[A-Z\u00C0-\u024F]{2,}){1,4}$/.test(line)) add(line, w + 6);
    if (/^[A-Z][a-z\u00C0-\u024F]{1,}(?:\s+[A-Z][a-z\u00C0-\u024F]{1,}){1,4}$/.test(line)) add(line, w + 4);

    if (/^[A-Z][a-z\u00C0-\u024F]{2,20}$/.test(line)) add(line, w + 2);
    if (/^[A-Z\u00C0-\u024F]{3,20}$/.test(line)) add(line, w + 3);

    const embedded = line.match(/^([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]{1,}(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]{1,}){1,4})/);
    if (embedded) add(embedded[1], w);
  });

  let best: string | null = null;
  let bestScore = 0;
  Array.from(scores.entries()).forEach(([name, sc]) => {
    if (sc > bestScore) {
      bestScore = sc;
      best = titleCaseName(name);
    }
  });
  return best;
}

/**
 * Nama pelamar: penanda sistem → label nama → nama file → header CV.
 * Nama file diutamakan sebelum teks agar tidak tertukar dengan skill/institusi.
 */
export function resolveApplicantName(text: string, filename: string): string | null {
  const body = stripCvTextForNameExtraction(text);

  const marker = body.match(/>>>\s*NAMA PELAMAR DI FILE INI:\s*([^\n]+)/i);
  if (marker) {
    const n = cleanNameLine(marker[1]);
    if (looksLikePersonName(n)) return titleCaseName(n);
  }

  const labeled = body.match(/(?:nama\s*(?:lengkap)?|name)\s*[:：]\s*([^\n]+)/i);
  if (labeled) {
    const n = cleanNameLine(labeled[1]);
    if (looksLikePersonName(n)) return titleCaseName(n);
  }

  const fromFile = extractNameFromFilename(filename);
  if (fromFile) return fromFile;

  return extractApplicantName(text);
}

type CvEvidenceUnit = { text: string; kind: "skill" | "pengalaman" | "proyek" | "other" };

function evidenceKindWeight(kind: CvEvidenceUnit["kind"]): number {
  if (kind === "pengalaman") return 1;
  if (kind === "proyek") return 0.92;
  if (kind === "skill") return 0.55;
  return 0.45;
}

/** Ekstrak semua unit bukti dari CV (skill, pengalaman, proyek) — dasar evaluasi holistik */
function extractCvEvidenceUnits(cvBody: string, domain: RoleDomain): CvEvidenceUnit[] {
  const body = sanitizeCvSegmentText(cvBody);
  const units: CvEvidenceUnit[] = [];
  const seen = new Set<string>();

  const push = (text: string, kind: CvEvidenceUnit["kind"]) => {
    const t = normalizeEvidenceBullet(text);
    if (!t || t.length < 3 || isEvidenceFluff(t)) return;
    if (kind !== "skill" && !bulletMatchesActiveDomain(t, domain) && !signalHitInText(t, domain)) {
      return;
    }
    if (kind === "skill" && !signalHitInText(t, domain)) return;
    if (kind === "skill" && isOffDomainSkillToken(t, domain)) return;
    const key = `${kind}:${t.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    units.push({ text: t, kind });
  };

  const skillBlock = extractCvSection(
    body,
    /^(?:keterampilan|keahlian|skills?|technical\s*skills?)\b/i
  );
  if (skillBlock) {
    for (const tok of parseSkillTokens(skillBlock)) push(tok, "skill");
  }
  for (const line of body.split(/\n+/)) {
    const skillInline = line.match(/^(?:keterampilan|keahlian|skills?)\s*[:：]\s*(.+)$/i);
    if (skillInline) {
      for (const tok of parseSkillTokens(skillInline[1])) push(tok, "skill");
    }
  }

  const experienceSections: [RegExp, CvEvidenceUnit["kind"]][] = [
    [/^(?:pengalaman|experience|work\s*experience|riwayat\s*pekerjaan|pekerjaan)\b/i, "pengalaman"],
    [/^(?:proyek|projects?|portofolio)\b/i, "proyek"],
  ];
  for (const [headerRe, kind] of experienceSections) {
    const block = extractCvSection(body, headerRe);
    if (!block) continue;

    const paragraphs = joinCvLinesToParagraphs(block);
    for (const p of paragraphs) {
      for (const line of splitIntoSentences(p)) {
        if (line.length >= 8 && !isLowValueRawCvLine(line) && !isEvidenceFluff(line)) {
          push(line, kind);
          const compact = compactExperienceBullet(line, domain);
          if (compact) push(compact, kind);
        }
      }
    }
  }

  const fullNorm = body.replace(/\s+/g, " ");
  const verbRe =
    /(?:membangun|mengembangkan|membuat|mengerjakan|develop(?:ed|ing)?|merencanakan|menjalankan|mengelola|melakukan|mengoperasikan|memastikan|menyusun|mematuhi|menerapkan)\s+[^.!?\n]{5,150}/gi;
  let vm: RegExpExecArray | null;
  while ((vm = verbRe.exec(fullNorm)) !== null) {
    const phrase = vm[0].trim();
    if (!signalHitInText(phrase, domain) || isEvidenceFluff(phrase)) continue;
    const compact = compactExperienceBullet(phrase, domain);
    if (compact) push(compact, "pengalaman");
  }

  const domainSigs = signalsForDomain(domain, "");
  if (domainSigs.length > 0) {
    for (const u of collectSkillEvidenceUnits(body, domainSigs)) {
      if (signalHitInText(u, domain)) push(u, "other");
    }
  }

  return units;
}

/** Persyaratan utama dari teks JD */
function getPrimaryJdSignals(domain: RoleDomain, jdText: string, query: string): RoleSignal[] {
  const fromJd = signalsFromJdText(jdText, domain);
  if (fromJd.length > 0) return fromJd;
  const base = signalsForDomain(domain, query);
  return base.length > 0 ? base : signalsForDomain("general", query);
}

function buildHolisticReason(
  roleLabel: string,
  matchedReqs: number,
  totalReqs: number,
  expCount: number,
  skillCount: number,
  hitLabels: string[]
): string {
  if (matchedReqs === 0 && expCount === 0) {
    return `Belum ditemukan bukti pengalaman atau skill yang selaras dengan posisi **${roleLabel}** pada dokumen pelamar ini.`;
  }
  const skillsText = hitLabels.length > 0 ? ` serta menguasai kompetensi ${hitLabels.slice(0, 3).join(", ")}` : "";
  return `Menunjukkan kecocokan yang baik untuk posisi **${roleLabel}** dengan adanya bukti riil di bidang pengalaman terkait${skillsText}.`;
}

/** Skor holistik: cakupan JD + kedalaman bukti + volume pengalaman */
function computeHolisticCvScore(
  cvBody: string,
  domain: RoleDomain,
  roleLabel: string,
  primaryReqs: RoleSignal[],
  allSignals: RoleSignal[]
): { score: number; quotes: string[]; reason: string; depthMeta: RankedCandidate["depthMeta"] } {
  const units = extractCvEvidenceUnits(cvBody, domain);
  const primaryLabels = new Set(primaryReqs.map((s) => s.label));

  let matchedReqs = 0;
  let depthPoints = 0;
  const hitLabels: string[] = [];
  const quoteCandidates: { text: string; score: number }[] = [];

  for (const sig of allSignals) {
    if (shouldSkipScoringSignal(sig, cvBody, domain)) continue;

    const matching = units.filter(
      (u) => sig.re.test(u.text) && bulletMatchesActiveDomain(u.text, domain)
    );
    if (matching.length === 0) continue;

    const isPrimary = primaryLabels.has(sig.label);
    if (isPrimary) matchedReqs++;

    if (!hitLabels.includes(sig.label)) hitLabels.push(sig.label);

    const expMatches = matching.filter((u) => u.kind === "pengalaman" || u.kind === "proyek");
    const skillMatches = matching.filter((u) => u.kind === "skill");

    // PERBAIKAN PENGALI SKOR: Diperbesar agar skor lebih wajar (tidak terlalu kecil)
    const primaryMult = isPrimary ? 1.5 : 0.8;

    const base = sig.w * 0.8 * primaryMult;
    const expBonus = Math.min(5, expMatches.length) * sig.w * 0.4 * primaryMult;
    const skillBonus = Math.min(6, skillMatches.length) * sig.w * 0.2 * primaryMult;
    const repeatBonus = Math.min(4, Math.max(0, matching.length - 1)) * sig.w * 0.15 * primaryMult;
    depthPoints += base + expBonus + skillBonus + repeatBonus;

    const best = [...matching].sort(
      (a, b) => evidenceKindWeight(b.kind) - evidenceKindWeight(a.kind)
    )[0];
    if (best) {
      const prefix =
        best.kind === "skill" ? "Skill" : best.kind === "proyek" ? "Proyek" : "Pengalaman";
      quoteCandidates.push({
        text: `${prefix}: ${best.text}`,
        score: sig.w * evidenceKindWeight(best.kind) + expMatches.length * 8 + (isPrimary ? 10 : 0),
      });
    }
  }

  const totalReqs = primaryReqs.length;
  const coverageRatio = totalReqs > 0 ? matchedReqs / totalReqs : hitLabels.length > 0 ? 0.6 : 0;
  // NORMALISASI POIN: Total poin maksimal 100 secara alami (Coverage: 40, Depth: 45, Volume: 15)
  const coveragePoints = coverageRatio * 40;

  const expUnits = units.filter(
    (u) =>
      (u.kind === "pengalaman" || u.kind === "proyek") &&
      (bulletMatchesActiveDomain(u.text, domain) || signalHitInText(u.text, domain))
  );
  const skillUnits = units.filter((u) => u.kind === "skill");

  // Normalisasi bonus volume (maksimal 15 poin)
  const volumeBonus = Math.min(15, expUnits.length * 2.5 + Math.min(10, skillUnits.length) * 1.25);

  const maxDepth = allSignals.reduce((s, sig) => s + sig.w * 1.15, 0);

  // Normalisasi kedalaman (maksimal 45 poin)
  const depthNormalized = maxDepth > 0 ? (depthPoints / maxDepth) * 45 : 0;

  const score = Math.round(coveragePoints + depthNormalized + volumeBonus);

  quoteCandidates.sort((a, b) => b.score - a.score);
  const seenQ = new Set<string>();
  const quotes: string[] = [];
  for (const q of quoteCandidates) {
    const k = q.text.toLowerCase();
    if (seenQ.has(k)) continue;
    const display = prepareEvidenceForDisplay(q.text);
    if (!display || isIncompleteFragment(display.replace(/^(?:skill|pengalaman|proyek):\s*/i, ""))) {
      continue;
    }
    const cleanContent = display.replace(/^(?:skill|pengalaman|proyek):\s*/i, "").trim();
    if (isExperienceHeaderLine(cleanContent)) {
      continue;
    }
    seenQ.add(k);
    quotes.push(display);
    if (quotes.length >= 4) break;
  }

  if (quotes.length === 0) {
    const fallback = extractJdEvidenceBullets(cvBody, roleLabel, domain);
    for (const fb of fallback) {
      if (quotes.length >= 4) break;
      quotes.push(fb);
    }
  }

  const reason = buildHolisticReason(
    roleLabel,
    matchedReqs,
    totalReqs,
    expUnits.length,
    skillUnits.length,
    hitLabels
  );

  return {
    score,
    quotes,
    reason,
    depthMeta: { matchedReqs, expCount: expUnits.length, skillCount: skillUnits.length },
  };
}

export function scoreCvForRole(
  text: string,
  query: string,
  opts?: { context?: string; activeCriteria?: ActiveCriteriaMeta | null }
): { score: number; quotes: string[]; reason: string; depthMeta?: RankedCandidate["depthMeta"] } {
  const cvBody = sanitizeCvSegmentText(text);
  const role = resolveScreeningRole(query, opts?.activeCriteria, opts?.context);
  const queryLabel = role.criteria?.title ?? query;
  const primaryReqs = getPrimaryJdSignals(role.domain, role.jdText, queryLabel);
  const allSignals = mergeScoringSignals(role.domain, role.jdText, queryLabel);

  const holistic = computeHolisticCvScore(
    cvBody,
    role.domain,
    role.roleLabel,
    primaryReqs,
    allSignals
  );

  let score = holistic.score;
  let quotes = holistic.quotes;
  let reason = holistic.reason;

  score = applyDomainScoreCaps(score, cvBody, role.domain);

  return {
    score: Math.min(100, Math.max(0, score)),
    quotes,
    reason,
    depthMeta: holistic.depthMeta,
  };
}

/** @deprecated gunakan scoreCvForRole */
export function scoreCvForGameRole(text: string) {
  return scoreCvForRole(text, "game developer unity");
}

export function rankCandidates(
  context: string,
  query: string,
  activeCriteria?: ActiveCriteriaMeta | null
): RankedCandidate[] {
  const segments = parseCvOnlySegments(context);

  const ranked = segments
    .map((seg) => {
      const name = resolveApplicantName(seg.text, seg.filename) ?? "Nama tidak tersurat di CV";
      const scored = scoreCvForRole(seg.text, query, { context, activeCriteria });
      return {
        filename: seg.filename,
        name,
        score: scored.score,
        quotes: scored.quotes,
        reason: scored.reason,
        cvBody: seg.text,
        depthMeta: scored.depthMeta,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aExp = a.depthMeta?.expCount ?? 0;
      const bExp = b.depthMeta?.expCount ?? 0;
      if (bExp !== aExp) return bExp - aExp;
      const aReq = a.depthMeta?.matchedReqs ?? 0;
      const bReq = b.depthMeta?.matchedReqs ?? 0;
      if (bReq !== aReq) return bReq - aReq;
      return b.quotes.length - a.quotes.length;
    });

  return deduplicateRankedByPerson(ranked);
}

function pickTopCandidates(
  ranked: RankedCandidate[],
  query: string,
  topN: number
): { picks: RankedCandidate[]; rest: RankedCandidate[]; explicitNamedOnly: boolean } {
  const mentioned = candidatesMentionedInQuery(query, ranked);
  const explicitNamedOnly = isExplicitNamedComparison(query, mentioned.length);

  let picks: RankedCandidate[];

  if (explicitNamedOnly) {
    picks = mentioned;
  } else if (mentioned.length >= 2) {
    picks = mentioned.slice(0, Math.max(mentioned.length, topN));
  } else {
    picks = ranked
      .filter((r) => r.score >= MIN_SCORE_FOR_RECOMMENDATION)
      .slice(0, topN);
  }

  const pickKeys = new Set(picks.map((p) => normalizePersonKey(p.name, p.filename)));
  const rest = explicitNamedOnly
    ? []
    : ranked.filter((r) => !pickKeys.has(normalizePersonKey(r.name, r.filename)));

  return { picks, rest, explicitNamedOnly };
}

export const LIST_NAMES_TEMPLATE = `
[Format untuk pertanyaan DAFTAR NAMA — bukan rekomendasi/skor]
## Daftar kandidat
1. **Nama Lengkap** (CV: namafile.pdf)
2. ...

Gunakan nama asli dari teks CV tiap file. **Jangan** pakai "Rekomendasi utama", skor, atau kutipan IDENTITAS sistem.
`;

export function buildCandidateListMarkdown(context: string): string | null {
  const segments = parseCvOnlySegments(context);
  const entries: { name: string; filename: string }[] = [];

  if (segments.length > 0) {
    for (const seg of segments) {
      const name = resolveApplicantName(seg.text, seg.filename) ?? "Nama tidak tersurat di CV";
      entries.push({ name, filename: seg.filename });
    }
  } else {
    const roster = context.match(/CV kandidat[^\n]*\n([\s\S]*?)\[Selesai daftar\]/i);
    if (roster?.[1]) {
      const lines = roster[1].split("\n").filter((l) => /^\d+\.\s+/.test(l.trim()));
      for (const line of lines) {
        const m = line.match(/^\d+\.\s+(.+)$/);
        if (m) entries.push({ name: "—", filename: m[1].trim() });
      }
    }
    Array.from(context.matchAll(/\[CV - ([^\]]+)\]/g)).forEach((m) => {
      const file = m[1];
      if (!entries.some((e) => e.filename === file)) {
        entries.push({ name: "Nama tidak terbaca di cuplikan CV", filename: file });
      }
    });
  }

  if (entries.length === 0) return null;

  let md = `## Daftar kandidat\n\nBerikut nama pelamar berdasarkan file CV yang diunggah:\n\n`;
  entries.forEach((e, i) => {
    md += `${i + 1}. **${e.name}** (CV: ${e.filename})\n`;
  });
  md += `\n_Total: ${entries.length} kandidat._`;
  return md;
}

/** Tambahan instruksi user message sesuai jenis pertanyaan */
export function buildQueryUserAddon(
  context: string,
  query: string,
  askedN: number | null,
  activeCriteria?: ActiveCriteriaMeta | null,
  opts?: { followUp?: boolean; history?: ChatHistoryTurn[] }
): string {
  const followUp = opts?.followUp ?? false;
  const history = opts?.history ?? [];

  if (followUp && history.length > 0) {
    const kind = classifyHrQuery(query, context);
    const followAddon = buildFollowUpUserAddon(query, history);
    if (kind === "top_n") {
      return (
        followAddon +
        (askedN != null ? `\n[Wajib: maks **${askedN}** kandidat saja, format singkat.]` : "") +
        buildCvRankingHint(context, query, askedN, activeCriteria) +
        `\n\n${CONCISE_TOP_N_TEMPLATE}`
      );
    }
    if (kind === "single_candidate") {
      return (
        followAddon +
        `\n\n[Instruksi: profil **satu** kandidat saja — bullet singkat, tanpa skor JD kecuali diminta.]`
      );
    }
    return followAddon;
  }

  const kind = classifyHrQuery(query, context);
  const criteria = resolveActiveCriteria(activeCriteria, context);
  const criteriaNote =
    criteria && kind === "top_n"
      ? `\n\n[Instruksi penting: HR sudah memilih kriteria lowongan **${criteria.title}** (${criteria.department}). ` +
      `Pertanyaan seperti "posisi ini", "di posisi tersebut", atau "paling cocok" merujuk ke kriteria ini. ` +
      `Evaluasi semua CV terhadap persyaratan JD **${criteria.title}**, meskipun pertanyaan tidak menyebut nama role secara eksplisit.]`
      : "";

  if (kind === "list_names") {
    return `\n\n[Instruksi: HR hanya minta **daftar nama** dari CV — jawab format ## Daftar kandidat, tanpa Rekomendasi utama/skor.]${LIST_NAMES_TEMPLATE}`;
  }
  if (kind === "top_n") {
    return (
      criteriaNote +
      (askedN != null
        ? `\n\n[Wajib: Rekomendasi utama = **${askedN}** kandidat terbaik dengan bukti di CV.]`
        : "") +
      buildCvRankingHint(context, query, askedN, activeCriteria) +
      `\n\n${TOP_N_OUTPUT_TEMPLATE}`
    );
  }
  if (kind === "single_candidate") {
    return `\n\n[Instruksi: HR menanyakan **profil / data diri / informasi** satu kandidat. Jawab natural dan terstruktur seperti asisten HR. Satu kandidat saja; tanpa skor JD kecuali diminta.]${SINGLE_CANDIDATE_TEMPLATE}`;
  }
  if (kind === "general") {
    return `\n\n[Instruksi: Jawab **sesuai maksud pertanyaan** HR secara natural. Jika pertanyaan faktual tentang isi CV/JD, jawab langsung. Jangan pakai format screening massal atau skor kecocokan JD kecuali HR meminta penilaian, perbandingan, atau rekomendasi.]`;
  }
  return "";
}

function findCvSnippet(cvBody: string | undefined, queryText: string): string {
  if (!cvBody) return "";
  const normalizedCv = cvBody.replace(/\s+/g, " ");

  const cleanQuery = queryText.replace(/^(?:pengalaman|skill|proyek):\s*/i, "").trim();

  const idx = normalizedCv.toLowerCase().indexOf(cleanQuery.toLowerCase());
  if (idx !== -1) {
    const start = Math.max(0, idx - 150);
    const end = Math.min(normalizedCv.length, idx + cleanQuery.length + 150);
    let snippet = normalizedCv.slice(start, end).trim();
    if (start > 0) snippet = "..." + snippet;
    if (end < normalizedCv.length) snippet = snippet + "...";
    return snippet;
  }

  const sentences = cvBody.split(/[.\n]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  let bestSent = "";
  let maxOverlap = 0;

  const queryWords = new Set(cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (queryWords.size === 0) return cvBody.slice(0, 300) + "...";

  for (const sent of sentences) {
    const sentWords = sent.toLowerCase().split(/\s+/);
    let overlap = 0;
    for (const w of sentWords) {
      if (queryWords.has(w)) overlap++;
    }
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestSent = sent;
    }
  }

  if (bestSent && maxOverlap > 0) {
    const idx2 = normalizedCv.toLowerCase().indexOf(bestSent.toLowerCase());
    if (idx2 !== -1) {
      const start = Math.max(0, idx2 - 100);
      const end = Math.min(normalizedCv.length, idx2 + bestSent.length + 100);
      let snippet = normalizedCv.slice(start, end).trim();
      if (start > 0) snippet = "..." + snippet;
      if (end < normalizedCv.length) snippet = snippet + "...";
      return snippet;
    }
    return bestSent;
  }

  return cvBody.slice(0, 300).trim() + "...";
}

function formatCandidateEvidence(r: RankedCandidate, roleLabel: string): string[] {
  const filtered = filterQuotesByRoleRelevance(
    dedupeQuotes(r.quotes.filter((q) => q && !isEvidenceFluff(q))),
    roleLabel
  );

  const expItems: string[] = [];
  const skillItems: string[] = [];

  for (const item of filtered) {
    if (item.startsWith("Skill:")) {
      const s = item.replace(/^skill:\s*/i, "").trim();
      if (s) skillItems.push(s);
    } else if (item.startsWith("Pengalaman:") || item.startsWith("Proyek:")) {
      const e = item.replace(/^(?:pengalaman|proyek):\s*/i, "").trim();
      if (e) expItems.push(e);
    } else {
      expItems.push(item);
    }
  }

  const uniqueExp = Array.from(new Set(expItems));
  const uniqueSkills = Array.from(new Set(skillItems));

  const finalBullets: string[] = [];
  let citationIndex = 1;

  const formatItemWithCitation = (item: string) => {
    const snippet = findCvSnippet(r.cvBody, item);
    const cleanSnippet = snippet.replace(/[|"]/g, " ");
    const titleAttr = `${r.filename}|${cleanSnippet}`;
    const citation = ` [${citationIndex}](#citation-${r.name.replace(/\s+/g, "-")}-${citationIndex} "${titleAttr}")`;
    citationIndex++;
    return `${item}${citation}`;
  };

  const joinItems = (items: string[], conj = "serta") => {
    if (items.length === 0) return "";
    const formatted = items.map(formatItemWithCitation);
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} ${conj} ${formatted[1]}`;
    return `${formatted.slice(0, -1).join(", ")}, ${conj} ${formatted[formatted.length - 1]}`;
  };

  if (uniqueExp.length > 0 && uniqueSkills.length > 0) {
    const combinedExp = joinItems(uniqueExp, "serta");
    const combinedSkill = joinItems(uniqueSkills, "dan");
    finalBullets.push(`**Pengalaman:** ${combinedExp}`);
    finalBullets.push(`**Skill:** ${combinedSkill}`);
  } else if (uniqueExp.length > 0) {
    uniqueExp.slice(0, 2).forEach((exp) => {
      finalBullets.push(`**Pengalaman:** ${formatItemWithCitation(exp)}`);
    });
  } else if (uniqueSkills.length > 0) {
    uniqueSkills.slice(0, 2).forEach((skill) => {
      finalBullets.push(`**Skill:** ${formatItemWithCitation(skill)}`);
    });
  }

  return finalBullets;
}

function formatCandidateBlockCompact(r: RankedCandidate, index: number, roleLabel: string): string {
  const evidence = formatCandidateEvidence(r, roleLabel);
  let md = `### ${index}. ${r.name}\n`;
  md += `- **Skor:** ${r.score}/100\n`;
  if (evidence.length > 0) {
    for (const q of evidence) md += `- ${q}\n`;
  } else {
    md += `- Belum ada bukti kuat untuk **${roleLabel}**.\n`;
  }
  md += `- **Rekomendasi:** ${buildRecommendationLabel(r.score)}\n\n`;
  return md;
}

/** Versi ringkas untuk follow-up top-N (tanpa ringkasan eksekutif panjang) */
export function buildCompactTopNMarkdown(
  context: string,
  query: string,
  topN: number,
  activeCriteria?: ActiveCriteriaMeta | null
): string | null {
  const ranked = rankCandidates(context, query, activeCriteria);
  if (ranked.length === 0) return null;

  const role = resolveScreeningRole(query, activeCriteria, context);
  const { picks } = pickTopCandidates(ranked, query, topN);
  if (picks.length === 0) return null;

  let md = `## Rekomendasi\n\n`;
  picks.forEach((r, i) => {
    md += formatCandidateBlockCompact(r, i + 1, role.roleLabel);
  });
  return md.trim();
}

/** Pasca-proses jawaban sesuai jenis pertanyaan */
export function applyPostProcessAnswer(
  answer: string,
  context: string,
  query: string,
  askedN: number | null,
  activeCriteria?: ActiveCriteriaMeta | null,
  opts?: { followUp?: boolean; history?: ChatHistoryTurn[] }
): string {
  const followUp = opts?.followUp ?? false;
  const history = opts?.history ?? [];
  const kind = classifyHrQuery(query, context);

  if (kind === "greeting") return answer;
  if (kind === "list_names") {
    const list = buildCandidateListMarkdown(context);
    if (list) return followUp ? polishConciseFollowUpAnswer(list, query) : list;
    return followUp ? polishConciseFollowUpAnswer(answer, query) : answer;
  }
  if (kind === "top_n") {
    if (followUp) {
      const n = askedN ?? 5;
      const compact = buildCompactTopNMarkdown(context, query, n, activeCriteria);
      if (compact) return compact;
    }
    return applyRankingToAnswer(answer, context, query, askedN, activeCriteria);
  }
  if (kind === "single_candidate") {
    if (answerLooksLikeWrongScreening(query, answer)) {
      const refName = resolveFollowUpCandidateName(query, history);
      const qAug = refName ? `${query} ${refName}` : query;
      const profile = buildSingleCandidateProfileMarkdown(context, qAug);
      if (profile) return followUp ? polishConciseFollowUpAnswer(profile, query) : profile;
    }
    return followUp ? polishConciseFollowUpAnswer(answer, query) : answer;
  }

  if (followUp) {
    const refName = resolveFollowUpCandidateName(query, history);
    if (refName && answerLooksLikeWrongScreening(query, answer)) {
      const profile = buildSingleCandidateProfileMarkdown(context, `${query} ${refName}`);
      if (profile) return polishConciseFollowUpAnswer(profile, query);
    }
    return polishConciseFollowUpAnswer(answer, query);
  }
  return answer;
}

export function buildCvRankingHint(
  context: string,
  query: string,
  topN: number | null,
  activeCriteria?: ActiveCriteriaMeta | null
): string {
  if (classifyHrQuery(query, context) !== "top_n") return "";

  const ranked = rankCandidates(context, query, activeCriteria);
  if (ranked.length === 0) return "";

  const role = resolveScreeningRole(query, activeCriteria, context);

  const n = topN ?? 5;
  const mentioned = candidatesMentionedInQuery(query, ranked);
  const explicitOnly = isExplicitNamedComparison(query, mentioned.length);
  const { picks } = pickTopCandidates(ranked, query, n);

  const listForHint = explicitOnly ? mentioned : ranked;

  let hint =
    `\n\n=== DAFTAR PERINGKAT (${role.roleLabel}${explicitOnly ? "; hanya kandidat yang disebut HR" : ""}) ===\n`;

  listForHint.forEach((r, i) => {
    hint += `${i + 1}. **${r.name}** (CV: ${r.filename}) — skor ${r.score}/100`;
    if (r.depthMeta) {
      hint += ` (${r.depthMeta.matchedReqs} syarat JD, ${r.depthMeta.expCount} pengalaman/proyek, ${r.depthMeta.skillCount} skill)`;
    }
    if (r.quotes[0]) hint += `\n   Bukti: "${r.quotes[0]}"`;
    hint += "\n";
  });

  hint += `\n**Wajib:**\n`;
  hint += `- Skor = evaluasi **holistik CV** (cakupan JD + kedalaman pengalaman/proyek + jumlah skill), **bukan** sekadar kecocokan kata kunci.\n`;
  hint += `- Kandidat dengan **lebih banyak** pengalaman/skill relevan JD harus **di atas** yang buktinya sedikit.\n`;
  hint += `- Posisi / kriteria aktif: **${role.roleLabel}**.\n`;

  if (explicitOnly) {
    hint +=
      `- HR **hanya** membandingkan: **${mentioned.map((m) => m.name).join(", ")}**. ` +
      `Jawab **hanya** untuk ${mentioned.length} orang ini.\n`;
    hint += `- **Dilarang** menyebut kandidat lain, ## Kandidat lain, atau file CV lain.\n`;
    hint += `- Di ## Ringkasan, nyatakan siapa **lebih cocok** di antara keduanya (atau sebutkan jika seri/tidak ada bukti).\n`;
  } else if (mentioned.length >= 2) {
    hint += `- HR menyebut: **${mentioned.map((m) => m.name).join(", ")}** — prioritaskan mereka di ## Rekomendasi utama.\n`;
    hint += `- Kandidat lain boleh singkat di ## Kandidat lain.\n`;
  } else {
    hint += `- ## Rekomendasi utama = paling banyak **${n}** kandidat teratas untuk **${role.roleLabel}**.\n`;
    hint += `- Di ## Kandidat lain sebut pelamar lain secara ringkas.\n`;
  }

  hint += `- Kutipan bukti hanya dari CV file kandidat yang sama.\n`;

  if (picks.length > 0) {
    hint += `\nUrutan sinyal untuk pertanyaan ini: ${picks.map((p) => p.name).join(" > ")}.\n`;
  }

  return hint;
}

export const TOP_N_OUTPUT_TEMPLATE = `
FORMAT WAJIB:
## Ringkasan eksekutif
(2–3 kalimat profesional: posisi yang dinilai, jumlah CV, dan arah rekomendasi)

## Rekomendasi utama
### 1. [Nama dari daftar peringkat] (CV: file.pdf)
- **Skor Kecocokan JD:** XX/100
- **Rangkuman Rekomendasi:** (alasan profesional kesesuaian profil kandidat)
- **Bukti Kompetensi & Pengalaman (Eksplisit):**
  - **Pengalaman:** (gabungan tugas/pengalaman terkait)
  - **Skill:** (gabungan keahlian/sertifikasi terkait)
- **Kesenjangan Kualifikasi (Gap Analysis):** (kualifikasi JD yang belum terbukti kuat di CV)
- **Rekomendasi Tindak Lanjut:** (saran langkah rekrutmen berikutnya)

## Kandidat lain
- **[Nama]** (file.pdf): satu kalimat ringkas per orang
`;

function buildRecommendationLabel(score: number): string {
  if (score >= 70) return "Sangat disarankan untuk dilanjutkan ke tahap wawancara kompetensi teknis.";
  if (score >= 40) return "Dapat dipertimbangkan untuk tahap seleksi berikutnya dengan klarifikasi portofolio/uji kompetensi.";
  return "Kualifikasi saat ini belum sesuai dengan persyaratan minimal posisi terkait.";
}

function buildGapNote(score: number, roleLabel: string): string {
  if (score >= 70) {
    return `Kualifikasi pelengkap (nice-to-have) dari kriteria **${roleLabel}** belum tertera sepenuhnya secara eksplisit; disarankan untuk diverifikasi pada saat sesi wawancara.`;
  }
  if (score >= 40) {
    return `Terdapat kesenjangan (*gap*) pada kedalaman pengalaman atau penguasaan spesifik kriteria **${roleLabel}** yang perlu diklarifikasi lebih lanjut.`;
  }
  return `CV belum menunjukkan pemenuhan terhadap kriteria utama dan kompetensi inti yang disyaratkan untuk posisi **${roleLabel}**.`;
}

function buildShortAlasan(r: RankedCandidate, roleLabel: string, bullets: string[]): string {
  if (r.score < 12) return `Kualifikasi yang tercantum di CV belum memadai untuk kebutuhan posisi **${roleLabel}**.`;
  const name = r.name;
  if (r.score >= 70) {
    return `**${name}** merupakan kandidat yang sangat kuat untuk posisi **${roleLabel}** karena memiliki bukti pengalaman kerja dan kompetensi teknis yang selaras dengan kriteria utama.`;
  }
  if (r.score >= 40) {
    return `**${name}** menunjukkan potensi kecocokan menengah untuk posisi **${roleLabel}**, dengan sebagian besar persyaratan dasar telah terpenuhi di CV.`;
  }
  return `**${name}** memiliki beberapa indikasi relevansi awal untuk posisi **${roleLabel}**, namun memerlukan klarifikasi lebih lanjut terkait detail tugasnya.`;
}

function formatCandidateBlock(
  r: RankedCandidate,
  index: number,
  roleLabel: string
): string {
  const evidence = formatCandidateEvidence(r, roleLabel);

  let md = `### ${index}. ${r.name} (CV: ${r.filename})\n`;
  md += `- **Skor Kecocokan JD:** ${r.score}/100\n`;
  md += `- **Rangkuman Rekomendasi:** ${buildShortAlasan(r, roleLabel, evidence)}\n`;
  md += `- **Bukti Kompetensi & Pengalaman (Eksplisit):**\n`;
  if (evidence.length > 0) {
    for (const q of evidence) md += `  - ${q}\n`;
  } else if (r.score >= 12 && r.reason.includes("melalui:")) {
    const skills = r.reason.replace(/^.*melalui:\s*/i, "").replace(/\.$/, "");
    md += `  - **Skill Relevan:** ${skills}\n`;
  } else {
    md += `  - Belum ada bukti keahlian atau rincian tugas yang terdokumentasi jelas di CV untuk kriteria **${roleLabel}**.\n`;
  }
  md += `- **Kesenjangan Kualifikasi (Gap Analysis):** ${buildGapNote(r.score, roleLabel)}\n`;
  md += `- **Rekomendasi Tindak Lanjut:** ${buildRecommendationLabel(r.score)}\n\n`;
  return md;
}

function dedupeQuotes(quotes: string[]): string[] {
  const trimmed = quotes
    .map((q) => prepareEvidenceForDisplay(q))
    .filter((q) => q && !isLowValueEvidence(q) && !isIncompleteFragment(q.replace(/^(?:skill|pengalaman|proyek):\s*/i, "")) && !isExperienceHeaderLine(q.replace(/^(?:skill|pengalaman|proyek):\s*/i, "")));

  const out: string[] = [];
  for (const q of trimmed) {
    let skip = false;
    for (let i = 0; i < out.length; i++) {
      const prev = out[i];
      if (prev.includes(q) || q.includes(prev)) {
        if (q.length > prev.length) out[i] = q;
        skip = true;
        break;
      }
      if (quoteWordOverlap(prev, q) >= 0.55) {
        const qGame = /\b(unity|game|flutter|unreal|godot|gameplay)\b/i.test(q);
        const pGame = /\b(unity|game|flutter|unreal|godot|gameplay)\b/i.test(prev);
        if (qGame && !pGame) out[i] = q;
        skip = true;
        break;
      }
    }
    if (!skip) out.push(q);
  }
  return out;
}

function quoteWordOverlap(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  Array.from(wa).forEach((w) => {
    if (wb.has(w)) inter++;
  });
  return inter / Math.min(wa.size, wb.size);
}

/** Prioritaskan kutipan yang benar-benar relevan dengan role yang dinilai */
function filterQuotesByRoleRelevance(quotes: string[], roleLabel: string): string[] {
  if (quotes.length <= 1) return quotes;
  const rl = roleLabel.toLowerCase();

  if (/game|unity|gamedev/.test(rl)) {
    const core = quotes.filter(
      (q) =>
        /\b(unity|game|unreal|godot|flutter|gameplay|cocos|game\s*dev)\b/i.test(q) &&
        !isIncompleteFragment(q)
    );
    if (core.length > 0) {
      core.sort((a, b) => {
        const aDone = /[.!?]$/.test(a.trim()) ? 1 : 0;
        const bDone = /[.!?]$/.test(b.trim()) ? 1 : 0;
        return bDone - aDone || b.length - a.length;
      });
      const top = core[0];
      if (
        /\bunity\b/i.test(top) &&
        /\bgame\b/i.test(top) &&
        /[.!?]$/.test(top.trim())
      ) {
        return [top];
      }
      return core.slice(0, 2);
    }
  }
  if (/backend/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(backend|spring|node\.?js|rest\s*api|django|fastapi|java|python|laravel)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/frontend/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(react|vue|angular|next\.?js|frontend|typescript|javascript|html|css)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/mobile|flutter/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(mobile|flutter|android|ios|kotlin|swift|firebase)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/marketing|sosmed|content|seo/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(marketing|seo|sem|ads|sosmed|social\s*media|copywriting|content|campaign|roas|fmcg)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/produksi|manufaktur/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(produksi|manufaktur|fmcg|gmp|k3|sop|shift|lini)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/rnd|food|teknologi\s*pangan/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(r&d|rnd|food|pangan|kimia|biologi|formulasi|sensorik|lab|haccp)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/supply\s*chain|logistik/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(supply|chain|logistik|inventory|gudang|mrp|erp|sap|oracle)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }
  if (/hr|recruitment|rekrutmen/.test(rl)) {
    const core = quotes.filter((q) =>
      /\b(hr|rekrutmen|recruitment|sourcing|interview|psikologi|onboarding)\b/i.test(q)
    );
    if (core.length > 0) return core.slice(0, 2);
  }

  return quotes.slice(0, 2);
}

export function buildTopNRecommendationsMarkdown(
  context: string,
  query: string,
  topN: number,
  activeCriteria?: ActiveCriteriaMeta | null
): string | null {
  const ranked = rankCandidates(context, query, activeCriteria);
  if (ranked.length === 0) return null;

  const role = resolveScreeningRole(query, activeCriteria, context);
  const mentioned = candidatesMentionedInQuery(query, ranked);
  const { picks, rest, explicitNamedOnly } = pickTopCandidates(ranked, query, topN);

  if (picks.length === 0) {
    const allBelow = ranked.every((r) => r.score < MIN_SCORE_FOR_RECOMMENDATION);
    if (allBelow) {
      let md = `## Ringkasan eksekutif\n`;
      md += `Dari ${ranked.length} CV yang dipindai, **tidak ada kandidat yang memenuhi persyaratan minimum** untuk posisi **${role.roleLabel}**.\n\n`;

      md += `## Hasil Screening\n`;
      md += `Semua kandidat menunjukkan ketidaksesuaian signifikan dengan kriteria JD **${role.roleLabel}**.\n\n`;

      md += `## Daftar Kandidat (Tidak Lolos)\n`;
      for (const r of ranked) {
        const reason = r.score <= 0
          ? `tidak ditemukan bukti skill/pengalaman relevan untuk **${role.roleLabel}**`
          : `skor ${r.score}/100 — di bawah ambang minimum (${MIN_SCORE_FOR_RECOMMENDATION}/100)`;
        md += `- **${r.name}** (CV: ${r.filename}): ${reason}.\n`;
      }

      md += `\n_Saran: Tinjau ulang kriteria JD atau perluas pencarian kandidat yang lebih sesuai dengan posisi **${role.roleLabel}**._\n`;
      return md.trim();
    }
    return null;
  }

  const winner = picks[0];
  const runnerUp = picks[1];

  let md = `## Ringkasan eksekutif\n`;
  if (explicitNamedOnly && picks.length >= 2) {
    if (winner.score > runnerUp.score + 5) {
      md += `Untuk posisi **${role.roleLabel}**, **${winner.name}** lebih unggul daripada **${runnerUp.name}** berdasarkan bukti di CV (skor ${winner.score}/100 vs ${runnerUp.score}/100). `;
    } else if (winner.score > runnerUp.score) {
      md += `Untuk posisi **${role.roleLabel}**, **${winner.name}** sedikit lebih unggul daripada **${runnerUp.name}**; pertimbangkan wawancara lanjut untuk keduanya. `;
    } else {
      md += `Perbandingan **${role.roleLabel}** antara **${mentioned.map((m) => m.name).join(" dan ")}** tidak menunjukkan perbedaan kuat di CV (skor seri/rendah). `;
    }
    md += `Hanya kandidat yang Anda sebut yang dinilai.\n\n`;
  } else if (mentioned.length >= 2) {
    md += `Screening **${role.roleLabel}** untuk ${mentioned.map((m) => m.name).join(", ")} berdasarkan ${ranked.length} CV yang tersedia. `;
    md += `Rekomendasi utama di bawah memuat bukti dari masing-masing dokumen.\n\n`;
  } else {
    md += `Dari ${ranked.length} CV yang dipindai, ditemukan **${picks.length} kandidat** yang memenuhi syarat minimum untuk posisi **${role.roleLabel}**. `;
    if (picks[0]) {
      md += `Kandidat teratas: **${picks[0].name}** (skor ${picks[0].score}/100).`;
    }
    md += `\n\n`;
  }

  md += explicitNamedOnly ? `## Perbandingan kandidat\n` : `## Rekomendasi utama\n`;

  picks.forEach((r, i) => {
    md += formatCandidateBlock(r, i + 1, role.roleLabel);
  });

  if (!explicitNamedOnly && rest.length > 0) {
    md += `## Kandidat lain\n`;
    for (const r of rest) {
      const note =
        r.score < MIN_SCORE_ABSOLUTE
          ? `tidak ditemukan bukti skill/pengalaman relevan untuk **${role.roleLabel}**`
          : r.score < MIN_SCORE_FOR_RECOMMENDATION
            ? `skor ${r.score}/100 — belum memenuhi ambang rekomendasi untuk posisi ini`
            : `skor ${r.score}/100 — di bawah kandidat rekomendasi utama`;
      md += `- **${r.name}** (CV: ${r.filename}): ${note}.\n`;
    }
    md += "\n";
  }

  md += `_Penilaian berdasarkan teks CV dan kriteria JD **${role.roleLabel}** yang dipilih. Verifikasi akhir disarankan melalui wawancara dan pengecekan portofolio._\n`;

  return md.trim();
}

/** Gabungkan jawaban model dengan rekomendasi terstruktur dari peringkat CV */
export function applyRankingToAnswer(
  answer: string,
  context: string,
  query: string,
  askedN: number | null,
  activeCriteria?: ActiveCriteriaMeta | null
): string {
  if (!isTopNStyleQuery(query, context)) return normalizeTopNAnswer(answer, askedN);

  const ranked = rankCandidates(context, query, activeCriteria);
  const mentioned = candidatesMentionedInQuery(query, ranked);
  const explicitOnly = isExplicitNamedComparison(query, mentioned.length);

  const n = explicitOnly ? mentioned.length : mentioned.length >= 2 ? mentioned.length : askedN ?? 5;

  const structured = buildTopNRecommendationsMarkdown(context, query, n, activeCriteria);
  if (!structured) return normalizeTopNAnswer(answer, askedN);

  return structured;
}

function isNegativeBlock(block: string): boolean {
  const b = block.toLowerCase();
  if (/nama tidak tersurat/i.test(b)) return true;
  if (/\(cv:\s*\.{2,}\)/i.test(b) || /\(cv:\s*\)/i.test(b)) return true;
  if (/skor[^:\n]*:\s*0\b/.test(b) && !/unity|\bgame\b/i.test(b)) return true;
  if (/bukti[^:\n]*:.*tidak mencantumkan/i.test(b) && !/unity|unreal|godot|\bgame\b/i.test(b)) {
    return true;
  }
  return false;
}

export function normalizeTopNAnswer(answer: string, askedN: number | null): string {
  if (!/rekomendasi utama/i.test(answer)) return answer;

  let a = answer;
  const lainRe = /(##\s*Kandidat lain[^\n]*\n)([\s\S]*?)(?=\n##\s+|\n*$)/i;
  const lainM = a.match(lainRe);
  if (lainM) {
    let body = lainM[2];
    body = body.replace(/^###\s+/gm, "- ");
    a = a.replace(lainM[0], lainM[1] + body);
  }

  const utamaRe = /(##\s*Rekomendasi utama[^\n]*\n)([\s\S]*?)(?=\n##\s+Kandidat lain|\n##\s+[^#]|\n*$)/i;
  const utamaM = a.match(utamaRe);
  if (!utamaM) return a;

  const parts = (utamaM[2] ?? "").split(/(?=^###\s)/m);
  const blocks: string[] = [];
  const dropped: string[] = [];

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    if (isNegativeBlock(block)) {
      const hm = block.match(/^###\s+(.+?)\s*\(CV:\s*([^)]+)\)/im);
      const label = hm ? `${hm[1].trim()} (${hm[2].trim()})` : "";
      if (label) dropped.push(`- **${label}**: tidak memenuhi bukti untuk rekomendasi utama.`);
      continue;
    }
    blocks.push(block);
  }

  const maxN = askedN ?? 5;
  const kept = blocks.slice(0, maxN).map((block, idx) =>
    block.replace(/^###\s+(\d+\.\s*)?/m, `### ${idx + 1}. `)
  );
  let newUtama = utamaM[1] + (parts[0] ?? "") + kept.join("");
  a = a.replace(utamaM[0], newUtama);

  if (dropped.length > 0 && /##\s*Kandidat lain/i.test(a)) {
    a = a.replace(/(##\s*Kandidat lain[^\n]*\n)/i, `$1${dropped.join("\n")}\n`);
  }

  return a.replace(/\n{4,}/g, "\n\n\n").trim();
}

export function isTopNStyleQuery(query: string, context?: string): boolean {
  return classifyHrQuery(query, context) === "top_n";
}

function extractRequestedCount(s: string): number | null {
  if (/(nama|namanya)/i.test(s) && !/\d+\s*kandidat\s+(terbaik|cocok|paling)/i.test(s)) {
    const onlyNames = /sebutkan\s+\d+\s+nama/i.test(s);
    if (!onlyNames && /sebutkan\s+(semua\s+)?nama/i.test(s)) return null;
  }
  const m = s.match(/sebutkan\s+(\d+)(?!\s*nama)|(\d+)\s*kandidat\s*(?:terbaik|cocok|yang cocok|paling)?/i);
  if (m) {
    const n = parseInt(m[1] || m[2], 10);
    if (n >= 1 && n <= 20) return n;
  }
  const words: [string, number][] = [
    ["dua", 2],
    ["tiga", 3],
    ["empat", 4],
  ];
  for (const [w, n] of words) {
    if (new RegExp(`\\b${w}\\s+kandidat`).test(s)) return n;
  }
  return null;
}

/** Coba ambil nama dari pola nama file (cv_budi_santoso.pdf, Resume-John-Doe.pdf) */
export function extractNameFromFilename(filename: string): string | null {
  const base = (filename || "").replace(/\.[^.]+$/i, "").trim();
  if (!base) return null;

  let cleaned = base
    .replace(/^(cv|resume|curriculum[\s_-]?vitae|lamaran|pelamar|applicant)[\s_.-]*/i, "")
    .replace(/^(dummy[_\s-]?cv|sample[_\s-]?cv)[\s_.-]*/i, "")
    .replace(/^\d+[\s_.-]*/, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /^\d+$/.test(cleaned) || cleaned.length < 4) return null;
  if (/^[a-z0-9]{20,}$/i.test(cleaned.replace(/\s/g, ""))) return null;

  const titled = titleCaseName(cleaned);
  if (looksLikePersonName(titled)) return titled;

  const tokens = cleaned.split(/\s+/).filter((t) => /^[a-z\u00C0-\u024F.'-]{2,}$/i.test(t));

  if (tokens.length >= 1 && tokens.length <= 5) {
    const joined = titleCaseName(tokens.join(" "));
    if (looksLikePersonName(joined)) return joined;
  }
  return null;
}

/** Baris identitas di awal segmen CV_ONLY */
export function formatCvIdentityLine(text: string, filename?: string): string {
  const name = resolveApplicantName(text, filename ?? "");
  if (!name) return "";
  return `>>> NAMA PELAMAR DI FILE INI: ${name}\n\n`;
}