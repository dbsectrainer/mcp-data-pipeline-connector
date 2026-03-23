import type { DataConnector } from "./base.js";
import type { ColumnInfo, QueryResult } from "../types.js";
export interface SheetsConfig {
    type: "sheets";
    spreadsheet_id: string;
    sheet_name: string;
}
export declare class SheetsConnector implements DataConnector {
    readonly name: string;
    readonly type = "sheets";
    private config;
    private connected;
    private accessToken;
    constructor(config: SheetsConfig & {
        name: string;
    });
    connect(config?: SheetsConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    healthCheck(): Promise<boolean>;
    listTables(): Promise<string[]>;
    getSchema(table: string): Promise<ColumnInfo[]>;
    query(sql: string, maxRows: number): Promise<QueryResult>;
}
