export async function sendToN8n(webhookPath: string, data: unknown) {
  const base = (process.env.N8N_WEBHOOK_BASE || 'https://n8n.mavash.net/webhook').replace(/\/$/, '')
  const path = webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`
  const url = `${base}${path}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_API_KEY ? { 'x-api-key': process.env.N8N_API_KEY } : {}),
      },
      body: JSON.stringify(data),
    })
    console.log(`n8n ${path} -> ${res.status}`)
    return { ok: res.ok, status: res.status }
  } catch (e) {
    console.error(`n8n ${path} failed`, e)
    return { ok: false, status: 0 }
  }
}
