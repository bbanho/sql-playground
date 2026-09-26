// Exercise the Worker with fake bindings and a stubbed Google, so the OAuth
// session, the refresh path, and the CORS policy are all verified without
// touching a real Google account.
import worker from '../src/index.js';

const REFRESHED = { access_token: 'fresh-token', expires_in: 3600 };
let googleCalls = [];

const ORIGIN = 'https://sql-playground.axio.eng.br';
const ENV = { CLIENT_ID: 'cid', CLIENT_SECRET: 'secret', ALLOWED_ORIGIN: ORIGIN, APP_URL: `${ORIGIN}/beta/` };
// A second allowlist entry, as configured in production.
const ENV_MULTI = { ...ENV, ALLOWED_ORIGIN: `${ORIGIN},http://127.0.0.1:5199` };

function makeRequest(path, { method = 'GET', cookie = '', origin = ORIGIN } = {}) {
  return new Request(`https://relay.example${path}`, {
    method,
    headers: { origin, ...(cookie ? { cookie } : {}) },
  });
}

const call = (req) => worker.fetch(req, ENV);
const setCookies = (res) => res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
const pass = []; const fail = [];
const check = (name, cond, extra = '') => (cond ? pass : fail).push(name + (extra ? ` (${extra})` : ''));

// 1. no session -> authenticated:false, no Set-Cookie
{
  const res = await call(makeRequest('/session'));
  const body = await res.json();
  check('no session => authenticated false', body.authenticated === false);
  check('no session => no cookie set', setCookies(res).length === 0, JSON.stringify(setCookies(res)));
}

// 2. valid, unexpired session -> authenticated true with email
{
  const future = Date.now() + 30 * 60 * 1000;
  const c = `pg_session=${encodeURIComponent(JSON.stringify({ accessToken: 'tok', refreshToken: 'ref', expiresAt: future, email: 'a@b.c' }))}`;
  const res = await call(makeRequest('/session', { cookie: c }));
  const body = await res.json();
  check('valid session => authenticated true', body.authenticated === true);
  check('valid session => email surfaced', body.email === 'a@b.c', body.email);
  check('valid session => token never leaked', !JSON.stringify(body).includes('tok'));
  check('valid session => no needless refresh', setCookies(res).length === 0);
}

// 3. EXPIRED session with refresh token => refreshed, new cookie issued
{
  const past = Date.now() - 1000;
  const c = `pg_session=${encodeURIComponent(JSON.stringify({ accessToken: 'old', refreshToken: 'ref', expiresAt: past, email: 'a@b.c' }))}`;
  googleCalls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    googleCalls.push(String(url));
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify(REFRESHED), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, opts);
  };
  const res = await call(makeRequest('/session', { cookie: c }));
  globalThis.fetch = realFetch;
  const body = await res.json();
  check('expired session => refreshed', body.authenticated === true, JSON.stringify(body));
  const cookies = setCookies(res);
  const rotated = cookies.find((x) => x.includes('pg_session=') && !x.includes('pg_session=;'));
  check('expired session => rotated cookie issued', !!rotated, JSON.stringify(cookies));
  check('rotated cookie carries new token', !!rotated && rotated.includes('fresh-token'));
  check('rotated cookie keeps refresh token', !!rotated && rotated.includes(encodeURIComponent('ref')));
  check('refresh hit the token endpoint', googleCalls.some((u) => u.includes('/token')), JSON.stringify(googleCalls));
}

// 4. EXPIRED session WITHOUT refresh token => cleared, not stuck
{
  const past = Date.now() - 1000;
  const c = `pg_session=${encodeURIComponent(JSON.stringify({ accessToken: 'old', refreshToken: '', expiresAt: past, email: 'a@b.c' }))}`;
  const res = await call(makeRequest('/session', { cookie: c }));
  const body = await res.json();
  const cookies = setCookies(res);
  check('expired w/o refresh => signed out', body.authenticated === false);
  check('expired w/o refresh => cookie cleared', cookies.some((x) => /pg_session=;/.test(x)), JSON.stringify(cookies));
}

// 5. CORS: allowed origin echoed, foreign origin not honoured
{
  const res = await call(makeRequest('/session', { origin: 'https://evil.example' }));
  check('foreign origin not echoed', res.headers.get('access-control-allow-origin') !== 'https://evil.example', res.headers.get('access-control-allow-origin'));
  check('credentials allowed', res.headers.get('access-control-allow-credentials') === 'true');
}

