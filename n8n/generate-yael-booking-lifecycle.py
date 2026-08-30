#!/usr/bin/env python3
"""Build the unpublished Yael booking lifecycle workflow. No Haya ids."""
from __future__ import annotations

import json
from pathlib import Path

API = "https://yael.mavash.net/api/n8n"
GREEN = {"greenApiAuthApi": {"id": "VBzwcT8zWZQJypE4", "name": "Green-API 140"}}
GREEN_NODE = "@green-api/n8n-nodes-whatsapp-greenapi.greenapi"
TOKEN_HEADER = {
    "parameters": {
        "parameters": [
            {"name": "X-Yael-N8n-Token", "value": "={{ $vars.YAEL_N8N_TOKEN }}"}
        ]
    }
}

SPLIT_APPOINTMENTS = r"""
const payload = $json.appointments ?? $json.body?.appointments ?? $json.data ?? $json;
const rows = Array.isArray(payload) ? payload : [];
return rows.filter((row) => row && (row.id || row.ID)).map((row) => ({ json: row }));
""".strip()

NORMALIZE_NEW = r"""
const OWNER_CHAT_ID = '972548060140@c.us';
const SALON_NAME = 'Yael Mavashev — פדיקור ומניקור';
const SALON_ADDRESS = 'אשקלון, שכונת נווה הדרים';
const WAZE_URL = 'https://www.waze.com/ul?q=%D7%A9%D7%9B%D7%95%D7%A0%D7%AA%20%D7%A0%D7%95%D7%95%D7%94%20%D7%94%D7%93%D7%A8%D7%99%D7%9D%20%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F&navigate=yes';

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && clean(value) !== '') return clean(value);
  }
  return '';
}

function toE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  if (p.length === 9 && /^5/.test(p)) return '972' + p;
  return p;
}

function formatDate(raw) {
  const value = raw == null ? '' : raw;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const s = clean(value);
  if (!s) return '';
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return s;
}

function formatTime(raw) {
  const s = clean(raw);
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return String(m[1]).padStart(2, '0') + ':' + m[2];
  return s;
}

const id = pick($json, 'id', 'ID', 'מזהה');
const name = pick($json, 'שם הלקוחה', 'שם');
const rawPhone = pick($json, 'טלפון', 'פלאפון', 'נייד');
const phone = toE164(rawPhone);
const date = formatDate($json['תאריך'] ?? $json.Date);
const time = formatTime($json['שעה'] ?? $json.Time);
const service = pick($json, 'שירות', 'טיפול') || 'טיפול';
const status = pick($json, 'סטאטוס', 'סטטוס', 'מצב');
const source = pick($json, 'מקור', 'Source', 'מקור הגעה');
const folderUrl = pick($json, 'Customer_Folder_URL');
const auditLog = pick($json, 'Audit_Log');
const createdAt = pick($json, 'Created_At');
const createdBy = pick($json, 'Created_By');

const ownerLines = [
  '📌 תור חדש נקבע — Yael Mavashev',
  '',
  'מזהה: ' + id,
  'שם: ' + name,
  'טלפון: ' + rawPhone,
  'מתי: ' + date + ' ' + time,
  'שירות: ' + service,
];
if (status) ownerLines.push('סטטוס: ' + status);
if (source) ownerLines.push('מקור: ' + source);
if (createdBy) ownerLines.push('נוצר דרך: ' + createdBy);
if (createdAt) ownerLines.push('נוצר בתאריך: ' + createdAt);
if (folderUrl) ownerLines.push('תיקיית לקוחה: ' + folderUrl);
const ownerMsg = ownerLines.join('\n');

const customerMsg = [
  'שלום ' + name + '! 🌸',
  '',
  'התור שלך נקבע אצל ' + SALON_NAME,
  '',
  '📅 תאריך: ' + date,
  '🕐 שעה: ' + time,
  '💅 טיפול: ' + service,
  '',
  '📍 כתובת:',
  SALON_ADDRESS,
  'הכתובת המדויקת תאושר בנפרד.',
  '',
  '🗺 ניווט ב-Waze:',
  WAZE_URL,
  '',
  'לקביעת תור נוסף: https://yael.mavash.net/',
  'טלפון: 054-806-0140',
  '',
  'נתראה! 💅',
  'Yael Mavashev',
].join('\n');

const customerForwardMsg = [
  '📤 הודעה להעברה ללקוחה — Yael Mavashev',
  '',
  'שם: ' + name,
  'טלפון לשליחה: ' + rawPhone,
  phone ? 'טלפון מנורמל: +' + phone : '',
  '',
  '--- להעתקה ושליחה ללקוחה ---',
  customerMsg,
].filter(Boolean).join('\n');

return {
  json: {
    ...$json,
    id,
    name,
    rawPhone,
    phone,
    date,
    time,
    service,
    source,
    folderUrl,
    auditLog,
    ownerChatId: OWNER_CHAT_ID,
    ownerMsg,
    customerMsg,
    customerForwardMsg,
  },
};
""".strip()

