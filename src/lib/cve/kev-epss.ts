import { CveCache } from "./cache";

export interface KevRecord {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  notes: string;
}

export interface EpssRecord {
  cve: string;
  epss: number;
  percentile: number;
}

// In-memory set for rapid lookup of KEV records
let kevMapCache: Map<string, KevRecord> | null = null;
let lastKevFetch = 0;

/**
 * Fetch and cache the CISA KEV catalog (12h TTL)
 */
export async function getCisaKevCatalog(): Promise<Map<string, KevRecord>> {
  const now = Date.now();
  if (kevMapCache && now - lastKevFetch < 12 * 3600 * 1000) {
    return kevMapCache;
  }

  const cached = CveCache.get<KevRecord[]>("cisa:kev:catalog");
  if (cached && cached.length > 0) {
    kevMapCache = new Map(cached.map((k) => [k.cveID.toUpperCase(), k]));
    lastKevFetch = now;
    return kevMapCache;
  }

  try {
    const res = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      const vulns: KevRecord[] = data?.vulnerabilities || [];
      kevMapCache = new Map(vulns.map((k) => [k.cveID.toUpperCase(), k]));
      lastKevFetch = now;
      CveCache.set("cisa:kev:catalog", "CISA_KEV", vulns, 12 * 3600 * 1000);
      return kevMapCache;
    }
  } catch (err) {
    console.warn("[KEV] Failed to fetch CISA KEV catalog:", err);
  }

  return kevMapCache || new Map();
}

export async function checkKevStatus(cveId: string): Promise<{
  isKev: boolean;
  dueDate: string | null;
  vulnerabilityName: string | null;
}> {
  const map = await getCisaKevCatalog();
  const match = map.get(cveId.trim().toUpperCase());
  if (match) {
    return {
      isKev: true,
      dueDate: match.dueDate,
      vulnerabilityName: match.vulnerabilityName,
    };
  }
  return { isKev: false, dueDate: null, vulnerabilityName: null };
}

/**
 * Query FIRST EPSS score for one or multiple CVEs
 */
export async function queryEpssScore(cveId: string): Promise<EpssRecord | null> {
  const normalized = cveId.trim().toUpperCase();
  const cacheKey = `epss:${normalized}`;
  const cached = CveCache.get<EpssRecord>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(normalized)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    const dataList = json?.data || [];
    if (dataList.length > 0) {
      const row = dataList[0];
      const record: EpssRecord = {
        cve: normalized,
        epss: parseFloat(row.epss),
        percentile: parseFloat(row.percentile),
      };
      CveCache.set(cacheKey, "FIRST_EPSS", record, 24 * 3600 * 1000);
      return record;
    }
  } catch (err) {
    console.warn(`[EPSS] Query failed for ${cveId}:`, err);
  }

  return null;
}
