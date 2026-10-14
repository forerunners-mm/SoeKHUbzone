# Soe Kalayar booking deployment

This branch is **not deployed** until reviewed and merged. Install dependencies with `npm install` and start with `npm start` (Node.js 20+).

## Render environment variables

- `DATABASE_URL`: private PostgreSQL connection URL from Render Postgres (required)
- `ADMIN_EMAIL`: `soekhubzone@gmail.com`
- `ADMIN_PASSWORD`: a unique randomly generated secret of at least 16 characters (required; never commit it)
- `SMTP_HOST`: SMTP server host for your mail provider
- `SMTP_PORT`: typically 465 or 587
- `SMTP_USER`: sender mailbox
- `SMTP_PASSWORD`: SMTP-specific app password or credential; never use or commit your regular Gmail password
- `DB_SSL`: `true` only if your database requires TLS and has a valid CA chain

Notifications go to ADMIN_EMAIL. If SMTP is not configured, bookings are saved but no email is sent. If DATABASE_URL is missing or unavailable, the form reports an error and does not claim success. The database table is created on first request. Admin dashboard is at `/admin` and uses browser HTTP Basic authentication over HTTPS.

## Security and launch checklist

- Set all secrets in Render Environment, not GitHub source.
- Use HTTPS, a strong admin password, and limit access to admin credentials.
- Test booking, email delivery, status updates, and database persistence before merging.
- Admin form POST uses same-origin validation; use the production HTTPS domain.
- Add backups, retention/deletion policy, CSRF protection for broader browser compatibility, and stronger session-based authentication/MFA before storing sensitive counseling information at scale.
- Do not submit clinical details or crisis information in the optional notes field.
- No deployment or external email account setup has been performed automatically.
