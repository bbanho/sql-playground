import React, { useCallback, useEffect, useState } from 'react';
import {
  AuthMode,
  getAuthMode,
  setAuthMode,
  getApiKey,
  setApiKey,
  getSystemPrompt,
  setSystemPrompt,
  getModel,
  setModel,
  getAuthStatus,
  startGoogleLogin,
  logout,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_KEY_URL,
  RELAY_URL,
} from '../services/ai';

/**
 * Gemini credentials and tutor prompt.
 *
 * The credential belongs to the student. OAuth means no key ever reaches this
 * browser; the API key path is a fallback for students who do not want to sign
 * in with Google, and their key stays in this browser's localStorage.
 *
 * The system prompt is editable on purpose. Study method is a personal choice,
 * so this is a setting, not a constant baked into the app.
 */
const AiSettings: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>(getAuthMode());
  const [apiKey, setKey] = useState(getApiKey());
  const [prompt, setPrompt] = useState(getSystemPrompt());
  const [model, setModelValue] = useState(getModel());
  const [email, setEmail] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true);
    const status = await getAuthStatus();
    setReady(status.ready);
    setEmail(status.email);
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Coming back from Google's consent screen is a fresh page load, so the
  // session has to be re-read on mount rather than assumed.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    if (url.get('gemini') === 'signed-in') {
      setMessage('Login realizado.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const pickMode = (next: AuthMode) => {
    setMode(next);
    setAuthMode(next);
    setMessage('');
    refresh();
  };

  const saveKey = () => {
    setApiKey(apiKey);
    refresh();
  };

  const signOut = async () => {
    await logout();
    setEmail(undefined);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Assistente Gemini</h4>
        <span
          className={`text-[10px] font-mono ${ready ? 'text-green-500' : 'text-slate-400'}`}
        >
          {busy ? '...' : ready ? 'PRONTO' : 'SEM CREDENCIAL'}
        </span>
      </div>

      {/* Auth mode */}
      <div className="flex gap-1">
        {(['oauth', 'apikey'] as AuthMode[]).map((m) => (
          <button
            key={m}
            onClick={() => pickMode(m)}
            className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-wider rounded-sm border transition-colors ${
              mode === m
                ? 'bg-blue-500 text-white border-blue-500'
                : 'text-slate-500 border-slate-300 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            {m === 'oauth' ? 'Google OAuth' : 'Chave API'}
          </button>
        ))}
      </div>

      {mode === 'oauth' ? (
        <div className="space-y-2">
          {email ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1">
                {email}
              </span>
              <button
                onClick={signOut}
                className="text-[10px] uppercase px-2 py-1 rounded-sm border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-red-500"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => startGoogleLogin()}
              disabled={!ready}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Entrar com Google
            </button>
          )}
          <p className="text-[10px] text-slate-400 leading-tight">
            O login passa pelo relay em {new URL(RELAY_URL).host}. Nenhum segredo vai
            para o navegador.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            onBlur={saveKey}
            placeholder="AIza..."
            className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
          />
          <a
            href={GEMINI_KEY_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-blue-500 hover:underline"
          >
            Obter uma chave no Google AI Studio
          </a>
          <p className="text-[10px] text-slate-400 leading-tight">
            A chave fica só neste navegador, em localStorage. Nunca entra no bundle.
          </p>
        </div>
      )}

      {/* Model */}
      <div>
        <label className="text-[10px] text-slate-500 uppercase block mb-1">Modelo</label>
        <select
          value={model}
          onChange={(e) => {
            setModelValue(e.target.value);
            setModel(e.target.value);
          }}
          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
        >
          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
          <option value="gemini-2.0-flash">gemini-2.0-flash</option>
        </select>
      </div>

      {/* System prompt */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-500 uppercase">Prompt de sistema</label>
          <button
            onClick={() => setPrompt(DEFAULT_SYSTEM_PROMPT)}
            className="text-[10px] text-slate-400 hover:text-blue-500"
          >
            Restaurar padrão
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => setSystemPrompt(prompt)}
          rows={5}
          className="w-full px-2 py-1.5 text-[10px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-600 dark:text-slate-300 resize-y leading-relaxed"
        />
        <p className="text-[10px] text-slate-400 leading-tight mt-1">
          Define como o Gemini atua como tutor. Editável porque o método de estudo é
          escolha do aluno.
        </p>
      </div>

      {message && <p className="text-[10px] text-blue-500">{message}</p>}
    </div>
  );
};

export default AiSettings;
