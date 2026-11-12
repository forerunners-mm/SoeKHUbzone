/**
 * Separate personal To-do Telegram worker.
 * Run as its own hosting service with: npm run start:bot
 * Uses Myanmar Time (Asia/Yangon) and a dedicated Google Sheets tab.
 */
const TelegramBot = require("node-telegram-bot-api");
const { google } = require("googleapis");
const cron = require("node-cron");
const crypto = require("node:crypto");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID;
const SPREADSHEET_ID = process.env.SOEKHUB_GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.TODO_SHEET_NAME || "Tasks";
const TIME_ZONE = "Asia/Yangon";
const HEADERS = ["TaskID", "Task", "DueAt", "Status", "CreatedAt", "Source"];

if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!ALLOWED_CHAT_ID) throw new Error("TELEGRAM_ALLOWED_CHAT_ID is required; bot is private by default");
if (!SPREADSHEET_ID) throw new Error("SOEKHUB_GOOGLE_SHEET_ID is required");

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is required");
  const credentials = JSON.parse(raw);
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

const sheets = getSheetsClient();
const bot = new TelegramBot(TOKEN, { polling: true });

async function ensureTab() {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const found = (meta.data.sheets || []).some(s => s.properties.title === SHEET_NAME);
  if (!found) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    });
  }
  const header = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:F1`
  });
  if (!header.data.values || !header.data.values.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:F1`,
      valueInputOption: "RAW", requestBody: { values: [HEADERS] }
    });
  }
}

async function readTasks() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A2:F`
  });
  return (response.data.values || []).map((r, i) => ({
    row: i + 2, id: r[0] || "", task: r[1] || "",
    dueAt: r[2] || "", status: r[3] || "Pending",
    createdAt: r[4] || "", source: r[5] || ""
  }));
}

async function appendTask(task, dueAt) {
  const id = crypto.randomUUID().slice(0, 8).toUpperCase();
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date());
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:F`,
    valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[id, task, dueAt, "Pending", created, "Telegram"]] }
  });
  return id;
}

