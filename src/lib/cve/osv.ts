import { CveCache } from "./cache";

export interface OsvVulnerability {
  id: string; // OSV ID or GHSA ID
  cveId: string | null; // Extracted CVE alias
  summary: string;
  details?: string;
  affectedVersionRange?: string;
  fixedInVersion?: string | null;
  references: string[];
}

export async function queryOsvPackage({
  packageName,
  ecosystem,
  version,
}: {
  packageName: string;
  ecosystem?: "npm" | "PyPI" | "Go" | "Maven" | "crates.io";
  version?: string | null;
}): Promise<OsvVulnerability[]> {
  const cacheKey = `osv:${ecosystem || "any"}:${packageName}:${version || "any"}`;
  const cached = CveCache.get<OsvVulnerability[]>(cacheKey);
  if (cached) return cached;

  const results: OsvVulnerability[] = [];
  const ecosystemsToTry: Array<"npm" | "PyPI" | "Go" | "Maven" | "crates.io"> = ecosystem
    ? [ecosystem]
    : ["npm", "Go", "PyPI"];

  for (const eco of ecosystemsToTry) {
    try {
      const payload: any = {
        package: {
          name: packageName,
          ecosystem: eco,
        },
      };
      if (version) {
        payload.version = version;
      }

      const res = await fetch("https://api.osv.dev/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const vulns = data?.vulns || [];

      for (const v of vulns) {
        // Extract CVE alias if available
        const aliases: string[] = v.aliases || [];
        const cveAlias = aliases.find((a) => a.startsWith("CVE-")) || null;

        // Extract fixed version
        let fixedVersion: string | null = null;
        let versionRange: string | undefined = undefined;

        if (v.affected && v.affected[0]) {
          const aff = v.affected[0];
          const ranges = aff.ranges || [];
          for (const r of ranges) {
            const events = r.events || [];
            const fixedEvent = events.find((e: any) => e.fixed);
            if (fixedEvent) fixedVersion = fixedEvent.fixed;
          }
          if (aff.versions) {
            versionRange = `Affected: ${aff.versions.slice(0, 3).join(", ")}${aff.versions.length > 3 ? "..." : ""}`;
          }
        }

        results.push({
          id: v.id,
          cveId: cveAlias,
          summary: v.summary || v.details?.slice(0, 200) || "Vulnerability in package",
          details: v.details,
          affectedVersionRange: versionRange,
          fixedInVersion: fixedVersion,
          references: (v.references || []).map((r: any) => r.url).filter(Boolean),
        });
      }

      if (results.length > 0) break; // Found in this ecosystem
    } catch (err) {
      console.warn(`[OSV] Failed query for ${packageName} in ${eco}:`, err);
    }
  }

  CveCache.set(cacheKey, "OSV", results, 24 * 3600 * 1000); // 24h cache
  return results;
}
