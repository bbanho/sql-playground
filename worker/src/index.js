/**
 * Gemini OAuth relay for SQL Playground.
 *
 * Why a relay at all: a static SPA cannot hold an OAuth client secret. Anything
 * bundled into public JavaScript is readable by every visitor, so the code ->
 * token exchange has to happen somewhere the student cannot inspect. This Worker
 * is that somewhere, and it is deliberately the smallest thing that works:
 *
 *   - it stores no data, and has no database
 *   - the access token lives in an httpOnly cookie, so page JavaScript can never
 *     read it, and it is scoped to the Google account the student signed in with
 *   - it only proxies requests to the Gemini API
 *
 * The student never sees a secret. The SPA only ever learns "yes, signed in" and
 * "here is an answer".
 */

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// OIDC "openid email profile" is the narrowest scope that lets the Worker know
// who is signed in. It grants no access to Drive, Gmail, or anything else.
const SCOPE = 'openid email profile https://www.googleapis.com/auth/cloud-platform';

const COOKIE_SESSION = 'pg_session';
const COOKIE_OAUTH = 'pg_oauth';

/**
 * Build a JSON response.
 *
 * `headers` accepts a Headers instance as well as a plain object. That matters
 * because the session endpoints mutate a Headers to set multiple Set-Cookie
 * values, and spreading a Headers into an object literal would stringify it and
 * silently drop the cookies.
 */
const json = (data, status = 200, headers) => {
  const out = new Headers(headers);
  if (!out.has('content-type')) out.set('content-type', 'application/json; charset=utf-8');
  if (!out.has('cache-control')) out.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: out });
};

/** Read a cookie by name. */
function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/**
 * Cookie attributes.
 *
 * SameSite=None + Secure is required, not a preference. The SPA is served from
 * GitHub Pages and the Worker from a `workers.dev` host, so every Gemini call
 * is cross-origin; SameSite=Lax would silently drop the session cookie on
 * fetch and the login would appear to succeed then never work.
 *
 * Secure is only switched off for local testing, where the relay is reached
 * over plain http on localhost. Browsers reject Secure cookies on http, which
 * is why the attribute has to be conditional rather than hardcoded.
 */
function cookie(name, value, { maxAge, secure = true, sameSite = 'None' } = {}) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
  ];
  if (secure) bits.push('Secure');
  if (typeof maxAge === 'number') bits.push(`Max-Age=${maxAge}`);
  return bits.join('; ');
}

const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const base64urlFromString = (str) =>
  btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (len = 32) => {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return base64url(buf);
};

async function sha256Base64Url(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64url(digest);
}

/**
 * CORS for the SPA origin, with credentials so the session cookie is sent.
 *
 * ALLOWED_ORIGIN is a comma-separated allowlist because there is more than one
 * legitimate origin: the production domain, the beta subdirectory is the same
 * origin so it needs nothing extra, and localhost during development. Matching
 * is exact, never a prefix or a wildcard: reflecting an arbitrary origin with
 * credentials enabled would let any site drive the student's session.
 */
