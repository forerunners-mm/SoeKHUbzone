# Soe Kalayar To-do Telegram Worker

This worker is intentionally separate from the existing booking website and the existing Service & Product bot.

## Run locally / as a separate hosting service

- Node.js 20+
- Install: `npm install`
- Start only the To-do worker: `npm run start:bot`

Do **not** change the existing website start command (`npm start`). Deploy this worker as a separate service/process so the booking website remains online independently.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`: token for the dedicated `@Soekalayar.bot` To-do bot only. Never add a token to GitHub.
- `TELEGRAM_ALLOWED_CHAT_ID`: your personal Telegram numeric chat ID. The bot rejects all other chats.
- `SOEKHUB_GOOGLE_SHEET_ID`: ID of the SoeK Hub Google Sheet.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: complete service-account JSON stored as a hosting secret. Share the target Google Sheet with the service account email as Editor.
- `TODO_SHEET_NAME`: optional; defaults to `Tasks`.

The worker creates a `Tasks` tab and its header row if they do not exist. It stores only task title, due time, status, creation time and source. Do not put counseling notes or sensitive personal details in task titles.

## Telegram commands

- `/id`: show your numeric Telegram chat ID in a private chat (use it for `TELEGRAM_ALLOWED_CHAT_ID`)
- `/start` or `/help`: show instructions
- `/add YYYY-MM-DD HH:mm | Task description`: add a task
- `/list`: list incomplete tasks
- `/done TASKID`: mark a task completed

All dates and reminders use Myanmar Time (`Asia/Yangon`, UTC+06:30).

## Daily reminders

- 07:00 — morning task briefing
- 13:00 — midday task check
- 20:00 — evening review

## Important deployment safety

- Keep this worker in a separate hosting service from the booking website.
- Run only one polling instance for this bot token. Do not start a second copy elsewhere.
- Do not reuse the Service & Product bot token.
- Do not change the existing website's `npm start` command.
- The worker has not been deployed or connected to Google Sheets automatically by this repository change.
