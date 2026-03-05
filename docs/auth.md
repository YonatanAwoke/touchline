# Auth API Contract

This document describes the authentication endpoints and cookie/token behavior used by the Touchline backend and frontend.

## Strategy
- Access tokens: JWT signed with `process.env.JWT_SECRET`, short-lived (15 minutes), stored in an `HttpOnly` cookie named `token`.
- Refresh tokens: opaque random string, stored hashed in the database (`refreshToken` table) and kept in an `HttpOnly` cookie named `refreshToken`.
- `userId` is stored in an `HttpOnly` cookie to help locate refresh tokens server-side.
- Token rotation: when a refresh is used, the old refresh record is deleted and replaced with a new one.
- Cookies: `HttpOnly`, `SameSite=lax`, `Secure` in production, `path=/`.

## Environment variables
- `JWT_SECRET` — secret for signing JWTs.
- `NODE_ENV` — controls `secure` cookie flag.

## Endpoints

### POST /api/auth/login
- Request JSON:

```json
{ "email": "user@example.com", "password": "password123" }
```

- Success (200): sets cookies `token`, `refreshToken`, `userId` and returns:

```json
{ "message": "Logged in" }
```

- Errors:
  - 400: invalid request
  - 401: invalid credentials
  - 500: server error

### POST /api/auth/refresh
- Description: Exchanges a valid refresh token (cookie) for a new access token and refresh token. Implements token rotation.
- Request: no body. Requires `refreshToken` and `userId` cookies.
- Success (200): sets new `token`, `refreshToken`, and `userId` cookies; returns:

```json
{ "message": "Token refreshed" }
```

- Errors:
  - 401: missing/invalid/expired refresh token
  - 500: server error

### GET /api/auth/me
- Description: Returns the currently authenticated user's public profile based on the access token cookie `token`.
- Request: no body. Requires `token` cookie.
- Success (200):

```json
{ "user": { "id": 1, "email": "user@example.com", "username": "joe", "role": "user", "organizationId": null, "coachProfile": null } }
```

- Errors:
  - 401: missing/invalid access token
  - 404: user not found
  - 500: server error

### POST /api/auth/logout
- Description: Invalidates current session (deletes refresh token record) and clears cookies.
- Request: no body. Uses cookies to identify session.
- Success (200): returns `{ "message": "Logged out" }` and clears cookies.

## Security notes
- CSRF: because auth uses `HttpOnly` cookies, protect state-changing endpoints using SameSite cookies and consider CSRF tokens for cross-site POSTs. `SameSite=lax` prevents most cross-site navigation POST attacks but if you later use `SameSite=None` then add CSRF protection.
- Cookie domain: ensure `cookie` domain is set appropriately for your deployment (not set here; defaults to host).
- Rotation: refresh token rotation reduces replay window.

## Client guidance (frontend)
- Send no Authorization header for cookie-based flow; rely on browser cookies.
- On app load, call `GET /api/auth/me` to populate client state. If 401, call `POST /api/auth/refresh` once to attempt silent refresh, then re-call `/me`.
- On 401 responses from APIs, attempt the refresh flow once, then redirect to login if still unauthorized.

## Data shapes (user)
- Returned `user` object excludes sensitive fields (no password hash). Example:

```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "joe",
  "role": "admin",
  "organizationId": 2,
  "coachProfile": null,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---
Add this file to `docs/auth.md` and update `apps/backend/.env.example` with `JWT_SECRET` and any other deployment-specific variables when ready.
