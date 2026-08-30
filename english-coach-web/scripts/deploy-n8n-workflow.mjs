#!/usr/bin/env node
/**
 * Import and activate english-coach-chat workflow on n8n via REST API.
 *
 * Usage:
 *   N8N_API_KEY=... N8N_BASE_URL=https://dev.n8n.mavash.net node scripts/deploy-n8n-workflow.mjs
 *
 * Optional:
 *   N8N_WORKFLOW_FILE=./n8n/english-coach-chat.workflow.json
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.N8N_BASE_URL ?? "https://dev.n8n.mavash.net").replace(
  /\/$/,
  "",
);
const apiKey = process.env.N8N_API_KEY;
const workflowFile =
  process.env.N8N_WORKFLOW_FILE ??
  join(__dirname, "../n8n/english-coach-chat.workflow.json");

if (!apiKey) {
  console.error("Missing N8N_API_KEY");
  process.exit(1);
}

const headers = {
  "X-N8N-API-KEY": apiKey,
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} → ${response.status}: ${text}`);
  }
  return body;
}

async function findWorkflowByName(name) {
  const workflows = await request("/workflows?limit=100");
  const list = Array.isArray(workflows?.data) ? workflows.data : workflows;
  return list?.find((w) => w.name === name) ?? null;
}

async function main() {
  const raw = JSON.parse(readFileSync(workflowFile, "utf8"));
  const payload = {
    name: raw.name ?? "english-coach-chat",
    nodes: raw.nodes,
    connections: raw.connections,
    settings: raw.settings ?? { executionOrder: "v1" },
  };

  let workflow = await findWorkflowByName(payload.name);
  if (workflow?.id) {
    console.log(`Updating workflow ${workflow.id} (${payload.name})`);
    workflow = await request(`/workflows/${workflow.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } else {
    console.log(`Creating workflow ${payload.name}`);
    workflow = await request("/workflows", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  const id = workflow.id;
  console.log(`Activating workflow ${id}`);
  try {
    await request(`/workflows/${id}/activate`, { method: "POST", body: "{}" });
  } catch {
    await request(`/workflows/${id}/publish`, { method: "POST", body: "{}" });
  }

  const probe = await fetch(`${baseUrl}/webhook/english-coach-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  console.log(`Webhook probe: ${probe.status}`);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
