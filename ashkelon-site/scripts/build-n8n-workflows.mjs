#!/usr/bin/env node
/**
 * Builds importable n8n workflow JSON files (Webhook → Respond immediately → sticky note).
 * Paths match site sendToN8n(): /lead, /new-booking, /payment-status, etc.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'n8n-workflows', 'importable')
fs.mkdirSync(outDir, { recursive: true })

const workflows = [
  { name: 'ASK-01 Lead Capture', path: 'lead', note: 'Lead from /api/check-availability + /api/lead' },
  { name: 'ASK-02 Core Booking', path: 'new-booking', note: 'Core booking ASK payload from /api/new-booking' },
  { name: 'ASK-08 Payment Status', path: 'payment-status', note: 'PayPlus IPN via /api/webhook/payplus' },
  { name: 'ASK-08b Payment Success', path: 'payment-success', note: 'Alias success from PayPlus route' },
  { name: 'ASK-08c Payment Failed', path: 'payment-failed', note: 'Alias failed from PayPlus route' },
  { name: 'ASK-15 Chatbot Lead', path: 'chatbot-lead', note: 'Chat widget leads' },
  { name: 'ASK-16 Chat to WhatsApp', path: 'chat-to-wa', note: 'Phone detected in chat' },
]

function build(wf) {
  const webhookId = `wh_${wf.path}`
  const respondId = `rs_${wf.path}`
  const noteId = `nt_${wf.path}`
  return {
    name: wf.name,
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: wf.path,
          responseMode: 'responseNode',
          options: {},
        },
        id: webhookId,
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [240, 300],
        webhookId: webhookId,
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ { "ok": true, "workflow": $workflow.name, "received": $json } }}',
          options: {},
        },
        id: respondId,
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [480, 300],
      },
      {
        parameters: {
          content: `## ${wf.name}\n${wf.note}\n\nURL: \`https://n8n.mavash.net/webhook/${wf.path}\`\n\nחובה: Activate אחרי import. חבר כאן Telegram / Sheets / WA לפי README_CONNECTIONS.`,
          height: 320,
          width: 360,
        },
        id: noteId,
        name: 'Sticky Note',
        type: 'n8n-nodes-base.stickyNote',
        typeVersion: 1,
        position: [220, 40],
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
      },
    },
    settings: { executionOrder: 'v1' },
    active: false,
    tags: [{ name: 'ashkelon' }],
  }
}

for (const wf of workflows) {
  const file = path.join(outDir, `${wf.path}.json`)
  fs.writeFileSync(file, JSON.stringify(build(wf), null, 2))
  console.log('wrote', file)
}
console.log('Done', workflows.length, 'workflows')
