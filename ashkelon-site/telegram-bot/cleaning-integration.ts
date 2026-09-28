import { Telegraf, Markup, Context } from 'telegraf'
import type { SupabaseClient } from '@supabase/supabase-js'

const CLEANER_CHAT_ID = () => process.env.TELEGRAM_CHAT_ID_CLEANER || process.env.TELEGRAM_CHAT_ID_REUVEN!
const REUVEN_CHAT_ID = () => process.env.TELEGRAM_CHAT_ID_REUVEN!
const AIRTABLE_BASE = () => process.env.AIRTABLE_BASE_ID || 'appSP419jrkoX3u3x'
const CLEANING_TABLE = () => process.env.AIRTABLE_CLEANING_TABLE_ID || 'tblc9rRXfTW3Nupzq'

type PhotoSession = { waitingPhotosFor: string; photos: string[] }
const sessions = new Map<number, PhotoSession>()

async function airtableHeaders() {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) return null
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function findCleaningRecord(bookingId: string): Promise<string | null> {
  const headers = await airtableHeaders()
  if (!headers) return null
  const formula = encodeURIComponent(`{Booking}='${bookingId}'`)
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE()}/${CLEANING_TABLE()}?filterByFormula=${formula}&maxRecords=1`
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  const data = (await res.json()) as { records?: { id: string }[] }
  return data.records?.[0]?.id || null
}

async function updateCleaningStatus(
  bookingId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const headers = await airtableHeaders()
  if (!headers) return false
  const recId = await findCleaningRecord(bookingId)
  if (!recId) return false
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE()}/${CLEANING_TABLE()}/${recId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  })
  return res.ok
}

export async function sendCleaningTask(bot: Telegraf, booking: Record<string, any>) {
  const bookingId = booking.id || booking.booking_id || booking.Booking || 'unknown'
  const checkout = booking.checkout || booking.Checkout || booking.check_out || '?'
  const guest = booking.guest_name || booking.Guest || booking.name || '?'
  const guests = booking.guests_count || booking.guests || booking.Guests || '?'

  const message =
    `🧹 *משימת ניקיון*\n` +
    `דירה בר כוכבא - צ'ק אאוט ${checkout}\n` +
    `אורח: ${guest} | ${guests} אורחים\n` +
    `צ'ק ליסט: מצעים, מגבות, מטבח, שירותים, רצפה, ממד, מרפסת\n\n` +
    `Booking: \`${bookingId}\``

  await bot.telegram.sendMessage(CLEANER_CHAT_ID(), message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('▶️ התחלתי ניקיון', `clean_start_${bookingId}`)],
      [Markup.button.callback('✅ סיימתי + שלח 6 תמונות', `clean_done_${bookingId}`)],
      [Markup.button.callback('⚠️ יש תקלה', `clean_issue_${bookingId}`)],
    ]),
  })
}

export function registerCleaningHandlers(bot: Telegraf, supabase: SupabaseClient) {
  bot.action(/clean_start_(.+)/, async (ctx) => {
    const bookingId = ctx.match[1]
    await supabase
      .from('cleaning_tasks')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
    await updateCleaningStatus(bookingId, { Status: 'In Progress' })
    await ctx.editMessageText(
      `🧹 התחילה ניקיון ${bookingId} — סטטוס In Progress ב-Airtable Kanban`,
    )
    try {
      await bot.telegram.sendMessage(
        REUVEN_CHAT_ID(),
        `🧹 המנקה התחילה לנקות ${bookingId}`,
      )
    } catch {
      /* ignore notify failures */
    }
  })

  bot.action(/clean_done_(.+)/, async (ctx) => {
    const bookingId = ctx.match[1]
    const chatId = ctx.chat?.id
    if (chatId) sessions.set(chatId, { waitingPhotosFor: bookingId, photos: [] })
    await ctx.reply('📸 שלחי 6 תמונות: מטבח, שירותים, סלון, חדר שינה, ממד, מרפסת')
  })

  bot.action(/clean_issue_(.+)/, async (ctx) => {
    const bookingId = ctx.match[1]
    await updateCleaningStatus(bookingId, { Status: 'To Clean' })
    await ctx.reply(`⚠️ תקלה דווחה על ${bookingId} — ראובן קיבל התראה`)
    try {
      await bot.telegram.sendMessage(
        REUVEN_CHAT_ID(),
        `⚠️ תקלת ניקיון ב-${bookingId}`,
      )
    } catch {
      /* ignore */
    }
  })

  bot.on('photo', async (ctx, next) => {
    const chatId = ctx.chat?.id
    if (!chatId) return next()
    const session = sessions.get(chatId)
    if (!session?.waitingPhotosFor) return next()

    const bookingId = session.waitingPhotosFor
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    session.photos.push(photo.file_id)

    if (session.photos.length < 6) {
      await ctx.reply(
        `📸 קיבלתי ${session.photos.length}/6 — שלחי עוד ${6 - session.photos.length}`,
      )
      return
    }

    const photoUrls = await Promise.all(
      session.photos.map(async (fid) => {
        const file = await ctx.telegram.getFile(fid)
        return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`
      }),
    )

    await updateCleaningStatus(bookingId, {
      Status: 'Done',
      'Telegram Sent?': true,
    })
    await supabase
      .from('cleaning_tasks')
      .update({
        status: 'done',
        photos: photoUrls,
        finished_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)

    await ctx.reply(
      `✅ ניקיון ${bookingId} הושלם! 6 תמונות נשמרו`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ אשר תמונות — דירה מוכנה', `approve_clean_${bookingId}`)],
      ]),
    )

    for (const url of photoUrls) {
      try {
        await bot.telegram.sendPhoto(REUVEN_CHAT_ID(), url, {
          caption: `ניקיון ${bookingId}`,
        })
      } catch {
        /* ignore */
      }
    }
    sessions.delete(chatId)
  })

  bot.action(/approve_clean_(.+)/, async (ctx) => {
    const bookingId = ctx.match[1]
    await updateCleaningStatus(bookingId, { Status: 'Photo OK' })
    await ctx.editMessageText(`🏠 דירה ${bookingId} מוכנה לאורח הבא! סטטוס Photo OK ב-Kanban`)
  })
}

export type { Context }
