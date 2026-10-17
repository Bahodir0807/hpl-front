# HPL CRM frontend

Next.js App Router frontend for the HPL CRM. Authenticated browser requests go
through the same-origin `/api/backend` route; backend credentials are kept in
HTTP-only cookies and are not exposed to client JavaScript.

## Local setup

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. Set `API_URL` to the backend API origin, including
the `/api` prefix. `NEXT_PUBLIC_API_URL` is an optional public fallback and
must never contain a secret. The backend must allow the frontend origin.

The frontend sets a per-request CSP nonce for page scripts, strict security
headers, and secure HTTP-only auth cookies in production. Production traffic
must use HTTPS so the cookies marked `Secure` can be sent.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Browser QA lives in `browser-qa/`. It is restricted to local HTTP URLs. Point it
at the dedicated browser QA backend and database; do not run it against a
shared or production CRM. Auth state and test artifacts are ignored by Git and
should be treated as sensitive local files.

## Deployment notes

No production hosting configuration is checked in. The deployment platform
must provide `API_URL`, the public frontend origin on the backend, TLS, and a
health/readiness check. Keep `.env.local` out of source control and deploy the
frontend only after the backend API is available.
