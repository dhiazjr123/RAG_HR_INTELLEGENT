import { promises as fs } from "fs";
import path from "path";
import {
  PARTNER_JD_CRITERIA,
  type PartnerJobCriteria,
} from "@/lib/partner-jd-criteria";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "jd-criteria.json");

type StoreFile = {
  updatedAt: string;
  criteria: PartnerJobCriteria[];
};

async function ensureStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
      return parsed;
    }
  } catch {
    // seed on first access
  }

  const seeded: StoreFile = {
    updatedAt: new Date().toISOString(),
    criteria: PARTNER_JD_CRITERIA.map((c) => ({
      ...c,
      approvalStatus: c.approvalStatus || "approved",
    })),
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(seeded, null, 2), "utf-8");
  return seeded;
}

async function writeStore(criteria: PartnerJobCriteria[]): Promise<StoreFile> {
  const payload: StoreFile = {
    updatedAt: new Date().toISOString(),
    criteria,
  };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export async function listJdCriteria(): Promise<{
  criteria: PartnerJobCriteria[];
  updatedAt: string;
}> {
  const store = await ensureStore();
  // Ensure default approvalStatus for legacy items
  const criteria = store.criteria.map((c) => ({
    ...c,
    approvalStatus: c.approvalStatus || "approved",
  }));
  return { criteria, updatedAt: store.updatedAt };
}

export async function getJdCriteriaById(id: string): Promise<PartnerJobCriteria | undefined> {
  const { criteria } = await listJdCriteria();
  return criteria.find((c) => c.id === id);
}

export async function createJdCriteria(
  item: PartnerJobCriteria
): Promise<PartnerJobCriteria> {
  const { criteria } = await listJdCriteria();
  if (criteria.some((c) => c.id === item.id)) {
    throw new Error(`ID kriteria "${item.id}" sudah digunakan.`);
  }
  const newItem = {
    ...item,
    approvalStatus: item.approvalStatus || "pending",
    pendingAt: item.pendingAt || new Date().toISOString(),
    hrRespondedAt: undefined,
  };
  const next = [...criteria, newItem];
  await writeStore(next);
  return newItem;
}

export async function updateJdCriteria(
  id: string,
  item: PartnerJobCriteria
): Promise<PartnerJobCriteria> {
  const { criteria } = await listJdCriteria();
  const idx = criteria.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error(`Kriteria "${id}" tidak ditemukan.`);

  const nextId = item.id.trim();
  if (nextId !== id && criteria.some((c) => c.id === nextId)) {
    throw new Error(`ID kriteria "${nextId}" sudah digunakan.`);
  }

  const next = [...criteria];
  next[idx] = {
    ...item,
    id: nextId,
    approvalStatus: "pending",
    pendingAt: new Date().toISOString(),
    hrRespondedAt: undefined,
  };
  await writeStore(next);
  return next[idx];
}

export async function approveJdCriteria(
  id: string,
  approve: boolean,
  reason?: string
): Promise<PartnerJobCriteria> {
  const { criteria } = await listJdCriteria();
  const idx = criteria.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error(`Kriteria "${id}" tidak ditemukan.`);

  const next = [...criteria];
  next[idx] = {
    ...next[idx],
    approvalStatus: approve ? "approved" : "pending",
    pendingReason: approve ? undefined : (reason || "Menunggu konfirmasi HR"),
    hrRespondedAt: new Date().toISOString(),
  };
  await writeStore(next);
  return next[idx];
}

export async function deleteJdCriteria(id: string): Promise<void> {
  const { criteria } = await listJdCriteria();
  const next = criteria.filter((c) => c.id !== id);
  if (next.length === criteria.length) {
    throw new Error(`Kriteria "${id}" tidak ditemukan.`);
  }
  await writeStore(next);
}
