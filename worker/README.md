# Gemini relay (Cloudflare Worker)

A static SPA cannot hold an OAuth client secret: anything in public JavaScript
is readable by every visitor. This Worker performs the `code` -> token exchange
so the secret never leaves Cloudflare, then proxies Gemini calls using the
student's own OAuth token.

It stores nothing. There is no database. The access token lives in an httpOnly
cookie, so page JavaScript cannot read it.

## Setup (one time, ~10 minutes)

1. Create a Google OAuth client at
   <https://console.cloud.google.com/apis/credentials>

   - Type: **Web application**
   - Authorized redirect URI: `https://sql-playground-gemini.<your-subdomain>.workers.dev/auth/callback`
     (the exact hostname appears after the first deploy)
   - Add `https://sql-playground.axio.eng.br` under **Authorized domains**

2. Enable the **Generative Language API** for the same GCP project.

3. Install and authenticate:

   ```bash
   cd worker
   npm install
   npx wrangler login
   ```

4. Deploy once to get the hostname:

   ```bash
   npx wrangler deploy
   ```

5. Store the credentials as encrypted secrets:

   ```bash
   npx wrangler secret put CLIENT_ID
   npx wrangler secret put CLIENT_SECRET
   ```

6. Add the Worker URL to `services/ai.ts`:

   ```ts
   export const RELAY_URL = 'https://sql-playground-gemini.<your-subdomain>.workers.dev';
   ```

Nothing in step 5 is ever written to a file. `wrangler.toml` holds only
non-sensitive configuration.

## Local development

```bash
cd worker
npx wrangler dev
```

## What the Student Experiences

Click "Entrar com Google" -> Google's consent screen -> back to the app,
signed in. No key to copy, no key stored in the bundle, no key visible in
devtools.

## Caveat worth reading

This authenticates the student with Google and calls the standard Gemini API
with their own quota. It does **not** use Gemini Code Assist, which is
licensed for Google's own editor integrations.
