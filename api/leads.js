const fs = require("fs");
const path = require("path");

const LEADS_FILE = path.join("/tmp", "hyperdca-leads.json");

function getLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const leads = getLeads();
    if (leads.some((l) => l.email === email)) {
      return res.json({ ok: true, message: "already registered" });
    }

    leads.push({
      email,
      country: null,
      markets: [],
      createdAt: new Date().toISOString(),
    });
    saveLeads(leads);
    console.log("[LEAD] %s — total: %d", email, leads.length);

    // Send welcome email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + resendKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HyperDCA <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to HyperDCA — Launching tomorrow!",
          html: [
            '<div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">',
            '<div style="width:38px;height:38px;border-radius:10px;background:#1E40AF;color:#fff;text-align:center;line-height:38px;font-weight:900;font-size:16px;margin-bottom:24px">H</div>',
            '<h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 12px;letter-spacing:-0.03em">You\'re in!</h1>',
            '<p style="font-size:15px;color:#4B5563;line-height:1.6;margin:0 0 20px">',
            'Thanks for joining the HyperDCA beta. We\'re launching <strong>tomorrow</strong> — you\'ll be among the first to deploy capital across crypto, stocks, and commodities with an AI agent that suggests while you stay in control.',
            '</p>',
            '<p style="font-size:15px;color:#4B5563;line-height:1.6;margin:0 0 20px">',
            'What to expect:<br/>',
            '&bull; Multi-asset baskets curated by top traders<br/>',
            '&bull; AI-powered insights tied to your portfolio<br/>',
            '&bull; Full transparency — you approve every trade',
            '</p>',
            '<p style="font-size:15px;color:#4B5563;line-height:1.6;margin:0 0 24px">',
            'We\'ll send you access credentials as soon as the platform opens. Stay tuned.',
            '</p>',
            '<p style="font-size:13px;color:#9CA3AF;margin:0">— The HyperDCA team</p>',
            '<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0 16px"/>',
            '<p style="font-size:11px;color:#9CA3AF;margin:0">Built on Hyperliquid. Non-custodial. Your funds stay in your wallet.</p>',
            '</div>',
          ].join(""),
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) { console.log("[EMAIL] Sent to %s:", email, data.id || data.error || data); })
        .catch(function (err) { console.error("[EMAIL] Failed for %s:", email, err.message); });
    }

    return res.json({ ok: true, count: leads.length });
  }

  if (req.method === "PATCH") {
    const { email, country, markets } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const leads = getLeads();
    const lead = leads.find((l) => l.email === email);
    if (!lead) return res.status(404).json({ error: "lead not found" });

    if (country) lead.country = country;
    if (markets && Array.isArray(markets)) lead.markets = markets;
    lead.updatedAt = new Date().toISOString();

    saveLeads(leads);
    console.log("[LEAD-UPDATE] %s — country: %s, markets: %s", email, lead.country, (lead.markets || []).join(", "));

    return res.json({ ok: true });
  }

  if (req.method === "GET") {
    const secret = req.query.s;
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const leads = getLeads();
    return res.json({ leads, count: leads.length });
  }

  return res.status(405).json({ error: "method not allowed" });
};
