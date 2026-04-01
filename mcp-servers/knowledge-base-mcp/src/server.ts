/**
 * Knowledge Base MCP Server — Tool Definitions
 * BE EASY ENTERPRISES LLC
 *
 * Firm-wide intelligence layer centralizing institutional knowledge.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import {
  DocumentCategory,
  Classification,
  Domain,
  PlaybookAction,
  PlaybookCategory,
  PlaybookStepSchema,
  EntityType,
  RelationshipType,
  KnowledgePackIncludeType,
  ExportFormat,
  ExportAudience,
  type KnowledgePack,
} from "./types.js";

import {
  DocumentStore,
  LessonLearnedStore,
  PlaybookStore,
} from "./storage/document-store.js";
import { createVectorStore } from "./storage/vector-store.js";
import { SemanticEngine } from "./search/semantic-engine.js";
import { KnowledgeGraph } from "./search/knowledge-graph.js";
import { TemplateManager } from "./templates/template-manager.js";
import { sanitizeForAudience } from "./utils/classification.js";

// ---------------------------------------------------------------------------
// Server Factory
// ---------------------------------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({
    name: "knowledge-base-mcp",
    version: "1.0.0",
  });

  // Shared state
  const documentStore = new DocumentStore();
  const lessonStore = new LessonLearnedStore();
  const playbookStore = new PlaybookStore();
  const vectorStore = createVectorStore();
  const semanticEngine = new SemanticEngine(vectorStore);
  const knowledgeGraph = new KnowledgeGraph();
  const templateManager = new TemplateManager();

  // -----------------------------------------------------------------------
  // store_document
  // -----------------------------------------------------------------------
  server.tool(
    "store_document",
    "Store documents, playbooks, architectures, and policies in the firm-wide knowledge base.",
    {
      title: z.string().min(1).max(500).describe("Document title"),
      content: z.string().min(1).describe("Full document content"),
      category: DocumentCategory.describe("Document category"),
      tags: z.array(z.string()).describe("Searchable tags"),
      classification: Classification.describe("Security classification level"),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe("Optional additional metadata"),
    },
    async (params) => {
      const doc = await documentStore.store({
        title: params.title,
        content: params.content,
        category: params.category,
        tags: params.tags,
        classification: params.classification,
        metadata: params.metadata,
      });

      // Register in knowledge graph
      knowledgeGraph.addNode({
        id: doc.id,
        entityType: "document",
        label: doc.title,
        metadata: { category: doc.category, classification: doc.classification },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                document: {
                  id: doc.id,
                  title: doc.title,
                  category: doc.category,
                  classification: doc.classification,
                  version: doc.version,
                  checksum: doc.checksum,
                  createdAt: doc.createdAt,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // semantic_search
  // -----------------------------------------------------------------------
  server.tool(
    "semantic_search",
    "Semantic search across the firm-wide knowledge base with TF-IDF ranking and classification filtering.",
    {
      query: z.string().min(1).describe("Natural language search query"),
      categories: z
        .array(DocumentCategory)
        .optional()
        .describe("Filter by document categories"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags"),
      classification_max: Classification.optional().describe(
        "Maximum classification level to include in results",
      ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of results (default 20)"),
      similarity_threshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Minimum similarity score (default 0.05)"),
    },
    async (params) => {
      const documents = documentStore.getAll();
      const results = semanticEngine.search(params.query, documents, {
        categories: params.categories,
        tags: params.tags,
        classificationMax: params.classification_max,
        limit: params.limit,
        similarityThreshold: params.similarity_threshold,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                query: params.query,
                totalResults: results.length,
                results,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // get_solution_template
  // -----------------------------------------------------------------------
  server.tool(
    "get_solution_template",
    "Retrieve reusable solution templates by domain, use case, and technology stack.",
    {
      domain: Domain.describe("Solution domain"),
      use_case: z.string().min(1).describe("Description of the target use case"),
      technology_stack: z
        .array(z.string())
        .optional()
        .describe("Preferred technologies to match"),
    },
    async (params) => {
      const templates = templateManager.getTemplates({
        domain: params.domain,
        useCase: params.use_case,
        technologyStack: params.technology_stack,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                domain: params.domain,
                useCase: params.use_case,
                matchedTemplates: templates.length,
                templates,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // store_lessons_learned
  // -----------------------------------------------------------------------
  server.tool(
    "store_lessons_learned",
    "Store lessons learned from completed projects for future reference.",
    {
      project_id: z.string().min(1).describe("Unique project identifier"),
      title: z.string().min(1).describe("Lesson title"),
      context: z.string().min(1).describe("Project context and background"),
      challenge: z.string().min(1).describe("Challenge or problem encountered"),
      solution: z.string().min(1).describe("Solution that was applied"),
      outcome: z.string().min(1).describe("Outcome and results achieved"),
      recommendations: z
        .array(z.string())
        .describe("Actionable recommendations for future projects"),
      tags: z.array(z.string()).describe("Searchable tags"),
    },
    async (params) => {
      const lesson = lessonStore.store({
        projectId: params.project_id,
        title: params.title,
        context: params.context,
        challenge: params.challenge,
        solution: params.solution,
        outcome: params.outcome,
        recommendations: params.recommendations,
        tags: params.tags,
      });

      // Register in knowledge graph
      knowledgeGraph.addNode({
        id: lesson.id,
        entityType: "lesson",
        label: lesson.title,
        metadata: { projectId: lesson.projectId },
      });

      // Link to project node
      const projectNodeId = `project:${lesson.projectId}`;
      knowledgeGraph.addNode({
        id: projectNodeId,
        entityType: "project",
        label: `Project ${lesson.projectId}`,
      });
      knowledgeGraph.addEdge({
        source: lesson.id,
        target: projectNodeId,
        relationship: "references",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                lesson: {
                  id: lesson.id,
                  projectId: lesson.projectId,
                  title: lesson.title,
                  createdAt: lesson.createdAt,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // query_lessons_learned
  // -----------------------------------------------------------------------
  server.tool(
    "query_lessons_learned",
    "Query past lessons learned by domain, keywords, project type, or date range.",
    {
      domain: Domain.optional().describe("Filter by business domain"),
      keywords: z
        .array(z.string())
        .optional()
        .describe("Keywords to search for"),
      project_type: z
        .string()
        .optional()
        .describe("Filter by project type"),
      date_range: z
        .object({
          start: z.string().describe("Start date (ISO 8601)"),
          end: z.string().describe("End date (ISO 8601)"),
        })
        .optional()
        .describe("Filter by date range"),
    },
    async (params) => {
      const lessons = lessonStore.query({
        domain: params.domain,
        keywords: params.keywords,
        projectType: params.project_type,
        dateRange: params.date_range,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                totalResults: lessons.length,
                lessons,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // manage_playbook
  // -----------------------------------------------------------------------
  server.tool(
    "manage_playbook",
    "Create, update, retrieve, list, or archive operational playbooks.",
    {
      action: PlaybookAction.describe("Action to perform"),
      playbook_id: z
        .string()
        .optional()
        .describe("Playbook ID (required for get, update, archive)"),
      title: z
        .string()
        .optional()
        .describe("Playbook title (required for create)"),
      steps: z
        .array(PlaybookStepSchema)
        .optional()
        .describe("Playbook steps (required for create, optional for update)"),
      category: PlaybookCategory.optional().describe("Playbook category"),
    },
    async (params) => {
      switch (params.action) {
        case "create": {
          if (!params.title) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "Title is required for creating a playbook.",
                  }),
                },
              ],
              isError: true,
            };
          }

          const playbook = playbookStore.create({
            title: params.title,
            category: params.category ?? "assessment",
            steps: params.steps ?? [],
          });

          knowledgeGraph.addNode({
            id: playbook.id,
            entityType: "playbook",
            label: playbook.title,
            metadata: { category: playbook.category },
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { success: true, playbook },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "get": {
          if (!params.playbook_id) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "playbook_id is required for get.",
                  }),
                },
              ],
              isError: true,
            };
          }
          const playbook = playbookStore.get(params.playbook_id);
          if (!playbook) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: `Playbook ${params.playbook_id} not found.`,
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(playbook, null, 2) },
            ],
          };
        }

        case "list": {
          const playbooks = playbookStore.list({
            category: params.category,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { total: playbooks.length, playbooks },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "update": {
          if (!params.playbook_id) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "playbook_id is required for update.",
                  }),
                },
              ],
              isError: true,
            };
          }
          const updated = playbookStore.update(params.playbook_id, {
            title: params.title,
            steps: params.steps,
            category: params.category,
          });
          if (!updated) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: `Playbook ${params.playbook_id} not found.`,
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { success: true, playbook: updated },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        case "archive": {
          if (!params.playbook_id) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "playbook_id is required for archive.",
                  }),
                },
              ],
              isError: true,
            };
          }
          const archived = playbookStore.archive(params.playbook_id);
          if (!archived) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: `Playbook ${params.playbook_id} not found.`,
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { success: true, archived: true, playbook: archived },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "Unknown action." }),
              },
            ],
            isError: true,
          };
      }
    },
  );

  // -----------------------------------------------------------------------
  // knowledge_graph_query
  // -----------------------------------------------------------------------
  server.tool(
    "knowledge_graph_query",
    "Query relationships between knowledge artifacts in the knowledge graph.",
    {
      entity_id: z.string().optional().describe("Starting entity ID for traversal"),
      entity_type: EntityType.optional().describe("Filter by entity type"),
      relationship_type: RelationshipType.optional().describe(
        "Filter by relationship type",
      ),
      depth: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Maximum traversal depth (default 2)"),
    },
    async (params) => {
      const result = knowledgeGraph.query({
        entityId: params.entity_id,
        entityType: params.entity_type,
        relationshipType: params.relationship_type,
        depth: params.depth,
      });

      const stats = knowledgeGraph.stats();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                nodes: result.nodes,
                edges: result.edges,
                graphStats: stats,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // export_knowledge_pack
  // -----------------------------------------------------------------------
  server.tool(
    "export_knowledge_pack",
    "Export curated knowledge packages filtered by topic, type, format, and audience.",
    {
      topic: z.string().min(1).describe("Topic to build the knowledge pack around"),
      include_types: z
        .array(KnowledgePackIncludeType)
        .describe("Types of knowledge artifacts to include"),
      format: ExportFormat.describe("Output format"),
      audience: ExportAudience.describe("Target audience (affects content redaction)"),
    },
    async (params) => {
      const includeSet = new Set(params.include_types);
      const topicLower = params.topic.toLowerCase();

      // Gather matching artifacts
      const allDocs = documentStore.getAll();
      const matchedDocs = includeSet.has("documents")
        ? allDocs.filter(
            (d) =>
              d.title.toLowerCase().includes(topicLower) ||
              d.tags.some((t) => t.toLowerCase().includes(topicLower)) ||
              d.content.toLowerCase().includes(topicLower),
          )
        : undefined;

      const matchedPlaybooks = includeSet.has("playbooks")
        ? playbookStore
            .list()
            .filter(
              (p) =>
                p.title.toLowerCase().includes(topicLower) ||
                p.steps.some((s) =>
                  s.description.toLowerCase().includes(topicLower),
                ),
            )
        : undefined;

      const matchedTemplates = includeSet.has("templates")
        ? templateManager
            .getAll()
            .filter(
              (t) =>
                t.title.toLowerCase().includes(topicLower) ||
                t.useCase.toLowerCase().includes(topicLower) ||
                t.tags.some((tag) => tag.toLowerCase().includes(topicLower)),
            )
        : undefined;

      const matchedLessons = includeSet.has("lessons")
        ? lessonStore
            .getAll()
            .filter(
              (l) =>
                l.title.toLowerCase().includes(topicLower) ||
                l.tags.some((t) => t.toLowerCase().includes(topicLower)) ||
                l.context.toLowerCase().includes(topicLower),
            )
        : undefined;

      const pack: KnowledgePack = {
        id: randomUUID(),
        topic: params.topic,
        includeTypes: params.include_types,
        format: params.format,
        audience: params.audience,
        documents: matchedDocs,
        playbooks: matchedPlaybooks,
        templates: matchedTemplates,
        lessons: matchedLessons,
        generatedAt: new Date().toISOString(),
      };

      // Format output
      if (params.format === "markdown") {
        const md = renderKnowledgePackMarkdown(pack, params.audience);
        return {
          content: [{ type: "text" as const, text: md }],
        };
      }

      // JSON (default) and pdf placeholder
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(pack, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderKnowledgePackMarkdown(
  pack: KnowledgePack,
  audience: "internal" | "client" | "partner",
): string {
  const lines: string[] = [
    `# Knowledge Pack: ${pack.topic}`,
    "",
    `**Generated:** ${pack.generatedAt}`,
    `**Audience:** ${audience}`,
    `**Included types:** ${pack.includeTypes.join(", ")}`,
    "",
  ];

  if (pack.documents && pack.documents.length > 0) {
    lines.push("## Documents", "");
    for (const doc of pack.documents) {
      lines.push(`### ${doc.title}`);
      lines.push(`_Category: ${doc.category} | Classification: ${doc.classification}_`);
      lines.push("");
      lines.push(sanitizeForAudience(doc.content, audience));
      lines.push("");
    }
  }

  if (pack.playbooks && pack.playbooks.length > 0) {
    lines.push("## Playbooks", "");
    for (const pb of pack.playbooks) {
      lines.push(`### ${pb.title}`);
      lines.push(`_Category: ${pb.category} | Steps: ${pb.steps.length}_`);
      lines.push("");
      for (const step of pb.steps) {
        lines.push(`${step.order}. ${step.description}`);
      }
      lines.push("");
    }
  }

  if (pack.templates && pack.templates.length > 0) {
    lines.push("## Solution Templates", "");
    for (const tmpl of pack.templates) {
      lines.push(`### ${tmpl.title}`);
      lines.push(`_Domain: ${tmpl.domain} | Tech: ${tmpl.technologyStack.join(", ")}_`);
      lines.push("");
      lines.push(tmpl.description);
      lines.push("");
    }
  }

  if (pack.lessons && pack.lessons.length > 0) {
    lines.push("## Lessons Learned", "");
    for (const lesson of pack.lessons) {
      lines.push(`### ${lesson.title}`);
      lines.push(`_Project: ${lesson.projectId}_`);
      lines.push("");
      lines.push(`**Challenge:** ${lesson.challenge}`);
      lines.push(`**Solution:** ${lesson.solution}`);
      lines.push(`**Outcome:** ${lesson.outcome}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
