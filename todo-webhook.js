const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { google } = require("googleapis");
const crypto = require("node:crypto");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";
const SPREADSHEET_ID = process.env.SOEKHUB_GOOGLE_SHEET_ID || "";
const SHEET_NAME = process.env.TODO_SHEET_NAME || "Tasks";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const WEBHOOK_PATH_SECRET = process.env.WEBHOOK_PATH_SECRET;
const BASE_URL = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const TZ = "Asia/Yangon";
const HEADERS = ["TaskID", "Task", "DueAt", "Status", "CreatedAt", "Source"];

if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!WEBHOOK_SECRET || !/^[A-Za-z0-9_-]{1,256}$/.test(WEBHOOK_SECRET)) throw new Error("TELEGRAM_WEBHOOK_SECRET must be 1-256 characters: A-Z, a-z, 0-9, _ or -");
if (!WEBHOOK_PATH_SECRET || WEBHOOK_PATH_SECRET.length < 24) throw new Error("WEBHOOK_PATH_SECRET must be at least 24 characters");
if (!BASE_URL) throw new Error("Render must provide RENDER_EXTERNAL_URL");

const bot = new TelegramBot(TOKEN);
let sheetsClient;

function sheets() {
  if (sheetsClient) return sheetsClient;
  if (!SPREADSHEET_ID) throw new Error("SOEKHUB_GOOGLE_SHEET_ID is not configured");
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");
  const credentials = JSON.parse(raw);
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}
function allowed(msg) {
  return Boolean(ALLOWED_CHAT_ID) && String(msg.chat.id) === String(ALLOWED_CHAT_ID);
}
function helpText() {
  return [
    "မင်္ဂလာပါ။ Soe Kalayar To-do Assistant ပါ။",
    "",
    "/id - ကိုယ်ပိုင် Telegram Chat ID ရယူရန်",
    "/add YYYY-MM-DD HH:mm | လုပ်စရာအကြောင်းအရာ",
    "ဥပမာ - /add 2026-11-15 14:00 | Proposal ပြီးအောင်ရေးရန်",
    "/list - မပြီးသေးသော Task များ",
    "/done TASKID - ပြီးစီးကြောင်းမှတ်ရန်",
    "/help - အသုံးပြုပုံ",
    "",
    "အချိန်အားလုံး Myanmar Time (UTC+6:30) ဖြစ်ပါတယ်။"
  ].join("\n");
}
function parseDue(value) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return false;
  const [datePart, timePart] = value.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, h - 6, min - 30));
  const local = new Date(utc.getTime() + 390 * 60000);
  return local.getUTCFullYear() === y && local.getUTCMonth() + 1 === m &&
    local.getUTCDate() === d && local.getUTCHours() === h && local.getUTCMinutes() === min;
}
async function ensureTab() {
  const api = sheets();
  const meta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (meta.data.sheets || []).some(s => s.properties.title === SHEET_NAME);
  if (!exists) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    });
  }
  const header = await api.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME + "!A1:F1" });
  if (!header.data.values || !header.data.values.length) {
    await api.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME + "!A1:F1",
      valueInputOption: "RAW", requestBody: { values: [HEADERS] }
    });
  }
}
async function readTasks() {
  const result = await sheets().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME + "!A2:F"
  });
  return (result.data.values || []).map((r, i) => ({
    row: i + 2, id: r[0] || "", task: r[1] || "", dueAt: r[2] || "",
    status: r[3] || "Pending"
  }));
}
async function appendTask(task, dueAt) {
  const id = crypto.randomUUID().slice(0, 8).toUpperCase();
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date());
  await sheets().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME + "!A:F",
    valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[id, task, dueAt, "Pending", created, "Telegram"]] }
  });
  return id;
}
async function markDone(id) {
  const task = (await readTasks()).find(t => t.id.toUpperCase() === id.toUpperCase());
  if (!task) return false;
  await sheets().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME + "!D" + task.row,
    valueInputOption: "RAW", requestBody: { values: [["Completed"]] }
  });
  return true;
}

