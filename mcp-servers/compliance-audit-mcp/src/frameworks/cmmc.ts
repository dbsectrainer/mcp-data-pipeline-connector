import type { SecurityControl } from "../types.js";

/**
 * CMMC 2.0 domain and practice mapping.
 * Maps CMMC levels (1-3) to their practices with NIST 800-53 cross-references.
 */

export interface CMMCPractice {
  id: string;
  domain: string;
  level: 1 | 2 | 3;
  title: string;
  description: string;
  nistMappings: string[];
}

export interface CMMCDomain {
  id: string;
  title: string;
  practices: CMMCPractice[];
}

const domains: CMMCDomain[] = [
  {
    id: "AC",
    title: "Access Control",
    practices: [
      {
        id: "AC.L1-3.1.1",
        domain: "AC",
        level: 1,
        title: "Authorized Access Control",
        description:
          "Limit information system access to authorized users, processes acting on behalf of authorized users, or devices.",
        nistMappings: ["AC-2", "AC-3", "AC-17"],
      },
      {
        id: "AC.L1-3.1.2",
        domain: "AC",
        level: 1,
        title: "Transaction & Function Control",
        description:
          "Limit information system access to the types of transactions and functions that authorized users are permitted to execute.",
        nistMappings: ["AC-3"],
      },
      {
        id: "AC.L2-3.1.3",
        domain: "AC",
        level: 2,
        title: "Control CUI Flow",
        description: "Control the flow of CUI in accordance with approved authorizations.",
        nistMappings: ["AC-4"],
      },
      {
        id: "AC.L2-3.1.5",
        domain: "AC",
        level: 2,
        title: "Least Privilege",
        description:
          "Employ the principle of least privilege, including for specific security functions and privileged accounts.",
        nistMappings: ["AC-6", "AC-6(1)", "AC-6(5)"],
      },
    ],
  },
  {
    id: "AU",
    title: "Audit and Accountability",
    practices: [
      {
        id: "AU.L2-3.3.1",
        domain: "AU",
        level: 2,
        title: "System Auditing",
        description:
          "Create and retain system audit logs and records to the extent needed to enable monitoring, analysis, investigation, and reporting.",
        nistMappings: ["AU-2", "AU-3", "AU-3(1)", "AU-6"],
      },
      {
        id: "AU.L2-3.3.2",
        domain: "AU",
        level: 2,
        title: "User Accountability",
        description:
          "Ensure that the actions of individual system users can be uniquely traced to those users so they can be held accountable.",
        nistMappings: ["AU-2", "AU-3"],
      },
    ],
  },
  {
    id: "CM",
    title: "Configuration Management",
    practices: [
      {
        id: "CM.L2-3.4.1",
        domain: "CM",
        level: 2,
        title: "System Baselining",
        description:
          "Establish and maintain baseline configurations and inventories of organizational systems.",
        nistMappings: ["CM-2", "CM-8"],
      },
      {
        id: "CM.L2-3.4.2",
        domain: "CM",
        level: 2,
        title: "Security Configuration Enforcement",
        description:
          "Establish and enforce security configuration settings for IT products employed in organizational systems.",
        nistMappings: ["CM-6"],
      },
    ],
  },
  {
    id: "IA",
    title: "Identification and Authentication",
    practices: [
      {
        id: "IA.L1-3.5.1",
        domain: "IA",
        level: 1,
        title: "Identification",
        description:
          "Identify information system users, processes acting on behalf of users, or devices.",
        nistMappings: ["IA-2"],
      },
      {
        id: "IA.L1-3.5.2",
        domain: "IA",
        level: 1,
        title: "Authentication",
        description:
          "Authenticate (or verify) the identities of users, processes, or devices as a prerequisite to allowing access.",
        nistMappings: ["IA-2"],
      },
      {
        id: "IA.L2-3.5.3",
        domain: "IA",
        level: 2,
        title: "Multifactor Authentication",
        description: "Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.",
        nistMappings: ["IA-2(1)", "IA-2(2)"],
      },
    ],
  },
  {
    id: "IR",
    title: "Incident Response",
    practices: [
      {
        id: "IR.L2-3.6.1",
        domain: "IR",
        level: 2,
        title: "Incident Handling",
        description:
          "Establish an operational incident-handling capability for organizational systems that includes preparation, detection, analysis, containment, recovery, and user response activities.",
        nistMappings: ["IR-2", "IR-4", "IR-5", "IR-6"],
      },
    ],
  },
  {
    id: "SC",
    title: "System and Communications Protection",
    practices: [
      {
        id: "SC.L1-3.13.1",
        domain: "SC",
        level: 1,
        title: "Boundary Protection",
        description:
          "Monitor, control, and protect communications at the external boundaries and key internal boundaries.",
        nistMappings: ["SC-7"],
      },
      {
        id: "SC.L2-3.13.6",
        domain: "SC",
        level: 2,
        title: "Network Communication by Exception",
        description: "Deny network communications traffic by default and allow network communications traffic by exception.",
        nistMappings: ["SC-7(5)"],
      },
    ],
  },
  {
    id: "SI",
    title: "System and Information Integrity",
    practices: [
      {
        id: "SI.L1-3.14.1",
        domain: "SI",
        level: 1,
        title: "Flaw Remediation",
        description: "Identify, report, and correct information and system flaws in a timely manner.",
        nistMappings: ["SI-2"],
      },
      {
        id: "SI.L2-3.14.3",
        domain: "SI",
        level: 2,
        title: "Security Alerts & Advisories",
        description: "Monitor system security alerts and advisories and take action in response.",
        nistMappings: ["SI-5"],
      },
    ],
  },
];

export function getCMMCDomains(): CMMCDomain[] {
  return domains;
}

export function getCMMCPracticesByLevel(level: 1 | 2 | 3): CMMCPractice[] {
  return domains.flatMap((d) =>
    d.practices.filter((p) => p.level <= level),
  );
}

export function getCMMCPracticesByDomain(domainId: string): CMMCPractice[] {
  const domain = domains.find(
    (d) => d.id.toUpperCase() === domainId.toUpperCase(),
  );
  return domain?.practices ?? [];
}

export function getAllCMMCPractices(): CMMCPractice[] {
  return domains.flatMap((d) => d.practices);
}

/**
 * Convert CMMC practices to SecurityControl format for unified processing.
 */
export function cmmcPracticesToControls(
  practices: CMMCPractice[],
): SecurityControl[] {
  return practices.map((p) => ({
    id: p.id,
    family: p.domain,
    title: p.title,
    description: p.description,
    framework: "cmmc" as const,
    relatedControls: p.nistMappings,
    crossFrameworkMappings: {
      nist_800_53: p.nistMappings,
    },
  }));
}
