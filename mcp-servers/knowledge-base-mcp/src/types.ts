/**
 * Knowledge Base MCP Server — Type Definitions
 * BE EASY ENTERPRISES LLC
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums & Shared Schemas
// ---------------------------------------------------------------------------

export const DocumentCategory = z.enum([
  "playbook",
  "architecture",
  "policy",
  "procedure",
  "template",
  "lesson_learned",
  "solution_pattern",
  "reference",
]);
export type DocumentCategory = z.infer<typeof DocumentCategory>;

export const Classification = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);
export type Classification = z.infer<typeof Classification>;

export const ClassificationLevel: Record<Classification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export const Domain = z.enum([
  "cybersecurity",
  "cloud",
  "compliance",
  "ai_ml",
  "devops",
  "data_engineering",
  "consulting",
]);
export type Domain = z.infer<typeof Domain>;

export const PlaybookCategory = z.enum([
  "incident_response",
  "deployment",
  "assessment",
  "audit",
  "onboarding",
]);
export type PlaybookCategory = z.infer<typeof PlaybookCategory>;

export const PlaybookAction = z.enum([
  "create",
  "update",
  "get",
  "list",
  "archive",
]);
export type PlaybookAction = z.infer<typeof PlaybookAction>;

export const EntityType = z.enum([
  "document",
  "playbook",
  "template",
  "lesson",
  "project",
  "technology",
]);
export type EntityType = z.infer<typeof EntityType>;

export const RelationshipType = z.enum([
  "related_to",
  "depends_on",
  "supersedes",
  "implements",
  "references",
]);
export type RelationshipType = z.infer<typeof RelationshipType>;

export const ExportFormat = z.enum(["json", "markdown", "pdf"]);
export type ExportFormat = z.infer<typeof ExportFormat>;

export const ExportAudience = z.enum(["internal", "client", "partner"]);
export type ExportAudience = z.infer<typeof ExportAudience>;

export const KnowledgePackIncludeType = z.enum([
  "documents",
  "playbooks",
  "templates",
  "lessons",
]);
export type KnowledgePackIncludeType = z.infer<typeof KnowledgePackIncludeType>;

// ---------------------------------------------------------------------------
// Core Data Models
// ---------------------------------------------------------------------------

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  category: DocumentCategory,
  tags: z.array(z.string()),
  classification: Classification,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  checksum: z.string(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const SearchResultSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string(),
  snippet: z.string(),
  score: z.number().min(0).max(1),
  category: DocumentCategory,
  classification: Classification,
  tags: z.array(z.string()),
  highlights: z.array(z.string()).optional(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SolutionTemplateSchema = z.object({
  id: z.string().uuid(),
  domain: Domain,
  useCase: z.string(),
  title: z.string(),
  description: z.string(),
  technologyStack: z.array(z.string()),
  architecture: z.string(),
  steps: z.array(
    z.object({
      order: z.number().int().positive(),
      title: z.string(),
      description: z.string(),
      tools: z.array(z.string()).optional(),
      estimatedHours: z.number().optional(),
    }),
  ),
  prerequisites: z.array(z.string()),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SolutionTemplate = z.infer<typeof SolutionTemplateSchema>;

export const LessonLearnedSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  title: z.string().min(1),
  context: z.string(),
  challenge: z.string(),
  solution: z.string(),
  outcome: z.string(),
  recommendations: z.array(z.string()),
  tags: z.array(z.string()),
  domain: Domain.optional(),
  projectType: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type LessonLearned = z.infer<typeof LessonLearnedSchema>;

export const PlaybookStepSchema = z.object({
  order: z.number().int().positive(),
  description: z.string(),
  tools: z.array(z.string()).optional(),
  responsible_role: z.string().optional(),
});
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;

export const PlaybookSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  category: PlaybookCategory,
  steps: z.array(PlaybookStepSchema),
  tags: z.array(z.string()).optional(),
  archived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
});
export type Playbook = z.infer<typeof PlaybookSchema>;

export const KnowledgeGraphNodeSchema = z.object({
  id: z.string(),
  entityType: EntityType,
  label: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type KnowledgeGraphNode = z.infer<typeof KnowledgeGraphNodeSchema>;

export const KnowledgeGraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relationship: RelationshipType,
  weight: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type KnowledgeGraphEdge = z.infer<typeof KnowledgeGraphEdgeSchema>;

export const KnowledgePackSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  includeTypes: z.array(KnowledgePackIncludeType),
  format: ExportFormat,
  audience: ExportAudience,
  documents: z.array(DocumentSchema).optional(),
  playbooks: z.array(PlaybookSchema).optional(),
  templates: z.array(SolutionTemplateSchema).optional(),
  lessons: z.array(LessonLearnedSchema).optional(),
  generatedAt: z.string().datetime(),
});
export type KnowledgePack = z.infer<typeof KnowledgePackSchema>;
