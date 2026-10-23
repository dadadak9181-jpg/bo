# INSTORY Cloudflare D1 + R2

Vercel serves the existing static website. A separate Cloudflare Worker serves the content API.

## Setup

1. In Cloudflare, connect a Cloudflare account and create a Worker deployment using this `cloudflare` directory. Wrangler can automatically provision D1/R2 bindings when you deploy with the binding names in `wrangler.jsonc`. Check the assigned resources before applying migrations. See https://developers.cloudflare.com/workers/wrangler/configuration/
2. From this directory run `npx wrangler d1 migrations apply instory-content --remote` after the database is provisioned. First test locally with `npx wrangler dev` and `npx wrangler d1 migrations apply instory-content --local`.
3. Configure Cloudflare Access application for administrator authentication. Set `ACCESS_TEAM_DOMAIN` (for example `company.cloudflareaccess.com`) and `ACCESS_AUD` to the application audience tag, and create an allow policy for approved administrator identities. **Do not configure a public Access bypass for administration.**
4. Set `ALLOWED_ORIGIN` to the site's exact origin. Protect `/admin` in the site separately; the API still verifies Access tokens for every write.
5. After deployment set your static site's `window.INSTORY_API_BASE` to the deployed Worker origin (for example by updating `index.html`). Never commit Cloudflare API tokens or authentication secrets.
6. On Vercel, register the Worker origin as the content API, then verify actual network persistence across two browsers.

## Endpoints

- `GET /api/posts?category=insurance-news&month=2026.10` public list (published only)
- `GET /api/posts/:id` public published detail
- `POST /api/posts` Access-authenticated create
- `PUT /api/posts/:id` Access-authenticated update
- `DELETE /api/posts/:id` Access-authenticated delete
- `POST /api/files` Access-authenticated file upload (multipart `file`; up to 15MB)
- `GET /api/files/:key` public file read only if referenced by a published post

Files are stored privately in R2. Database stores only storage keys, never inline base64. Do not store personal medical or other sensitive records in this demo schema.

Security: admin routes use Cloudflare Access JWT validation with JWKS; there is no public anonymous write. An Access application on the Worker domain must issue those JWTs to authorized admins. Static Vercel routes are not a security boundary.

The current website previously used browser localStorage. The worker/API needs to be deployed and wired in before real shared persistence is available.