REMINDER_FILTER = r"""
const OWNER_CHAT_ID = '972548060140@c.us';
const SALON_NAME = 'Yael Mavashev — פדיקור ומניקור';
const SALON_ADDRESS = 'אשקלון, שכונת נווה הדרים';
const WAZE_URL = 'https://www.waze.com/ul?q=%D7%A9%D7%9B%D7%95%D7%A0%D7%AA%20%D7%A0%D7%95%D7%95%D7%94%20%D7%94%D7%93%D7%A8%D7%99%D7%9D%20%D7%90%D7%A9%D7%A7%D7%9C%D7%95%D7%9F&navigate=yes';

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && clean(value) !== '') return clean(value);
  }
  return '';
}

function toE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  if (p.length === 9 && /^5/.test(p)) return '972' + p;
  return p;
}

function parseDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && raw > 0) return new Date((raw - 25569) * 86400 * 1000);
  const s = clean(raw);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return new Date(Number(m[3]), month - 1, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(raw) {
  const d = parseDate(raw);
  if (!d) return clean(raw);
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(raw) {
  const s = clean(raw);
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return String(m[1]).padStart(2, '0') + ':' + m[2];
  return s;
}

const now = new Date();
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const tomorrowKey = dateKey(tomorrow);
const out = [];

for (const item of $input.all()) {
  const row = item.json;
  const id = pick(row, 'id', 'ID', 'מזהה');
  const name = pick(row, 'שם הלקוחה', 'שם');
  const rawPhone = pick(row, 'טלפון', 'פלאפון', 'נייד');
  const phone = toE164(rawPhone);
  const apptDate = parseDate(row['תאריך'] ?? row.Date);
  const time = formatTime(row['שעה'] ?? row.Time);
  const service = pick(row, 'שירות', 'טיפול') || 'טיפול';
  const status = pick(row, 'סטאטוס', 'סטטוס', 'מצב');
  const auditLog = pick(row, 'Audit_Log');

  if (!id || !name || !phone || !apptDate || !time) continue;
  if (status !== 'ממתין' && status !== 'מאושר') continue;
  if (auditLog !== 'sent') continue;
  if (dateKey(apptDate) !== tomorrowKey) continue;

  const date = formatDate(apptDate);
  const customerReminderMsg = [
    'שלום ' + name + '! 👋',
    '',
    'תזכורת — יש לך תור מחר אצל ' + SALON_NAME,
    '',
    '📅 ' + date,
    '🕐 שעה: ' + time,
    '💅 טיפול: ' + service,
    '',
    '📍 ' + SALON_ADDRESS,
    '🗺 Waze: ' + WAZE_URL,
    '',
    'לביטול או שינוי תור — שלחי הודעה או התקשרי 054-806-0140 🙏',
    'Yael Mavashev 🌸',
  ].join('\n');

  const ownerReminderMsg = [
    '⏰ תזכורת לתור מחר — Yael Mavashev',
    '',
    'מזהה: ' + id,
    'שם: ' + name,
    'טלפון: ' + rawPhone,
    'מתי: ' + date + ' ' + time,
    'שירות: ' + service,
    '',
    'צריך להעביר ללקוחה את ההודעה הבאה.',
  ].join('\n');

  const customerForwardMsg = [
    '📤 הודעת תזכורת להעברה ללקוחה — Yael Mavashev',
    '',
    'שם: ' + name,
    'טלפון לשליחה: ' + rawPhone,
    phone ? 'טלפון מנורמל: +' + phone : '',
    '',
    '--- להעתקה ושליחה ללקוחה ---',
    customerReminderMsg,
  ].filter(Boolean).join('\n');

  out.push({
    json: {
      ...row,
      id,
      name,
      rawPhone,
      phone,
      date,
      time,
      service,
      auditLog,
      ownerChatId: OWNER_CHAT_ID,
      ownerReminderMsg,
      customerReminderMsg,
      customerForwardMsg,
      reminderSentAt: new Date().toISOString(),
    },
  });
}

return out;
""".strip()

