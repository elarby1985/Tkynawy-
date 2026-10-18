# Fix for build error on 18 Oct 2026

The previous build attempted to upload the repository root as static assets, including node_modules/workerd/bin/workerd (129 MiB). This project uses `public/` as the ONLY static assets directory, defined in wrangler.toml.

Cloudflare Git integration settings:
- Root directory: repository root (folder containing wrangler.toml)
- Build command: `npm install` (or leave empty if Cloudflare allows)
- Deploy command: `npx wrangler deploy`
- Do NOT use the old copy-everything build command.
- Do NOT retain wrangler.jsonc with `assets.directory = "."`.
- The Worker name is `tkynawy` to match the existing Cloudflare build.

REQUIRED BEFORE DEPLOYING SECURE VERSION:
1. Create a Cloudflare D1 database named tyknawy-cfm.
2. Replace REPLACE_WITH_YOUR_D1_DATABASE_ID in wrangler.toml with its actual ID.
3. Run `npx wrangler d1 migrations apply tyknawy-cfm --remote`.
4. Set `ADMIN_API_KEY` via `npx wrangler secret put ADMIN_API_KEY`.
5. Deploy to a preview first and test /fm-knowledge-hub/ and /api/login.

Do not publish or sell premium access until all setup and testing is complete.
