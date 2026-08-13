/**
 * How long a signed-in session survives.
 *
 * Three separate clocks have to agree, so they live together here — the
 * shortest one is what the user actually feels:
 *
 * - `SESSION_INACTIVE_DURATION_MS` — how long a session survives without being
 *   used. Every visit refreshes it, so an active user never hits it.
 * - `SESSION_TOTAL_DURATION_MS` — the hard cap from the moment of sign-in.
 *   Reaching it forces a fresh GitHub login no matter how active the user is.
 * - `AUTH_COOKIE_MAX_AGE_SECONDS` — the lifetime written on the auth cookies
 *   by the Next middleware. Without it the tokens are *session cookies* and
 *   die when the browser closes, which is what made sessions feel minutes
 *   long. It matches the inactivity window and is re-stamped on every
 *   document request, so it slides forward with use.
 *
 * This module is imported by both the Convex backend (`convex/auth.ts`) and
 * the Next middleware, so the two can never drift apart.
 */

const DAY_MS = 1000 * 60 * 60 * 24;

/** Sliding window: 30 days without visiting ends the session. */
export const SESSION_INACTIVE_DURATION_MS = 30 * DAY_MS;

/** Absolute cap: re-authenticate with GitHub every 90 days. */
export const SESSION_TOTAL_DURATION_MS = 90 * DAY_MS;

export const AUTH_COOKIE_MAX_AGE_SECONDS = SESSION_INACTIVE_DURATION_MS / 1000;
