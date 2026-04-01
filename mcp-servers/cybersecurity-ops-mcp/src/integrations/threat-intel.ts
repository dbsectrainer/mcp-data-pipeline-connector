/**
 * Cybersecurity Operations MCP — Threat Intelligence Feed Aggregator
 * BE EASY ENTERPRISES LLC
 *
 * Aggregates threat intelligence from multiple sources
 * (VirusTotal, AbuseIPDB, OTX AlienVault).
 */

import type { IndicatorType, ThreatIntelResult, ThreatIntelSource } from "../types.js";
import { hashIndicator } from "../utils/crypto.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface ThreatIntelConfig {
  virusTotalApiKey?: string;
  abuseIpDbApiKey?: string;
  otxApiKey?: string;
}

function loadConfig(): ThreatIntelConfig {
  return {
    virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY,
    abuseIpDbApiKey: process.env.ABUSEIPDB_API_KEY,
    otxApiKey: process.env.OTX_API_KEY,
  };
}

// ---------------------------------------------------------------------------
// Threat Intelligence Client
// ---------------------------------------------------------------------------

export class ThreatIntelClient {
  private config: ThreatIntelConfig;

  constructor(config?: ThreatIntelConfig) {
    this.config = config ?? loadConfig();
  }

  /**
   * Look up an indicator across all configured threat intelligence feeds.
   */
  async lookup(
    indicator: string,
    indicatorType: IndicatorType,
  ): Promise<ThreatIntelResult> {
    // Validate indicator format
    this.validateIndicator(indicator, indicatorType);

    // In production, these would run in parallel against live APIs.
    // We aggregate simulated results from each configured source.
    const sources: ThreatIntelSource[] = [];
    let riskScore = 0;
    let malicious = false;
    const tags: Set<string> = new Set();
    const malwareAssociations: Set<string> = new Set();
    const campaigns: Set<string> = new Set();

    if (this.config.virusTotalApiKey) {
      const vtResult = await this.queryVirusTotal(indicator, indicatorType);
      sources.push(vtResult.source);
      riskScore = Math.max(riskScore, vtResult.riskScore);
      if (vtResult.malicious) malicious = true;
      vtResult.tags.forEach((t) => tags.add(t));
      vtResult.malware.forEach((m) => malwareAssociations.add(m));
    }

    if (this.config.abuseIpDbApiKey && indicatorType === "ip") {
      const abuseResult = await this.queryAbuseIPDB(indicator);
      sources.push(abuseResult.source);
      riskScore = Math.max(riskScore, abuseResult.riskScore);
      if (abuseResult.malicious) malicious = true;
      abuseResult.tags.forEach((t) => tags.add(t));
    }

    if (this.config.otxApiKey) {
      const otxResult = await this.queryOTX(indicator, indicatorType);
      sources.push(otxResult.source);
      riskScore = Math.max(riskScore, otxResult.riskScore);
      if (otxResult.malicious) malicious = true;
      otxResult.tags.forEach((t) => tags.add(t));
      otxResult.campaigns.forEach((c) => campaigns.add(c));
    }

    // If no feeds are configured, return a baseline result
    if (sources.length === 0) {
      sources.push({
        name: "local-analysis",
        confidence: 30,
        last_updated: new Date().toISOString(),
      });
      riskScore = 15;
      tags.add("unchecked");
    }

    const recommendations = this.buildRecommendations(
      indicatorType,
      malicious,
      riskScore,
    );

    return {
      indicator: hashIndicator(indicator), // store hashed for security
      indicator_type: indicatorType,
      malicious,
      risk_score: riskScore,
      sources,
      tags: [...tags],
      first_seen: new Date(Date.now() - 86400000 * 30).toISOString(),
      last_seen: new Date().toISOString(),
      associated_malware: [...malwareAssociations],
      associated_campaigns: [...campaigns],
      geo_location: indicatorType === "ip"
        ? { country: "US", asn: "AS15169", org: "Simulated ISP" }
        : undefined,
      recommendations,
    };
  }

