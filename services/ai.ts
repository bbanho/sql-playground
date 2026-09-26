// AI study assistant.
//
// Two authentication paths, chosen by the student in ConfigShelf:
//
//   OAuth  — the student signs in with Google. No key ever reaches the browser.
//            Requires the Cloudflare Worker in /worker, which holds the client
//            secret and keeps the access token in an httpOnly cookie.
//
//   API key — the student pastes their own Gemini key. It is stored in this
//            browser's localStorage, sent only to Google from their machine, and
//            never bundled, committed, or shipped with the app.
//
// Whichever they pick, the credential belongs to the student and stays on their
// machine. The system prompt is theirs too: it is configurable rather than
// hardcoded, because the study method is a personal choice, not a product
// decision.

const API_KEY_STORAGE = 'sqlpg.gemini.apiKey';
const PROMPT_STORAGE = 'sqlpg.gemini.systemPrompt';
const MODEL_STORAGE = 'sqlpg.gemini.model';
const HISTORY_STORAGE = 'sqlpg.gemini.history';
const AUTH_MODE_STORAGE = 'sqlpg.gemini.authMode';

// Deployed Worker, holding the OAuth client secret. See worker/README.md.
export const RELAY_URL = 'https://sql-playground-gemini.bmbanho.workers.dev';
export const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey';
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export type AuthMode = 'oauth' | 'apikey';

/**
 * Default study tutor. Configurable and overridable by the student — this is
 * the contract the model is held to, not a suggestion.
 */
export const DEFAULT_SYSTEM_PROMPT = `Você é um tutor de SQL didático em uma universidade brasileira.

REGRAS INEGOCIÁVEIS:
1. Nunca entregue a resposta pronta de um exercício. O aluno precisa pensar.
2. Dê no máximo uma pista por vez. Espere o aluno tentar antes de avançar.
3. Se o aluno errar, aponte o CONCEITO que ele errou, não a linha do código.
4. Se o erro for de sintaxe, indique a posição aproximada e o tipo do erro
   (aspas, vírgula faltando, nome de coluna inexistente).
5. Use português do Brasil e o vocabulário que o aluno usa nos enunciados.
6. Se o aluno pedir a resposta completa duas vezes, dê a resposta mas explique
   cada linha, didaticamente.
7. Nunca invente tabelas, colunas ou valores que não existam no schema.

AO GERAR EXERCÍCIOS:
- Retorne SOMENTE JSON válido, sem markdown e sem cercas de código.
- Cada enunciado deve ser resolvível com uma única query sobre o schema dado.
- O expected_sql deve ser a query de referência, não a resposta em texto.
- Varie a dificuldade de forma progressiva.
`;

export type QuestionDraft = {
  title: string;
  description: string;
  expected_sql: string;
  success_message: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  tags: string[];
};

export type ChatMessage = { role: 'user' | 'model'; text: string };

const readStore = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStore = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode); AI just won't persist */
  }
};

export const getAuthMode = (): AuthMode => {
  const stored = readStore(AUTH_MODE_STORAGE);
  return stored === 'oauth' || stored === 'apikey' ? stored : 'oauth';
};
export const setAuthMode = (mode: AuthMode): void => writeStore(AUTH_MODE_STORAGE, mode);

export const getApiKey = (): string => readStore(API_KEY_STORAGE) ?? '';
export const setApiKey = (key: string): void => writeStore(API_KEY_STORAGE, key.trim());

export const getSystemPrompt = (): string => readStore(PROMPT_STORAGE) ?? DEFAULT_SYSTEM_PROMPT;
export const setSystemPrompt = (prompt: string): void => writeStore(PROMPT_STORAGE, prompt);

export const getModel = (): string => readStore(MODEL_STORAGE) ?? DEFAULT_MODEL;
export const setModel = (model: string): void => writeStore(MODEL_STORAGE, model.trim());

