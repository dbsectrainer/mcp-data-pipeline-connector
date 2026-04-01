import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const RFPSourceEnum = z.enum([
  "sam_gov",
  "ebuy",
  "gsa_advantage",
  "manual",
]);
export type RFPSource = z.infer<typeof RFPSourceEnum>;

export const ProposalTypeEnum = z.enum([
  "technical_volume",
  "management_volume",
  "past_performance",
  "cost_volume",
  "executive_summary",
]);
export type ProposalType = z.infer<typeof ProposalTypeEnum>;

export const ContractTypeEnum = z.enum([
  "firm_fixed_price",
  "time_and_materials",
  "cost_plus",
  "idiq",
  "bpa",
]);
export type ContractType = z.infer<typeof ContractTypeEnum>;

export const ComplianceCheckTypeEnum = z.enum([
  "format",
  "content",
  "certifications",
  "past_performance",
  "pricing",
  "representations",
]);
export type ComplianceCheckType = z.infer<typeof ComplianceCheckTypeEnum>;

export const SetAsideEnum = z.enum([
  "8a",
  "hubzone",
  "sdvosb",
  "wosb",
  "none",
]);
export type SetAside = z.infer<typeof SetAsideEnum>;

export const RequirementPriorityEnum = z.enum(["critical", "important", "nice_to_have"]);
export type RequirementPriority = z.infer<typeof RequirementPriorityEnum>;

export const ComplianceStatusEnum = z.enum([
  "compliant",
  "partially_compliant",
  "non_compliant",
  "not_evaluated",
]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusEnum>;

// ---------------------------------------------------------------------------
// RFP Types
// ---------------------------------------------------------------------------

export const RFPRequirementSchema = z.object({
  id: z.string(),
  section: z.string(),
  text: z.string(),
  priority: RequirementPriorityEnum,
  category: z.string(),
});
export type RFPRequirement = z.infer<typeof RFPRequirementSchema>;

export const RFPSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: RFPSourceEnum,
  opportunity_id: z.string().optional(),
  agency: z.string(),
  naics_code: z.string(),
  set_aside: SetAsideEnum.optional(),
  posted_date: z.string(),
  response_deadline: z.string(),
  estimated_value: z.number().optional(),
  requirements: z.array(RFPRequirementSchema),
  evaluation_criteria: z.array(z.string()),
  contract_type: ContractTypeEnum.optional(),
  place_of_performance: z.string().optional(),
  raw_text: z.string().optional(),
});
export type RFP = z.infer<typeof RFPSchema>;

// ---------------------------------------------------------------------------
// Proposal Types
// ---------------------------------------------------------------------------

export const ProposalSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  page_count: z.number(),
  requirements_addressed: z.array(z.string()),
});
export type ProposalSection = z.infer<typeof ProposalSectionSchema>;

