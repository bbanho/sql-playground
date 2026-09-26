#!/usr/bin/env node
// Dev-server verification gate.
//
// The project's release rule: never merge on a green build alone. This boots
// the app in a real browser against a running dev server (or preview server),
// waits for DuckDB to finish instantiating, and asserts the mission UI is
// actually usable. Exits non-zero on failure so it can gate a merge.
//
// Usage: node scripts/verify-app.js [url] [--port=PORT] [--shot=out.png]

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const url = (args.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5173/').trim();
const shot = (args.find((a) => a.startsWith('--shot=')) || '').slice(7);
const cdpPort = 9400 + Math.floor(Math.random() * 400);
const profile = path.join('/tmp', `sqlpg-gate-${cdpPort}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp() {
  for (let i = 0; i < 90; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (_) {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('CDP endpoint never came up');
}

const browser = spawn(
  'flatpak',
  [
    'run',
    '--command=chromium',
    'org.chromium.Chromium',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,900',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let ws;
const cleanup = () => {
  try { ws && ws.close(); } catch (_) {}
  try { browser.kill('SIGKILL'); } catch (_) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
};
process.on('exit', cleanup);

(async () => {
  ws = new WebSocket(await waitForCdp());
  let id = 0;
  const pending = new Map();
  const consoleMsgs = [];
  const badResponses = [];
  const requests = [];

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      consoleMsgs.push(
        `[${m.params.type}] ` + (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200),
      );
    }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleMsgs.push(
        'EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 300),
      );
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      badResponses.push(`${m.params.response.status} ${m.params.response.url.slice(0, 100)}`);
    }
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
    sessionId,
  );
  await send('Page.navigate', { url }, sessionId);

  const evaluate = async (expression) => {
    const r = await send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'evaluate failed');
    }
    return r.result.value;
  };

  // Wait for the app to leave the bootstrap screen. DuckDB instantiation pulls
  // ~35MB of WASM, so this can legitimately take a while.
  let rootText = '';
  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(2000);
    rootText = await evaluate(
      `(() => { const r = document.getElementById('root'); return r ? r.innerText.trim() : 'NO_ROOT'; })()`,
    );
    if (rootText && !/BOOTSTRAPING|BOOTSTRAPPING/i.test(rootText)) break;
  }

  const rootLen = rootText.length;
  const stillBooting = /BOOTSTRAPING|BOOTSTRAPPING/i.test(rootText);
  const duckdb = await evaluate(
    `(() => { const t = document.getElementById('root').innerText; const i = t.search(/DuckDB-WASM/); return i >= 0 ? t.slice(i, i + 40) : 'NOT_FOUND'; })()`,
  );
  const missions = await evaluate(
    `(() => {
      // Mission buttons render a number badge plus the mission title, so match
      // on the sidebar's own button structure rather than a bare numeric label.
      const btns = [...document.querySelectorAll('button')].filter((b) =>
        /OBJETIVO|Exerc/i.test(b.closest('div')?.innerText || '') ||
        b.querySelector('span.truncate'));
      return btns.length;
    })()`,
  );
  const objective = await evaluate(
    `(() => { const p = [...document.querySelectorAll('p,div')].find(x => /Escreva|Retorne|Liste|Consulte|Apresente|Exibir|Quantos/i.test(x.innerText || '') && x.innerText.length > 20 && x.innerText.length < 400);
      if (!p) return 'NOT_FOUND';
      const r = p.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), text: p.innerText.slice(0, 90) }; })()`,
  );
  const external = [
    ...new Set(
      requests.filter(
        (u) =>
          !u.startsWith('http://127.0.0.1') &&
          !u.startsWith('http://localhost') &&
          !u.startsWith('data:') &&
          !u.startsWith('blob:') &&
          !u.startsWith('ws:'),
      ),
    ),
  ];

  if (shot) {
    const { data } = await send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false },
      sessionId,
    );
    fs.writeFileSync(shot, Buffer.from(data, 'base64'));
  }

  const report = {
    url,
    duckdb,
    missions,
    objective,
    externalRequests: external.length,
    http4xx: badResponses.filter((b) => !b.includes('favicon')),
    consoleErrors: consoleMsgs.filter((c) => !/DevTools|download the React/i.test(c)),
    screenshot: shot || null,
  };

  const failures = [];
  if (stillBooting) failures.push(`app stuck on bootstrap screen (${rootLen} chars rendered)`);
  if (!/CONNECTED/i.test(duckdb)) failures.push(`DuckDB not connected: ${duckdb}`);
  if (!missions) failures.push('no mission buttons rendered');
  if (objective === 'NOT_FOUND') failures.push('mission objective not found in DOM');

  console.log('=== APP VERIFICATION ===');
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.log('\nFAILED:');
    failures.forEach((f) => console.log('  - ' + f));
    process.exitCode = 1;
  } else {
    console.log('\nPASS');
  }
  process.exit(process.exitCode || 0);
})().catch((err) => {
  console.error('GATE ERROR:', err.message);
  process.exit(1);
});
