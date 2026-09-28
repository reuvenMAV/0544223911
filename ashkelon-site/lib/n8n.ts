
export async function sendToN8n(webhookPath: string, data: any) {
  const base = process.env.N8N_WEBHOOK_BASE || 'https://n8n.mavash.net/webhook'
  const url = `${base}${webhookPath}`
  // Respond immediately pattern - fire and forget but log
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY || '' },
      body: JSON.stringify(data),
    })
    console.log(`n8n ${webhookPath} -> ${res.status}`)
    return res.ok
  } catch (e) {
    console.error(`n8n ${webhookPath} failed`, e)
    return false
  }
}
