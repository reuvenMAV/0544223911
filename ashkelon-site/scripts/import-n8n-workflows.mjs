#!/usr/bin/env node
/**
 * Imports importable/*.json into n8n via REST API.
 * Requires: N8N_API_KEY, optional N8N_BASE_URL (default https://n8n.mavash.net)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = (process.env.N8N_BASE_URL || 'https://n8n.mavash.net').replace(/\/$/, '')
const apiKey = process.env.N8N_API_KEY
const dir = path.join(__dirname, '..', 'n8n-workflows', 'importable')

if (!apiKey) {
  console.error('Missing N8N_API_KEY. Export it and re-run: npm run import:n8n')
  process.exit(1)
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
for (const file of files) {
  const workflow = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  const res = await fetch(`${base}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    body: JSON.stringify(workflow),
  })
  const text = await res.text()
  console.log(file, res.status, text.slice(0, 200))
  if (res.ok) {
    try {
      const created = JSON.parse(text)
      if (created.id) {
        const act = await fetch(`${base}/api/v1/workflows/${created.id}/activate`, {
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey },
        })
        console.log('  activate', created.id, act.status)
      }
    } catch {}
  }
}
