import type { SecurityControl, SecurityCategorization } from "../types.js";

/**
 * NIST 800-53 Rev 5 control catalog — representative subset for each family.
 * Production deployments should ingest the full OSCAL catalog from NIST.
 */

export interface NISTControlFamily {
  id: string;
  title: string;
  controls: SecurityControl[];
}

const families: NISTControlFamily[] = [
  {
    id: "AC",
    title: "Access Control",
    controls: [
      {
        id: "AC-1",
        family: "AC",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate an access control policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "AC-2",
        family: "AC",
        title: "Account Management",
        description:
          "Define and manage information system accounts, including establishing, activating, modifying, reviewing, disabling, and removing accounts.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-3", "AC-5", "IA-4"],
        crossFrameworkMappings: {
          cmmc: ["AC.L1-3.1.1", "AC.L2-3.1.5"],
          fedramp: ["AC-2"],
        },
      },
      {
        id: "AC-3",
        family: "AC",
        title: "Access Enforcement",
        description:
          "Enforce approved authorizations for logical access to information and system resources.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-2", "AC-5", "AC-6"],
      },
      {
        id: "AC-6",
        family: "AC",
        title: "Least Privilege",
        description:
          "Employ the principle of least privilege, allowing only authorized access needed for organizational missions.",
        framework: "nist_800_53",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3", "AC-5"],
      },
      {
        id: "AC-17",
        family: "AC",
        title: "Remote Access",
        description:
          "Establish and document usage restrictions, configuration, and implementation guidance for remote access.",
        framework: "nist_800_53",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3", "IA-2"],
      },
    ],
  },
  {
    id: "AU",
    title: "Audit and Accountability",
    controls: [
      {
        id: "AU-1",
        family: "AU",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate an audit and accountability policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "AU-2",
        family: "AU",
        title: "Event Logging",
        description:
          "Identify the types of events that the system is capable of logging in support of the audit function.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AU-3", "AU-12"],
      },
      {
        id: "AU-6",
        family: "AU",
        title: "Audit Record Review, Analysis, and Reporting",
        description:
          "Review and analyze system audit records for indications of inappropriate or unusual activity.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AU-2", "AU-3", "IR-5"],
      },
    ],
  },
  {
    id: "CM",
    title: "Configuration Management",
    controls: [
      {
        id: "CM-1",
        family: "CM",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate a configuration management policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "CM-2",
        family: "CM",
        title: "Baseline Configuration",
        description:
          "Develop, document, and maintain a current baseline configuration of the information system.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CM-3", "CM-6", "CM-8"],
      },
      {
        id: "CM-6",
        family: "CM",
        title: "Configuration Settings",
        description:
          "Establish and document configuration settings for information technology products used within the system.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CM-2", "CM-3", "SI-2"],
      },
    ],
  },
  {
    id: "IA",
    title: "Identification and Authentication",
    controls: [
      {
        id: "IA-1",
        family: "IA",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate an identification and authentication policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "IA-2",
        family: "IA",
        title: "Identification and Authentication (Organizational Users)",
        description:
          "Uniquely identify and authenticate organizational users, and associate that identity with processes acting on behalf of those users.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3", "IA-4"],
      },
    ],
  },
  {
    id: "IR",
    title: "Incident Response",
    controls: [
      {
        id: "IR-1",
        family: "IR",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate an incident response policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "IR-4",
        family: "IR",
        title: "Incident Handling",
        description:
          "Implement an incident handling capability for incidents that includes preparation, detection, analysis, containment, eradication, and recovery.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["IR-1", "IR-5", "IR-6"],
      },
    ],
  },
  {
    id: "RA",
    title: "Risk Assessment",
    controls: [
      {
        id: "RA-1",
        family: "RA",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate a risk assessment policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "RA-3",
        family: "RA",
        title: "Risk Assessment",
        description:
          "Conduct an assessment of risk, including the likelihood and magnitude of harm from unauthorized access, use, disclosure, disruption, modification, or destruction.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["RA-2", "PM-9"],
      },
      {
        id: "RA-5",
        family: "RA",
        title: "Vulnerability Monitoring and Scanning",
        description:
          "Monitor and scan for vulnerabilities in the system and hosted applications.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CA-2", "CM-6", "SI-2"],
      },
    ],
  },
  {
    id: "SC",
    title: "System and Communications Protection",
    controls: [
      {
        id: "SC-1",
        family: "SC",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate a system and communications protection policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "SC-7",
        family: "SC",
        title: "Boundary Protection",
        description:
          "Monitor and control communications at the external managed interfaces and at key internal boundaries.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-4", "SC-5"],
      },
    ],
  },
  {
    id: "SI",
    title: "System and Information Integrity",
    controls: [
      {
        id: "SI-1",
        family: "SI",
        title: "Policy and Procedures",
        description:
          "Develop, document, and disseminate a system and information integrity policy and procedures.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
      },
      {
        id: "SI-2",
        family: "SI",
        title: "Flaw Remediation",
        description:
          "Identify, report, and correct system flaws. Install software and firmware updates.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CM-3", "SI-3"],
      },
      {
        id: "SI-4",
        family: "SI",
        title: "System Monitoring",
        description:
          "Monitor the system to detect attacks, indicators of potential attacks, and unauthorized connections.",
        framework: "nist_800_53",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AU-2", "IR-4", "SI-3"],
      },
    ],
  },
];

/**
 * Return all NIST 800-53 control families.
 */
export function getNISTFamilies(): NISTControlFamily[] {
  return families;
}

/**
 * Look up controls for a specific family.
 */
export function getNISTControlsByFamily(
  familyId: string,
): SecurityControl[] {
  const family = families.find(
    (f) => f.id.toUpperCase() === familyId.toUpperCase(),
  );
  return family?.controls ?? [];
}

/**
 * Filter controls by baseline impact level.
 */
export function getNISTControlsByBaseline(
  categorization: SecurityCategorization,
): SecurityControl[] {
  const levels: SecurityCategorization[] = ["low", "moderate", "high"];
  const threshold = levels.indexOf(categorization);
  return families.flatMap((f) =>
    f.controls.filter((c) => {
      if (!c.baseline) return false;
      return levels.indexOf(c.baseline) <= threshold;
    }),
  );
}

/**
 * Return all controls across every family.
 */
export function getAllNISTControls(): SecurityControl[] {
  return families.flatMap((f) => f.controls);
}

/**
 * Retrieve a single control by its ID (e.g. "AC-2").
 */
export function getNISTControlById(
  controlId: string,
): SecurityControl | undefined {
  return families
    .flatMap((f) => f.controls)
    .find((c) => c.id.toUpperCase() === controlId.toUpperCase());
}