async function markDone(id) {
  const tasks = await readTasks();
  const item = tasks.find(t => t.id.toUpperCase() === id.toUpperCase());
  if (!item) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!D${item.row}`,
    valueInputOption: "RAW", requestBody: { values: [["Completed"]] }
  });
  return true;
}

function isAllowed(msg) {
  return String(msg.chat.id) === String(ALLOWED_CHAT_ID);
}
function localNowString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date());
}
function parseDue(value) {
  // Input is Myanmar local time: YYYY-MM-DD HH:mm
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(value.replace(" ", "T") + ":00+06:30");
  return Number.isNaN(d.getTime()) ? null : d;
}
function helpText() {
  return [
    "မင်္ဂလာပါ။ Soe Kalayar To-do Assistant ပါ။",
    "",
    "/add YYYY-MM-DD HH:mm | လုပ်စရာအကြောင်းအရာ",
    "ဥပမာ - /add 2026-11-15 14:00 | Proposal ပြီးအောင်ရေးရန်",
    "/list - မပြီးသေးသော Task များ",
    "/done TASKID - ပြီးစီးကြောင်းမှတ်ရန်",
    "/help - အသုံးပြုပုံ",
    "",
    "အချိန်အားလုံး Myanmar Time (UTC+6:30) ဖြစ်ပါတယ်။"
  ].join("\n");
}

bot.onText(/^\/start(?:@\w+)?$/, async msg => {
  if (!isAllowed(msg)) return bot.sendMessage(msg.chat.id, "ဒီ Bot ကို အသုံးပြုခွင့်မရှိပါ။");
  await bot.sendMessage(msg.chat.id, helpText());
});
bot.onText(/^\/help(?:@\w+)?$/, async msg => {
  if (!isAllowed(msg)) return;
  await bot.sendMessage(msg.chat.id, helpText());
});
bot.onText(/^\/add(?:@\w+)?\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\|\s*(.+)$/s, async (msg, match) => {
  if (!isAllowed(msg)) return;
  const due = parseDue(match[1]);
  const task = match[2].trim();
  if (!due || !task || task.length > 300) {
    return bot.sendMessage(msg.chat.id, "ရက်စွဲ/အချိန် သို့မဟုတ် Task ကို ပြန်စစ်ပါ။ /help ကိုကြည့်ပါ။");
  }
  try {
    const id = await appendTask(task, match[1]);
    await bot.sendMessage(msg.chat.id, `Task သိမ်းပြီးပါပြီ။\nID: ${id}\nလုပ်စရာ: ${task}\nသတ်မှတ်ချိန်: ${match[1]} (Myanmar Time)`);
  } catch (err) {
    console.error("Task save failed:", err.message);
    await bot.sendMessage(msg.chat.id, "Task သိမ်းမရသေးပါ။ Google Sheets ချိတ်ဆက်မှုကို စစ်ဆေးရန်လိုပါတယ်။");
  }
});
bot.onText(/^\/list(?:@\w+)?$/, async msg => {
  if (!isAllowed(msg)) return;
  try {
    const tasks = (await readTasks()).filter(t => t.status !== "Completed");
    if (!tasks.length) return bot.sendMessage(msg.chat.id, "မပြီးသေးတဲ့ Task မရှိသေးပါဘူး။");
    const lines = tasks.slice(0, 40).map(t => `• [${t.id}] ${t.task} — ${t.dueAt || "အချိန်မသတ်မှတ်ရသေး"}`);
    await bot.sendMessage(msg.chat.id, "မပြီးသေးသော Task များ:\n" + lines.join("\n"));
  } catch (err) {
    console.error("Task list failed:", err.message);
    await bot.sendMessage(msg.chat.id, "Task စာရင်းဖတ်မရသေးပါ။");
  }
});
bot.onText(/^\/done(?:@\w+)?\s+([A-Z0-9-]+)$/i, async (msg, match) => {
  if (!isAllowed(msg)) return;
  try {
    const ok = await markDone(match[1]);
    await bot.sendMessage(msg.chat.id, ok ? "ပြီးစီးကြောင်း မှတ်သားပြီးပါပြီ။" : "ဒီ Task ID ကို မတွေ့ပါဘူး။ /list နဲ့ ပြန်စစ်ပါ။");
  } catch (err) {
    console.error("Task update failed:", err.message);
    await bot.sendMessage(msg.chat.id, "Task အခြေအနေ ပြောင်းလဲမရသေးပါ။");
  }
});

async function sendDailyBriefing(label) {
  try {
    const tasks = (await readTasks()).filter(t => t.status !== "Completed");
    const lines = tasks.slice(0, 40).map(t => `• [${t.id}] ${t.task} — ${t.dueAt || "အချိန်မသတ်မှတ်ရသေး"}`);
    const message = tasks.length
      ? `Soe Kalayar — ${label}\nမပြီးသေးသော Task ${tasks.length} ခု:\n${lines.join("\n")}`
      : `Soe Kalayar — ${label}\nလက်ရှိ မပြီးသေးတဲ့ Task မရှိပါဘူး။`;
    await bot.sendMessage(ALLOWED_CHAT_ID, message);
  } catch (err) {
    console.error("Scheduled briefing failed:", err.message);
  }
}

async function start() {
  await ensureTab();
  console.log(`To-do Telegram worker ready. Time zone: ${TIME_ZONE}; sheet tab: ${SHEET_NAME}`);
  cron.schedule("0 7 * * *", () => sendDailyBriefing("မနက်ခင်းအစီအစဉ်"), { timezone: TIME_ZONE });
  cron.schedule("0 13 * * *", () => sendDailyBriefing("နေ့လယ် Task စစ်ဆေးချက်"), { timezone: TIME_ZONE });
  cron.schedule("0 20 * * *", () => sendDailyBriefing("ညပိုင်း ပြန်လည်သုံးသပ်ချက်"), { timezone: TIME_ZONE });
}
start().catch(err => {
  console.error("To-do worker startup failed:", err.message);
  process.exit(1);
});

process.on("SIGTERM", () => { bot.stopPolling(); process.exit(0); });
process.on("SIGINT", () => { bot.stopPolling(); process.exit(0); });
