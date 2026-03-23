import * as https from "node:https";
/**
 * Perform a GET request to the Airtable API using Node https.
 */
async function airtableGet(url, apiKey) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Failed to parse Airtable response: ${data}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}
export class AirtableConnector {
  name;
  type = "airtable";
  config;
  connected = false;
  apiKey = null;
  constructor(config) {
    this.name = config.name;
    this.config = config;
  }
  async connect(config) {
    const cfg = config ?? this.config;
    if (!cfg.base_id) {
      throw new Error(`AirtableConnector '${this.name}': base_id is required`);
    }
    if (!cfg.table_name) {
      throw new Error(`AirtableConnector '${this.name}': table_name is required`);
    }
    const key = process.env["AIRTABLE_API_KEY"];
    if (!key) {
      throw new Error("AIRTABLE_API_KEY environment variable is not set");
    }
    this.apiKey = key;
    this.connected = true;
  }
  async disconnect() {
    this.apiKey = null;
    this.connected = false;
  }
  isConnected() {
    return this.connected;
  }
  async healthCheck() {
    try {
      if (!this.apiKey) return false;
      // Try listing first page of the configured table
      const url = `https://api.airtable.com/v0/${this.config.base_id}/${encodeURIComponent(this.config.table_name)}?maxRecords=1`;
      await airtableGet(url, this.apiKey);
      return true;
    } catch {
      return false;
    }
  }
  async listTables() {
    if (!this.apiKey) {
      throw new Error("Not connected");
    }
    try {
      // Airtable Metadata API for listing tables
      const url = `https://api.airtable.com/v0/meta/bases/${this.config.base_id}/tables`;
      const data = await airtableGet(url, this.apiKey);
      if (data.tables) {
        return data.tables.map((t) => t.name);
      }
    } catch {
      // Fallback: return the configured table name
    }
    return [this.config.table_name];
  }
  async getSchema(table) {
    if (!this.apiKey) {
      throw new Error("Not connected");
    }
    // Fetch one record to infer field names
    const url = `https://api.airtable.com/v0/${this.config.base_id}/${encodeURIComponent(table)}?maxRecords=1`;
    const data = await airtableGet(url, this.apiKey);
    const firstRecord = data.records?.[0];
    if (!firstRecord) {
      return [];
    }
    return Object.keys(firstRecord.fields).map((fieldName) => ({
      name: fieldName,
      type: "string",
      normalized_type: "string",
    }));
  }
  async query(sql, maxRows) {
    if (!this.apiKey) {
      throw new Error("Not connected");
    }
    // Determine limit from sql
    let limit = maxRows;
    const limitMatch = /\bLIMIT\s+(\d+)/i.exec(sql);
    if (limitMatch) {
      limit = Math.min(parseInt(limitMatch[1], 10), maxRows);
    }
    // Page through all records
    const allRecords = [];
    let offset;
    do {
      let url = `https://api.airtable.com/v0/${this.config.base_id}/${encodeURIComponent(this.config.table_name)}?pageSize=100`;
      if (offset) {
        url += `&offset=${encodeURIComponent(offset)}`;
      }
      const data = await airtableGet(url, this.apiKey);
      const records = data.records ?? [];
      allRecords.push(...records);
      offset = data.offset;
      if (allRecords.length >= limit) break;
    } while (offset);
    const truncated = allRecords.length > limit;
    const sliced = truncated ? allRecords.slice(0, limit) : allRecords;
    // Build column list from all records
    const colSet = new Set();
    for (const r of sliced) {
      for (const key of Object.keys(r.fields)) {
        colSet.add(key);
      }
    }
    const columns = Array.from(colSet);
    const rows = sliced.map((r) => {
      const row = { _id: r.id };
      for (const col of columns) {
        row[col] = r.fields[col] ?? null;
      }
      return row;
    });
    // Include _id in columns
    const allColumns = ["_id", ...columns];
    return {
      columns: allColumns,
      rows,
      rowCount: rows.length,
      truncated,
    };
  }
}
