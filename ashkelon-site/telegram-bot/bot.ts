import 'dotenv/config'
import { createServer } from 'node:http'
import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { registerCleaningHandlers, sendCleaningTask } from './cleaning-integration'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

const token = requireEnv('TELEGRAM_BOT_TOKEN')
const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const reuvenChat = process.env.TELEGRAM_CHAT_ID_REUVEN || '8503731042'
const airtableBase = process.env.AIRTABLE_BASE_ID || 'appSP419jrkoX3u3x'
const blockedTable = process.env.AIRTABLE_BLOCKED_TABLE_ID || 'tblrEehaTbBzD4izM'
const n8nBase = (process.env.N8N_WEBHOOK_BASE || 'https://newsite.mavash.net/webhook').replace(
  /\/$/,
  '',
)

const bot = new Telegraf(token)
const supabase = createClient(supabaseUrl, supabaseKey)

const mainMenu = Markup.keyboard([
  ['📊 סטטוס היום', '💰 דוח יומי'],
  ['📅 מי בדירה?', '🧹 ניקיון'],
  ['🚫 חסום תאריכים', '💵 עדכן מחיר'],
  ['🔑 שלח קוד כניסה', '📄 כל ההזמנות'],
]).resize()

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function parseBlockArg(raw: string): { start: string; endExclusive: string; dates: string[] } | null {
  const arg = raw.trim()
  const iso = arg.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/)
  let start: string | undefined
  let endInclusive: string | undefined
  if (iso) {
    start = iso[1]
    endInclusive = iso[2]
  } else {
    const m = arg.match(/(\d{1,2})-(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?/)
    if (!m) return null
    const y = m[4] || String(new Date().getFullYear())
    const mm = m[3].padStart(2, '0')
    start = `${y}-${mm}-${m[1].padStart(2, '0')}`
    endInclusive = `${y}-${mm}-${m[2].padStart(2, '0')}`
  }
  const end = new Date(endInclusive + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 1)
  const endExclusive = end.toISOString().slice(0, 10)
  const dates: string[] = []
  let cur = new Date(start + 'T00:00:00Z')
  const stop = new Date(endExclusive + 'T00:00:00Z')
  while (cur < stop) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return { start, endExclusive, dates }
}

