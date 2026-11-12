const TelegramBot = require("node-telegram-bot-api");
const { google } = require("googleapis");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID;
const SPREADSHEET_ID = process.env.SOEKHUB_GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.TODO_SHEET_NAME || "Tasks";

async function main() {
  if (!TOKEN || !CHAT_ID || !SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing one or more required GitHub Actions secrets");
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME + "!A2:F"
  });
  const tasks = (response.data.values || [])
    .map(r => ({ id: r[0] || "", task: r[1] || "", dueAt: r[2] || "", status: r[3] || "Pending" }))
    .filter(t => t.status !== "Completed");
  const now = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date());
  const label = process.env.REMINDER_LABEL || "နေ့စဉ် Task သတိပေးချက်";
  const lines = tasks.slice(0, 40).map(t => "• [" + t.id + "] " + t.task + " — " + (t.dueAt || "အချိန်မသတ်မှတ်ရသေး"));
  const message = tasks.length
    ? "Soe Kalayar — " + label + "\nအချိန်: " + now + " (Myanmar Time)\nမပြီးသေးသော Task " + tasks.length + " ခု:\n" + lines.join("\n")
    : "Soe Kalayar — " + label + "\nအချိန်: " + now + " (Myanmar Time)\nလက်ရှိ မပြီးသေးတဲ့ Task မရှိပါဘူး။";
  const bot = new TelegramBot(TOKEN);
  await bot.sendMessage(CHAT_ID, message);
  console.log("Reminder sent. Pending tasks: " + tasks.length);
}
main().catch(err => {
  console.error("Reminder failed:", err.message);
  process.exit(1);
});
