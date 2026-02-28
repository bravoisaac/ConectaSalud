# MCP MySQL (Salut_app)

Servidor **MCP por stdio** para que Codex pueda consultar y (opcionalmente) modificar la base de datos MySQL configurada en el backend Laravel.

## Requisitos

- Node.js 18+ (en tu equipo ya está).
- MySQL accesible (local o remoto).
- Archivo `.env` del backend con `DB_*` (por defecto usa `Salut_app/Backend/api/.env`).

## Instalación

```powershell
cd .\Salut_app\tools\mcp-mysql
npm install
```

## Configurar Codex (MCP por comando/stdio)

Edita tu archivo `~/.codex/config.toml` y agrega algo así:

```toml
[mcp_servers.salut_mysql]
command = "node"
args = ["C:\\Users\\isaac\\Documents\\Proyectos\\Salut_app\\tools\\mcp-mysql\\server.mjs"]

[mcp_servers.salut_mysql.env]
# Lee DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD desde este archivo:
MCP_MYSQL_ENV_FILE = "C:\\Users\\isaac\\Documents\\Proyectos\\Salut_app\\Backend\\api\\.env"

# Por seguridad, por defecto NO permite escrituras.
MCP_MYSQL_ALLOW_WRITE = "0"
```

Reinicia Codex CLI para que levante el servidor MCP.

## Permitir escrituras (INSERT/UPDATE/DELETE/DDL)

Cuando realmente quieras que Codex pueda hacer cambios, pon:

```toml
[mcp_servers.salut_mysql.env]
MCP_MYSQL_ALLOW_WRITE = "1"
```

## Tools disponibles

- `mysql_list_tables` (solo lectura)
- `mysql_describe_table` (solo lectura)
- `mysql_query` (solo lectura: permite `SELECT/SHOW/DESCRIBE/EXPLAIN`)
- `mysql_execute` (escritura: requiere `MCP_MYSQL_ALLOW_WRITE=1`)

## Variables de entorno (opcionales)

- `MCP_MYSQL_ENV_FILE`: ruta al `.env` de Laravel (default: `../../Backend/api/.env` relativo a este directorio).
- `MCP_MYSQL_ALLOW_WRITE`: `1` para habilitar escrituras (default `0`).
- `MCP_MYSQL_MAX_ROWS`: límite por defecto de filas en `mysql_query` (default `200`).
