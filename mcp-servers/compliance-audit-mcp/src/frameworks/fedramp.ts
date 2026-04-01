import type { SecurityControl, SecurityCategorization } from "../types.js";

/**
 * FedRAMP baseline controls and templates.
 * Maps FedRAMP Low, Moderate, and High baselines to their required controls
 * with cross-references to NIST 800-53.
 */

export interface FedRAMPBaseline {
  level: SecurityCategorization;
  title: string;
  description: string;
  controls: SecurityControl[];
}

const baselines: FedRAMPBaseline[] = [
  {
    level: "low",
    title: "FedRAMP Low Baseline",
    description:
      "Minimum security controls for low-impact cloud systems processing federal data.",
    controls: [
      {
        id: "FedRAMP-AC-1",
        family: "AC",
        title: "Access Control Policy and Procedures",
        description:
          "Develop, document, and disseminate an access control policy that addresses purpose, scope, roles, responsibilities, management commitment, coordination among organizational entities, and compliance.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["PL-1", "PM-9"],
        crossFrameworkMappings: {
          nist_800_53: ["AC-1"],
          cmmc: ["AC.L1-3.1.1"],
        },
      },
      {
        id: "FedRAMP-AC-2",
        family: "AC",
        title: "Account Management",
        description:
          "Manage system accounts including creating, enabling, modifying, disabling, and removing accounts. Review accounts on a periodic basis.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-3", "AC-5", "IA-4"],
        crossFrameworkMappings: {
          nist_800_53: ["AC-2"],
          cmmc: ["AC.L1-3.1.1", "AC.L2-3.1.5"],
        },
      },
      {
        id: "FedRAMP-AU-2",
        family: "AU",
        title: "Event Logging",
        description:
          "Identify the types of events that the system is capable of logging in support of the audit function.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AU-3", "AU-12"],
        crossFrameworkMappings: {
          nist_800_53: ["AU-2"],
        },
      },
      {
        id: "FedRAMP-CM-2",
        family: "CM",
        title: "Baseline Configuration",
        description:
          "Develop, document, and maintain a current baseline configuration of the information system.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CM-3", "CM-6"],
        crossFrameworkMappings: {
          nist_800_53: ["CM-2"],
          cmmc: ["CM.L2-3.4.1"],
        },
      },
      {
        id: "FedRAMP-IA-2",
        family: "IA",
        title: "Identification and Authentication",
        description:
          "Uniquely identify and authenticate organizational users and associate that identity with processes acting on behalf of those users.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3"],
        crossFrameworkMappings: {
          nist_800_53: ["IA-2"],
          cmmc: ["IA.L1-3.5.1", "IA.L1-3.5.2"],
        },
      },
      {
        id: "FedRAMP-SC-7",
        family: "SC",
        title: "Boundary Protection",
        description:
          "Monitor and control communications at the external managed interfaces to the system and at key internal boundaries within the system.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["AC-4", "SC-5"],
        crossFrameworkMappings: {
          nist_800_53: ["SC-7"],
          cmmc: ["SC.L1-3.13.1"],
        },
      },
      {
        id: "FedRAMP-SI-2",
        family: "SI",
        title: "Flaw Remediation",
        description:
          "Identify, report, and correct system flaws. Install security-relevant software and firmware updates within the defined time period.",
        framework: "fedramp",
        baseline: "low",
        priority: "P1",
        relatedControls: ["CM-3", "SI-3"],
        crossFrameworkMappings: {
          nist_800_53: ["SI-2"],
          cmmc: ["SI.L1-3.14.1"],
        },
      },
    ],
  },
  {
    level: "moderate",
    title: "FedRAMP Moderate Baseline",
    description:
      "Security controls for moderate-impact cloud systems. Covers the majority of federal cloud deployments.",
    controls: [
      {
        id: "FedRAMP-AC-6",
        family: "AC",
        title: "Least Privilege",
        description:
          "Employ the principle of least privilege, allowing only authorized accesses for users (or processes acting on behalf of users).",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3", "AC-5"],
        crossFrameworkMappings: {
          nist_800_53: ["AC-6"],
          cmmc: ["AC.L2-3.1.5"],
        },
      },
      {
        id: "FedRAMP-AC-17",
        family: "AC",
        title: "Remote Access",
        description:
          "Establish usage restrictions, configuration/connection requirements, and implementation guidance for each type of remote access allowed.",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AC-2", "AC-3", "IA-2"],
        crossFrameworkMappings: {
          nist_800_53: ["AC-17"],
        },
      },
      {
        id: "FedRAMP-AU-6",
        family: "AU",
        title: "Audit Record Review, Analysis, and Reporting",
        description:
          "Review and analyze system audit records for indications of inappropriate or unusual activity. Report findings to designated organizational officials.",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AU-2", "IR-5"],
        crossFrameworkMappings: {
          nist_800_53: ["AU-6"],
        },
      },
      {
        id: "FedRAMP-IR-4",
        family: "IR",
        title: "Incident Handling",
        description:
          "Implement an incident handling capability that includes preparation, detection and analysis, containment, eradication, and recovery.",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["IR-1", "IR-5", "IR-6"],
        crossFrameworkMappings: {
          nist_800_53: ["IR-4"],
          cmmc: ["IR.L2-3.6.1"],
        },
      },
      {
        id: "FedRAMP-RA-5",
        family: "RA",
        title: "Vulnerability Monitoring and Scanning",
        description:
          "Monitor and scan for vulnerabilities in the system and hosted applications and remediate discovered vulnerabilities.",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["CA-2", "CM-6", "SI-2"],
        crossFrameworkMappings: {
          nist_800_53: ["RA-5"],
        },
      },
      {
        id: "FedRAMP-SI-4",
        family: "SI",
        title: "System Monitoring",
        description:
          "Monitor the system to detect attacks and indicators of potential attacks, unauthorized local/remote connections, and unauthorized use.",
        framework: "fedramp",
        baseline: "moderate",
        priority: "P1",
        relatedControls: ["AU-2", "IR-4", "SI-3"],
        crossFrameworkMappings: {
          nist_800_53: ["SI-4"],
        },
      },
    ],
  },
  {
    level: "high",
    title: "FedRAMP High Baseline",
    description:
      "Maximum security controls for high-impact cloud systems processing the most sensitive unclassified federal data.",
    controls: [
      {
        id: "FedRAMP-AC-3",
        family: "AC",
        title: "Access Enforcement",
        description:
          "Enforce approved authorizations for logical access to information and system resources in accordance with applicable access control policies.",
        framework: "fedramp",
        baseline: "high",
        priority: "P1",
        relatedControls: ["AC-2", "AC-5", "AC-6"],
        crossFrameworkMappings: {
          nist_800_53: ["AC-3"],
        },
      },
      {
        id: "FedRAMP-CM-6",
        family: "CM",
        title: "Configuration Settings",
        description:
          "Establish mandatory configuration settings for IT products employed within the system using security configuration checklists.",
        framework: "fedramp",
        baseline: "high",
        priority: "P1",
        relatedControls: ["CM-2", "CM-3"],
        crossFrameworkMappings: {
          nist_800_53: ["CM-6"],
          cmmc: ["CM.L2-3.4.2"],
        },
      },
      {
        id: "FedRAMP-IA-2(12)",
        family: "IA",
        title: "PIV Credentials",
        description:
          "Accept and electronically verify Personal Identity Verification (PIV) credentials issued by federal agencies.",
        framework: "fedramp",
        baseline: "high",
        priority: "P1",
        relatedControls: ["IA-2"],
        crossFrameworkMappings: {
          nist_800_53: ["IA-2(12)"],
        },
      },
    ],
  },
];