// 6. cookie attributes: SameSite=None + Secure + HttpOnly
{
  const past = Date.now() - 1000;
  const c = `pg_session=${encodeURIComponent(JSON.stringify({ accessToken: 'old', refreshToken: 'ref', expiresAt: past, email: 'a@b.c' }))}`;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => new Response(JSON.stringify(REFRESHED), { status: 200, headers: { 'content-type': 'application/json' } });
  const res = await call(makeRequest('/session', { cookie: c }));
  globalThis.fetch = realFetch;
  const rotated = setCookies(res).find((x) => x.includes('fresh-token')) || '';
  check('cookie SameSite=None', /SameSite=None/i.test(rotated), rotated);
  check('cookie Secure', /Secure/i.test(rotated), rotated);
  check('cookie HttpOnly', /HttpOnly/i.test(rotated), rotated);
}

// 7. Gemini proxy: no session => 401, and the Bearer header is attached when signed in
{
  const res = await call(makeRequest('/api/gemini/models/x:generateContent', { method: 'POST' }));
  check('proxy unauthenticated => 401', res.status === 401, String(res.status));

  const future = Date.now() + 30 * 60 * 1000;
  const c = `pg_session=${encodeURIComponent(JSON.stringify({ accessToken: 'tok-xyz', refreshToken: 'ref', expiresAt: future, email: 'a@b.c' }))}`;
  let seen = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { seen = { url: String(url), auth: opts.headers.authorization, body: opts.body };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const res2 = await call(makeRequest('/api/gemini/models/x:generateContent', { method: 'POST', cookie: c }));
  globalThis.fetch = realFetch;
  check('proxy forwards to Gemini API', !!seen && seen.url.includes('generativelanguage.googleapis.com'), seen && seen.url);
  check('proxy sends Bearer token', !!seen && seen.auth === 'Bearer tok-xyz', seen && String(seen.auth));
  check('proxy relays upstream status', res2.status === 200);
  check('proxy GET is rejected', (await call(makeRequest('/api/gemini/x', { method: 'GET', cookie: c }))).status === 405);
}

// 8. logout clears the session
{
  const res = await call(makeRequest('/logout', { method: 'POST' }));
  check('logout clears cookie', setCookies(res).some((x) => /pg_session=;/.test(x)));
}

// 9. multi-origin allowlist: both listed origins echoed, others rejected
{
  const prod = await worker.fetch(makeRequest('/session'), ENV_MULTI);
  check('allowlist: production origin echoed', prod.headers.get('access-control-allow-origin') === ORIGIN, prod.headers.get('access-control-allow-origin'));

  const local = await worker.fetch(makeRequest('/session', { origin: 'http://127.0.0.1:5199' }), ENV_MULTI);
  check('allowlist: localhost echoed', local.headers.get('access-control-allow-origin') === 'http://127.0.0.1:5199', local.headers.get('access-control-allow-origin'));

  const evil = await worker.fetch(makeRequest('/session', { origin: 'https://evil.example' }), ENV_MULTI);
  check('allowlist: foreign origin rejected', evil.headers.get('access-control-allow-origin') !== 'https://evil.example', evil.headers.get('access-control-allow-origin'));

  // A prefix of an allowed origin must not pass, or a lookalike domain would.
  const lookalike = await worker.fetch(makeRequest('/session', { origin: 'https://sql-playground.axio.eng.br.evil.example' }), ENV_MULTI);
  check('allowlist: lookalike prefix rejected', lookalike.headers.get('access-control-allow-origin') !== 'https://sql-playground.axio.eng.br.evil.example', lookalike.headers.get('access-control-allow-origin'));

  // A single-origin config must not start allowing localhost by accident.
  const strict = await worker.fetch(makeRequest('/session', { origin: 'http://127.0.0.1:5199' }), ENV);
  check('allowlist: single-origin stays strict', strict.headers.get('access-control-allow-origin') !== 'http://127.0.0.1:5199', strict.headers.get('access-control-allow-origin'));
}

console.log('PASS (' + pass.length + '):'); pass.forEach((p) => console.log('  ok  ' + p));
if (fail.length) { console.log('\nFAILED (' + fail.length + '):'); fail.forEach((f) => console.log('  --  ' + f)); process.exit(1); }
console.log('\nALL GREEN');
