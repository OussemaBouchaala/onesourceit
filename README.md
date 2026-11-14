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

## Deploy (Vercel)

1. Import the GitHub repo in Vercel.
2. In Convex, Settings → Deploy keys → create a production deploy key.
   Add it in Vercel as `CONVEX_DEPLOY_KEY`.
3. Override the Vercel build command:
   `npx convex deploy --cmd 'npm run build'`
4. Add `NEXT_PUBLIC_WHATSAPP_NUMBER` (e.g. `21621050742`).
5. On the production Convex deployment, run `npx @convex-dev/auth --prod`
   and set `SITE_URL` to the Vercel domain.

## Product photos (Cloudinary)

Photos are uploaded from Admin → Import straight to Cloudinary at full
resolution. The site shows resized copies (`f_auto,q_auto`, 1200 px for the
main photo, 200 px for thumbnails, 600 px for product covers).

1. Create a free Cloudinary account and copy the cloud name, API key and
   API secret (Settings → API Keys).
2. Set them on each Convex deployment (never in the Next.js env):
   ```bash
   npx convex env set CLOUDINARY_CLOUD_NAME <cloud name>
   npx convex env set CLOUDINARY_API_KEY <api key>
   npx convex env set CLOUDINARY_API_SECRET <api secret>
   # add --prod for production
   ```

The browser gets a one-time signature from `admin.signPhotoUpload` (admins
only) that pins the file to its product/model/color/position slot. Without
these variables, uploads fall back to Convex file storage, compressed to
1200 px WebP.

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