SURVEY_FILTER = r"""
const OWNER_CHAT_ID = '972548060140@c.us';
const SALON_NAME = 'Yael Mavashev — פדיקור ומניקור';
const FILLOUT_FORM_URL = 'https://yael.mavash.net/survey';

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && clean(value) !== '') return clean(value);
  }
  return '';
}

function toE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  if (p.length === 9 && /^5/.test(p)) return '972' + p;
  return p;
}

function formatDate(raw) { return clean(raw); }
function formatTime(raw) {
  const s = clean(raw);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? String(m[1]).padStart(2, '0') + ':' + m[2] : s;
}

function alreadySent(value) {
  const s = clean(value).toLowerCase();
  return Boolean(s) && s !== 'false' && s !== '0' && s !== 'לא';
}

function withParams(url, params) {
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + Object.entries(params)
    .filter(([, value]) => clean(value) !== '')
    .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(clean(value)))
    .join('&');
}

if (!FILLOUT_FORM_URL || /PENDING|PUT_FILLOUT|example\.com/i.test(FILLOUT_FORM_URL)) {
  return [];
}

const out = [];
for (const item of $input.all()) {
  const row = item.json;
  const id = pick(row, 'id', 'ID', 'מזהה');
  const name = pick(row, 'שם הלקוחה', 'שם');
  const rawPhone = pick(row, 'טלפון', 'פלאפון', 'נייד');
  const phone = toE164(rawPhone);
  const date = formatDate(row['תאריך'] ?? row.Date);
  const time = formatTime(row['שעה'] ?? row.Time);
  const service = pick(row, 'שירות', 'טיפול');
  const status = pick(row, 'סטאטוס', 'סטטוס', 'מצב');
  const reviewSent = pick(row, 'Review_Sent');

  if (!id || !name || !phone) continue;
  if (status !== 'בוצע') continue;
  if (alreadySent(reviewSent)) continue;

  const filloutUrl = withParams(FILLOUT_FORM_URL, { phone: rawPhone, id, name });
  const ownerDoneMsg = [
    '✅ טיפול סומן כבוצע — Yael Mavashev',
    '',
    'מזהה: ' + id,
    'שם: ' + name,
    'טלפון: ' + rawPhone,
    date ? 'תאריך: ' + date : '',
    time ? 'שעה: ' + time : '',
    service ? 'שירות: ' + service : '',
    '',
    'בהודעה הבאה יש סקר Fillout להעברה ללקוחה.',
  ].filter(Boolean).join('\n');

  const customerSurveyMsg = [
    'היי ' + name + ' 😊',
    '',
    'תודה שביקרת אצל ' + SALON_NAME + ' 💅',
    'נשמח אם תמלאי סקר קצר על החוויה שלך:',
    filloutUrl,
    '',
    'זה לוקח פחות מדקה 🙏',
    'Yael Mavashev 🌸',
  ].join('\n');

  const filloutForwardMsg = [
    '📤 הודעת סקר Fillout להעברה ללקוחה — Yael Mavashev',
    '',
    'שם: ' + name,
    'טלפון לשליחה: ' + rawPhone,
    phone ? 'טלפון מנורמל: +' + phone : '',
    '',
    '--- להעתקה ושליחה ללקוחה ---',
    customerSurveyMsg,
  ].filter(Boolean).join('\n');

  out.push({
    json: {
      ...row,
      id,
      name,
      rawPhone,
      phone,
      date,
      time,
      service,
      ownerChatId: OWNER_CHAT_ID,
      ownerDoneMsg,
      filloutForwardMsg,
      customerSurveyMsg,
      filloutUrl,
      filloutSentAt: new Date().toISOString(),
    },
  });
}
return out;
""".strip()

