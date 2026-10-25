# CardVault

A private, local-first wallet for credit, debit and prepaid cards, built with
React, TypeScript and Vite.

## What it does

- Adds Visa, Mastercard, Amex, Discover, JCB and UnionPay cards, detecting the
  network from the card number.
- Keeps only the **last four digits** plus the details you choose: card name,
  bank, holder, expiry, type, currency, credit limit, balance, statement due
  day, notes and a card colour.
- Records a balance for **every** card: what you owe on credit cards, the funds
  on debit and prepaid cards. The figure is printed on the card artwork and in
  the wallet list, with the credit still available on credit cards. The balance
  can be changed inline on a card, without opening the full edit form.
- Shows credit utilisation, cards expiring within 60 days and the next payment
  due date.
- Searches and filters by network or card type, and sorts by recency, name,
  expiry or utilisation.
- Saves everything to `localStorage` in your browser. There is no account, no
  server and no analytics.

Full card numbers, CVVs and PINs are never persisted. The form uses the number
once, in memory, to validate it with the Luhn checksum and derive the last four
digits and network.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # typecheck + production build into dist/
npm test         # unit tests for card utilities and stored-data validation
```

## Hosting

CardVault is published as a static site on Freebuff Sites:

- Production: https://site-f4ca7fdf3eab4111bde4ff90f016dfc5.freebuff.page
- Preview: https://site-0b4b8d8aca9c4b1ea3b1a47d8b796f3d.freebuff.page

`npm run build` writes `dist/`, and `deploy.manifest.json` uploads it with
`worker.js` as a pass-through entrypoint that serves the SPA through the
`ASSETS` binding (unknown paths fall back to `index.html`). Cards live in the
browser's `localStorage`, so each browser and device has its own wallet.

## Notes

Clearing this site's browser data removes the wallet. CardVault is a personal
organiser and is not affiliated with any bank or card network.
