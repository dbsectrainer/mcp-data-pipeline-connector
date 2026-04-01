/**
 * Cybersecurity Operations MCP — MITRE ATT&CK Mapping Utilities
 * BE EASY ENTERPRISES LLC
 *
 * Maps threats to the MITRE ATT&CK framework using technique IDs,
 * tactic names, or free-text threat descriptions.
 */

import type { MITRETechnique, MITREMapping } from "../types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface MITREConfig {
  apiUrl: string;
}

function loadConfig(): MITREConfig {
  return {
    apiUrl: process.env.MITRE_ATTACK_API_URL ?? "https://attack.mitre.org/api",
  };
}

// ---------------------------------------------------------------------------
// Known technique database (subset for offline / simulation use)
// ---------------------------------------------------------------------------

const TECHNIQUE_DB: MITRETechnique[] = [
  {
    id: "T1190",
    name: "Exploit Public-Facing Application",
    description:
      "Adversaries may attempt to exploit a weakness in an Internet-facing host or system to initially access a network.",
    tactics: ["Initial Access"],
    platforms: ["Windows", "Linux", "macOS", "Containers"],
    detection:
      "Monitor application logs for abnormal behavior. Use WAF and IDS/IPS signatures.",
    data_sources: ["Application Log", "Network Traffic"],
    url: "https://attack.mitre.org/techniques/T1190",
  },
  {
    id: "T1566",
    name: "Phishing",
    description:
      "Adversaries may send phishing messages to gain access to victim systems.",
    tactics: ["Initial Access"],
    platforms: ["Windows", "Linux", "macOS", "Google Workspace", "Office 365"],
    detection:
      "Monitor email gateways and user-reported phishing. Analyze attachment and URL reputation.",
    data_sources: ["Application Log", "Network Traffic"],
    url: "https://attack.mitre.org/techniques/T1566",
  },
  {
    id: "T1059",
    name: "Command and Scripting Interpreter",
    description:
      "Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.",
    tactics: ["Execution"],
    platforms: ["Windows", "Linux", "macOS"],
    detection:
      "Monitor process creation and command-line arguments. Look for unusual scripting engine invocations.",
    data_sources: ["Command", "Process", "Script"],
    url: "https://attack.mitre.org/techniques/T1059",
  },
  {
    id: "T1078",
    name: "Valid Accounts",
    description:
      "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining access.",
    tactics: ["Defense Evasion", "Persistence", "Privilege Escalation", "Initial Access"],
    platforms: ["Windows", "Linux", "macOS", "Azure AD", "Google Workspace"],
    detection:
      "Monitor authentication logs for anomalous logon patterns, impossible travel, and credential reuse.",
    data_sources: ["Logon Session", "User Account"],
    url: "https://attack.mitre.org/techniques/T1078",
  },
  {
    id: "T1486",
    name: "Data Encrypted for Impact",
    description:
      "Adversaries may encrypt data on target systems or on large numbers of systems to interrupt availability.",
    tactics: ["Impact"],
    platforms: ["Windows", "Linux", "macOS"],
    detection:
      "Monitor file system activity for mass file modifications. Watch for known ransomware signatures.",
    data_sources: ["Command", "File", "Process"],
    url: "https://attack.mitre.org/techniques/T1486",
  },
  {
    id: "T1071",
    name: "Application Layer Protocol",
    description:
      "Adversaries may communicate using OSI application layer protocols to avoid detection.",
    tactics: ["Command and Control"],
    platforms: ["Windows", "Linux", "macOS"],
    detection:
      "Analyze network traffic for anomalous patterns in HTTP, DNS, or SMTP communications.",
    data_sources: ["Network Traffic"],
    url: "https://attack.mitre.org/techniques/T1071",
  },
  {
    id: "T1053",
    name: "Scheduled Task/Job",
    description:
      "Adversaries may abuse task scheduling functionality to facilitate initial or recurring execution of malicious code.",
    tactics: ["Execution", "Persistence", "Privilege Escalation"],
    platforms: ["Windows", "Linux", "macOS", "Containers"],
    detection:
      "Monitor scheduled task creation and modification. Alert on unusual scheduled task parameters.",
    data_sources: ["Command", "File", "Process", "Scheduled Job"],
    url: "https://attack.mitre.org/techniques/T1053",
  },
  {
    id: "T1048",
    name: "Exfiltration Over Alternative Protocol",
    description:
      "Adversaries may steal data by exfiltrating it over a different protocol than the existing command and control channel.",
    tactics: ["Exfiltration"],
    platforms: ["Windows", "Linux", "macOS"],
    detection:
      "Monitor for unusual outbound data transfers over DNS, ICMP, or non-standard ports.",
    data_sources: ["Command", "File", "Network Traffic"],
    url: "https://attack.mitre.org/techniques/T1048",
  },
];