export const ProposalSchema = z.object({
  id: z.string(),
  rfp_id: z.string(),
  proposal_type: ProposalTypeEnum,
  title: z.string(),
  sections: z.array(ProposalSectionSchema),
  total_pages: z.number(),
  compliance_score: z.number().min(0).max(100),
  generated_at: z.string(),
  company_name: z.string(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

// ---------------------------------------------------------------------------
// Capability Types
// ---------------------------------------------------------------------------

export const CapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  evidence: z.array(z.string()),
  certifications: z.array(z.string()).optional(),
  years_experience: z.number().optional(),
});
export type Capability = z.infer<typeof CapabilitySchema>;

export const CapabilityMappingSchema = z.object({
  requirement_id: z.string(),
  requirement_text: z.string(),
  mapped_capabilities: z.array(z.string()),
  coverage_score: z.number().min(0).max(100),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type CapabilityMapping = z.infer<typeof CapabilityMappingSchema>;

// ---------------------------------------------------------------------------
// Pricing Types
// ---------------------------------------------------------------------------

export const LaborCategorySchema = z.object({
  role: z.string(),
  rate: z.number(),
  hours: z.number(),
});
export type LaborCategory = z.infer<typeof LaborCategorySchema>;

export const IndirectRatesSchema = z.object({
  overhead: z.number().optional(),
  ga: z.number().optional(),
  fringe: z.number().optional(),
  material_handling: z.number().optional(),
});
export type IndirectRates = z.infer<typeof IndirectRatesSchema>;

export const PricingModelSchema = z.object({
  contract_type: ContractTypeEnum,
  labor_categories: z.array(LaborCategorySchema),
  indirect_rates: IndirectRatesSchema,
  profit_margin: z.number(),
  total_direct_labor: z.number(),
  total_indirect_costs: z.number(),
  total_price: z.number(),
  price_per_hour_blended: z.number(),
  competitive_assessment: z.string(),
  recommendations: z.array(z.string()),
});
export type PricingModel = z.infer<typeof PricingModelSchema>;

// ---------------------------------------------------------------------------
// Compliance Types
// ---------------------------------------------------------------------------

export const ComplianceItemSchema = z.object({
  check_type: ComplianceCheckTypeEnum,
  requirement: z.string(),
  status: ComplianceStatusEnum,
  finding: z.string(),
  recommendation: z.string().optional(),
});
export type ComplianceItem = z.infer<typeof ComplianceItemSchema>;

export const ComplianceResultSchema = z.object({
  proposal_id: z.string(),
  rfp_id: z.string(),
  overall_status: ComplianceStatusEnum,
  score: z.number().min(0).max(100),
  items: z.array(ComplianceItemSchema),
  critical_gaps: z.array(z.string()),
  checked_at: z.string(),
});
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;

// ---------------------------------------------------------------------------
// Past Performance Types
// ---------------------------------------------------------------------------

export const PastPerformanceSchema = z.object({
  contract_number: z.string(),
  title: z.string(),
  agency: z.string(),
  naics_code: z.string(),
  contract_value: z.number(),
  period_of_performance: z.object({
    start: z.string(),
    end: z.string(),
  }),
  description: z.string(),
  relevance_score: z.number().min(0).max(100),
  performance_rating: z.string().optional(),
  key_personnel: z.array(z.string()).optional(),
  contract_vehicle: z.string().optional(),
});
export type PastPerformance = z.infer<typeof PastPerformanceSchema>;

// ---------------------------------------------------------------------------
// Contract Vehicle Types
// ---------------------------------------------------------------------------

export const ContractVehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  agency: z.string(),
  description: z.string(),
  eligible_naics: z.array(z.string()),
  ceiling_value: z.number().optional(),
  ordering_period_end: z.string().optional(),
  set_aside_types: z.array(SetAsideEnum),
  advantages: z.array(z.string()),
  requirements: z.array(z.string()),
  suitability_score: z.number().min(0).max(100),
});
export type ContractVehicle = z.infer<typeof ContractVehicleSchema>;

// ---------------------------------------------------------------------------
// SAM.gov Opportunity Types
// ---------------------------------------------------------------------------

export const SAMOpportunitySchema = z.object({
  opportunity_id: z.string(),
  title: z.string(),
  agency: z.string(),
  sub_agency: z.string().optional(),
  posted_date: z.string(),
  response_deadline: z.string(),
  naics_code: z.string(),
  set_aside: z.string().optional(),
  type: z.string(),
  url: z.string(),
  description: z.string(),
  place_of_performance: z.string().optional(),
  point_of_contact: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});
export type SAMOpportunity = z.infer<typeof SAMOpportunitySchema>;

// ---------------------------------------------------------------------------
// Tool Input Schemas (Zod objects for MCP server.tool())
// ---------------------------------------------------------------------------

export const ParseRFPInputSchema = z.object({
  source: RFPSourceEnum,
  opportunity_id: z.string().optional(),
  document_url: z.string().optional(),
  document_text: z.string().optional(),
});
export type ParseRFPInput = z.infer<typeof ParseRFPInputSchema>;

export const GenerateProposalInputSchema = z.object({
  rfp_id: z.string(),
  proposal_type: ProposalTypeEnum,
  company_capabilities: z.array(z.string()),
  page_limit: z.number().optional(),
  compliance_matrix: z.boolean(),
});
export type GenerateProposalInput = z.infer<typeof GenerateProposalInputSchema>;

export const CapabilityMappingInputSchema = z.object({
  rfp_requirements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    priority: RequirementPriorityEnum.optional(),
  })),
  company_capabilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  gap_analysis: z.boolean(),
});
export type CapabilityMappingInput = z.infer<typeof CapabilityMappingInputSchema>;

export const PricingAnalysisInputSchema = z.object({
  contract_type: ContractTypeEnum,
  labor_categories: z.array(LaborCategorySchema),
  indirect_rates: IndirectRatesSchema,
  profit_margin: z.number(),
});
export type PricingAnalysisInput = z.infer<typeof PricingAnalysisInputSchema>;

export const ComplianceCheckInputSchema = z.object({
  proposal_id: z.string(),
  rfp_id: z.string(),
  check_types: z.array(ComplianceCheckTypeEnum),
});
export type ComplianceCheckInput = z.infer<typeof ComplianceCheckInputSchema>;

export const PastPerformanceSearchInputSchema = z.object({
  naics_codes: z.array(z.string()),
  contract_vehicles: z.array(z.string()).optional(),
  agency: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
export type PastPerformanceSearchInput = z.infer<typeof PastPerformanceSearchInputSchema>;

export const ContractVehicleAnalysisInputSchema = z.object({
  service_type: z.string(),
  agency: z.string().optional(),
  estimated_value: z.number(),
  small_business_set_aside: SetAsideEnum.optional(),
});
export type ContractVehicleAnalysisInput = z.infer<typeof ContractVehicleAnalysisInputSchema>;

export const SAMGovSearchInputSchema = z.object({
  keywords: z.array(z.string()),
  naics_codes: z.array(z.string()).optional(),
  set_aside: z.string().optional(),
  posted_date_range: z.string().optional(),
  response_deadline_min_days: z.number().optional(),
});
export type SAMGovSearchInput = z.infer<typeof SAMGovSearchInputSchema>;