bot.onText(/^\/id(?:@\w+)?$/, async msg => {
  if (msg.chat.type === "private") {
    await bot.sendMessage(msg.chat.id, "သင့် Telegram Chat ID: " + msg.chat.id);
  }
});
bot.onText(/^\/start(?:@\w+)?$/, async msg => {
  if (!allowed(msg)) return bot.sendMessage(msg.chat.id, "အသုံးပြုခွင့် မသတ်မှတ်ရသေးပါ။ /id ကို ပို့ပြီး Chat ID ကို Admin ထံ ထည့်သွင်းပါ။");
  await bot.sendMessage(msg.chat.id, helpText());
});
bot.onText(/^\/help(?:@\w+)?$/, async msg => {
  if (allowed(msg)) await bot.sendMessage(msg.chat.id, helpText());
});
bot.onText(/^\/add(?:@\w+)?\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\|\s*(.+)$/s, async (msg, match) => {
  if (!allowed(msg)) return;
  const dueAt = match[1];
  const task = match[2].trim();
  if (!parseDue(dueAt) || !task || task.length > 300) {
    return bot.sendMessage(msg.chat.id, "ရက်စွဲ/အချိန် သို့မဟုတ် Task ကို ပြန်စစ်ပါ။ /help ကိုကြည့်ပါ။");
  }
  try {
    const id = await appendTask(task, dueAt);
    await bot.sendMessage(msg.chat.id, "Task သိမ်းပြီးပါပြီ။\nID: " + id + "\nလုပ်စရာ: " + task + "\nသတ်မှတ်ချိန်: " + dueAt + " (Myanmar Time)");
  } catch (e) {
    console.error("Task save failed:", e.message);
    await bot.sendMessage(msg.chat.id, "Task သိမ်းမရသေးပါ။ Google Sheets ချိတ်ဆက်မှုကို စစ်ဆေးရန်လိုပါတယ်။");
  }
});
bot.onText(/^\/list(?:@\w+)?$/, async msg => {
  if (!allowed(msg)) return;
  try {
    const tasks = (await readTasks()).filter(t => t.status !== "Completed");
    if (!tasks.length) return bot.sendMessage(msg.chat.id, "မပြီးသေးတဲ့ Task မရှိသေးပါဘူး။");
    await bot.sendMessage(msg.chat.id, "မပြီးသေးသော Task များ:\n" +
      tasks.slice(0, 40).map(t => "• [" + t.id + "] " + t.task + " — " + (t.dueAt || "အချိန်မသတ်မှတ်ရသေး")).join("\n"));
  } catch (e) {
    console.error("Task list failed:", e.message);
    await bot.sendMessage(msg.chat.id, "Task စာရင်းဖတ်မရသေးပါ။");
  }
});
bot.onText(/^\/done(?:@\w+)?\s+([A-Z0-9-]+)$/i, async (msg, match) => {
  if (!allowed(msg)) return;
  try {
    const ok = await markDone(match[1]);
    await bot.sendMessage(msg.chat.id, ok ? "ပြီးစီးကြောင်း မှတ်သားပြီးပါပြီ။" : "ဒီ Task ID ကို မတွေ့ပါဘူး။ /list နဲ့ ပြန်စစ်ပါ။");
  } catch (e) {
    console.error("Task update failed:", e.message);
    await bot.sendMessage(msg.chat.id, "Task အခြေအနေ ပြောင်းလဲမရသေးပါ။");
  }
});

const webhookUrl = BASE_URL + "/telegram/" + WEBHOOK_PATH_SECRET;
app.post("/telegram/" + WEBHOOK_PATH_SECRET, (req, res) => {
  if (req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }
  if (!req.body || typeof req.body.update_id !== "number") return res.sendStatus(400);
  bot.processUpdate(req.body);
  return res.sendStatus(200);
});
app.get("/health", (req, res) => res.json({ status: "ok", service: "soe-kalayar-todo-webhook" }));
app.listen(PORT, "0.0.0.0", async () => {
  try {
    await bot.setWebHook(webhookUrl, { secret_token: WEBHOOK_SECRET });
    if (SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      await ensureTab();
      console.log("Google Sheets Tasks tab is ready.");
    } else {
      console.log("Google Sheets is not configured yet; /id remains available.");
    }
    console.log("To-do webhook is active at " + BASE_URL + "/health");
  } catch (e) {
    console.error("Telegram webhook registration failed:", e.message);
    process.exit(1);
  }
});
process.on("SIGTERM", async () => {
  try { await bot.deleteWebHook(); } catch (_) {}
  process.exit(0);
});