PARSE_FILLOUT = r"""
const OWNER_CHAT_ID = '972548060140@c.us';
const GOOGLE_REVIEW_LINK = '';

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function arrayFrom(value) {
  return Array.isArray(value) ? value : [];
}

function findUrlParam(submission, name) {
  const params = arrayFrom(submission?.urlParameters || submission?.url_parameters || submission?.hiddenFields || submission?.hidden_fields);
  const hit = params.find((p) => clean(p.name || p.key).toLowerCase() === name.toLowerCase());
  return clean(hit?.value);
}

function findQuestionValue(submission, names) {
  const wanted = names.map((n) => clean(n).toLowerCase());
  const questions = arrayFrom(submission?.questions || submission?.answers || submission?.responses);
  for (const q of questions) {
    const qName = clean(q.name || q.label || q.title || q.question).toLowerCase();
    if (wanted.includes(qName)) return q.value ?? q.answer ?? q.response ?? '';
  }
  return '';
}

function toE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  if (p.length === 9 && /^5/.test(p)) return '972' + p;
  return p;
}

function numericRating(value) {
  if (typeof value === 'number') return value;
  const m = String(value || '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

const body = $json.body || $json;
const submission = body.submission || body;
const id = findUrlParam(submission, 'id') || clean(body.id || submission.id);
const rawPhone = findUrlParam(submission, 'phone') || clean(body.phone || submission.phone);
const phone = toE164(rawPhone);
const name = findQuestionValue(submission, ['שם', 'שם מלא', 'שם הלקוחה', 'name']) || clean(body.name);
const ratingRaw = findQuestionValue(submission, ['דירוג', 'rating', 'ציון']);
const rating = numericRating(ratingRaw);
const feedback = findQuestionValue(submission, ['פידבק', 'משוב', 'הערות', 'תגובה', 'feedback', 'comments']);

const customerGoogleMsg = GOOGLE_REVIEW_LINK
  ? [
      'איזה כיף שאהבת! 😍',
      '',
      'נשמח מאוד אם תפרגני לנו גם בגוגל:',
      GOOGLE_REVIEW_LINK,
      '',
      'תודה רבה!',
      'Yael Mavashev 🌸',
    ].join('\n')
  : [
      'איזה כיף שאהבת! 😍',
      '',
      'עדיין אין קישור Google Review מאושר ליעל.',
      'אפשר לבקש חוות דעת במילים שלה בלי קישור עד שהקישור יאושר.',
      '',
      'Yael Mavashev 🌸',
    ].join('\n');

const googleForwardMsg = [
  '📤 הודעת Google Review להעברה ללקוחה — Yael Mavashev',
  '',
  name ? 'שם: ' + name : '',
  rawPhone ? 'טלפון לשליחה: ' + rawPhone : '',
  phone ? 'טלפון מנורמל: +' + phone : '',
  'דירוג Fillout: ' + rating,
  feedback ? 'משוב: ' + feedback : '',
  '',
  '--- להעתקה ושליחה ללקוחה ---',
  customerGoogleMsg,
].filter(Boolean).join('\n');

const highRatingOwnerMsg = [
  '⭐ דירוג גבוה התקבל ב-Fillout — Yael Mavashev',
  '',
  id ? 'מזהה תור: ' + id : '',
  name ? 'שם: ' + name : '',
  rawPhone ? 'טלפון: ' + rawPhone : '',
  'דירוג: ' + rating,
  feedback ? 'משוב: ' + feedback : '',
  '',
  GOOGLE_REVIEW_LINK
    ? 'אפשר לשלוח ללקוחה את הודעת Google Review שבהודעה הבאה.'
    : 'אין עדיין קישור Google Review מאושר. לא הומצא קישור.',
].filter(Boolean).join('\n');

const lowRatingOwnerMsg = [
  '⚠️ דירוג נמוך/בינוני התקבל ב-Fillout — Yael Mavashev',
  '',
  id ? 'מזהה תור: ' + id : '',
  name ? 'שם: ' + name : '',
  rawPhone ? 'טלפון: ' + rawPhone : '',
  'דירוג: ' + rating,
  feedback ? 'משוב: ' + feedback : '',
  '',
  'לא נשלח לינק לגוגל. מומלץ ליצור קשר אישי לפני בקשת ביקורת.',
].filter(Boolean).join('\n');

return [{
  json: {
    id,
    name,
    rawPhone,
    phone,
    rating,
    feedback,
    ownerChatId: OWNER_CHAT_ID,
    highRatingOwnerMsg,
    lowRatingOwnerMsg,
    googleForwardMsg,
    customerGoogleMsg,
    processedAt: new Date().toISOString(),
  }
}];
""".strip()