export const getHistory = (): ChatMessage[] => {
  const raw = readStore(HISTORY_STORAGE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setHistory = (history: ChatMessage[]): void =>
  writeStore(HISTORY_STORAGE, JSON.stringify(history.slice(-40)));

export const clearHistory = (): void => writeStore(HISTORY_STORAGE, null);

/** Strip markdown fences and any prose around the JSON payload. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const arr = body.indexOf('[');
  let from = -1;
  if (start >= 0 && arr >= 0) from = Math.min(start, arr);
  else from = Math.max(start, arr);
  if (from < 0) return body.trim();
  const to = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  return body.slice(from, to + 1);
}

/** Which credential is usable right now. */
export const getAuthStatus = async (): Promise<{ ready: boolean; email?: string }> => {
  if (getAuthMode() === 'apikey') {
    return { ready: getApiKey().length > 0 };
  }
  try {
    const res = await fetch(`${RELAY_URL}/session`, { credentials: 'include' });
    if (!res.ok) return { ready: false };
    const data = (await res.json()) as { authenticated?: boolean; email?: string };
    return { ready: !!data.authenticated, email: data.email };
  } catch {
    return { ready: false };
  }
};

export const startGoogleLogin = (): void => {
  window.location.href = `${RELAY_URL}/auth/google`;
};

export const logout = async (): Promise<void> => {
  try {
    await fetch(`${RELAY_URL}/logout`, { credentials: 'include' });
  } catch {
    /* nothing to do if the relay is unreachable */
  }
};

/**
 * One call to Gemini, whichever credential is configured.
 *
 * The relay path deliberately sends no Authorization header: the Worker reads
 * the token from the httpOnly cookie and attaches it server-side, so the browser
 * never handles it.
 */
const callGemini = async (systemPrompt: string, contents: unknown[]): Promise<string> => {
  const model = getModel();
  const path = `models/${encodeURIComponent(model)}:generateContent`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  };

  let res: Response;
  if (getAuthMode() === 'oauth') {
    res = await fetch(`${RELAY_URL}/api/gemini/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      throw new Error('Sessão expirada. Entre com o Google novamente.');
    }
  } else {
    const key = getApiKey();
    if (!key) {
      throw new Error(
        `Sem credencial. Adicione sua chave em ${GEMINI_KEY_URL} ou entre com o Google.`,
      );
    }
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${path}?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(await res.clone().text())) {
      throw new Error('Chave da API recusada pelo Google. Confira em ' + GEMINI_KEY_URL);
    }
    if (res.status === 429) throw new Error('Cota do Gemini esgotada. Aguarde ou troque de modelo.');
    if (res.status === 403) {
      throw new Error('Acesso negado (403). A API do Gemini pode não estar habilitada para esta chave.');
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro do Gemini (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('O Gemini devolveu uma resposta vazia.');
  return text;
};

/** Ask the tutor a question about the student's SQL. */
export const askTutor = async (question: string, context = ''): Promise<string> => {
  const history = getHistory();
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: context ? `${context}\n\n---\n\n${question}` : question }] },
  ];

  const reply = await callGemini(getSystemPrompt(), contents);
  setHistory([...history, { role: 'user', text: question }, { role: 'model', text: reply }]);
  return reply;
};

/**
 * Generate exercise drafts against the live schema, so the model can only
 * propose queries that actually run on the student's tables.
 */
export const generateQuestions = async (opts: {
  topic: string;
  count: number;
  difficulty: QuestionDraft['difficulty'];
  schema: string;
}): Promise<QuestionDraft[]> => {
  const instruction = `Gere ${opts.count} exercícios de SQL sobre "${opts.topic}".

Dificuldade: ${opts.difficulty}.
Schema disponível (use SOMENTE estas tabelas e colunas):
${opts.schema}

Responda SOMENTE com um array JSON, cada elemento:
{
  "title": "N. Titulo curto",
  "description": "Enunciado em portugues, claro, do que deve ser consultado.",
  "expected_sql": "A query de referencia que resolve o exercicio.",
  "success_message": "Uma frase curta de elogio/confirmacao.",
  "difficulty": "${opts.difficulty}",
  "tags": ["tag1", "tag2"]
}`;

  const raw = await callGemini(
    getSystemPrompt() + '\n\n' + instruction,
    [{ role: 'user', parts: [{ text: 'Gere os exercicios agora.' }] }],
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('O Gemini nao devolveu JSON valido. Tente gerar novamente.');
  }

  const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) {
    throw new Error('O Gemini nao devolveu uma lista de exercicios.');
  }

  return (list as QuestionDraft[])
    .filter((q) => q && q.title && q.description && q.expected_sql)
    .map((q) => ({
      title: String(q.title),
      description: String(q.description),
      expected_sql: String(q.expected_sql),
      success_message: String(q.success_message ?? 'Missao concluida.'),
      difficulty: (['facil', 'medio', 'dificil'].includes(q.difficulty)
        ? q.difficulty
        : opts.difficulty) as QuestionDraft['difficulty'],
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    }));
};