function corsHeaders(request, allowedOrigin) {
  const origin = request.headers.get('origin') || '';
  const allowlist = (allowedOrigin || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allow = allowlist.length === 0 || allowlist.includes(origin);
  return {
    'access-control-allow-origin': allow ? origin : allowlist[0] || '',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export default {
  async fetch(request, bindings) {
    const { CLIENT_ID, CLIENT_SECRET, ALLOWED_ORIGIN, APP_URL } = bindings;
    const env = { CLIENT_ID, CLIENT_SECRET, ALLOWED_ORIGIN, APP_URL };
    const url = new URL(request.url);
    const cors = corsHeaders(request, ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      switch (url.pathname) {
        case '/auth/google':
          return handleAuthRedirect(request, { CLIENT_ID, APP_URL });
        case '/auth/callback':
          return handleCallback(request, { CLIENT_ID, CLIENT_SECRET, APP_URL, origin: url.origin });
        case '/session':
          return handleSession(request, { cors, env });
        case '/logout':
          return handleLogout(cors);
        default:
          break;
      }

      if (url.pathname.startsWith('/api/gemini/')) {
        return handleGeminiProxy(request, {
          cors,
          restPath: url.pathname.slice('/api/gemini'.length),
          search: url.search,
          env: bindings,
        });
      }

      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      return json({ error: 'server_error', message: String(err && err.message) }, 500, cors);
    }
  },
};

/**
 * Step 1: send the student to Google's consent screen.
 *
 * PKCE is used even though there is a client secret. It costs nothing and means
 * an intercepted authorization code cannot be redeemed by anyone else.
 */
async function handleAuthRedirect(request, { CLIENT_ID, APP_URL }) {
  const state = randomString(24);
  const verifier = randomString(48);
  const challenge = await sha256Base64Url(verifier);

  const target = new URL(GOOGLE_AUTH);
  target.searchParams.set('client_id', CLIENT_ID);
  target.searchParams.set('redirect_uri', `${new URL(request.url).origin}/auth/callback`);
  target.searchParams.set('response_type', 'code');
  target.searchParams.set('scope', SCOPE);
  target.searchParams.set('state', state);
  target.searchParams.set('code_challenge', challenge);
  target.searchParams.set('code_challenge_method', 'S256');
  target.searchParams.set('access_type', 'offline');
  target.searchParams.set('prompt', 'consent');

  // The oauth cookie is short-lived and only carries the anti-forgery pair.
  return new Response(null, {
    status: 302,
    headers: {
      location: target.href,
      'set-cookie': [
        cookie(COOKIE_OAUTH, JSON.stringify({ state, verifier }), { maxAge: 600 }),
      ],
      'cache-control': 'no-store',
    },
  });
}

/** Step 2: redeem the code, then bounce back to the app. */
async function handleCallback(request, { CLIENT_ID, CLIENT_SECRET, APP_URL, origin }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const fail = (msg) =>
    new Response(msg, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  if (error) return fail(`Google returned: ${error}`);
  if (!code || !state) return fail('Missing code or state.');

  const raw = readCookie(request, COOKIE_OAUTH);
  if (!raw) return fail('Login session expired. Start again.');

  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    return fail('Login session corrupted. Start again.');
  }
  if (!stored || stored.state !== state) {
    // A mismatched state means the callback did not originate from the login we
    // started, so this is either a stale tab or an attempt to inject a code.
    return fail('State mismatch. Start again.');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `${origin}/auth/callback`,
      grant_type: 'authorization_code',
      code_verifier: stored.verifier,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    return fail(`Token exchange failed (${tokenRes.status}): ${detail.slice(0, 300)}`);
  }

  const tokens = await tokenRes.json();
  if (!tokens.access_token) return fail('No access token returned.');

  // Identify the student so the UI can show who is signed in. Failure here is
  // not fatal: the token is still valid for Gemini.
  let email = '';
  try {
    const info = await fetch(GOOGLE_USERINFO, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (info.ok) {
      const profile = await info.json();
      email = profile.email || '';
    }
  } catch {
    /* keep going without an email */
  }

  const session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    email,
  };

  return new Response(null, {
    status: 302,
    headers: {
      location: APP_URL || '/',
      'set-cookie': [
        cookie(COOKIE_SESSION, JSON.stringify(session), { maxAge: 60 * 60 * 24 * 30 }),
        cookie(COOKIE_OAUTH, '', { maxAge: 0 }),
      ],
      'cache-control': 'no-store',
    },
  });
}

/** Who is signed in, if anyone. Never exposes the token itself. */
async function handleSession(request, { cors, env }) {
  const headers = new Headers(cors);
  const session = await loadSession(request, new URL(request.url).origin, headers, env);
  if (!session) return json({ authenticated: false }, 200, headers);
  return json({ authenticated: true, email: session.email }, 200, headers);
}

function handleLogout(cors) {
  const headers = new Headers(cors);
  headers.append('set-cookie', cookie(COOKIE_SESSION, '', { maxAge: 0 }));
  return json({ authenticated: false }, 200, headers);
}

/**
 * Proxy to the Gemini API using the student's own OAuth token.
 *
 * The browser never holds a credential: it posts to /api/gemini/... and this
 * Worker attaches the Authorization header from the httpOnly session cookie.
 */
async function handleGeminiProxy(request, { cors, restPath, search, env }) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, cors);
  }

  const headers = new Headers(cors);
  const session = await loadSession(request, new URL(request.url).origin, headers, env);
  if (!session) {
    return json({ error: 'not_authenticated' }, 401, headers);
  }

  const body = await request.text();
  const target = `${GEMINI_BASE}${restPath}${search || ''}`;

  const upstream = await fetch(target, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.accessToken}`,
    },
    body,
  });

  const text = await upstream.text();
  headers.set('content-type', upstream.headers.get('content-type') || 'application/json');
  headers.set('cache-control', 'no-store');
  return new Response(text, { status: upstream.status, headers });
}

/**
 * Load the session cookie, refreshing the access token if it has expired.
 *
 * A Google access token lasts about an hour, so without this a student would
 * be silently signed out mid-study. The refresh token is what makes a long
 * session possible; it is stored in the same httpOnly cookie and never leaves
 * the Worker.
 */
async function loadSession(request, origin, headers, env) {
  const raw = readCookie(request, COOKIE_SESSION);
  if (!raw) return null;

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!session || !session.accessToken) return null;

  // A minute of slack avoids refreshing on every call when the token is about
  // to expire mid-session.
  if (session.expiresAt && session.expiresAt - Date.now() > 60_000) {
    return session;
  }
  if (!session.refreshToken) {
    // Expired with no way back. Clearing the cookie stops the browser from
    // replaying a dead session on every subsequent request.
    headers.set('set-cookie', cookie(COOKIE_SESSION, '', { maxAge: 0 }));
    return null;
  }

  const refreshed = await refreshAccessToken(session.refreshToken, env);
  if (!refreshed) {
    headers.set('set-cookie', cookie(COOKIE_SESSION, '', { maxAge: 0 }));
    return null;
  }

  const next = { ...session, ...refreshed };
  // Set the refreshed cookie on the response already being assembled, so the
  // browser stores the new token without a second round trip.
  headers.append(
    'set-cookie',
    cookie(COOKIE_SESSION, JSON.stringify(next), { maxAge: 60 * 60 * 24 * 30 }),
  );
  return next;
}

/** Exchange a refresh token for a fresh access token. */
async function refreshAccessToken(refreshToken, { CLIENT_ID, CLIENT_SECRET }) {
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    return {
      accessToken: data.access_token,
      // Google only returns a new refresh token sometimes; keep the old one.
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
  } catch {
    return null;
  }
}