  // -------------------------------------------------------------------------
  // Feed-specific query methods (simulated)
  // -------------------------------------------------------------------------

  private async queryVirusTotal(
    _indicator: string,
    _type: IndicatorType,
  ): Promise<FeedResult> {
    // Production: GET https://www.virustotal.com/api/v3/{type}/{indicator}
    return {
      source: {
        name: "VirusTotal",
        confidence: 85,
        last_updated: new Date().toISOString(),
      },
      riskScore: 45,
      malicious: false,
      tags: ["scanned", "community-rated"],
      malware: [],
      campaigns: [],
    };
  }

  private async queryAbuseIPDB(_indicator: string): Promise<FeedResult> {
    // Production: GET https://api.abuseipdb.com/api/v2/check?ipAddress=...
    return {
      source: {
        name: "AbuseIPDB",
        confidence: 78,
        last_updated: new Date().toISOString(),
      },
      riskScore: 35,
      malicious: false,
      tags: ["ip-checked"],
      malware: [],
      campaigns: [],
    };
  }

  private async queryOTX(
    _indicator: string,
    _type: IndicatorType,
  ): Promise<FeedResult> {
    // Production: GET https://otx.alienvault.com/api/v1/indicators/{type}/{indicator}
    return {
      source: {
        name: "OTX AlienVault",
        confidence: 72,
        last_updated: new Date().toISOString(),
      },
      riskScore: 30,
      malicious: false,
      tags: ["otx-pulse"],
      malware: [],
      campaigns: [],
    };
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  private validateIndicator(indicator: string, type: IndicatorType): void {
    if (!indicator || indicator.trim().length === 0) {
      throw new Error("Indicator must not be empty.");
    }

    switch (type) {
      case "ip": {
        const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (!ipv4.test(indicator) && !ipv6.test(indicator)) {
          throw new Error(`Invalid IP address format: ${indicator}`);
        }
        break;
      }
      case "domain": {
        const domainRe = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
        if (!domainRe.test(indicator)) {
          throw new Error(`Invalid domain format: ${indicator}`);
        }
        break;
      }
      case "hash": {
        const hashRe = /^[a-fA-F0-9]{32,128}$/;
        if (!hashRe.test(indicator)) {
          throw new Error(`Invalid hash format: ${indicator}`);
        }
        break;
      }
      case "email": {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(indicator)) {
          throw new Error(`Invalid email format: ${indicator}`);
        }
        break;
      }
      case "url": {
        try {
          new URL(indicator);
        } catch {
          throw new Error(`Invalid URL format: ${indicator}`);
        }
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------

  private buildRecommendations(
    type: IndicatorType,
    malicious: boolean,
    riskScore: number,
  ): string[] {
    const recs: string[] = [];

    if (malicious) {
      recs.push("URGENT: Block this indicator across all perimeter defenses immediately.");
      recs.push("Investigate all systems that have communicated with this indicator.");
      recs.push("Check SIEM logs for historical activity involving this indicator.");
    } else if (riskScore > 50) {
      recs.push("Monitor this indicator closely for further suspicious activity.");
      recs.push("Consider adding to watchlist for enhanced logging.");
    } else {
      recs.push("No immediate action required. Continue routine monitoring.");
    }

    if (type === "ip") {
      recs.push("Verify geo-location and ASN against expected traffic patterns.");
    } else if (type === "domain") {
      recs.push("Check DNS records and WHOIS for recent changes.");
    } else if (type === "hash") {
      recs.push("Search for this hash across endpoint detection platforms.");
    }

    return recs;
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface FeedResult {
  source: ThreatIntelSource;
  riskScore: number;
  malicious: boolean;
  tags: string[];
  malware: string[];
  campaigns: string[];
}

export default ThreatIntelClient;
