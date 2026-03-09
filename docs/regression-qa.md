# Regression QA Checklist

## Prerequisites
- API env configured at `apps/api/.env` with valid `DATABASE_URL` and `JWT_SECRET`.
- Web env configured at `apps/web/.env`.
- API server running on `QA_API_URL` (default `http://localhost:4000`).

## Automated checks
- Build validation:
  - `npm run build:api`
  - `npm run build:web`
- API smoke validation:
  - `npm run qa:regression`

## Manual smoke checks
- Auth:
  - Register a new account from `/auth`.
  - Login/logout roundtrip.
  - Forgot-password submission with valid and invalid emails.
  - Reset-password flow with a valid reset token.
- Core app:
  - Browse `/` and `/map`.
  - Open a place detail page and submit a review.
  - Toggle save and visit state for a place.
- Admin:
  - Access `/admin` with admin user.
  - Validate user activation/deactivation and role update.
  - Validate review moderation endpoints.

## Hardening checks
- Request from an untrusted `Origin` and confirm API returns `403`.
- Large request body larger than `API_JSON_LIMIT` should be rejected.
- Repeated auth abuse attempts should return `429` on register/login/forgot/reset routes.
