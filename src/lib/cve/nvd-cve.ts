import { CveCache } from "./cache";
import { NvdRateLimiter } from "./rate-limiter";

export interface NvdCveItem {
  cveId: string;
  summary: string;
  cvssScore: number | null;
  cvssVersion: string | null;
  cvssVector: string | null;
  cweIds: string[];
  affectedVersionRange?: string;
  references: string[];
  publishedDate: string;
}

export async function queryNvdCveByCpe({
  cpe,
  version,
}: {
  cpe: string;
  version?: string | null;
}): Promise<NvdCveItem[]> {
  const cacheKey = `nvd:cve:${cpe}:${version || "any"}`;
  const cached = CveCache.get<NvdCveItem[]>(cacheKey);
  if (cached) return cached;

  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpe)}&resultsPerPage=10`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "AbuseCase-ThreatWorkbench/1.0",
  };
  if (process.env.NVD_API_KEY) {
    headers["apiKey"] = process.env.NVD_API_KEY;
  }

  const results: NvdCveItem[] = [];

  try {
    const json = await NvdRateLimiter.schedule(async () => {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`NVD CVE 2.0 API returned status ${res.status}`);
      }
      return res.json();
    });

    const vulnerabilities = json?.vulnerabilities || [];

    for (const item of vulnerabilities) {
      const cve = item?.cve;
      if (!cve || !cve.id) continue;

      // Extract description
      const descObj = (cve.descriptions || []).find((d: any) => d.lang === "en");
      const summary = descObj?.value || "No English description provided.";

      // Extract CVSS metrics (v3.1 preferred, then v3.0, then v2.0)
      let cvssScore: number | null = null;
      let cvssVersion: string | null = null;
      let cvssVector: string | null = null;

      const metrics = cve.metrics || {};
      const cvss31 = metrics.cvssMetricV31?.[0]?.cvssData;
      const cvss30 = metrics.cvssMetricV30?.[0]?.cvssData;
      const cvss20 = metrics.cvssMetricV2?.[0]?.cvssData;

      if (cvss31) {
        cvssScore = cvss31.baseScore;
        cvssVersion = "3.1";
        cvssVector = cvss31.vectorString;
      } else if (cvss30) {
        cvssScore = cvss30.baseScore;
        cvssVersion = "3.0";
        cvssVector = cvss30.vectorString;
      } else if (cvss20) {
        cvssScore = cvss20.baseScore;
        cvssVersion = "2.0";
        cvssVector = cvss20.vectorString;
      }

      // Extract CWEs
      const cweIds: string[] = [];
      const weaknesses = cve.weaknesses || [];
      for (const w of weaknesses) {
        for (const desc of w.description || []) {
          if (desc.value && desc.value.startsWith("CWE-")) {
            cweIds.push(desc.value);
          }
        }
      }

      const references: string[] = (cve.references || []).map((r: any) => r.url).filter(Boolean);

      results.push({
        cveId: cve.id,
        summary,
        cvssScore,
        cvssVersion,
        cvssVector,
        cweIds,
        references,
        publishedDate: cve.published || "",
      });
    }

    CveCache.set(cacheKey, "NVD_CVE", results, 24 * 3600 * 1000);
  } catch (err) {
    console.warn(`[NVD CVE] Query failed for CPE ${cpe}:`, err);
  }

  return results;
}