ARCHIVE_BUILD = r"""
function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && clean(value) !== '') return clean(value);
  }
  return '';
}

function toE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('972')) return p;
  if (p.startsWith('0')) return '972' + p.slice(1);
  if (p.length === 9 && /^5/.test(p)) return '972' + p;
  return p;
}

function parseDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && raw > 0) return new Date((raw - 25569) * 86400 * 1000);
  const s = clean(raw);
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return new Date(Number(m[3]), month - 1, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusIsDone(status) {
  return clean(status) === 'בוצע';
}

const customerMap = {};
for (const item of $input.all()) {
  const appt = item.json || {};
  const rawName = pick(appt, 'שם הלקוחה', 'שם');
  const rawPhone = pick(appt, 'טלפון', 'פלאפון', 'נייד');
  const phone = toE164(rawPhone);
  const apptDate = parseDate(appt['תאריך'] ?? appt.Date);
  const service = pick(appt, 'שירות', 'טיפול');
  const status = pick(appt, 'סטאטוס', 'סטטוס', 'מצב');
  const folder = pick(appt, 'Customer_Folder_URL');
  if (!phone || !rawName) continue;
  if (!customerMap[phone]) {
    customerMap[phone] = {
      phone, name: rawName, first_visit: apptDate, last_visit: apptDate,
      latest_name_date: apptDate, total_visits: 0, completed_visits: 0,
      services: [], folder_url: folder,
    };
  }
  const c = customerMap[phone];
  c.total_visits += 1;
  if (statusIsDone(status)) c.completed_visits += 1;
  if (service && !c.services.includes(service)) c.services.push(service);
  if (folder && !c.folder_url) c.folder_url = folder;
  if (apptDate) {
    if (!c.first_visit || apptDate < c.first_visit) c.first_visit = apptDate;
    if (!c.last_visit || apptDate > c.last_visit) c.last_visit = apptDate;
    if (rawName && (!c.latest_name_date || apptDate >= c.latest_name_date)) {
      c.name = rawName;
      c.latest_name_date = apptDate;
    }
  } else if (rawName && !c.name) {
    c.name = rawName;
  }
}

return Object.values(customerMap)
  .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'he'))
  .map((c) => ({
    json: {
      phone: c.phone,
      name: c.name,
      first_visit: formatDate(c.first_visit),
      last_visit: formatDate(c.last_visit),
      total_visits: String(c.total_visits),
      completed_visits: String(c.completed_visits),
      services_history: c.services.join(', '),
      is_returning: c.total_visits > 1 ? 'כן' : 'לא',
      folder_url: c.folder_url || '',
    },
  }));
""".strip()


def node(nid, name, ntype, version, position, parameters, credentials=None):
    item = {
        "parameters": parameters,
        "id": nid,
        "name": name,
        "type": ntype,
        "typeVersion": version,
        "position": position,
    }
    if credentials:
        item["credentials"] = credentials
    return item


def cron(expression):
    return {"rule": {"interval": [{"field": "cronExpression", "expression": expression}]}}


def http_get():
    return {
        "method": "GET",
        "url": f"{API}/appointments",
        "sendHeaders": True,
        "headerParameters": TOKEN_HEADER["parameters"],
        "options": {},
    }


def http_lifecycle(id_expr, extra):
    body = {"id": id_expr, **extra}
    return {
        "method": "POST",
        "url": f"{API}/lifecycle",
        "sendHeaders": True,
        "headerParameters": TOKEN_HEADER["parameters"],
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": json.dumps(body, ensure_ascii=False),
        "options": {},
    }


def http_customer():
    return {
        "method": "POST",
        "url": f"{API}/customers",
        "sendHeaders": True,
        "headerParameters": TOKEN_HEADER["parameters"],
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": json.dumps(
            {
                "phone": "={{ $json.phone }}",
                "name": "={{ $json.name }}",
                "first_visit": "={{ $json.first_visit }}",
                "last_visit": "={{ $json.last_visit }}",
                "total_visits": "={{ $json.total_visits }}",
                "completed_visits": "={{ $json.completed_visits }}",
                "services_history": "={{ $json.services_history }}",
                "is_returning": "={{ $json.is_returning }}",
                "folder_url": "={{ $json.folder_url }}",
            },
            ensure_ascii=False,
        ),
        "options": {},
    }


def wa(chat, message):
    return {"chatId": chat, "message": message, "typingTime": 0}


