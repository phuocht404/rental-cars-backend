# Rental Cars Server: Self-driving Car Rental Application

APIs for Rental Cars project with NestJS + Prisma (MySQL).

## Getting Started

### 1. Install Libraries

```bash
pnpm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in the values. The server refuses to start when a required variable is missing.

### 3. Database

```bash
pnpm prisma migrate deploy   # apply migrations
pnpm prisma db seed          # optional sample data
```

### 4. Run the Development Server

```bash
pnpm start:dev
```

The server runs at http://localhost:8080, API docs at http://localhost:8080/api/v1/docs (non-production only).

## Authentication & sessions

`POST /auth/signin` creates a **session** (table `phien_dang_nhap`, one per device) and sets two **httpOnly**
cookies: `access_token` (30 minutes) and `refresh_token` (7 days).

- `POST /auth/refresh` rotates the refresh token (new `jti` each time). Re-using an old refresh token
  revokes the whole session (token theft detection); a 30-second grace window covers two tabs refreshing
  at the same moment.
- `POST /auth/logout` revokes the current session, `POST /auth/logout-all` revokes every session of the user.
- Changing the password signs out all other devices; an admin deactivating a user or resetting their
  password signs out all of that user's devices.
- Every access token carries its session id and is checked against the database (cached for 30 seconds),
  so revocation takes effect within that window.
- `GET /auth/me` returns the current user. A `Bearer` header is still accepted (Swagger / API clients).

## Payments (Stripe)

1. `POST /stripe/checkout` with `{ items: [{ carId, startDate, endDate }] }` (dates `DD/MM/YYYY`).
   The server prices the cart, creates an order with `paymentStatus = PENDING` and returns the Checkout URL.
2. Stripe calls `POST /stripe/webhook` (`checkout.session.completed` → deposit paid, `checkout.session.expired` → order cancelled).
3. The success page also calls `GET /stripe/session/:id`, which re-checks the session and marks the deposit as paid
   (so local development works even without the webhook).

Local webhook forwarding:

```bash
stripe listen --forward-to localhost:8080/api/v1/stripe/webhook
```

## Scheduled jobs

Run inside the API process (`@nestjs/schedule`); they are idempotent, so several instances can run them.

| Job | Every | What it does |
| --- | --- | --- |
| `cancel-overdue-trips` | 10 min | Trips still pending on their start date are cancelled (deposit refunded if paid) |
| `cancel-abandoned-checkouts` | 30 min | Unpaid orders older than 2 hours are cancelled (covers missed Stripe webhooks) |
| `purge-auth-sessions` | daily 03:00 | Deletes sessions expired/revoked more than 7 days ago |

## Deployment notes

- **Rate limiting & real client IP.** Set `TRUST_PROXY` to the number of reverse proxies in front of the API.
  The outermost proxy must **overwrite** `X-Forwarded-For`, otherwise clients can spoof their IP, e.g. Nginx:
  `proxy_set_header X-Forwarded-For $remote_addr;`
- **Server-to-server calls.** The Next.js server renders pages for many users from a single IP. Set the same
  random value in `INTERNAL_API_KEY` (backend) and `API_INTERNAL_KEY` (frontend) so those calls are not
  rate-limited as one client.
- **Existing databases:**
  1. Mark the schema-drift migration as applied (the columns already exist):
     `npx prisma migrate resolve --applied 20260929000000_sync_schema_drift`
  2. Migration `20231101124339_update_table_name_user` was fixed to use the correct table name case
     (it failed on case-sensitive MySQL, the Linux default). If your database already applied it, update the
     stored checksum so `prisma migrate dev` does not ask to reset:
     ```sql
     UPDATE _prisma_migrations
     SET checksum = '23a7db3c55e9d266a34bf77c54ec089bb71d655d2d88d152f48f3f819a53403c'
     WHERE migration_name = '20231101124339_update_table_name_user';
     ```
  3. `npx prisma migrate deploy`
- Images are uploaded straight from the browser to Cloudinary; the API only accepts Cloudinary URLs and the
  JSON body limit is 1 MB.

## Tests

```bash
pnpm test        # unit tests
E2E=1 pnpm test:e2e   # needs a real database
```
