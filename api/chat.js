module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

  const { message, history } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });

  const systemPrompt = `You are the HyperDCA AI assistant embedded on the HyperDCA landing page.
HyperDCA is a multi-asset portfolio agent on HyperLiquid that lets users deploy capital across stocks, crypto, and commodities via curated baskets.

You know these 3 curated baskets:

1. Majors Momentum (Crypto Majors) — by 0xCipher.hl — TRENDING
   - BTC 35%, ETH 28%, SOL 22%, HYPE 15%
   - Performance: +42.8% (30D) · Followers: 3.1K · Hit rate: 71%
   - Theme: High-conviction crypto majors — the largest, most liquid perps on HyperLiquid
   - Risk: Crypto volatility, correlation during drawdowns, regulatory risk

2. AI Infra (AI & Tech) — by Data-center beta — TRENDING
   - NVDA 40%, AMD 25%, TSLA 20%, HYPE 15%
   - Performance: +28.6% (30D) · Followers: 1.8K · Hit rate: 64%
   - Theme: AI infrastructure build-out — chipmakers, data centers, and tech leaders
   - Risk: Tech concentration, sector rotation risk, valuation risk

3. Copper Macro (Commodities & Macro) — by Macro metals desk
   - COPPER 35%, GOLD 25%, OIL 20%, BTC 12%, HYPE 8%
   - Performance: +17.2% (30D) · Followers: 1.2K · Hit rate: 61%
   - Theme: Macro metals and energy — industrial commodities plus crypto hedge
   - Risk: Commodity cycle, geopolitical events, demand slowdown

General info:
- All baskets use USDC as collateral
- Leverage: 1x to 5x configurable per schedule
- DCA frequency: minimum hourly, typically daily
- Agent suggests trades, user always approves (non-custodial)
- Built on HyperLiquid L1 with HyperCore (main dex) and HIP-3 (xyz dex)

Be helpful, concise (2-4 sentences max), and conversational. If asked about something outside HyperDCA, politely redirect. Use plain english, no markdown.`;

  const contents = [];

  // Add conversation history if provided
  if (Array.isArray(history)) {
    for (const h of history.slice(-6)) {
      contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] });
    }
  }

  contents.push({ role: "user", parts: [{ text: message }] });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[CHAT] Gemini error:", response.status, err);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    return res.json({ reply });
  } catch (e) {
    console.error("[CHAT] Error:", e.message);
    return res.status(500).json({ error: "Internal error" });
  }
};
