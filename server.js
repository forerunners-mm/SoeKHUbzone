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
function logo() {
  return `<a class="brand" href="/" aria-label="SoeK Hub Zone home">
    <svg class="brand-mark" viewBox="0 0 64 64" role="img" aria-label="SoeK Hub Zone logo">
      <defs><linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#176B55"/><stop offset="1" stop-color="#58B887"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="19" fill="#E9F5EE"/>
      <path d="M17 42c1-15 13-25 30-24-1 17-10 29-26 29-4 0-6-2-4-5Z" fill="url(#leaf)"/>
      <path d="M20 46 42 25" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M29 38 28 29M35 32l8 1" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M47 12l2.2 4.5 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7Z" fill="#D5A64A"/>
    </svg>
    <span class="brand-name">SoeK <b>Hub Zone</b><small>AI • BUSINESS • CAREER</small></span>
  </a>`;
}
function shell(body, title = "SoeK Hub Zone | AI, Business & Career") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="SoeK Hub Zone offers AI tools, SME consultation, business and career coaching, and practical training to help people and businesses grow.">
<meta name="theme-color" content="#176b55">
<title>${title}</title>
<style>
:root{--green:#176b55;--green2:#248363;--mint:#b5dccb;--ink:#242b2b;--muted:#66736e;--paper:#f7faf8;--line:#e2ebe5;--gold:#d5a64a}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:#fff;color:var(--ink);font:16px/1.65 Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}.container{width:min(1160px,calc(100% - 40px));margin:auto}
.site-header{position:sticky;top:0;z-index:20;background:#ffffffed;backdrop-filter:blur(12px);border-bottom:1px solid #e8eee9}.nav-wrap{display:flex;align-items:center;justify-content:space-between;min-height:76px;gap:20px}.brand{display:flex;align-items:center;gap:11px;min-width:0}.brand-mark{width:49px;height:49px;flex:none}.brand-name{font-size:19px;font-weight:800;letter-spacing:-.5px;line-height:1.15}.brand-name b{color:var(--green)}.brand-name small{display:block;margin-top:5px;color:#75847c;font-size:9px;letter-spacing:1.8px;font-weight:700}
.nav-links{display:flex;align-items:center;gap:25px;color:#3d4a45;font-size:14px;font-weight:650}.nav-links a:hover{color:var(--green)}.nav-cta,.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--green);color:white;padding:12px 19px;border-radius:12px;font-weight:700;border:1px solid var(--green);transition:.2s}.nav-cta:hover,.btn:hover{background:#10523f;transform:translateY(-1px)}.btn.secondary{background:#fff;color:var(--green)}.btn.light{background:#eaf5ee;border-color:#eaf5ee;color:var(--green)}.mobile-menu{display:none}
.hero{position:relative;overflow:hidden;background:radial-gradient(ellipse at 85% 10%,#d6eee1 0,transparent 42%),linear-gradient(135deg,#f7fbf8,#eef7f1);padding:92px 0 85px}.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:55px}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:12px;letter-spacing:1.6px;text-transform:uppercase;font-weight:800}.eyebrow:before{content:"";width:22px;height:2px;background:var(--green)}h1{font-size:clamp(40px,5.5vw,66px);line-height:1.07;letter-spacing:-2.6px;margin:18px 0 22px}h1 em{color:var(--green);font-style:normal}.hero p{max-width:590px;font-size:18px;color:#52625a;margin:0 0 28px}.hero-actions{display:flex;flex-wrap:wrap;gap:12px}.hero-note{margin-top:23px;color:#748179;font-size:13px}.hero-art{min-height:390px;display:flex;align-items:center;justify-content:center;position:relative}.hub-card{width:min(390px,100%);aspect-ratio:1;border-radius:38px;background:linear-gradient(145deg,#176b55,#104b3b);box-shadow:0 24px 60px #176b552a;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.hub-card:before,.hub-card:after{content:"";position:absolute;border:1px solid #ffffff24;border-radius:50%}.hub-card:before{width:310px;height:310px}.hub-card:after{width:230px;height:230px}.hub-card .big-leaf{width:150px;height:150px;z-index:1;filter:drop-shadow(0 14px 15px #061d1540)}.float-label{position:absolute;background:#fff;padding:12px 15px;border-radius:14px;box-shadow:0 10px 28px #193c2b18;font-size:13px;font-weight:750;display:flex;align-items:center;gap:8px}.float-label.top{top:28px;right:-5px}.float-label.bottom{bottom:35px;left:-10px}.float-label span{font-size:19px}
.section{padding:82px 0}.section.soft{background:var(--paper)}.section-head{text-align:center;max-width:740px;margin:0 auto 42px}.section-head h2{font-size:clamp(29px,4vw,42px);letter-spacing:-1.4px;line-height:1.2;margin:13px 0}.section-head p{color:var(--muted);font-size:17px;margin:0}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.card{border:1px solid var(--line);border-radius:20px;padding:25px;background:white;transition:.2s}.card:hover{transform:translateY(-4px);box-shadow:0 16px 40px #143b2710;border-color:#c6ded0}.iconbox{width:52px;height:52px;border-radius:15px;background:#eaf5ee;display:grid;place-items:center;font-size:24px;margin-bottom:19px}.card h3{margin:0 0 9px;font-size:19px;letter-spacing:-.4px}.card p{margin:0;color:var(--muted);font-size:14px}.card .text-link{display:inline-block;margin-top:18px;color:var(--green);font-weight:800;font-size:13px}
.product-feature{display:grid;grid-template-columns:1fr 1fr;gap:38px;align-items:center;background:#163f32;color:#fff;border-radius:28px;padding:44px}.product-visual{background:linear-gradient(145deg,#d8f0e2,#9bcbb2);border-radius:23px;min-height:280px;display:grid;place-items:center;color:var(--green)}.product-visual .robot{font-size:100px;filter:drop-shadow(0 12px 12px #163f3220)}.product-feature h2{font-size:36px;letter-spacing:-1px;line-height:1.15;margin:14px 0}.product-feature p{color:#d2e5da}.product-feature .eyebrow{color:#a9e1c1}.feature-list{list-style:none;padding:0;margin:19px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px}.feature-list li:before{content:"✓";color:#95d5b1;font-weight:900;margin-right:8px}
.training-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.training-card{border-radius:18px;background:#f4f8f5;padding:23px;border:1px solid #e8efe9}.training-card .iconbox{margin-bottom:13px}.training-card h3{margin:0 0 7px;font-size:18px}.training-card p{margin:0;color:var(--muted);font-size:14px}
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.why-item{text-align:center;padding:24px}.why-item .iconbox{margin:0 auto 15px}.why-item p{color:var(--muted);font-size:14px}
.cta-band{background:linear-gradient(110deg,#176b55,#104a3b);color:#fff;border-radius:24px;padding:42px;display:flex;align-items:center;justify-content:space-between;gap:25px}.cta-band h2{margin:0 0 10px;font-size:32px;line-height:1.2}.cta-band p{margin:0;color:#d6e9df}.cta-band .btn{background:#fff;color:var(--green);border-color:#fff;white-space:nowrap}
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:start}.contact-panel{border:1px solid var(--line);border-radius:22px;padding:28px}.contact-panel h3{margin-top:0}.contact-row{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid var(--line)}.contact-row:last-child{border:0}.contact-icon{width:42px;height:42px;border-radius:13px;background:#eaf5ee;display:grid;place-items:center;font-size:20px}.contact-row small{display:block;color:var(--muted)}.contact-row strong{font-size:15px;word-break:break-word}.footer{background:#202a27;color:#e6eee9;padding:42px 0 24px}.footer-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:28px}.footer .brand-name{color:white}.footer p{color:#aebdb5;font-size:14px}.footer h4{margin:0 0 12px}.footer-links{display:grid;gap:9px;color:#c8d4cc;font-size:14px}.copyright{border-top:1px solid #3b4943;margin-top:30px;padding-top:20px;color:#aebdb5;font-size:13px}
.booking-main{max-width:660px;margin:42px auto;padding:30px;background:#fff;border-radius:20px;box-shadow:0 8px 35px #122d1d12}.booking-main h1{font-size:32px;letter-spacing:-1px}.booking-main label{display:block;margin-top:17px;font-weight:650}.booking-main input,.booking-main select,.booking-main textarea{width:100%;padding:12px;margin-top:6px;border:1px solid #b5cbbd;border-radius:10px;color:#18352b;background:#fff}.booking-main button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:10px;background:var(--green);color:#fff;font-weight:700;cursor:pointer}.booking-main small{display:block;margin-top:12px;color:#526c5f}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr;gap:35px}.hero{padding:65px 0}.hero-art{min-height:330px}.hub-card{width:320px}.cards,.training-grid{grid-template-columns:repeat(2,1fr)}.product-feature{padding:30px}.nav-links{gap:14px}.nav-links a:not(.nav-cta){display:none}.why-grid{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.container{width:min(100% - 28px,1160px)}.nav-wrap{min-height:68px}.brand-mark{width:43px;height:43px}.brand-name{font-size:17px}.nav-cta{padding:10px 13px;font-size:12px}.hero{padding:55px 0 48px}h1{font-size:42px;letter-spacing:-1.7px}.hero p{font-size:16px}.hero-art{min-height:280px}.hub-card{width:min(280px,100%);border-radius:27px}.hub-card:before{width:220px;height:220px}.hub-card:after{width:165px;height:165px}.float-label.top{right:0;top:15px}.float-label.bottom{left:0;bottom:18px}.section{padding:60px 0}.section-head{margin-bottom:28px}.section-head p{font-size:15px}.cards,.training-grid{grid-template-columns:1fr}.card{padding:22px}.product-feature{grid-template-columns:1fr;padding:22px;gap:22px}.product-visual{min-height:210px}.product-feature h2{font-size:29px}.feature-list{grid-template-columns:1fr}.why-grid{grid-template-columns:1fr}.why-item{padding:16px}.cta-band{padding:27px;display:block}.cta-band h2{font-size:28px}.cta-band .btn{margin-top:20px}.contact-grid{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr;gap:22px}.booking-main{margin:14px;padding:22px}.booking-main h1{font-size:28px}}
</style></head><body>${body}</body></html>`;
}
function homepage() {
  const nav = `<header class="site-header"><div class="container nav-wrap">${logo()}
    <nav class="nav-links" aria-label="Main navigation"><a href="#services">Services</a><a href="#products">AI Products</a><a href="#training">Training</a><a href="#contact">Contact</a><a class="nav-cta" href="/book">Let's Talk <span>↗</span></a></nav>
  </div></header>`;
  const hero = `<section class="hero"><div class="container hero-grid"><div><span class="eyebrow">Your growth partner for the digital age</span>
    <h1>Grow Your Business.<br>Build Your Future <em>with AI.</em></h1>
    <p>Practical AI, business solutions, career coaching and digital skills to help entrepreneurs, professionals and teams move forward with confidence.</p>
    <div class="hero-actions"><a class="btn" href="#services">Explore Our Services <span>↗</span></a><a class="btn secondary" href="#contact">Contact SoeK Hub</a></div>
    <div class="hero-note">Practical solutions. Smarter growth. Better opportunities.</div></div>
    <div class="hero-art"><div class="hub-card"><svg class="big-leaf" viewBox="0 0 120 120" aria-label="SoeK Hub Zone leaf mark"><path d="M22 84C22 41 51 17 99 20 94 65 69 100 35 100 23 100 18 92 22 84Z" fill="#a8dfbe"/><path d="M29 93 83 35" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M48 73 45 51M62 59l20 2" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="m91 6 5 11 12 2-9 8 2 12-11-6-11 6 2-12-9-8 12-2Z" fill="#d5a64a"/></svg></div><div class="float-label top"><span>🤖</span> AI-powered ideas</div><div class="float-label bottom"><span>📈</span> Growth & opportunity</div></div></div></section>`;
  const services = `<section class="section" id="services"><div class="container"><div class="section-head"><span class="eyebrow">What we do</span><h2>Solutions for your next step</h2><p>Personalized support, practical tools and learning experiences for business owners and career builders.</p></div><div class="cards">
    <article class="card"><div class="iconbox">💼</div><h3>SME Consultation</h3><p>Business planning, customer insights, marketing strategy, problem-solving and growth guidance for small businesses.</p><a class="text-link" href="mailto:soekhubzone@gmail.com?subject=SME%20Consultation">Explore consultation ↗</a></article>
    <article class="card"><div class="iconbox">🤖</div><h3>AI SME Coach</h3><p>Your AI companion for business ideas, content, planning, productivity and everyday business questions.</p><a class="text-link" href="https://t.me/SoeKHubSMECoachBot" target="_blank" rel="noopener noreferrer">Try AI SME Coach ↗</a></article>
    <article class="card"><div class="iconbox">🎯</div><h3>Career Coach</h3><p>Career direction, CV and cover letters, job applications, interview practice and professional development.</p><a class="text-link" href="mailto:soekhubzone@gmail.com?subject=Career%20Coaching">Plan your career ↗</a></article>
    <article class="card"><div class="iconbox">🚀</div><h3>Business Coach</h3><p>Build your idea, strengthen your business model, make a plan and take your next growth step.</p><a class="text-link" href="mailto:soekhubzone@gmail.com?subject=Business%20Coaching">Grow your business ↗</a></article>
    </div></div></section>`;
  const products = `<section class="section soft" id="products"><div class="container"><div class="section-head"><span class="eyebrow">AI products & digital tools</span><h2>AI that makes work more practical</h2><p>Accessible digital helpers designed to turn questions into action and save time.</p></div><div class="product-feature"><div class="product-visual"><div class="robot">✳</div></div><div><span class="eyebrow">Featured tool</span><h2>AI SME Coach</h2><p>A helpful AI business assistant for entrepreneurs and small business owners—brainstorm, plan, create and problem-solve with a little more confidence.</p><ul class="feature-list"><li>Business ideas & planning</li><li>Marketing content prompts</li><li>Customer service ideas</li><li>Everyday business guidance</li></ul><a class="btn light" href="https://t.me/SoeKHubSMECoachBot" target="_blank" rel="noopener noreferrer">Chat with AI SME Coach ↗</a></div></div></div></section>`;
  const training = `<section class="section" id="training"><div class="container"><div class="section-head"><span class="eyebrow">Learning & development</span><h2>Learn skills. Create opportunities. Grow.</h2><p>Hands-on training designed around real-world needs, with practical activities and tools participants can use.</p></div><div class="training-grid">
    <article class="training-card"><div class="iconbox">🤖</div><h3>AI Training</h3><p>AI basics, ChatGPT, prompting, productivity and responsible AI use.</p></article>
    <article class="training-card"><div class="iconbox">📊</div><h3>Business Training</h3><p>Entrepreneurship, business planning, digital marketing and SME development.</p></article>
    <article class="training-card"><div class="iconbox">🧭</div><h3>Career Training</h3><p>Job readiness, CV writing, interview preparation and career planning.</p></article>
    <article class="training-card"><div class="iconbox">💻</div><h3>Digital Skills</h3><p>Digital tools, online work, productivity and digital business skills.</p></article>
    </div><div style="text-align:center;margin-top:30px"><a class="btn secondary" href="mailto:soekhubzone@gmail.com?subject=Training%20Inquiry">Ask about training programs</a></div></div></section>`;
  const why = `<section class="section soft"><div class="container"><div class="section-head"><span class="eyebrow">Why SoeK Hub Zone</span><h2>Learning and solutions with purpose</h2></div><div class="why-grid">
    <div class="why-item"><div class="iconbox">🛠️</div><h3>Practical & Actionable</h3><p>Simple steps, usable tools and real-world application—not just theory.</p></div>
    <div class="why-item"><div class="iconbox">🌱</div><h3>Growth-minded</h3><p>Build confidence, strengthen skills and move toward sustainable progress.</p></div>
    <div class="why-item"><div class="iconbox">🤝</div><h3>People-centered</h3><p>Support tailored to your goals, context and learning journey.</p></div>
    </div></div></section>`;
  const contact = `<section class="section" id="contact"><div class="container"><div class="cta-band"><div><h2>Ready to grow with us?</h2><p>Let's turn your ideas into practical solutions.</p></div><a class="btn" href="mailto:soekhubzone@gmail.com?subject=Hello%20SoeK%20Hub%20Zone">Start a conversation ↗</a></div><div class="section-head" style="margin:48px auto 24px"><span class="eyebrow">Get in touch</span><h2>We'd love to hear from you</h2></div><div class="contact-grid"><div><p style="color:var(--muted);font-size:17px">Have a question about coaching, AI tools, training or business support? Reach out and let's explore what you need.</p><a class="btn" href="https://wa.me/959776705355" target="_blank" rel="noopener noreferrer">Message us on WhatsApp ↗</a></div><div class="contact-panel"><div class="contact-row"><div class="contact-icon">✉️</div><div><small>Email</small><strong><a href="mailto:soekhubzone@gmail.com">soekhubzone@gmail.com</a></strong></div></div><div class="contact-row"><div class="contact-icon">☎️</div><div><small>Phone / WhatsApp</small><strong><a href="https://wa.me/959776705355">+95 9 776 705 355</a></strong></div></div><div class="contact-row"><div class="contact-icon">🌐</div><div><small>Website</small><strong>soekhubzone.onrender.com</strong></div></div></div></div></div></section>`;
  const footer = `<footer class="footer"><div class="container"><div class="footer-grid"><div>${logo()}<p>Empowering businesses, building careers and unlocking AI potential through practical solutions and learning.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="#services">Services</a><a href="#products">AI Products</a><a href="#training">Training</a><a href="#contact">Contact</a></div></div><div><h4>Connect</h4><div class="footer-links"><a href="mailto:soekhubzone@gmail.com">soekhubzone@gmail.com</a><a href="https://wa.me/959776705355">WhatsApp: +95 9 776 705 355</a><a href="https://t.me/SoeKHubSMECoachBot">AI SME Coach on Telegram</a></div></div></div><div class="copyright">© ${new Date().getFullYear()} SoeK Hub Zone. Practical solutions. Smarter growth. Better opportunities.</div></div></footer>`;
  return shell(nav + hero + services + products + training + why + contact + footer);
}
function bookingPage(req) {
  const lang = preferredLanguage(req), t = labels[lang];
  const body = `<div class="booking-main"><header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">${logo()}<nav><a href="/book?lang=my">မြန်မာ</a> | <a href="/book?lang=en">English</a></nav></header><p style="color:#176b55;font-weight:700;margin-top:24px">SoeK Hub Zone • Coaching & Consultation</p><h1>${t.title}</h1><p style="color:#526c5f">${lang==="my"?"အောက်ပါအချက်အလက်များ ဖြည့်သွင်းပြီး ချိန်းဆိုမှုတောင်းဆိုနိုင်ပါသည်။":"Complete the form below and we will contact you to confirm your appointment."}</p><form method="post" action="/booking" accept-charset="UTF-8"><input type="hidden" name="lang" value="${lang}"><label for="name">${t.name} *</label><input id="name" name="name" autocomplete="name" required maxlength="100"><label for="email">${t.email} *</label><input id="email" type="email" name="email" autocomplete="email" required maxlength="200"><label for="phone">${t.phone} *</label><input id="phone" type="tel" name="phone" autocomplete="tel" required maxlength="40"><label for="service">${t.service} *</label><select id="service" name="service" required><option value="">${t.choose}</option><option value="Small Business Coaching">${t.business}</option><option value="Personal Development Counseling">${t.counseling}</option></select><label for="date">${t.date} *</label><input id="date" type="date" name="date" required min="${new Date().toISOString().slice(0,10)}"><label for="message">${t.notes}</label><textarea id="message" name="message" rows="4" maxlength="1000"></textarea><small>${t.privacy}</small><button type="submit">${t.submit}</button></form><p style="margin-top:20px"><a href="/">← ${t.home}</a></p></div>`;
  return shell(body, "SoeK Hub Zone | Book a Consultation");
}
app.get("/", (req, res) => res.type("html").send(homepage()));
app.get("/book", (req, res) => res.type("html").send(bookingPage(req)));

function page(lang, body) {
  return shell(`<main class="booking-main">${body}</main>`, "SoeK Hub Zone | Booking");
}
function respondHtml(res, status, html) {
  res.set("Cache-Control", "no-store");
  res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  return res.status(status).type("html").send(html);
}
installBookingRoutes(app, { page, labels, preferredLanguage, respondHtml, escapeHtml, allowedServices });

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.listen(PORT, "0.0.0.0", () => console.log(`Server is running on port ${PORT}`));