/**
 * Return all FedRAMP baselines.
 */
export function getFedRAMPBaselines(): FedRAMPBaseline[] {
  return baselines;
}

/**
 * Return the FedRAMP baseline for a given impact level.
 */
export function getFedRAMPBaselineByLevel(
  level: SecurityCategorization,
): FedRAMPBaseline | undefined {
  return baselines.find((b) => b.level === level);
}

/**
 * Return all controls at or below the given categorization level.
 */
export function getFedRAMPControlsByLevel(
  categorization: SecurityCategorization,
): SecurityControl[] {
  const levels: SecurityCategorization[] = ["low", "moderate", "high"];
  const threshold = levels.indexOf(categorization);
  return baselines
    .filter((_b, idx) => idx <= threshold)
    .flatMap((b) => b.controls);
}

/**
 * Return all FedRAMP controls across all baselines.
 */
export function getAllFedRAMPControls(): SecurityControl[] {
  return baselines.flatMap((b) => b.controls);
}

/**
 * Return controls for a specific family across all baselines.
 */
export function getFedRAMPControlsByFamily(
  familyId: string,
): SecurityControl[] {
  return baselines.flatMap((b) =>
    b.controls.filter(
      (c) => c.family.toUpperCase() === familyId.toUpperCase(),
    ),
  );
}

/**
 * Generate a FedRAMP SSP template outline for the given impact level.
 */
export function generateFedRAMPSSPTemplate(
  level: SecurityCategorization,
): Record<string, string> {
  return {
    documentTitle: `System Security Plan — FedRAMP ${level.charAt(0).toUpperCase() + level.slice(1)} Baseline`,
    section1: "1. Information System Name/Title",
    section2: "2. Information System Categorization",
    section3: "3. Information System Owner",
    section4: "4. Authorizing Official",
    section5: "5. Other Designated Contacts",
    section6: "6. Assignment of Security Responsibility",
    section7: "7. Information System Operational Status",
    section8: "8. Information System Type",
    section9: "9. General System Description",
    section10: "10. System Environment and Special Considerations",
    section11: "11. System Interconnections/Information Sharing",
    section12: "12. Laws, Regulations, Standards and Guidance",
    section13: "13. Minimum Security Controls",
    note: `This template covers the FedRAMP ${level} baseline. All applicable controls must be fully documented with implementation details.`,
  };
}
