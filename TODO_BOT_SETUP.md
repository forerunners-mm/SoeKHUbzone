# Soe Kalayar To-do Assistant — Free Hybrid Deployment

This is separate from the existing booking website and Service & Product bot.

## Architecture

- Render Free Web Service receives Telegram updates through a webhook. It may sleep after inactivity, so first response after idle may be delayed.
- GitHub Actions sends task briefings at 07:00, 13:00, and 20:00 Myanmar Time (UTC times: 00:30, 06:30, 13:30).
- Telegram task data is stored in the SoeK Hub Google Sheet, in a dedicated `Tasks` tab.
- Do not run the old polling worker and webhook worker at the same time with the same bot token.

## Render Web Service

- Repository: `forerunners-mm/SoeKHUbzone`
- Branch: `feature/telegram-todo-assistant` (after review/merge, use the branch containing these files)
- Runtime: Node
- Build command: `npm install`
- Start command: `npm run start:webhook`
- Health check path: `/health`

Render environment variables:
- `TELEGRAM_BOT_TOKEN`: dedicated To-do bot token only
- `TELEGRAM_WEBHOOK_SECRET`: 1-256 chars, only A-Z/a-z/0-9/_/-
- `WEBHOOK_PATH_SECRET`: random path secret, at least 24 characters
- `TELEGRAM_ALLOWED_CHAT_ID`: personal numeric chat ID (can be added after /id is used)
- `SOEKHUB_GOOGLE_SHEET_ID`: SoeK Hub Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_JSON`: complete service account JSON stored as a secret
- `TODO_SHEET_NAME`: optional; defaults to `Tasks`

Render supplies `PORT` and `RENDER_EXTERNAL_URL`.

## GitHub Actions repository secrets

Add the following under Settings > Secrets and variables > Actions > New repository secret:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `SOEKHUB_GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- Optional `TODO_SHEET_NAME` (value: `Tasks`)

The service account email in the JSON must have Editor access to the target Google Sheet. Do not commit credentials to GitHub or paste them into chat.

## Telegram commands

- `/id` — returns your private chat ID before the allowed ID is configured
- `/start` or `/help` — instructions (after allowed chat ID is configured)
- `/add YYYY-MM-DD HH:mm | Task description`
- `/list`
- `/done TASKID`

All task times use Myanmar Time (Asia/Yangon).

## Limitations

Render Free Web Services can sleep after inactivity. Telegram webhook messages may be delayed while the service wakes. GitHub Actions scheduled workflows are not guaranteed to start at the exact minute; GitHub may delay scheduled events. This is a free pilot, not a guaranteed critical-alert system.

Do not store counseling notes, passwords, or sensitive personal details in task titles. Keep the existing website `npm start` unchanged.
