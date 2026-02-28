import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.mjs"],
  cwd: __dirname,
  stderr: "pipe",
  env: {
    MCP_MYSQL_ALLOW_WRITE: "0",
  },
});

if (transport.stderr) {
  transport.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
}

const client = new Client({ name: "salut-mysql-selftest", version: "0.0.0" }, { capabilities: {} });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`OK: tools=${tools.map((t) => t.name).join(", ")}`);

await client.close();
