const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`<!doctype html>
<html lang="my">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Soe Kalayar | Booking</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; padding: 0 16px; color: #222; }
    label { display: block; margin-top: 16px; }
    input, select, textarea, button { box-sizing: border-box; width: 100%; padding: 11px; margin-top: 6px; }
    button { margin-top: 20px; cursor: pointer; background: #245c4b; color: white; border: 0; }
  </style>
</head>
<body>
  <h1>Soe Kalayar</h1>
  <p>Coaching for Small Business &amp; Counseling for Personal Development</p>

  <form method="post" action="/booking">
    <label>အမည်
      <input name="name" required maxlength="100">
    </label>
    <label>Email
      <input type="email" name="email" required maxlength="200">
    </label>
    <label>Утасны дугаар
      <input name="phone" required maxlength="40">
    </label>
    <label>Үйлчилгээ
      <select name="service" required>
        <option value="">Сонгоно уу</option>
        <option value="Small Business Coaching">Small Business Coaching</option>
        <option value="Personal Development Counseling">Personal Development Counseling</option>
      </select>
    </label>
    <label>Хүссэн өдөр
      <input type="date" name="date" required>
    </label>
    <label>Тайлбар (заавал биш)
      <textarea name="message" rows="4" maxlength="1000"></textarea>
    </label>
    <button type="submit">Райм захиалах хүсэлт илгээх</button>
  </form>
</body>
</html>`);
});

app.post("/booking", (req, res) => {
  const { name, email, phone, service, date, message = "" } = req.body;

  if (!name || !email || !phone || !service || !date) {
    return res.status(400).send("Бүх шаардлагатай талбарыг бөглөнө үү.");
  }

  const allowedServices = [
    "Small Business Coaching",
    "Personal Development Counseling"
  ];

  if (!allowedServices.includes(service)) {
    return res.status(400).send("Үйлчилгээний сонголт буруу байна.");
  }

  // Түр хувилбар: Render logs дээр захиалгын хүсэлтийг харуулна.
  // Бодит хэрэглээнд мэдээллийг database-д хадгалж, лог дээр хувийн мэдээлэл бүү хэвлээрэй.
  console.log("Шинэ захиалгын хүсэлт:", {
    name,
    email,
    phone,
    service,
    date,
    message
  });

  res.send(`
    <h1>Хүсэлт хүлээн авлаа</h1>
    <p>Баярлалаа, ${escapeHtml(name)}. Soe Kalayar тантай холбогдоно.</p>
    <a href="/">Нүүр хуудас руу буцах</a>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
