# ONEsource IT — PoC

Rebuild of onesourceit.shop for review by the client: product configurator,
retail and wholesale prices, reseller sign-up with admin approval, cart with
cash-on-delivery checkout, admin area with bulk photo and CSV import.

Stack: Next.js 16 (App Router, TypeScript, Tailwind 4, shadcn/ui components),
Convex (database, auth, file storage), deployed on Vercel.

## Run locally

```bash
npm install
npx convex dev            # first run: log in, create the project, writes .env.local
npx @convex-dev/auth      # one-time: sets JWT_PRIVATE_KEY, JWKS and SITE_URL on Convex
npx convex run seed:run   # demo catalog (3 brands, 13 models, 5 colors)
npm run dev               # http://localhost:3000
```

Create the first admin: sign up on `/inscription`, then

```bash
npx convex run seed:makeAdmin '{"email":"you@example.com"}'
```

## Deploy (VPS)

Production runs on a VPS (OVHcloud Tunisie VPS-1 is enough) with Docker:
the Next.js app behind Caddy, which handles HTTPS. Convex stays the backend.
Every push to `main` runs `.github/workflows/deploy.yml`: tests, then
`convex deploy`, then a Docker image pushed to `ghcr.io`, then a restart on
the VPS.

**One-time setup**

1. Order the VPS (Ubuntu 24.04) and the domain `onesourceit.tn`.
2. At the registrar, point DNS to the VPS IP: an `A` record for
   `onesourceit.tn` and one for `www.onesourceit.tn`.
3. On the VPS, as root: `bash deploy/setup.sh` (Docker, firewall,
   automatic security updates, a `deploy` user, `/opt/onesourceit`).
4. Create an SSH key pair for deploys. Put the public key in
   `/home/deploy/.ssh/authorized_keys` on the VPS.
5. In GitHub → Settings → Environments → `production`, add:
   - Secrets: `CONVEX_DEPLOY_KEY` (Convex → Settings → Deploy keys,
     production), `VPS_HOST` (the IP), `VPS_USER` (`deploy`),
     `VPS_SSH_KEY` (the private key).
   - Variables: `NEXT_PUBLIC_CONVEX_URL`
     (`https://little-dragon-976.convex.cloud`),
     `NEXT_PUBLIC_WHATSAPP_NUMBER` (e.g. `21621050742`),
     `DOMAIN` (`onesourceit.tn`).
6. On the production Convex deployment, set `SITE_URL` to
   `https://onesourceit.tn` (`npx convex env set SITE_URL https://onesourceit.tn --prod`).
7. Run the Deploy workflow (Actions → Deploy → Run workflow). Caddy gets the
   certificate on the first request.

The PoC preview on Vercel (`onesourceit.vercel.app`) can be removed once the
VPS is live.

## Where the rules live

| Rule | Where |
| --- | --- |
| Wholesale price never sent to non-approved visitors | `convex/lib.ts` → `wholesalePriceFor`, the only reader of `reseller_prices` |
| Order prices recalculated on the server | `convex/orders.ts` → `placeOrder` |
| Approved resellers: min 10 per model, steps of 5 | `convex/rules.ts`, checked in `placeOrder` and in the UI |
| New accounts are always `pending` resellers | `convex/auth.ts` → `createOrUpdateUser` |
| Admin-only functions | `convex/lib.ts` → `requireAdmin`, plus `app/admin/layout.tsx` |

Prices are stored in millimes (`20000` = `20,000 DT`). A price of `null`
shows as `[XX] DT` until the client provides it.

## Tests

```bash
npm test   # convex-test: price gating, order pricing, stock, admin access, CSV import
```

## Client placeholders

Marked `[…]` in the UI: company presentation, map link, delivery delay,
legal texts, wholesale price, delivery fee, product photos, validation delay.
The retail price (20,000 DT) and stock (100 per variant) in the seed are
demo values to confirm.
