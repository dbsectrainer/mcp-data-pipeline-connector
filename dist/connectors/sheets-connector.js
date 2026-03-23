import * as crypto from "node:crypto";
import * as https from "node:https";
/**
 * Base64url encode a Buffer or string (no padding).
 */
function base64url(input) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
    return buf.toString("base64url");
}
/**
 * Build a signed JWT for Google service account authentication.
 */
function buildServiceAccountJwt(sa) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64url(JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
    }));
    const signingInput = `${header}.${payload}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const sig = sign.sign(sa.private_key, "base64url");
    return `${signingInput}.${sig}`;
}
/**
 * Exchange a service account JWT for a Google OAuth2 access token.
 */
async function getAccessToken(sa) {
    const jwt = buildServiceAccountJwt(sa);
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: "oauth2.googleapis.com",
            path: "/token",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body),
            },
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk.toString();
            });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.access_token) {
                        resolve(parsed.access_token);
                    }
                    else {
                        reject(new Error(`Google OAuth error: ${parsed.error ?? data}`));
                    }
                }
                catch {
                    reject(new Error(`Failed to parse token response: ${data}`));
                }
            });
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}
/**
 * Fetch a URL with Authorization header using Node https.
 */
async function httpsGet(url, accessToken) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk.toString();
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });
        req.on("error", reject);
        req.end();
    });
}
export class SheetsConnector {
    name;
    type = "sheets";
    config;
    connected = false;
    accessToken = null;
    constructor(config) {
        this.name = config.name;
        this.config = config;
    }
    async connect(config) {
        const cfg = config ?? this.config;
        if (!cfg.spreadsheet_id) {
            throw new Error(`SheetsConnector '${this.name}': spreadsheet_id is required`);
        }
        if (!cfg.sheet_name) {
            throw new Error(`SheetsConnector '${this.name}': sheet_name is required`);
        }
        const saJson = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
        if (!saJson) {
            throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
        }
        const sa = JSON.parse(saJson);
        this.accessToken = await getAccessToken(sa);
        this.connected = true;
    }
    async disconnect() {
        this.accessToken = null;
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    async healthCheck() {
        try {
            if (!this.accessToken)
                return false;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheet_id}?fields=spreadsheetId`;
            await httpsGet(url, this.accessToken);
            return true;
        }
        catch {
            return false;
        }
    }
    async listTables() {
        if (!this.accessToken) {
            throw new Error("Not connected");
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheet_id}?fields=sheets.properties.title`;
        const data = (await httpsGet(url, this.accessToken));
        return (data.sheets ?? []).map((s) => s.properties?.title ?? "").filter((t) => t !== "");
    }
    async getSchema(table) {
        if (!this.accessToken) {
            throw new Error("Not connected");
        }
        const range = encodeURIComponent(`${table}!1:1`);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheet_id}/values/${range}`;
        const data = (await httpsGet(url, this.accessToken));
        const headers = data.values?.[0] ?? [];
        return headers.map((h) => ({
            name: h,
            type: "string",
            normalized_type: "string",
        }));
    }
    async query(sql, maxRows) {
        if (!this.accessToken) {
            throw new Error("Not connected");
        }
        const range = encodeURIComponent(this.config.sheet_name);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheet_id}/values/${range}`;
        const data = (await httpsGet(url, this.accessToken));
        const allValues = data.values ?? [];
        if (allValues.length === 0) {
            return { columns: [], rows: [], rowCount: 0, truncated: false };
        }
        const headers = allValues[0];
        const dataRows = allValues.slice(1);
        // Convert to row objects
        const objects = dataRows.map((row) => {
            const record = {};
            headers.forEach((h, i) => {
                record[h] = row[i] ?? null;
            });
            return record;
        });
        // Simple SQL parsing: respect LIMIT N in the sql string
        let limit = maxRows;
        const limitMatch = /\bLIMIT\s+(\d+)/i.exec(sql);
        if (limitMatch) {
            limit = Math.min(parseInt(limitMatch[1], 10), maxRows);
        }
        const truncated = objects.length > limit;
        const rows = truncated ? objects.slice(0, limit) : objects;
        return {
            columns: headers,
            rows,
            rowCount: rows.length,
            truncated,
        };
    }
}
