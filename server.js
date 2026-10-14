const express = require("express");
const { installBookingRoutes } = require("./booking-system");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

const labels = {
  my: {
    title: "ဝန်ဆောင်မှု ကြိုတင်ချိန်းဆိုရန်",
    name: "အမည်", email: "အီးမေးလ်", phone: "ဖုန်းနံပါတ်",
    service: "ဝန်ဆောင်မှု", choose: "ရွေးချယ်ပါ",
    business: "အသေးစားစီးပွားရေး လုပ်ငန်းရှင်များအတွက် Coaching",
    counseling: "တစ်ကိုယ်ရည် ဖွံ့ဖြိုးတိုးတက်ရေးအတွက် Counseling",
    date: "ချိန်းဆိုလိုသည့်ရက်စွဲ",
    notes: "အပိုဆောင်းမှတ်ချက် (မဖြည့်လည်းရပါသည်)",
    submit: "ချိန်းဆိုရန် တောင်းဆိုချက် ပေးပို့မည်",
    privacy: "သင့်အချက်အလက်များကို ချိန်းဆိုမှုစီစဉ်ရန်သာ အသုံးပြုပါမည်။",
    received: "တောင်းဆိုချက် လက်ခံရရှိပါပြီ",
    thanks: "ချိန်းဆိုမှုတောင်းဆိုချက်ကို လက်ခံရရှိပါပြီ။ အတည်ပြုရန် ပြန်လည်ဆက်သွယ်ပေးပါမည်။",
    home: "မူလစာမျက်နှာသို့ ပြန်သွားရန်",
    invalid: "ဖြည့်သွင်းထားသည့် အချက်အလက်များကို ပြန်လည်စစ်ဆေးပါ။",
    error: "ဝန်ဆောင်မှုကို ယခုမရရှိနိုင်ပါ။ နောက်မှ ထပ်မံကြိုးစားပါ။"
  },
  en: {
    title: "Book an Appointment",
    name: "Full Name", email: "Email Address", phone: "Phone Number",
    service: "Service", choose: "Select a service",
    business: "Small Business Coaching",
    counseling: "Personal Development Counseling",
    date: "Preferred Appointment Date",
    notes: "Additional Notes (Optional)",
    submit: "Submit Booking Request",
    privacy: "Your information will only be used to arrange your appointment.",
    received: "Request Received",
    thanks: "Your appointment request has been received. We will contact you to confirm the date.",
    home: "Back to Home",
    invalid: "Please check the information and try again.",
    error: "Booking is temporarily unavailable. Please try again later."
  }
};

const allowedServices = ["Small Business Coaching", "Personal Development Counseling"];
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function preferredLanguage(req) {
  return req.query.lang === "en" || req.body?.lang === "en" ? "en" : "my";
}
function page(lang, body) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Soe Kalayar | Booking</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f8f5;color:#18352b;font-family:Arial,"Noto Sans Myanmar",sans-serif;line-height:1.65}
main{max-width:660px;margin:40px auto;padding:32px;background:white;border-radius:18px;box-shadow:0 8px 35px #122d1d15}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
h1{margin:0;font-size:30px}h2{font-size:22px}p{color:#4e665c}
.language a{padding:7px 12px;border:1px solid #cbded3;border-radius:9px;text-decoration:none;color:#245c4b}
.language a[aria-current=page]{background:#245c4b;color:white}
label{display:block;margin-top:17px;font-weight:600}
input,select,textarea{width:100%;padding:12px;margin-top:6px;border:1px solid #b5cbbd;border-radius:9px;font:inherit;color:#18352b;background:#fff}
button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:9px;background:#245c4b;color:#fff;font:inherit;cursor:pointer}
small{display:block;margin-top:12px;color:#526c5f}
a{color:#245c4b}
@media(max-width:700px){main{margin:12px;padding:22px}}
</style></head><body><main>${body}</main></body></html>`;
}
function respondHtml(res, status, html) {
  res.set("Cache-Control", "no-store");
  res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  return res.status(status).type("html").send(html);
}
app.get("/", (req, res) => {
  const lang = preferredLanguage(req);
  const t = labels[lang];
  const body = `<header><h1>Soe Kalayar</h1>
<nav class="language" aria-label="Language">
<a href="/?lang=my" ${lang === "my" ? 'aria-current="page"' : ""}>မြန်မာ</a>
<a href="/?lang=en" ${lang === "en" ? 'aria-current="page"' : ""}>English</a>
</nav></header>
<p>Coaching for Small Business &amp; Counseling for Personal Development</p>
<h2>${t.title}</h2>
<form method="post" action="/booking" accept-charset="UTF-8">
<input type="hidden" name="lang" value="${lang}">
<label for="name">${t.name} *</label>
<input id="name" name="name" autocomplete="name" required maxlength="100">
<label for="email">${t.email} *</label>
<input id="email" type="email" name="email" autocomplete="email" required maxlength="200">
<label for="phone">${t.phone} *</label>
<input id="phone" type="tel" name="phone" autocomplete="tel" required maxlength="40">
<label for="service">${t.service} *</label>
<select id="service" name="service" required>
<option value="">${t.choose}</option>
<option value="Small Business Coaching">${t.business}</option>
<option value="Personal Development Counseling">${t.counseling}</option>
</select>
<label for="date">${t.date} *</label>
<input id="date" type="date" name="date" required min="${new Date().toISOString().slice(0, 10)}">
<label for="message">${t.notes}</label>
<textarea id="message" name="message" rows="4" maxlength="1000"></textarea>
<small>${t.privacy}</small>
<button type="submit">${t.submit}</button>
</form>`;
  return respondHtml(res, 200, page(lang, body));
});

installBookingRoutes(app, { page, labels, preferredLanguage, respondHtml, escapeHtml, allowedServices });

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.listen(PORT, "0.0.0.0", () => console.log(`Server is running on port ${PORT}`));
