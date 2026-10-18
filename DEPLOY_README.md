# Tyknawy secure CFM platform — deployment

This is **deployable source code**, not a live deployment. It preserves the uploaded Tyknawy site and adds an authenticated, server-side 100-question premium exam.

## Security model
- The **first 10 free questions** and their answers remain publicly visible for the free quiz.
- All **100 premium questions** are seeded into **Cloudflare D1**. The public site has no full question bank JSON.
- Each premium exam serves **one question at a time**; answers are checked on the server.
- Accounts use PBKDF2 password hashes, HttpOnly Secure SameSite cookies, server-side expiry, and an admin API key stored as a Cloudflare secret.
- Users receive **30-day access** by default after you manually confirm their WhatsApp payment.
- Accounts can be revoked. Login failures are temporarily blocked after five attempts per email. This does not replace edge/WAF rate limiting.

## Before deployment
You need a Cloudflare account with Workers and D1 enabled, and permission to deploy to your site. **Back up your existing project**. This package is designed to deploy as a Worker with static assets; it is **not** a ZIP you can simply upload to a plain static Netlify site and expect authentication to work.

1. Install Node.js 20+ and run `npm install` in this directory.
2. Run `npx wrangler login`.
3. Run `npx wrangler d1 create tyknawy-cfm` and copy the returned database ID into `wrangler.toml`.
4. Run `npx wrangler d1 migrations apply tyknawy-cfm --remote` (this creates the tables and imports the 100 questions).
5. Run `npx wrangler secret put ADMIN_API_KEY` and supply a **long random secret**. Do not put it in source code, HTML, screenshots, or the ZIP.
6. Run `npm run deploy`. Test on the generated `*.workers.dev` preview before changing `tyknawy.com` routing.
7. In Cloudflare, route the Worker to the appropriate domain **only after verifying that the existing Tyknawy pages still work**. You may prefer a separate subdomain such as `learn.tyknawy.com` to avoid replacing your current site; if so, update website navigation links accordingly.
8. Test the free quiz, login, premium questions, expiry, logout, and invalid password before taking any payments.

## Activate a paid customer (manual WhatsApp payment)
After confirming payment, issue the admin request from your **own trusted computer**. Replace placeholders; do not post passwords or admin keys in public.

```bash
curl -X POST 'https://YOUR-WORKER.workers.dev/api/admin/grant' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ADMIN_API_KEY' \
  -d '{"email":"buyer@example.com","name":"Buyer Name","password":"STRONG_RANDOM_PASSWORD_HERE","days":30}'
```

Send the customer the site URL, email, and temporary password privately. Note that this MVP does not include a self-service password change or reset; an admin must reissue credentials. For production, add email verification and a reset flow.

To revoke access:

```bash
curl -X POST 'https://YOUR-WORKER.workers.dev/api/admin/revoke' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ADMIN_API_KEY' \
  -d '{"email":"buyer@example.com"}'
```

## Before selling
- Add your privacy notice, terms of use, refund policy, and business contact information.
- Review all 100 questions and explanations for accuracy; they are **independent practice questions**, not official IFMA exam material.
- Configure Cloudflare WAF/rate limits for `/api/login`, `/api/admin/*`, and `/api/exam/*`.
- Verify local regulatory requirements, payment collection, and tax obligations.
- This system cannot prevent screenshots, manual copying, or all account sharing. Consider account/device/session limits and abuse monitoring.
- No online checkout, card processing, customer email delivery, or automated activation is included.