nodes = [
    node("yael-new-sched", "Schedule: כל דקה", "n8n-nodes-base.scheduleTrigger", 1, [-432, -384], cron("*/1 * * * *")),
    node("yael-new-http", "1️⃣ HTTP: קריאת תורים", "n8n-nodes-base.httpRequest", 4.2, [-208, -384], http_get()),
    node("yael-new-split", "1️⃣ Split Appointments", "n8n-nodes-base.code", 2, [-96, -384], {"jsCode": SPLIT_APPOINTMENTS}),
    node("yael-new-norm", "2️⃣ Code: Normalize Messages", "n8n-nodes-base.code", 2, [16, -384], {"mode": "runOnceForEachItem", "jsCode": NORMALIZE_NEW}),
    node(
        "yael-new-if",
        "3️⃣ IF: Valid + New?",
        "n8n-nodes-base.if",
        1,
        [240, -384],
        {
            "conditions": {
                "string": [
                    {"value1": "={{ $json.name }}", "operation": "isNotEmpty"},
                    {"value1": "={{ $json.phone }}", "operation": "isNotEmpty"},
                    {"value1": "={{ $json.date }}", "operation": "isNotEmpty"},
                    {"value1": "={{ $json.time }}", "operation": "isNotEmpty"},
                    {"value1": "={{ $json.auditLog }}", "value2": "created"},
                ]
            }
        },
    ),
    node("yael-new-wa1", "4️⃣ WhatsApp: ליעל - פרטי תור", GREEN_NODE, 1, [464, -384], wa("={{ $json.ownerChatId }}", "={{ $json.ownerMsg }}"), GREEN),
    node("yael-new-wa2", "5️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה", GREEN_NODE, 1, [688, -384], wa("={{ $('2️⃣ Code: Normalize Messages').item.json.ownerChatId }}", "={{ $('2️⃣ Code: Normalize Messages').item.json.customerForwardMsg }}"), GREEN),
    node("yael-new-mark", "6️⃣ HTTP: Mark Sent", "n8n-nodes-base.httpRequest", 4.2, [912, -384], http_lifecycle("={{ $('2️⃣ Code: Normalize Messages').item.json.id }}", {"auditLog": "sent"})),
    node("yael-rem-sched", "🟠 Schedule: תזכורת — כל בוקר 9:00", "n8n-nodes-base.scheduleTrigger", 1, [-432, -160], cron("0 9 * * *")),
    node("yael-rem-http", "🟠1️⃣ HTTP: קריאת תורים", "n8n-nodes-base.httpRequest", 4.2, [-208, -160], http_get()),
    node("yael-rem-split", "🟠1️⃣ Split Appointments", "n8n-nodes-base.code", 2, [-96, -160], {"jsCode": SPLIT_APPOINTMENTS}),
    node("yael-rem-code", "🟠2️⃣ Code: סינון + שתי הודעות ליעל", "n8n-nodes-base.code", 2, [16, -160], {"jsCode": REMINDER_FILTER}),
    node("yael-rem-wa1", "🟠3️⃣ WhatsApp: ליעל - פרטי תזכורת", GREEN_NODE, 1, [240, -160], wa("={{ $json.ownerChatId }}", "={{ $json.ownerReminderMsg }}"), GREEN),
    node("yael-rem-wa2", "🟠4️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה", GREEN_NODE, 1, [464, -160], wa("={{ $('🟠2️⃣ Code: סינון + שתי הודעות ליעל').item.json.ownerChatId }}", "={{ $('🟠2️⃣ Code: סינון + שתי הודעות ליעל').item.json.customerForwardMsg }}"), GREEN),
    node("yael-rem-mark", "🟠5️⃣ HTTP: Mark Reminder Sent", "n8n-nodes-base.httpRequest", 4.2, [688, -160], http_lifecycle("={{ $('🟠2️⃣ Code: סינון + שתי הודעות ליעל').item.json.id }}", {"auditLog": "reminder_sent"})),
    node("yael-sur-sched", "3️⃣ Schedule: סקר Fillout — כל 5 דקות", "n8n-nodes-base.scheduleTrigger", 1, [-432, 64], cron("*/5 * * * *")),
    node("yael-sur-http", "3️⃣1️⃣ HTTP: קריאת תורים", "n8n-nodes-base.httpRequest", 4.2, [-208, 64], http_get()),
    node("yael-sur-split", "3️⃣1️⃣ Split Appointments", "n8n-nodes-base.code", 2, [-96, 64], {"jsCode": SPLIT_APPOINTMENTS}),
    node("yael-sur-code", "3️⃣2️⃣ Code: מציאת טיפולים שבוצעו", "n8n-nodes-base.code", 2, [16, 64], {"jsCode": SURVEY_FILTER}),
    node("yael-sur-wa1", "3️⃣3️⃣ WhatsApp: ליעל - טיפול בוצע", GREEN_NODE, 1, [240, 64], wa("={{ $json.ownerChatId }}", "={{ $json.ownerDoneMsg }}"), GREEN),
    node("yael-sur-wa2", "3️⃣4️⃣ WhatsApp: ליעל - סקר להעברה", GREEN_NODE, 1, [464, 64], wa("={{ $('3️⃣2️⃣ Code: מציאת טיפולים שבוצעו').item.json.ownerChatId }}", "={{ $('3️⃣2️⃣ Code: מציאת טיפולים שבוצעו').item.json.filloutForwardMsg }}"), GREEN),
    node("yael-sur-mark", "3️⃣5️⃣ HTTP: Mark Fillout Sent", "n8n-nodes-base.httpRequest", 4.2, [688, 64], http_lifecycle("={{ $('3️⃣2️⃣ Code: מציאת טיפולים שבוצעו').item.json.id }}", {"reviewSent": "fillout_sent"})),
    node("yael-fb-hook", "3️⃣ Webhook: Fillout Feedback", "n8n-nodes-base.webhook", 1, [-432, 384], {"httpMethod": "POST", "path": "yael-review-rating", "options": {}}, None),
    node("yael-fb-parse", "3️⃣ Code: Parse Fillout Rating", "n8n-nodes-base.code", 2, [-208, 384], {"mode": "runOnceForEachItem", "jsCode": PARSE_FILLOUT}),
    node("yael-fb-if", "3️⃣ IF: Rating >= 4?", "n8n-nodes-base.if", 1, [16, 384], {"conditions": {"number": [{"value1": "={{ $json.rating }}", "operation": "largerEqual", "value2": 4}]}}),
    node("yael-fb-hi", "3️⃣ WhatsApp: ליעל - דירוג גבוה", GREEN_NODE, 1, [240, 288], wa("={{ $json.ownerChatId }}", "={{ $json.highRatingOwnerMsg }}"), GREEN),
    node("yael-fb-g", "3️⃣ WhatsApp: ליעל - Google להעברה", GREEN_NODE, 1, [464, 288], wa("={{ $('3️⃣ Code: Parse Fillout Rating').item.json.ownerChatId }}", "={{ $('3️⃣ Code: Parse Fillout Rating').item.json.googleForwardMsg }}"), GREEN),
    node("yael-fb-hi-mark", "3️⃣ HTTP: Mark Google Requested", "n8n-nodes-base.httpRequest", 4.2, [688, 288], http_lifecycle("={{ $('3️⃣ Code: Parse Fillout Rating').item.json.id }}", {"auditLog": "google_review_requested"})),
    node("yael-fb-lo", "3️⃣ WhatsApp: ליעל - דירוג נמוך", GREEN_NODE, 1, [240, 480], wa("={{ $json.ownerChatId }}", "={{ $json.lowRatingOwnerMsg }}"), GREEN),
    node("yael-fb-lo-mark", "3️⃣ HTTP: Mark Low Rating", "n8n-nodes-base.httpRequest", 4.2, [464, 480], http_lifecycle("={{ $('3️⃣ Code: Parse Fillout Rating').item.json.id }}", {"auditLog": "low_rating_received"})),
    node("yael-arc-sched", "🟣 Schedule: ארכיון — כל שעה", "n8n-nodes-base.scheduleTrigger", 1, [-432, 704], cron("0 * * * *")),
    node("yael-arc-http", "🟣1️⃣ HTTP: קריאת תורים", "n8n-nodes-base.httpRequest", 4.2, [-208, 704], http_get()),
    node("yael-arc-split", "🟣1️⃣ Split Appointments", "n8n-nodes-base.code", 2, [-96, 704], {"jsCode": SPLIT_APPOINTMENTS}),
    node("yael-arc-code", "🟣2️⃣ Code: בניית ארכיון Customers", "n8n-nodes-base.code", 2, [16, 704], {"jsCode": ARCHIVE_BUILD}),
    node("yael-arc-up", "🟣3️⃣ HTTP: Upsert Customers", "n8n-nodes-base.httpRequest", 4.2, [240, 704], http_customer()),
]

