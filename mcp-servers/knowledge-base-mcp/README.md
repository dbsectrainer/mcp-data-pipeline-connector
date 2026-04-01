# Knowledge Base MCP Server

**Firm-wide intelligence layer centralizing institutional knowledge for BE EASY ENTERPRISES LLC.**

Part of the MCP Data Pipeline Connector platform. This server provides a unified interface for storing, searching, and exporting organizational knowledge including documents, playbooks, solution templates, and lessons learned.

## Tools

| Tool | Description |
|------|-------------|
| `store_document` | Store documents, playbooks, architectures, and policies with classification tagging. |
| `semantic_search` | TF-IDF semantic search across the knowledge base with category, tag, and classification filters. |
| `get_solution_template` | Retrieve reusable solution templates by domain, use case, and technology stack. |
| `store_lessons_learned` | Capture lessons learned from completed projects with structured context, challenge, solution, and outcome fields. |
| `query_lessons_learned` | Query past lessons by domain, keywords, project type, or date range. |
| `manage_playbook` | Create, update, retrieve, list, or archive operational playbooks with ordered steps. |
| `knowledge_graph_query` | Traverse relationships between knowledge artifacts with configurable depth. |
| `export_knowledge_pack` | Export curated knowledge packages in JSON or Markdown, filtered by topic and audience. |

## Architecture

```
src/
  index.ts                  Entry point (stdio transport)
  server.ts                 MCP tool definitions
  types.ts                  Zod schemas and TypeScript types
  storage/
    document-store.ts       Document, lesson, and playbook storage with indexing
    vector-store.ts         Pluggable vector store interface (in-memory default)
  search/
    semantic-engine.ts      TF-IDF search engine with vector similarity support
    knowledge-graph.ts      Graph relationship management and BFS traversal
  templates/
    template-manager.ts     Solution template management with built-in starters
  utils/
    text-processor.ts       Tokenization, TF-IDF, cosine similarity, checksums
    classification.ts       Access control and content sanitization
tests/
  server.test.ts            Unit tests
```

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PATH` | Local data directory | `./data/knowledge-base` |
| `VECTOR_DB_URL` | Vector database endpoint | `http://localhost:6333` |
| `EMBEDDING_API_URL` | Embedding model API | `http://localhost:11434/api/embeddings` |
| `EMBEDDING_API_KEY` | API key for embedding service | _(empty)_ |
| `MAX_DOCUMENT_SIZE_MB` | Maximum document size | `50` |
| `MAX_SEARCH_RESULTS` | Search result limit | `100` |
| `MAX_GRAPH_DEPTH` | Knowledge graph traversal limit | `5` |
| `DEFAULT_CLASSIFICATION` | Default document classification | `internal` |

## Classification Levels

Documents support four classification levels controlling access and export visibility:

- **public** -- Freely shareable
- **internal** -- Visible within the organization
- **confidential** -- Restricted to authorized teams
- **restricted** -- Highest sensitivity, redacted in client/partner exports

## MCP Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "mcp-servers/knowledge-base-mcp"
    }
  }
}
```

## License

UNLICENSED -- Proprietary to BE EASY ENTERPRISES LLC.
