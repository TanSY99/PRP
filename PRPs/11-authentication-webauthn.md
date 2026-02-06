# PRP 11: Authentication (WebAuthn/Passkeys)

## Feature Overview
Implement passwordless authentication using WebAuthn/Passkeys. Users can register and login with biometrics or security keys. Sessions are managed via JWT stored in HTTP-only cookies. All routes should be protected in production.

## User Stories
- As a user, I can register a new account with a passkey.
- As a user, I can login using my passkey.
- As a user, I remain logged in for 7 days unless I logout.
- As a user, I am redirected to login if I access protected routes unauthenticated.
- As a user, I can logout at any time.

## User Flow
1. User visits `/login`.
2. User registers by entering a username and completing passkey creation.
3. User logs in by selecting their username and authenticating.
4. App sets a session cookie (HTTP-only, 7 days).
5. User is redirected to main app.
6. User can logout, which clears the session.

## Technical Requirements

### Database Schema
- `users` table
  - `id`, `username`, timestamps
- `authenticators` table
  - `id`, `user_id`, `credential_id`, `public_key`, `counter`, `transports`

### API Endpoints
- `POST /api/auth/register-options`
- `POST /api/auth/register-verify`
- `POST /api/auth/login-options`
- `POST /api/auth/login-verify`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Auth Utilities
- `lib/auth.ts`
  - `createSession`
  - `getSession`
  - `deleteSession`

### Session Rules
- JWT stored in HTTP-only cookie.
- Expiry: 7 days.
- Logout clears session immediately.

### Route Protection
- `middleware.ts` enforces auth on protected routes.
- Unauthenticated users redirected to `/login`.
- Authenticated users visiting `/login` redirected to main app.

### WebAuthn Details
- Use `@simplewebauthn` for registration and login flows.
- Support platform authenticators and security keys.

## UI Components

### Login Page
- Username input
- Register button
- Login button
- Error display for failed verification

### App Shell
- "Logout" button in top-right when authenticated
- Username display: "Welcome, <email/username>"

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-33-19.png`
- `screenshots/Screenshot From 2026-02-06 13-35-41.png`

## Edge Cases
- Duplicate username registration.
- Login attempt with non-existent user.
- WebAuthn not supported by browser.
- Session cookie missing or expired.
- Multiple authenticators per user.

## Acceptance Criteria
- Registration works with passkeys.
- Login works with passkeys.
- Session persists for 7 days.
- Logout clears session immediately.
- Protected routes redirect unauthenticated users to `/login`.
- Authenticated users are redirected away from `/login`.

## Testing Requirements

### E2E Tests
- Register new user (virtual authenticator).
- Login existing user.
- Logout clears session.
- Protected route redirects unauthenticated.
- Login page redirects authenticated.

### Unit Tests
- JWT creation/verification.
- Session expiry logic.

## Out of Scope
- Password-based auth.
- Multi-factor flows beyond passkeys.
- Account recovery.

## Success Metrics
- Users can authenticate without passwords reliably.
- Session handling secure and stable across refreshes.
