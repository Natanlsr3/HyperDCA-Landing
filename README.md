# Base-Kets Landing

Standalone pre-release landing page for email capture.

This is intentionally separate from the HyperDCA product app.

## Local preview

```bash
cd /Users/natanlasar/Desktop/Base-Kets-Landing
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`.

## Deploy

```bash
cd /Users/natanlasar/Desktop/Base-Kets-Landing
vercel --prod
```

## Lead capture

The current static version stores the submitted email in browser localStorage and opens a prefilled email to `natan.lasar3@gmail.com`.

For production-grade lead capture, replace the mailto fallback in `script.js` with a Tally, Typeform, Make, Zapier, Airtable, or custom webhook endpoint.