# webhookId is useful for n8n webhook nodes
for n in nodes:
    if n["type"] == "n8n-nodes-base.webhook":
        n["webhookId"] = "yael-review-rating-inactive"

connections = {
    "Schedule: כל דקה": {"main": [[{"node": "1️⃣ HTTP: קריאת תורים", "type": "main", "index": 0}]]},
    "1️⃣ HTTP: קריאת תורים": {"main": [[{"node": "1️⃣ Split Appointments", "type": "main", "index": 0}]]},
    "1️⃣ Split Appointments": {"main": [[{"node": "2️⃣ Code: Normalize Messages", "type": "main", "index": 0}]]},
    "2️⃣ Code: Normalize Messages": {"main": [[{"node": "3️⃣ IF: Valid + New?", "type": "main", "index": 0}]]},
    "3️⃣ IF: Valid + New?": {"main": [[{"node": "4️⃣ WhatsApp: ליעל - פרטי תור", "type": "main", "index": 0}]]},
    "4️⃣ WhatsApp: ליעל - פרטי תור": {"main": [[{"node": "5️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה", "type": "main", "index": 0}]]},
    "5️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה": {"main": [[{"node": "6️⃣ HTTP: Mark Sent", "type": "main", "index": 0}]]},
    "🟠 Schedule: תזכורת — כל בוקר 9:00": {"main": [[{"node": "🟠1️⃣ HTTP: קריאת תורים", "type": "main", "index": 0}]]},
    "🟠1️⃣ HTTP: קריאת תורים": {"main": [[{"node": "🟠1️⃣ Split Appointments", "type": "main", "index": 0}]]},
    "🟠1️⃣ Split Appointments": {"main": [[{"node": "🟠2️⃣ Code: סינון + שתי הודעות ליעל", "type": "main", "index": 0}]]},
    "🟠2️⃣ Code: סינון + שתי הודעות ליעל": {"main": [[{"node": "🟠3️⃣ WhatsApp: ליעל - פרטי תזכורת", "type": "main", "index": 0}]]},
    "🟠3️⃣ WhatsApp: ליעל - פרטי תזכורת": {"main": [[{"node": "🟠4️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה", "type": "main", "index": 0}]]},
    "🟠4️⃣ WhatsApp: ליעל - הודעה להעברה ללקוחה": {"main": [[{"node": "🟠5️⃣ HTTP: Mark Reminder Sent", "type": "main", "index": 0}]]},
    "3️⃣ Schedule: סקר Fillout — כל 5 דקות": {"main": [[{"node": "3️⃣1️⃣ HTTP: קריאת תורים", "type": "main", "index": 0}]]},
    "3️⃣1️⃣ HTTP: קריאת תורים": {"main": [[{"node": "3️⃣1️⃣ Split Appointments", "type": "main", "index": 0}]]},
    "3️⃣1️⃣ Split Appointments": {"main": [[{"node": "3️⃣2️⃣ Code: מציאת טיפולים שבוצעו", "type": "main", "index": 0}]]},
    "3️⃣2️⃣ Code: מציאת טיפולים שבוצעו": {"main": [[{"node": "3️⃣3️⃣ WhatsApp: ליעל - טיפול בוצע", "type": "main", "index": 0}]]},
    "3️⃣3️⃣ WhatsApp: ליעל - טיפול בוצע": {"main": [[{"node": "3️⃣4️⃣ WhatsApp: ליעל - סקר להעברה", "type": "main", "index": 0}]]},
    "3️⃣4️⃣ WhatsApp: ליעל - סקר להעברה": {"main": [[{"node": "3️⃣5️⃣ HTTP: Mark Fillout Sent", "type": "main", "index": 0}]]},
    "3️⃣ Webhook: Fillout Feedback": {"main": [[{"node": "3️⃣ Code: Parse Fillout Rating", "type": "main", "index": 0}]]},
    "3️⃣ Code: Parse Fillout Rating": {"main": [[{"node": "3️⃣ IF: Rating >= 4?", "type": "main", "index": 0}]]},
    "3️⃣ IF: Rating >= 4?": {
        "main": [
            [{"node": "3️⃣ WhatsApp: ליעל - דירוג גבוה", "type": "main", "index": 0}],
            [{"node": "3️⃣ WhatsApp: ליעל - דירוג נמוך", "type": "main", "index": 0}],
        ]
    },
    "3️⃣ WhatsApp: ליעל - דירוג גבוה": {"main": [[{"node": "3️⃣ WhatsApp: ליעל - Google להעברה", "type": "main", "index": 0}]]},
    "3️⃣ WhatsApp: ליעל - Google להעברה": {"main": [[{"node": "3️⃣ HTTP: Mark Google Requested", "type": "main", "index": 0}]]},
    "3️⃣ WhatsApp: ליעל - דירוג נמוך": {"main": [[{"node": "3️⃣ HTTP: Mark Low Rating", "type": "main", "index": 0}]]},
    "🟣 Schedule: ארכיון — כל שעה": {"main": [[{"node": "🟣1️⃣ HTTP: קריאת תורים", "type": "main", "index": 0}]]},
    "🟣1️⃣ HTTP: קריאת תורים": {"main": [[{"node": "🟣1️⃣ Split Appointments", "type": "main", "index": 0}]]},
    "🟣1️⃣ Split Appointments": {"main": [[{"node": "🟣2️⃣ Code: בניית ארכיון Customers", "type": "main", "index": 0}]]},
    "🟣2️⃣ Code: בניית ארכיון Customers": {"main": [[{"node": "🟣3️⃣ HTTP: Upsert Customers", "type": "main", "index": 0}]]},
}

workflow = {
    "id": "YaelBookLifeCycle01",
    "name": "Yael Mavashev — תורים",
    "active": False,
    "versionId": "yael-booking-lifecycle-v1",
    "nodes": nodes,
    "connections": connections,
    "pinData": {},
    "settings": {"executionOrder": "v1", "timezone": "Asia/Jerusalem"},
    "meta": {"templateCredsSetupCompleted": True},
}

out = Path(__file__).with_name("yael-mavashev-booking-lifecycle.workflow.json")
out.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out} nodes={len(nodes)}")
