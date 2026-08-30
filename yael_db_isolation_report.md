# Yael database isolation report

Oracle host: `instance-r223911m` (`129.159.138.4`).  
Secrets (`YAEL_DATABASE_URL`, passwords, tokens) are **not** included in this file.

## 1. Read-only discovery

No existing Yael application, nginx `server_name`, GitHub repo, n8n workflow, Prisma/Drizzle/Alembic tree, or `YAEL_*` env was found under `/home/ubuntu`, `/var/www`, `/opt`, or `reuvenMAV` GitHub repos.

Existing Postgres on the host (left untouched):

| Instance | Image / engine | Host bind | Used by (do not mix Yael data) |
|---|---|---|---|
| `openreply-postgres-1` | `postgres:16` | `127.0.0.1:5434` | OpenReply |
| `evolution_postgres` | `postgres:15-alpine` | `:5433` | Evolution + `n8n_prod` / `n8n_dev` / `n8n_newsite` |
| `chatwoot_postgres` | Chatwoot Postgres | internal | Chatwoot |

Yael was **not** attached to any of those instances.

## 2. What was provisioned

Because no Yael compose/service existed, a **new dedicated stack** was created. Existing compose files and containers were not edited. No `docker compose down`, no volume deletes on other stacks.

| Field | Value |
|---|---|
| Engine | PostgreSQL **16.15** (`postgres:16-alpine`) |
| Compose file | `/home/ubuntu/yael/docker-compose.yml` |
| Compose service | `postgres` |
| Container | `yael-postgres` |
| Docker network | `yael_net` only (not `n8n_net`, not OpenReply/Evolution/Chatwoot) |
| Volume | `yael-pgdata` (new) |
| Database name | `yael` |
| Schema name | `yael` |
| Role | `yael_app` |
| Listen | `127.0.0.1:5435` only |
| Health | `pg_isready` → container **healthy**; host `127.0.0.1:5435` accepting connections |

`YAEL_DATABASE_URL` was built from these local details and stored on the server only.

## 3. Secret handling

| Item | Status |
|---|---|
| File | `/home/ubuntu/yael/secrets/yael.env` |
| Mode | `600` (`ubuntu:ubuntu`) |
| Secrets directory | `700` |
| Injected into | Yael stack env_file only (`yael-postgres`) |
| OpenReply / n8n / Evolution / Chatwoot env | no `YAEL_*` keys |

The URL value, password, and token were not printed in logs collected for this report.

## 4. Migrations

**None run.** No Yael application tree and no Yael migration files (Prisma/Drizzle/Alembic/SQL) exist on the host or in `0544223911`. Only `CREATE SCHEMA yael` + `search_path` were applied.

Tables in schema `yael`: **none** (empty, as expected).

## 5. Isolation check

| Check | Result |
|---|---|
| `current_database()` | `yael` |
| `current_user` | `yael_app` |
| `current_schema()` | `yael` |
| Databases on this instance | `yael`, `postgres`, `template0`, `template1` only |
| `n8n_prod` / `n8n_dev` / `n8n_newsite` / `evolution` / OpenReply / Forever / booking / Chatwoot names on this instance | **absent** |
| `yael-postgres` DNS to `evolution_postgres` / `openreply-postgres-1` / `chatwoot_postgres` | **not resolved** |
| Other stacks still up | OpenReply, n8n-prod/dev/newsite, Evolution, Chatwoot unchanged |

**Isolation status: pass** (separate engine instance, separate network, dedicated role/db/schema, localhost bind).

## 6. Not done (blocked by missing app)

- No Yael HTTP service to point at, so no application health URL beyond Postgres `pg_isready`.
- Env was not copied into any non-Yael compose file.
- Application migrations cannot run until the Yael repo/path is present on Oracle.

When the Yael app compose exists, mount `/home/ubuntu/yael/secrets/yael.env` into **that service only** (use `YAEL_DATABASE_URL_DOCKER` if the app shares `yael_net`).