async function blockDates(dates: string[], reason = 'telegram-/block') {
  const airtableKey = process.env.AIRTABLE_API_KEY
  let airtableOk = 0
  let supabaseOk = 0
  for (const date of dates) {
    const { error } = await supabase.from('blocked_dates').upsert(
      { date, source: 'manual', reason },
      { onConflict: 'date' },
    )
    if (!error) supabaseOk++
    if (airtableKey) {
      const res = await fetch(
        `https://api.airtable.com/v0/${airtableBase}/${blockedTable}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${airtableKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: { Date: date, Source: 'manual', Reason: reason },
          }),
        },
      )
      if (res.ok) airtableOk++
    }
  }
  return { airtableOk, supabaseOk }
}

registerCleaningHandlers(bot, supabase)

bot.start(async (ctx) => {
  await ctx.reply(
    `🏖️ *ברוך הבא לבוט ניהול — דירת בר כוכבא אשקלון*\n\nמה תרצה לעשות?`,
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.hears('📅 מי בדירה?', async (ctx) => {
  const today = todayISO()
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .lte('checkin', today)
    .gte('checkout', today)
    .eq('status', 'paid')

  if (!data?.length) return ctx.reply('🏜️ הדירה פנויה היום', mainMenu)
  const b = data[0]
  await ctx.reply(
    `👤 *${b.guest_name || '?'}* — ${b.phone || ''}\n` +
      `📅 ${b.checkin} → ${b.checkout}\n` +
      `💰 ${b.total ?? b.total_price ?? '?'}₪ | ${b.guests_count ?? b.guests ?? '?'} אורחים`,
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.command('status', async (ctx) => {
  const today = todayISO()
  const { data } = await supabase
    .from('bookings')
    .select('guest_name, checkin, checkout, status')
    .lte('checkin', today)
    .gte('checkout', today)
    .eq('status', 'paid')
  if (!data?.length) return ctx.reply('הדירה פנויה כרגע (אין הזמנה paid היום)', mainMenu)
  const b = data[0]
  await ctx.reply(`👤 ${b.guest_name}\n📅 ${b.checkin} → ${b.checkout}`, mainMenu)
})

bot.command('today', async (ctx) => {
  const today = todayISO()
  const { data: checkins } = await supabase.from('bookings').select('id').eq('checkin', today)
  const { data: checkouts } = await supabase.from('bookings').select('id').eq('checkout', today)
  await ctx.reply(
    `📅 *היום ${today}*\nכניסות: ${checkins?.length || 0}\nיציאות: ${checkouts?.length || 0}\nניקיון: ${checkouts?.length ? 'צריך לנקות' : 'אין'}`,
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.hears('📊 סטטוס היום', async (ctx) => {
  const today = todayISO()
  const { data: blocked } = await supabase.from('blocked_dates').select('date').eq('date', today)
  const { data: guest } = await supabase
    .from('bookings')
    .select('guest_name')
    .lte('checkin', today)
    .gte('checkout', today)
    .eq('status', 'paid')
    .limit(1)
  await ctx.reply(
    `📊 *סטטוס ${today}*\n` +
      `${guest?.length ? `👤 ${guest[0].guest_name}` : blocked?.length ? '🔴 חסום' : '🟢 פנוי'}\n` +
      `אתר: https://ashkelon.mavash.net`,
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.hears('💰 דוח יומי', async (ctx) => {
  const month = todayISO().slice(0, 7)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('total, total_price')
    .eq('status', 'paid')
    .gte('checkin', `${month}-01`)
  const totals = (bookings || []).map((b) => Number(b.total ?? b.total_price ?? 0))
  const total = totals.reduce((s, n) => s + n, 0)
  await ctx.reply(
    `📊 *דוח חודשי ${month}*\nהכנסות: ${total}₪\nהזמנות: ${bookings?.length || 0}\nממוצע: ${bookings?.length ? Math.floor(total / bookings.length) : 0}₪`,
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.hears('📄 כל ההזמנות', async (ctx) => {
  const { data } = await supabase
    .from('bookings')
    .select('guest_name, checkin, checkout, status, total, total_price')
    .order('checkin', { ascending: false })
    .limit(10)
  if (!data?.length) return ctx.reply('אין הזמנות', mainMenu)
  const lines = data.map(
    (b) =>
      `• ${b.checkin}→${b.checkout} | ${b.guest_name || '?'} | ${b.status} | ${b.total ?? b.total_price ?? '?'}₪`,
  )
  await ctx.reply(`📄 *10 הזמנות אחרונות*\n${lines.join('\n')}`, {
    parse_mode: 'Markdown',
    ...mainMenu,
  })
})

bot.hears('🧹 ניקיון', async (ctx) => {
  const today = todayISO()
  const { data } = await supabase.from('bookings').select('*').eq('checkout', today)
  if (!data?.length) return ctx.reply('אין צ׳ק־אאוט היום — אין משימת ניקיון', mainMenu)
  for (const b of data) {
    await sendCleaningTask(bot, b)
  }
  await ctx.reply(`🧹 נשלחו ${data.length} משימות ניקיון למנקה`, mainMenu)
})

bot.hears('🚫 חסום תאריכים', async (ctx) => {
  await ctx.reply(
    'שימוש: `/block 10-12.10` או `/block 2026-10-10 2026-10-12`',
    { parse_mode: 'Markdown', ...mainMenu },
  )
})

bot.hears('💵 עדכן מחיר', async (ctx) => {
  await ctx.reply('שימוש: `/price 15.10 800`', { parse_mode: 'Markdown', ...mainMenu })
})

bot.hears('🔑 שלח קוד כניסה', async (ctx) => {
  await ctx.reply('שימוש: `/code ASK-xxxx` (Nuki ב-Phase 5)', mainMenu)
})

bot.command('block', async (ctx) => {
  const raw = ctx.message.text.replace(/^\/block(@\w+)?\s*/, '')
  const parsed = parseBlockArg(raw)
  if (!parsed?.dates.length) {
    return ctx.reply('שימוש: /block 10-12.10 או /block 2026-10-10 2026-10-12', mainMenu)
  }
  const { airtableOk, supabaseOk } = await blockDates(parsed.dates)
  await ctx.reply(
    `✅ נחסמו ${parsed.dates.length} תאריכים\nSupabase: ${supabaseOk} | Airtable: ${airtableOk}\n${parsed.dates.join(', ')}`,
    mainMenu,
  )
})

bot.hears(/\/block (.+)/, async (ctx) => {
  const parsed = parseBlockArg(ctx.match[1])
  if (!parsed?.dates.length) {
    return ctx.reply('שימוש: /block 10-12.10 או /block 2026-10-10 2026-10-12', mainMenu)
  }
  const { airtableOk, supabaseOk } = await blockDates(parsed.dates)
  await ctx.reply(
    `✅ נחסמו ${parsed.dates.length} תאריכים\nSupabase: ${supabaseOk} | Airtable: ${airtableOk}\n${parsed.dates.join(', ')}`,
    mainMenu,
  )
})

bot.command('price', async (ctx) => {
  const parts = ctx.message.text.split(/\s+/)
  const date = parts[1]
  const price = parts[2]
  if (!date || !price) return ctx.reply('שימוש: /price 15.10 800', mainMenu)
  const [dd, mm] = date.split('.')
  const iso = `2026-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  await supabase.from('pricing_rules').insert({
    type: 'manual',
    start_date: iso,
    price: parseInt(price, 10),
  })
  await ctx.reply(`💵 עדכנתי מחיר ${date} ל-${price}₪`, mainMenu)
})

bot.command('code', async (ctx) => {
  const id = ctx.message.text.split(/\s+/)[1] || '?'
  await ctx.reply(`🔑 שליחת קוד Nuki ל-${id} תתווסף ב-Phase 5`, mainMenu)
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    `פקודות:\n/start — תפריט\n/status — מי בדירה\n/today — כניסות/יציאות\n/block 10-12.10 — חסימה\n/price 15.10 800\n/code ASK-xxx`,
    mainMenu,
  )
})

bot.command('extend', async (ctx) => {
  const args = ctx.message.text.split(/\s+/)
  const bookingId = args[1]
  const newDate = args[2]
  if (!bookingId || !newDate) return ctx.reply('שימוש: /extend ASK-xxx 2026-10-20')
  await ctx.reply(
    `להאריך הזמנה ${bookingId} עד ${newDate}?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ כן, חייב', `extend_yes_${bookingId}_${newDate}`)],
      [Markup.button.callback('❌ בטל', 'cancel')],
    ]),
  )
})

bot.action(/extend_yes_(.+)_(.+)/, async (ctx) => {
  await ctx.editMessageText(`✅ בקשת הארכה נרשמה — חיוב PayPlus ב-Phase 5`)
})

bot.action('cancel', async (ctx) => {
  await ctx.editMessageText('בוטל')
})

// HTTP side-channel: n8n ASK-13 can POST cleaning jobs here
const port = Number(process.env.BOT_HTTP_PORT || 5055)
const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'ashkelon-bot' }))
    return
  }
  if (req.method === 'POST' && req.url === '/trigger-cleaning') {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      await sendCleaningTask(bot, body.booking || body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }))
    }
    return
  }
  res.writeHead(404)
  res.end('not found')
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Ashkelon bot HTTP on 127.0.0.1:${port}`)
  console.log(`n8n webhook base: ${n8nBase}`)
  console.log(`Owner chat: ${reuvenChat}`)
})

bot.launch().then(() => {
  console.log('Telegram bot running — Ashkelon (PM2 / Oracle)')
})

process.once('SIGINT', () => {
  bot.stop('SIGINT')
  server.close()
})
process.once('SIGTERM', () => {
  bot.stop('SIGTERM')
  server.close()
})
