/**
 * Contracting & Proposal MCP Server
 * BE EASY ENTERPRISES LLC
 *
 * Main server definition — registers all MCP tools for government
 * contracting and proposal management workflows.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  RFPSourceEnum,
  ProposalTypeEnum,
  ContractTypeEnum,
  ComplianceCheckTypeEnum,
  SetAsideEnum,
  RequirementPriorityEnum,
  LaborCategorySchema,
  IndirectRatesSchema,
} from "./types.js";

import { RFPParser } from "./parsers/rfp-parser.js";
import { SAMGovClient } from "./parsers/sam-gov-client.js";
import { ProposalWriter } from "./generators/proposal-writer.js";
import { ComplianceMatrixGenerator } from "./generators/compliance-matrix.js";
import { PricingEngine } from "./analysis/pricing-engine.js";
import { CapabilityMapper } from "./analysis/capability-mapper.js";
import { ContractVehicleAnalyzer } from "./analysis/contract-vehicles.js";

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "contracting-proposal-mcp",
    version: "1.0.0",
  });

  // Instantiate service classes
  const rfpParser = new RFPParser();
  const samClient = new SAMGovClient();
  const proposalWriter = new ProposalWriter();
  const complianceGenerator = new ComplianceMatrixGenerator();
  const pricingEngine = new PricingEngine();
  const capabilityMapper = new CapabilityMapper();
  const vehicleAnalyzer = new ContractVehicleAnalyzer();

  // -----------------------------------------------------------------------
  // Tool: parse_rfp
  // -----------------------------------------------------------------------
  server.tool(
    "parse_rfp",
    "Parse and analyze RFPs from SAM.gov, eBuy, GSA Advantage, or manual text input. Extracts structured requirements, evaluation criteria, and key metadata.",
    {
      source: RFPSourceEnum,
      opportunity_id: z.string().optional(),
      document_url: z.string().optional(),
      document_text: z.string().optional(),
    },
    async (params) => {
      try {
        const rfp = await rfpParser.parse(params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(rfp, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error parsing RFP: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: generate_proposal_draft
  // -----------------------------------------------------------------------
  server.tool(
    "generate_proposal_draft",
    "Generate structured proposal drafts for government contracting opportunities. Supports technical, management, past performance, cost, and executive summary volumes.",
    {
      rfp_id: z.string(),
      proposal_type: ProposalTypeEnum,
      company_capabilities: z.array(z.string()),
      page_limit: z.number().optional(),
      compliance_matrix: z.boolean(),
    },
    async (params) => {
      try {
        const proposal = await proposalWriter.generate(params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(proposal, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating proposal: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: capability_requirements_mapping
  // -----------------------------------------------------------------------
  server.tool(
    "capability_requirements_mapping",
    "Map company capabilities to RFP requirements. Identifies coverage, gaps, and provides recommendations for strengthening proposals.",
    {
      rfp_requirements: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          priority: RequirementPriorityEnum.optional(),
        }),
      ),
      company_capabilities: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
        }),
      ),
      gap_analysis: z.boolean(),
    },
    async (params) => {
      try {
        const mappings = capabilityMapper.map(params);
        const summary = capabilityMapper.summarize(mappings);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ mappings, summary }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error mapping capabilities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: pricing_analysis
  // -----------------------------------------------------------------------
  server.tool(
    "pricing_analysis",
    "Analyze pricing strategy for government contract proposals. Calculates fully-burdened rates, total pricing, and competitive positioning.",
    {
      contract_type: ContractTypeEnum,
      labor_categories: z.array(LaborCategorySchema),
      indirect_rates: IndirectRatesSchema,
      profit_margin: z.number(),
    },
    async (params) => {
      try {
        const model = pricingEngine.analyze(params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(model, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error in pricing analysis: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: compliance_check
  // -----------------------------------------------------------------------
  server.tool(
    "compliance_check",
    "Check proposal compliance against RFP requirements. Evaluates format, content, certifications, past performance, pricing, and representations.",
    {
      proposal_id: z.string(),
      rfp_id: z.string(),
      check_types: z.array(ComplianceCheckTypeEnum),
    },
    async (params) => {
      try {
        const items = complianceGenerator.generateComplianceItems(
          params.check_types,
          params.proposal_id,
          params.rfp_id,
        );

        const criticalGaps = items
          .filter((i) => i.status === "non_compliant")
          .map((i) => i.requirement);

        const compliantCount = items.filter(
          (i) => i.status === "compliant",
        ).length;
        const score =
          items.length > 0
            ? Math.round((compliantCount / items.length) * 100)
            : 0;

        const overallStatus =
          criticalGaps.length > 0
            ? "non_compliant"
            : score >= 80
              ? "compliant"
              : "partially_compliant";

        const result = {
          proposal_id: params.proposal_id,
          rfp_id: params.rfp_id,
          overall_status: overallStatus,
          score,
          items,
          critical_gaps: criticalGaps,
          checked_at: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error in compliance check: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: past_performance_search
  // -----------------------------------------------------------------------
  server.tool(
    "past_performance_search",
    "Search and compile past performance data based on NAICS codes, contract vehicles, agency, and keywords.",
    {
      naics_codes: z.array(z.string()),
      contract_vehicles: z.array(z.string()).optional(),
      agency: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    },
    async (params) => {
      try {
        // In production this would query a past-performance database.
        // For now, generate representative records based on search criteria.
        const records = generatePastPerformanceRecords(params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { count: records.length, records },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching past performance: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: contract_vehicle_analysis
  // -----------------------------------------------------------------------
  server.tool(
    "contract_vehicle_analysis",
    "Analyze and recommend applicable government contract vehicles based on service type, agency, estimated value, and small business set-aside requirements.",
    {
      service_type: z.string(),
      agency: z.string().optional(),
      estimated_value: z.number(),
      small_business_set_aside: SetAsideEnum.optional(),
    },
    async (params) => {
      try {
        const vehicles = vehicleAnalyzer.analyze(params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { count: vehicles.length, vehicles },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error analyzing contract vehicles: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: sam_gov_search
  // -----------------------------------------------------------------------
  server.tool(
    "sam_gov_search",
    "Search SAM.gov for federal contracting opportunities by keywords, NAICS codes, set-aside type, posting date, and response deadline.",
    {
      keywords: z.array(z.string()),
      naics_codes: z.array(z.string()).optional(),
      set_aside: z.string().optional(),
      posted_date_range: z.string().optional(),
      response_deadline_min_days: z.number().optional(),
    },
    async (params) => {
      try {
        let results = await samClient.search(params);

        // Filter by minimum days until deadline if specified
        if (params.response_deadline_min_days !== undefined) {
          const minDate = new Date();
          minDate.setDate(
            minDate.getDate() + params.response_deadline_min_days,
          );
          results = results.filter(
            (r) => new Date(r.response_deadline) >= minDate,
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { count: results.length, opportunities: results },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching SAM.gov: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Helper: generate mock past performance records
// ---------------------------------------------------------------------------

function generatePastPerformanceRecords(params: {
  naics_codes: string[];
  contract_vehicles?: string[];
  agency?: string;
  keywords?: string[];
}): Array<{
  contract_number: string;
  title: string;
  agency: string;
  naics_code: string;
  contract_value: number;
  period_of_performance: { start: string; end: string };
  description: string;
  relevance_score: number;
  performance_rating: string;
  contract_vehicle?: string;
}> {
  const companyName =
    process.env["COMPANY_NAME"] ?? "BE EASY ENTERPRISES LLC";
  const naics = params.naics_codes[0] ?? "541512";
  const agency = params.agency ?? "Department of Defense";
  const keyword = params.keywords?.[0] ?? "IT Services";

  return [
    {
      contract_number: "W911NF-22-C-0042",
      title: `${keyword} Enterprise Support — ${agency}`,
      agency,
      naics_code: naics,
      contract_value: 4_500_000,
      period_of_performance: {
        start: "2022-01-15",
        end: "2025-01-14",
      },
      description: `${companyName} provided ${keyword.toLowerCase()} support including system administration, cloud migration, and cybersecurity operations for ${agency}. Maintained 99.9% uptime SLA across all supported systems.`,
      relevance_score: 92,
      performance_rating: "Exceptional",
      contract_vehicle: params.contract_vehicles?.[0],
    },
    {
      contract_number: "GS-35F-0501T-TO-0023",
      title: `${keyword} Modernization Program`,
      agency: "General Services Administration",
      naics_code: naics,
      contract_value: 2_800_000,
      period_of_performance: {
        start: "2021-06-01",
        end: "2024-05-31",
      },
      description: `${companyName} delivered ${keyword.toLowerCase()} modernization services under GSA Schedule. Successfully migrated 12 legacy applications to cloud-native architecture with zero data loss.`,
      relevance_score: 85,
      performance_rating: "Very Good",
      contract_vehicle: "GSA MAS",
    },
    {
      contract_number: "HHSN316201500025W-TO-005",
      title: `${keyword} Advisory and Implementation`,
      agency: "Department of Health and Human Services",
      naics_code: naics,
      contract_value: 1_200_000,
      period_of_performance: {
        start: "2023-03-01",
        end: "2025-02-28",
      },
      description: `${companyName} provided ${keyword.toLowerCase()} advisory services and implementation support. Delivered all milestones on time and under budget with CPARS rating of Exceptional.`,
      relevance_score: 78,
      performance_rating: "Exceptional",
    },
  ];
}