// ---------------------------------------------------------------------------
// MITRE ATT&CK Client
// ---------------------------------------------------------------------------

export class MITREAttackClient {
  private config: MITREConfig;

  constructor(config?: MITREConfig) {
    this.config = config ?? loadConfig();
  }

  /**
   * Map threats to MITRE ATT&CK techniques.
   */
  async mapThreats(params: {
    technique_id?: string;
    tactic?: string;
    threat_description?: string;
  }): Promise<MITREMapping> {
    // In production, this would call the MITRE ATT&CK TAXII/STIX API
    // or an enriched enterprise knowledge base. We use the local DB here.

    let techniques: MITRETechnique[] = [];

    if (params.technique_id) {
      const match = TECHNIQUE_DB.find(
        (t) => t.id.toLowerCase() === params.technique_id!.toLowerCase(),
      );
      if (match) techniques.push(match);
    }

    if (params.tactic) {
      const tacticLower = params.tactic.toLowerCase();
      const tacticMatches = TECHNIQUE_DB.filter((t) =>
        t.tactics.some((tac) => tac.toLowerCase().includes(tacticLower)),
      );
      for (const tm of tacticMatches) {
        if (!techniques.find((t) => t.id === tm.id)) {
          techniques.push(tm);
        }
      }
    }

    if (params.threat_description) {
      const descLower = params.threat_description.toLowerCase();
      const keywords = descLower.split(/\s+/).filter((w) => w.length > 3);
      const descMatches = TECHNIQUE_DB.filter((t) => {
        const text = `${t.name} ${t.description}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw));
      });
      for (const dm of descMatches) {
        if (!techniques.find((t) => t.id === dm.id)) {
          techniques.push(dm);
        }
      }
    }

    // If no params matched, return all techniques as a reference
    if (techniques.length === 0 && !params.technique_id && !params.tactic && !params.threat_description) {
      techniques = [...TECHNIQUE_DB];
    }

    // Build tactic coverage
    const tacticCoverage: Record<string, number> = {};
    for (const tech of techniques) {
      for (const tactic of tech.tactics) {
        tacticCoverage[tactic] = (tacticCoverage[tactic] ?? 0) + 1;
      }
    }

    return {
      techniques,
      tactic_coverage: tacticCoverage,
      threat_summary: techniques.length > 0
        ? `Mapped ${techniques.length} technique(s) across ${Object.keys(tacticCoverage).length} tactic(s).`
        : "No techniques matched the provided criteria.",
      recommended_detections: techniques.map((t) => t.detection),
      related_groups: this.inferRelatedGroups(techniques),
    };
  }

  private inferRelatedGroups(techniques: MITRETechnique[]): string[] {
    const groups: Set<string> = new Set();
    for (const tech of techniques) {
      if (tech.id === "T1486") groups.add("FIN6").add("Wizard Spider");
      if (tech.id === "T1566") groups.add("APT29").add("Kimsuky");
      if (tech.id === "T1190") groups.add("APT41").add("Hafnium");
      if (tech.id === "T1078") groups.add("APT29").add("Cozy Bear");
    }
    return [...groups];
  }
}

export default MITREAttackClient;
