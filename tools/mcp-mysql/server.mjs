import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseBoolean(value, defaultValue = false) {
  if (value == null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseIntSafe(value, defaultValue) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function loadDotEnv(envFilePath) {
  const content = fs.readFileSync(envFilePath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function getDbConfig({ databaseOverride } = {}) {
  const defaultEnvFile = path.resolve(__dirname, "../../Backend/api/.env");
  const envFilePath = process.env.MCP_MYSQL_ENV_FILE
    ? path.resolve(process.env.MCP_MYSQL_ENV_FILE)
    : defaultEnvFile;

  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `No se encontró el archivo .env para la DB. Configura MCP_MYSQL_ENV_FILE. Probado: ${envFilePath}`,
    );
  }

  const envFile = loadDotEnv(envFilePath);

  const host = process.env.MCP_MYSQL_HOST ?? envFile.DB_HOST ?? "127.0.0.1";
  const port = parseIntSafe(process.env.MCP_MYSQL_PORT ?? envFile.DB_PORT ?? "3306", 3306);
  const user = process.env.MCP_MYSQL_USER ?? envFile.DB_USERNAME ?? "root";
  const password = process.env.MCP_MYSQL_PASSWORD ?? envFile.DB_PASSWORD ?? "";
  const database = databaseOverride ?? (process.env.MCP_MYSQL_DATABASE ?? envFile.DB_DATABASE ?? "");

  if (!database) {
    throw new Error("No hay DB_DATABASE definido (ni override). Revisa tu .env del backend.");
  }

  return { host, port, user, password, database };
}

const poolCache = new Map();
function getPool(databaseOverride) {
  const cfg = getDbConfig({ databaseOverride });
  const cacheKey = JSON.stringify({ host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database });

  const existing = poolCache.get(cacheKey);
  if (existing) return existing;

  const pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    multipleStatements: false,
  });

  poolCache.set(cacheKey, pool);
  return pool;
}

function firstSqlKeyword(sql) {
  const trimmed = sql.trim().replace(/^\uFEFF/, "");
  const match = trimmed.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : "";
}

function assertReadOnlySql(sql) {
  const keyword = firstSqlKeyword(sql);
  const allowed = new Set(["SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN"]);
  if (!allowed.has(keyword)) {
    throw new Error(`Solo lectura: se esperaba SELECT/SHOW/DESCRIBE/EXPLAIN y llegó: ${keyword || "(vacío)"}`);
  }
}

function assertWriteEnabled() {
  const allowWrite = parseBoolean(process.env.MCP_MYSQL_ALLOW_WRITE, false);
  if (!allowWrite) {
    throw new Error(
      "Escrituras deshabilitadas. Habilita MCP_MYSQL_ALLOW_WRITE=1 en la config del MCP para usar mysql_execute.",
    );
  }
}

function toTextSummary({ sql, rows, rowCount, affectedRows }) {
  const keyword = firstSqlKeyword(sql);
  if (keyword === "SELECT" || keyword === "SHOW" || keyword === "DESCRIBE" || keyword === "DESC" || keyword === "EXPLAIN") {
    return `OK (${rowCount} filas)`;
  }
  return `OK (${affectedRows ?? 0} filas afectadas)`;
}

const server = new McpServer(
  { name: "salut-mysql", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.registerTool(
  "mysql_list_tables",
  {
    title: "Listar tablas",
    description: "Lista tablas del schema actual (DB_DATABASE).",
    inputSchema: z.object({
      database: z.string().min(1).optional().describe("Override de base de datos (opcional)."),
    }),
  },
  async ({ database }) => {
    const pool = getPool(database);
    const cfg = getDbConfig({ databaseOverride: database });
    const [rows] = await pool.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
      [cfg.database],
    );
    const tableNames = Array.isArray(rows) ? rows.map((r) => r.name) : [];
    return {
      content: [{ type: "text", text: `OK (${tableNames.length} tablas)` }],
      structuredContent: { tables: tableNames },
    };
  },
);

server.registerTool(
  "mysql_describe_table",
  {
    title: "Describir tabla",
    description: "Devuelve columnas y metadatos básicos de una tabla.",
    inputSchema: z.object({
      table: z.string().min(1),
      database: z.string().min(1).optional().describe("Override de base de datos (opcional)."),
    }),
  },
  async ({ table, database }) => {
    const pool = getPool(database);
    const cfg = getDbConfig({ databaseOverride: database });
    const [rows] = await pool.query(
      `SELECT
         column_name AS name,
         data_type AS type,
         is_nullable AS isNullable,
         column_default AS defaultValue,
         column_key AS columnKey,
         extra AS extra
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?
       ORDER BY ordinal_position`,
      [cfg.database, table],
    );
    const columns = Array.isArray(rows) ? rows : [];
    return {
      content: [{ type: "text", text: `OK (${columns.length} columnas)` }],
      structuredContent: { table, columns },
    };
  },
);

server.registerTool(
  "mysql_query",
  {
    title: "Query (solo lectura)",
    description: "Ejecuta una consulta de solo lectura (SELECT/SHOW/DESCRIBE/EXPLAIN).",
    inputSchema: z.object({
      sql: z.string().min(1),
      params: z.array(z.any()).optional().describe("Parámetros posicionales para ? (opcional)."),
      database: z.string().min(1).optional().describe("Override de base de datos (opcional)."),
      maxRows: z.number().int().min(1).max(1000).optional().describe("Límite de filas devueltas (default MCP_MYSQL_MAX_ROWS o 200)."),
    }),
  },
  async ({ sql, params, database, maxRows }) => {
    assertReadOnlySql(sql);
    const pool = getPool(database);

    const limit = maxRows ?? parseIntSafe(process.env.MCP_MYSQL_MAX_ROWS ?? "200", 200);
    const [rows, fields] = await pool.query(sql, params ?? []);

    const rowArray = Array.isArray(rows) ? rows.slice(0, limit) : [];
    const fieldArray = Array.isArray(fields)
      ? fields.map((f) => ({ name: f.name, columnType: typeof f.columnType === "number" ? String(f.columnType) : undefined }))
      : [];

    const rowCount = rowArray.length;
    const warning = Array.isArray(rows) && rows.length > limit ? `Se truncó a ${limit} filas (habían ${rows.length}).` : undefined;

    return {
      content: [{ type: "text", text: warning ? `${toTextSummary({ sql, rowCount })}\n${warning}` : toTextSummary({ sql, rowCount }) }],
      structuredContent: { rows: rowArray, fields: fieldArray, rowCount, warning },
    };
  },
);

server.registerTool(
  "mysql_execute",
  {
    title: "Execute (escritura)",
    description: "Ejecuta SQL con efectos (INSERT/UPDATE/DELETE/DDL). Requiere MCP_MYSQL_ALLOW_WRITE=1.",
    inputSchema: z.object({
      sql: z.string().min(1),
      params: z.array(z.any()).optional().describe("Parámetros posicionales para ? (opcional)."),
      database: z.string().min(1).optional().describe("Override de base de datos (opcional)."),
    }),
  },
  async ({ sql, params, database }) => {
    assertWriteEnabled();
    const pool = getPool(database);

    const [result] = await pool.execute(sql, params ?? []);

    const affectedRows =
      result && typeof result === "object" && "affectedRows" in result && typeof result.affectedRows === "number"
        ? result.affectedRows
        : undefined;

    return {
      content: [{ type: "text", text: toTextSummary({ sql, affectedRows }) }],
      structuredContent: { affectedRows, ok: true },
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
