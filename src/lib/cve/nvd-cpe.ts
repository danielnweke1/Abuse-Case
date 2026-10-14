import { CveCache } from "./cache";
import { NvdRateLimiter } from "./rate-limiter";

export interface ResolvedCpe {
  cpe: string;
  vendor: string;
  product: string;
  version: string | null;
  confidence: "exact" | "high" | "heuristic" | "ambiguous";
  candidates?: string[];
}

// Well-known curated CPE mappings for common components
const KNOWN_CPE_MAP: Record<string, { vendor: string; product: string }> = {
  postgresql: { vendor: "postgresql", product: "postgresql" },
  postgres: { vendor: "postgresql", product: "postgresql" },
  redis: { vendor: "redis", product: "redis" },
  next: { vendor: "zeit", product: "next.js" },
  "next.js": { vendor: "zeit", product: "next.js" },
  gin: { vendor: "gin-gonic", product: "gin" },
  express: { vendor: "expressjs", product: "express" },
  nginx: { vendor: "f5", product: "nginx" },
  docker: { vendor: "docker", product: "docker" },
  node: { vendor: "nodejs", product: "node.js" },
  "node.js": { vendor: "nodejs", product: "node.js" },
  golang: { vendor: "golang", product: "go" },
  go: { vendor: "golang", product: "go" },
  spring: { vendor: "vmware", product: "spring_framework" },
  "spring-boot": { vendor: "vmware", product: "spring_boot" },
  django: { vendor: "djangoproject", product: "django" },
  fastapi: { vendor: "tiangolo", product: "fastapi" },
  flask: { vendor: "palletsprojects", product: "flask" },
  mysql: { vendor: "oracle", product: "mysql" },
  mongodb: { vendor: "mongodb", product: "mongodb" },
};

export async function resolveComponentCpe({
  name,
  vendor,
  version,
}: {
  name: string;
  vendor?: string | null;
  version?: string | null;
}): Promise<ResolvedCpe> {
  const normalizedName = name.trim().toLowerCase();
  const cacheKey = `cpe:${normalizedName}:${version || "any"}`;

  const cached = CveCache.get<ResolvedCpe>(cacheKey);
  if (cached) return cached;

  // 1. Check known mappings first for immediate, high-fidelity resolution
  if (KNOWN_CPE_MAP[normalizedName]) {
    const known = KNOWN_CPE_MAP[normalizedName];
    const cpe = `cpe:2.3:a:${known.vendor}:${known.product}:${version || "*"}:*:*:*:*:*:*:*`;
    const resolved: ResolvedCpe = {
      cpe,
      vendor: known.vendor,
      product: known.product,
      version: version || null,
      confidence: version ? "exact" : "high",
    };
    CveCache.set(cacheKey, "CPE_MAP", resolved, 7 * 24 * 3600 * 1000); // 7 day cache
    return resolved;
  }

  // 2. Query NVD CPE 2.0 API with Rate Limiting
  try {
    const queryTerm = `${vendor || ""} ${name}`.trim();
    const url = `https://services.nvd.nist.gov/rest/json/cpes/2.0?keywordSearch=${encodeURIComponent(queryTerm)}&resultsPerPage=5`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "AbuseCase-ThreatWorkbench/1.0",
    };
    if (process.env.NVD_API_KEY) {
      headers["apiKey"] = process.env.NVD_API_KEY;
    }

    const json = await NvdRateLimiter.schedule(async () => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`NVD CPE API returned status ${res.status}`);
      return res.json();
    });

    const products = json?.products || [];
    if (products.length > 0) {
      const primaryCpe = products[0]?.cpe?.cpeName;
      if (primaryCpe) {
        const resolved: ResolvedCpe = {
          cpe: primaryCpe,
          vendor: vendor || normalizedName,
          product: normalizedName,
          version: version || null,
          confidence: products.length === 1 ? "high" : "ambiguous",
          candidates: products.slice(0, 3).map((p: any) => p?.cpe?.cpeName),
        };
        CveCache.set(cacheKey, "NVD_CPE", resolved, 7 * 24 * 3600 * 1000);
        return resolved;
      }
    }
  } catch (err) {
    console.warn(`[CPE Resolver] NVD CPE lookup failed for ${name}:`, err);
  }

  // Fallback heuristic CPE
  const fallbackVendor = (vendor || normalizedName).replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "generic";
  const fallbackProduct = normalizedName.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "component";
  const safeVersion = (version && !version.includes("/") && !version.includes(":"))
    ? version.replace(/[^a-zA-Z0-9._-]/g, "")
    : "*";

  const fallbackCpe = `cpe:2.3:a:${fallbackVendor}:${fallbackProduct}:${safeVersion || "*"}:*:*:*:*:*:*:*`;

  const fallbackResult: ResolvedCpe = {
    cpe: fallbackCpe,
    vendor: fallbackVendor,
    product: fallbackProduct,
    version: version || null,
    confidence: "heuristic",
  };

  CveCache.set(cacheKey, "CPE_HEURISTIC", fallbackResult, 24 * 3600 * 1000);
  return fallbackResult;
}
