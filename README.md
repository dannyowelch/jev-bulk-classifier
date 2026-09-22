# Jev Bulk Classifier

Bulk text classification demo powered by TypeSafe Jev (System One). Inspired by [MotherDuck's `prompt_jev()` SQL function](https://motherduck.com/blog/motherduck-supports-jev/).

## What It Does

Classify multiple text rows with typed Choice questions. Shows label, confidence percentage, and wall time per row and across the batch.

Example use case: label support transcripts as billing, technical, sales, or account issues.

## How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### TypeSafe API Key

You need a TypeSafe API key:

1. Get your key from [TypeSafe](https://typesafe.ai)
2. Enter it in the UI field, or set server fallback:

```bash
TYPESAFE_API_KEY=ts_your_key npm run dev
```

The UI key is stored in localStorage and overrides the server key.

## Deploy to Vercel

```bash
npm run build
```

Deploy to Vercel and set the `TYPESAFE_API_KEY` environment variable (optional; users can supply their own key in the UI).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dannyowelch/jev-bulk-classifier)

## How It Works

1. Edit the text rows in the table (or use the sample support transcripts).
2. Configure the Choice question: instructions + label definitions (key/description pairs).
3. Click "Classify All". The app runs one TypeSafe Jev query per row with 6 concurrent requests.
4. Results appear inline: label, confidence %, per-row elapsed ms, total wall time, and rows/sec.

## API Format

POST to `https://api.typesafe.ai/v1/systemone`:

```json
{
  "state": "<row text>",
  "model": "jev-latest",
  "questions": {
    "label": {
      "type": "choice",
      "instructions": "Identify the customer's main complaint",
      "criteria": {
        "billing": "Payments, invoices, and refunds",
        "technical": "Errors, outages, and integrations",
        "sales": "Pricing and upgrades",
        "account": "Cancellations and account administration"
      }
    }
  }
}
```

Response:

```json
{
  "answers": {
    "label": {
      "choice": "billing",
      "confidence": 0.87
    }
  }
}
```

The app parses `answers.label.choice` and `answers.label.confidence` for each row.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- TypeSafe Jev API

## License

MIT

## Credits

- Inspired by [MotherDuck's prompt_jev() launch](https://motherduck.com/blog/motherduck-supports-jev/)
- Powered by [TypeSafe Jev](https://typesafe.ai)
