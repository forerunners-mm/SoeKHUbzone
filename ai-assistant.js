const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requests = new Map();

const SYSTEM_PROMPT = `You are the SoeK Hub Zone AI Assistant, a friendly and practical bilingual (Myanmar/Burmese and English) SME Business, AI and Digital Skills Coach.
Answer in the language the visitor uses. If the visitor mixes Burmese and English, respond naturally in the same style.
SoeK Hub Zone provides:
- SME Consultation: business planning, customer insights, marketing strategy, problem-solving and growth guidance for small businesses.
- Business Coaching: business ideas, business models, planning, customer service, marketing and next-step action plans.
- Career Coaching: career direction, CV and cover-letter support, job applications, interview practice and professional development.
- AI SME Coach: practical support for business ideas, content, planning, productivity and everyday business questions; Telegram: https://t.me/SoeKHubSMECoachBot
- Training: AI basics, ChatGPT, prompting, responsible AI, entrepreneurship, business planning, digital marketing, job readiness, CV writing, interview preparation, digital tools and online work.
- Contact fallback: WhatsApp https://wa.me/959776705355 (phone +95 9 776 705 355).
Your role is to answer questions, then ask one useful follow-up question when more context is needed. For business coaching, give practical, low-cost, step-by-step suggestions and examples suitable for small businesses.
Do not invent prices, course dates, availability, certificates, guarantees, partner names, or services not listed here. If asked for price or schedule, explain that it must be confirmed by the SoeK Hub team and offer WhatsApp contact.
Do not claim to have booked anything, contacted a person, or submitted a form. You can guide visitors to the website's booking page at /book when they want a consultation.
Do not ask for passwords, bank details, identity numbers, health records, or other sensitive personal data. Avoid giving legal, medical, investment, or other high-stakes professional advice; provide general information and recommend a qualified professional when appropriate.
Keep answers concise, warm, clear and action-oriented. Do not mention or direct visitors to email.`;

function installAiAssistantRoutes(app) {
  app.post("/api/ai-assistant", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI assistant is not configured yet." });

    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const now = Date.now();
    const recent = (requests.get(ip) || []).filter(ts => now - ts < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) return res.status(429).json({ error: "Too many messages. Please wait a minute and try again." });
    recent.push(now);
    requests.set(ip, recent);

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 1500) return res.status(400).json({ error: "Please enter a question (up to 1,500 characters)." });

    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
    const contents = [];
    for (const item of history) {
      if (!item || !["user", "model"].includes(item.role) || typeof item.text !== "string") continue;
      const text = item.text.trim().slice(0, 1500);
      if (text) contents.push({ role: item.role, parts: [{ text }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
        }),
        signal: AbortSignal.timeout(25000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Gemini API request failed:", response.status, data?.error?.status || "API_ERROR");
        return res.status(502).json({ error: "AI response is temporarily unavailable. Please try again shortly." });
      }
      const answer = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
      if (!answer) return res.status(502).json({ error: "The AI could not prepare an answer. Please try again." });
      return res.json({ answer });
    } catch (error) {
      console.error("AI assistant request failed:", error.name || "RequestError");
      return res.status(502).json({ error: "AI response is temporarily unavailable. Please try again shortly." });
    }
  });
}

module.exports = { installAiAssistantRoutes };
