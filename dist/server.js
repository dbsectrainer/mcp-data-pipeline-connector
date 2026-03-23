import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  CancelledNotificationSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { SourceRegistry } from "./source-registry.js";
import { loadConfig } from "./config-loader.js";
/**
 * Enforce read-only mode: only SELECT and WITH (CTE) queries are allowed.
 */
function assertReadOnly(sql) {
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Only SELECT queries are allowed in read-only mode",
    );
  }
}
/**
 * Estimate query complexity to decide whether to emit progress notifications.
 * Returns true for queries likely to be long-running.
 */
function isComplexQuery(sql) {
  const upper = sql.toUpperCase();
  return (
    upper.includes("JOIN") ||
    upper.includes("GROUP BY") ||
    upper.includes("ORDER BY") ||
    upper.includes("DISTINCT") ||
    upper.includes("UNION")
  );
}
/**
 * Build a SQL query from a list of transform operations.
 */
function buildTransformSql(baseTable, operations) {
  let sql = `SELECT * FROM "${baseTable}"`;
  const whereConditions = [];
  let selectColumns = "*";
  let groupByColumns;
  let aggregateExpr;
  let renameMap = {};
  for (const op of operations) {
    switch (op.type) {
      case "filter": {
        const column = String(op.params["column"] ?? "");
        const operator = String(op.params["operator"] ?? "=");
        const value = op.params["value"];
        const safeValue =
          typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : String(value ?? "NULL");
        const allowedOps = new Set([
          "=",
          "!=",
          "<",
          "<=",
          ">",
          ">=",
          "LIKE",
          "NOT LIKE",
          "IS NULL",
          "IS NOT NULL",
        ]);
        if (column && allowedOps.has(operator.toUpperCase())) {
          if (operator.toUpperCase() === "IS NULL" || operator.toUpperCase() === "IS NOT NULL") {
            whereConditions.push(`"${column}" ${operator.toUpperCase()}`);
          } else {
            whereConditions.push(`"${column}" ${operator} ${safeValue}`);
          }
        }
        break;
      }
      case "select": {
        const columns = op.params["columns"];
        if (Array.isArray(columns)) {
          selectColumns = columns.map((c) => `"${String(c)}"`).join(", ");
        }
        break;
      }
      case "rename": {
        const mappings = op.params["mappings"];
        if (mappings && typeof mappings === "object" && !Array.isArray(mappings)) {
          renameMap = mappings;
        }
        break;
      }
      case "aggregate": {
        groupByColumns = String(op.params["group_by"] ?? "");
        aggregateExpr = String(op.params["agg"] ?? "COUNT(*)");
        break;
      }
    }
  }
  // Apply renames to selectColumns
  if (Object.keys(renameMap).length > 0) {
    if (selectColumns === "*") {
      // We can't rename without explicit column list
    } else {
      const cols = selectColumns.split(",").map((c) => {
        const trimmed = c.trim().replace(/^"|"$/g, "");
        const renamed = renameMap[trimmed];
        return renamed ? `"${trimmed}" AS "${renamed}"` : `"${trimmed}"`;
      });
      selectColumns = cols.join(", ");
    }
  }
  if (groupByColumns && aggregateExpr) {
    sql = `SELECT "${groupByColumns}", ${aggregateExpr} FROM "${baseTable}"`;
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    sql += ` GROUP BY "${groupByColumns}"`;
  } else {
    sql = `SELECT ${selectColumns} FROM "${baseTable}"`;
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(" AND ")}`;
    }
  }
  return sql;
}
export function createServer(options) {
  const registry = new SourceRegistry(options.restCacheTtl ?? 60);
  /**
   * Tracks active long-running requests by request ID so they can be
   * cancelled via notifications/cancelled.
   */
  const activeRequests = new Map();
  const server = new Server(
    {
      name: "mcp-data-pipeline-connector",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
    },
  );
  /**
   * Emit a structured MCP logging notification.
   * Credentials must never appear in log messages.
   */
  function emitLog(level, message, data) {
    try {
      void server.notification({
        method: "notifications/message",
        params: {
          level,
          logger: "mcp-data-pipeline-connector",
          data: data !== undefined ? JSON.stringify(data) : message,
        },
      });
    } catch {
      // Non-fatal — logging must not break query execution
    }
  }
  /**
   * Emit a progress notification for long-running operations.
   */
  function emitProgress(progressToken, progress, total) {
    try {
      void server.notification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress,
          total,
        },
      });
    } catch {
      // Non-fatal
    }
  }
  // ─── List Tools ──────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "connect_source",
          description:
            "Register a data source (CSV file, Postgres database, or REST API). " +
            "Credentials must be in environment variables or a YAML config file — " +
            "never pass connection strings directly.",
          annotations: { readOnlyHint: false },
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Unique name for this data source",
              },
              type: {
                type: "string",
                enum: ["csv", "postgres", "rest"],
                description: "Type of the data source",
              },
              path: {
                type: "string",
                description: "File path for CSV/JSON sources",
              },
              url: {
                type: "string",
                description: "Base URL for REST API sources",
              },
              source_config_path: {
                type: "string",
                description:
                  "Path to a YAML config file. If provided, all sources in the file are registered.",
              },
            },
            required: ["name", "type"],
          },
        },
        {
          name: "list_sources",
          description: "List all registered data sources and their connection status.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_tables",
          description: "List available tables across all sources, or just the named source.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Optional: name of a specific source to list tables for",
              },
            },
          },
        },
        {
          name: "get_schema",
          description: "Return the column names and types for a specific table.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Name of the source that contains the table",
              },
              table: {
                type: "string",
                description: "Name of the table",
              },
            },
            required: ["source", "table"],
          },
        },
        {
          name: "query",
          description:
            "Execute a SQL query against a registered data source using DuckDB. " +
            "Returns up to --max-rows rows (default 1000). " +
            "In read-only mode (default), only SELECT statements are allowed. " +
            "Use source='_all' to query across all CSV sources with cross-source joins. " +
            "Supports limit and offset for pagination.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {
              sql: {
                type: "string",
                description: "The SQL query to execute",
              },
              source: {
                type: "string",
                description:
                  "Name of the source to query, or '_all' for cross-source joins. Required if multiple sources are registered.",
              },
              sources: {
                type: "array",
                items: { type: "string" },
                description:
                  "Array of source names for cross-source queries (alternative to source='_all')",
              },
              max_rows: {
                type: "number",
                description: "Override the default max row limit for this query",
              },
              limit: {
                type: "number",
                description: "Maximum number of rows to return (pagination)",
              },
              offset: {
                type: "number",
                description: "Number of rows to skip before returning results (pagination)",
              },
            },
            required: ["sql"],
          },
        },
        {
          name: "transform",
          description:
            "Apply aggregations, filters, renaming, or column selection to a source table and return or save results.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Name of the data source to transform",
              },
              table: {
                type: "string",
                description: "Name of the table within the source to transform",
              },
              operations: {
                type: "array",
                description: "List of transform operations to apply in order",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["filter", "aggregate", "rename", "select"],
                      description: "Operation type",
                    },
                    params: {
                      type: "object",
                      description: "Operation-specific parameters",
                    },
                  },
                  required: ["type", "params"],
                },
              },
              output_format: {
                type: "string",
                enum: ["json", "csv"],
                description: "Output format (default: json)",
              },
            },
            required: ["source", "table", "operations"],
          },
        },
        {
          name: "check_health",
          description: "Check whether registered data sources are still reachable and responsive.",
          annotations: { readOnlyHint: true },
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Optional: name of a specific source to health-check",
              },
            },
          },
        },
      ],
    };
  });
  // ─── Resources ───────────────────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const tables = await registry.listTables();
    return {
      resources: tables.map((t) => ({
        uri: `data://${t.source}/${t.name}`,
        name: `${t.source}.${t.name}`,
        description: `Schema for ${t.name} in ${t.source}`,
        mimeType: "application/json",
      })),
    };
  });
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    // data://{source_name}/{table_name}
    const match = /^data:\/\/([^/]+)\/(.+)$/.exec(uri);
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid resource URI: ${uri}. Expected format: data://{source_name}/{table_name}`,
      );
    }
    const [, sourceName, tableName] = match;
    const connector = registry.get(sourceName);
    if (!connector) {
      throw new McpError(ErrorCode.InvalidParams, `Source '${sourceName}' not found`);
    }
    const schema = await connector.getSchema(tableName);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ source: sourceName, table: tableName, schema }, null, 2),
        },
      ],
    };
  });
  // ─── Prompts ─────────────────────────────────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "explore-data",
          description:
            "Guide agents through schema discovery and querying. " +
            "Walks through list_sources → list_tables → get_schema before writing any queries.",
          arguments: [
            {
              name: "source_name",
              description: "Optional: focus discovery on a specific source",
              required: false,
            },
          ],
        },
      ],
    };
  });
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name !== "explore-data") {
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${request.params.name}`);
    }
    const sourceName = request.params.arguments?.["source_name"];
    const sourceHint = sourceName ? ` Focus on the source named "${sourceName}".` : "";
    return {
      description: "Guide schema discovery and safe querying",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `You are exploring a data pipeline.${sourceHint} Follow these steps in order:\n\n` +
              `1. Call \`list_sources\` to see all registered data sources and their status.\n` +
              `2. Call \`list_tables\`${sourceName ? ` with source="${sourceName}"` : ""} to enumerate the available tables.\n` +
              `3. For each table you want to query, call \`get_schema\` to understand its column names and types before writing any SQL.\n` +
              `4. Only after completing steps 1–3, write a \`query\` using only columns that exist in the schema.\n` +
              `\nAlways use the \`source\` parameter in \`query\` to specify which source to target. ` +
              `Avoid SELECT * on large tables — prefer selecting specific columns after schema discovery.`,
          },
        },
      ],
    };
  });
  // ─── Call Tool ───────────────────────────────────────────────────────────────
  server.setNotificationHandler(CancelledNotificationSchema, (notification) => {
    const cancelledId = notification.params.requestId;
    if (cancelledId === undefined) return;
    const controller = activeRequests.get(cancelledId);
    if (controller) {
      controller.abort();
      activeRequests.delete(cancelledId);
      emitLog("debug", `Request ${String(cancelledId)} cancelled`);
    }
  });
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const requestId = extra.requestId;
    try {
      switch (name) {
        // ── connect_source ──────────────────────────────────────────────────
        case "connect_source": {
          const toolArgs = args;
          // If a config file path is given, load all sources from it
          if (toolArgs["source_config_path"]) {
            const configPath = String(toolArgs["source_config_path"]);
            const config = loadConfig(configPath);
            if (!config) {
              throw new McpError(ErrorCode.InvalidParams, `Config file not found: ${configPath}`);
            }
            const registered = [];
            for (const source of config.sources) {
              await registry.register(source);
              registered.push(source.name);
              emitLog("info", `Source connected: ${source.name} (${source.type})`);
            }
            return {
              content: [
                {
                  type: "text",
                  text: `Registered ${registered.length} source(s): ${registered.join(", ")}`,
                },
              ],
            };
          }
          // Otherwise register the single described source
          const sourceName = toolArgs["name"];
          const sourceType = toolArgs["type"];
          if (!sourceName || typeof sourceName !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "name is required and must be a string");
          }
          if (
            !sourceType ||
            typeof sourceType !== "string" ||
            !["csv", "postgres", "rest"].includes(sourceType)
          ) {
            throw new McpError(ErrorCode.InvalidParams, "type must be one of: csv, postgres, rest");
          }
          const sourceConfig = {
            name: sourceName,
            type: sourceType,
          };
          if (toolArgs["path"] !== undefined) {
            sourceConfig.path = String(toolArgs["path"]);
          }
          if (toolArgs["url"] !== undefined) {
            sourceConfig.url = String(toolArgs["url"]);
          }
          // Note: connection_string is intentionally NOT accepted from tool input.
          // It must come from environment variables (via YAML config with ${ENV_VAR} substitution).
          await registry.register(sourceConfig);
          emitLog("info", `Source connected: ${sourceName} (${sourceType})`);
          return {
            content: [
              {
                type: "text",
                text: `Source '${sourceName}' (${sourceType}) connected successfully.`,
              },
            ],
          };
        }
        // ── list_sources ────────────────────────────────────────────────────
        case "list_sources": {
          const sources = registry.list();
          if (sources.length === 0) {
            return {
              content: [{ type: "text", text: "No sources registered." }],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(sources, null, 2),
              },
            ],
          };
        }
        // ── list_tables ─────────────────────────────────────────────────────
        case "list_tables": {
          const toolArgs = args;
          const sourceName =
            toolArgs && typeof toolArgs["source"] === "string" ? toolArgs["source"] : undefined;
          const tables = await registry.listTables(sourceName);
          if (tables.length === 0) {
            const msg = sourceName
              ? `No tables found in source '${sourceName}'.`
              : "No tables found across any registered source.";
            return { content: [{ type: "text", text: msg }] };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(tables, null, 2),
              },
            ],
          };
        }
        // ── get_schema ──────────────────────────────────────────────────────
        case "get_schema": {
          const toolArgs = args;
          const sourceName = toolArgs["source"];
          const tableName = toolArgs["table"];
          if (!sourceName || typeof sourceName !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "source is required");
          }
          if (!tableName || typeof tableName !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "table is required");
          }
          const connector = registry.get(sourceName);
          if (!connector) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Source '${sourceName}' not found. Use list_sources to see available sources.`,
            );
          }
          const schema = await connector.getSchema(tableName);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(schema, null, 2),
              },
            ],
          };
        }
        // ── query ────────────────────────────────────────────────────────────
        case "query": {
          const toolArgs = args;
          const sql = toolArgs["sql"];
          if (!sql || typeof sql !== "string" || sql.trim() === "") {
            throw new McpError(
              ErrorCode.InvalidParams,
              "sql is required and must be a non-empty string",
            );
          }
          // Enforce read-only mode
          if (options.readOnly) {
            assertReadOnly(sql);
          }
          // Pagination parameters
          const limitParam = typeof toolArgs["limit"] === "number" ? toolArgs["limit"] : undefined;
          const offsetParam = typeof toolArgs["offset"] === "number" ? toolArgs["offset"] : 0;
          // Determine max rows
          const maxRows =
            toolArgs["max_rows"] && typeof toolArgs["max_rows"] === "number"
              ? Math.min(toolArgs["max_rows"], options.maxRows)
              : options.maxRows;
          const effectiveLimit = limitParam !== undefined ? Math.min(limitParam, maxRows) : maxRows;
          // Check if cross-source query
          const isCrossSource =
            toolArgs["source"] === "_all" ||
            (Array.isArray(toolArgs["sources"]) && toolArgs["sources"].length > 1);
          const startTime = Date.now();
          const progressToken = `query-${startTime}`;
          // Set up cancellation support
          const abortController = new AbortController();
          const { signal } = abortController;
          if (requestId !== undefined) activeRequests.set(requestId, abortController);
          // Emit progress start for complex queries
          const complex = isComplexQuery(sql);
          if (complex) {
            emitProgress(progressToken, 0, 100);
          }
          let result;
          try {
            if (signal.aborted) {
              throw new McpError(ErrorCode.InternalError, "Request was cancelled");
            }
            if (isCrossSource) {
              // Cross-source query — use shared DuckDB with all CSV sources attached
              if (options.readOnly) {
                assertReadOnly(sql);
              }
              const { connection } = await registry.getCrossSourceDb();
              try {
                if (complex) emitProgress(progressToken, 30, 100);
                // Apply pagination
                let paginatedSql = sql;
                if (!/\bLIMIT\b/i.test(sql)) {
                  paginatedSql += ` LIMIT ${effectiveLimit + 1}`;
                }
                if (offsetParam > 0 && !/\bOFFSET\b/i.test(sql)) {
                  paginatedSql += ` OFFSET ${offsetParam}`;
                }
                if (signal.aborted) {
                  connection.closeSync();
                  throw new McpError(ErrorCode.InternalError, "Request was cancelled");
                }
                if (complex) emitProgress(progressToken, 60, 100);
                const dbResult = await connection.run(paginatedSql);
                if (signal.aborted) {
                  connection.closeSync();
                  throw new McpError(ErrorCode.InternalError, "Request was cancelled");
                }
                const columnNames = dbResult.columnNames();
                const allRows = await dbResult.getRows();
                connection.closeSync();
                const truncated = allRows.length > effectiveLimit;
                const slicedRows = truncated ? allRows.slice(0, effectiveLimit) : allRows;
                const rows = slicedRows.map((row) => {
                  const record = {};
                  columnNames.forEach((col, i) => {
                    const v = row[i];
                    record[col] = typeof v === "bigint" ? Number(v) : v;
                  });
                  return record;
                });
                result = {
                  columns: columnNames,
                  rows,
                  rowCount: rows.length,
                  truncated,
                  total_returned: rows.length,
                  offset: offsetParam,
                  has_more: truncated,
                };
              } catch (err) {
                connection.closeSync();
                throw err;
              }
            } else {
              // Single-source query
              let connector;
              if (toolArgs["source"] && typeof toolArgs["source"] === "string") {
                connector = registry.get(toolArgs["source"]);
                if (!connector) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    `Source '${toolArgs["source"]}' not found. Use list_sources to see available sources.`,
                  );
                }
              } else {
                const sources = registry.list();
                if (sources.length === 0) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    "No sources registered. Use connect_source first.",
                  );
                }
                if (sources.length > 1) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    `Multiple sources are registered. Specify which one to query using the 'source' parameter. Available: ${sources.map((s) => s.name).join(", ")}`,
                  );
                }
                connector = registry.get(sources[0].name);
              }
              if (complex) emitProgress(progressToken, 30, 100);
              // Build paginated SQL
              let paginatedSql = sql;
              if (limitParam !== undefined && !/\bLIMIT\b/i.test(sql)) {
                paginatedSql += ` LIMIT ${effectiveLimit + 1}`;
              } else if (limitParam === undefined && !/\bLIMIT\b/i.test(sql)) {
                paginatedSql += ` LIMIT ${effectiveLimit + 1}`;
              }
              if (offsetParam > 0 && !/\bOFFSET\b/i.test(sql)) {
                paginatedSql += ` OFFSET ${offsetParam}`;
              }
              if (signal.aborted) {
                throw new McpError(ErrorCode.InternalError, "Request was cancelled");
              }
              if (complex) emitProgress(progressToken, 60, 100);
              const rawResult = await connector.query(paginatedSql, effectiveLimit);
              if (signal.aborted) {
                throw new McpError(ErrorCode.InternalError, "Request was cancelled");
              }
              result = {
                ...rawResult,
                total_returned: rawResult.rowCount,
                offset: offsetParam,
                has_more: rawResult.truncated,
              };
            }
          } finally {
            if (requestId !== undefined) activeRequests.delete(requestId);
          }
          const elapsed = Date.now() - startTime;
          emitLog("debug", `Query executed in ${elapsed}ms`, {
            elapsed_ms: elapsed,
            rows: result.rowCount,
          });
          if (complex) emitProgress(progressToken, 100, 100);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        // ── transform ────────────────────────────────────────────────────────
        case "transform": {
          const toolArgs = args;
          const sourceName = toolArgs["source"];
          const tableName = toolArgs["table"];
          const operations = toolArgs["operations"];
          const outputFormat = toolArgs["output_format"] ?? "json";
          if (!sourceName || typeof sourceName !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "source is required");
          }
          if (!tableName || typeof tableName !== "string") {
            throw new McpError(ErrorCode.InvalidParams, "table is required");
          }
          if (!Array.isArray(operations)) {
            throw new McpError(ErrorCode.InvalidParams, "operations must be an array");
          }
          const connector = registry.get(sourceName);
          if (!connector) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `Source '${sourceName}' not found. Use list_sources to see available sources.`,
            );
          }
          const sql = buildTransformSql(tableName, operations);
          // Set up cancellation support
          const transformAbortController = new AbortController();
          const transformSignal = transformAbortController.signal;
          if (requestId !== undefined) activeRequests.set(requestId, transformAbortController);
          let rawResult;
          try {
            if (transformSignal.aborted) {
              throw new McpError(ErrorCode.InternalError, "Request was cancelled");
            }
            rawResult = await connector.query(sql, options.maxRows);
            if (transformSignal.aborted) {
              throw new McpError(ErrorCode.InternalError, "Request was cancelled");
            }
          } finally {
            if (requestId !== undefined) activeRequests.delete(requestId);
          }
          let output;
          if (outputFormat === "csv") {
            const header = rawResult.columns.join(",");
            const rows = rawResult.rows.map((row) =>
              rawResult.columns
                .map((col) => {
                  const val = row[col];
                  if (val === null || val === undefined) return "";
                  const str = String(val);
                  return str.includes(",") || str.includes('"') || str.includes("\n")
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
                })
                .join(","),
            );
            output = [header, ...rows].join("\n");
          } else {
            output = JSON.stringify(rawResult, null, 2);
          }
          emitLog(
            "debug",
            `Transform executed: ${operations.length} operation(s) on ${sourceName}.${tableName}`,
          );
          return {
            content: [
              {
                type: "text",
                text: output,
              },
            ],
          };
        }
        // ── check_health ─────────────────────────────────────────────────────
        case "check_health": {
          const toolArgs = args;
          const sourceName =
            toolArgs && typeof toolArgs["source"] === "string" ? toolArgs["source"] : undefined;
          const results = await registry.checkHealth(sourceName);
          // Emit warnings for unhealthy sources
          for (const r of results) {
            if (!r.healthy) {
              emitLog(
                "warning",
                `Health check failed for source '${r.name}': ${r.error ?? "unknown error"}`,
              );
            }
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (err) {
      // Re-throw MCP errors as-is
      if (err instanceof McpError) {
        throw err;
      }
      // Wrap unexpected errors as internal_error
      throw new McpError(ErrorCode.InternalError, `Internal error: ${err.message}`);
    }
  });
  return { server, registry, activeRequests };
}
/**
 * Auto-load sources from the default config path (or custom path) on startup.
 */
export async function autoLoadSources(registry, configPath) {
  try {
    const config = loadConfig(configPath);
    if (!config) {
      process.stderr.write("[server] No data-sources.yaml found, starting with no sources\n");
      return;
    }
    let count = 0;
    for (const source of config.sources) {
      try {
        await registry.register(source);
        count++;
      } catch (err) {
        process.stderr.write(
          `[server] Failed to auto-load source '${source.name}': ${err.message}\n`,
        );
      }
    }
    process.stderr.write(`[server] Auto-loaded ${count} source(s) from config\n`);
  } catch (err) {
    process.stderr.write(`[server] Failed to load config: ${err.message}\n`);
  }
}
