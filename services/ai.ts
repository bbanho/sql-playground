// AI study assistant.
//
// Design constraint: the app is static and open. There is no backend, no OAuth
// relay, and no secret belonging to this project. Whatever credential is used
// belongs to the student and never leaves their machine.
//
// Two sources, both run entirely in the browser:
//
//   local   An OpenAI-compatible endpoint on the student's own machine
//           (Ollama, LM Studio, llama.cpp). No credential at all. This is the
//           default, because a tool that asks for nothing can be used by anyone.
//
//   gemini  The student's personal Gemini API key, pasted by them and kept in
//           this browser's localStorage. It is sent from their machine straight
//           to Google and is never bundled, committed, or shipped.
//
// The system prompt is theirs too: configurable rather than hardcoded, because
// the study method is a personal choice, not a product decision.

const API_KEY_STORAGE = 'sqlpg.gemini.apiKey';
const PROMPT_STORAGE = 'sqlpg.gemini.systemPrompt';
const MODEL_STORAGE = 'sqlpg.gemini.model';
const HISTORY_STORAGE = 'sqlpg.gemini.history';
const SOURCE_STORAGE = 'sqlpg.gemini.source';
const ENDPOINT_STORAGE = 'sqlpg.gemini.endpoint';

export const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey';
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_ENDPOINT = 'http://localhost:11434/v1';

export type AiSource = 'local' | 'gemini';

export type QuestionDraft = {
  title: string;
  description: string;
  expected_sql: string;
  success_message: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  tags: string[];
};

export type ChatMessage = { role: 'user' | 'model'; text: string };

/**
 * Default study tutor. Configurable and overridable by the student: this is the
 * contract the model is held to, not a suggestion.
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
    /* storage unavailable (private mode); settings just won't persist */
  }
};

export const getSource = (): AiSource => {
  const stored = readStore(SOURCE_STORAGE);
  return stored === 'gemini' ? 'gemini' : 'local';
};
export const setSource = (source: AiSource): void => writeStore(SOURCE_STORAGE, source);

export const getApiKey = (): string => readStore(API_KEY_STORAGE) ?? '';
export const setApiKey = (key: string): void => writeStore(API_KEY_STORAGE, key.trim());

export const getSystemPrompt = (): string => readStore(PROMPT_STORAGE) ?? DEFAULT_SYSTEM_PROMPT;
export const setSystemPrompt = (prompt: string): void => writeStore(PROMPT_STORAGE, prompt);

export const getModel = (): string => readStore(MODEL_STORAGE) ?? DEFAULT_MODEL;
export const setModel = (model: string): void => writeStore(MODEL_STORAGE, model.trim());

export const getEndpoint = (): string => readStore(ENDPOINT_STORAGE) ?? DEFAULT_ENDPOINT;
export const setEndpoint = (url: string): void => writeStore(ENDPOINT_STORAGE, url.trim());

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

/** Strip markdown fences and any prose wrapped around the JSON payload. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const brace = body.indexOf('{');
  const bracket = body.indexOf('[');
  let from: number;
  if (brace >= 0 && bracket >= 0) from = Math.min(brace, bracket);
  else from = Math.max(brace, bracket);
  if (from < 0) return body.trim();
  const to = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  return body.slice(from, to + 1);
}

/** Whether a usable configuration exists. The local path needs nothing. */
export const getAuthStatus = async (): Promise<{ ready: boolean; detail?: string }> => {
  if (getSource() === 'local') return { ready: true, detail: getEndpoint() };
  return { ready: getApiKey().length > 0, detail: GEMINI_KEY_URL };
};

/**
 * One call to a chat model, whichever source is configured.
 *
 * The two APIs disagree on shape, so the response is read defensively rather
 * than assuming one of them: a local model may answer with OpenAI's
 * `choices[0].message.content` and Gemini with `candidates[0]...parts`.
 */
const callModel = async (systemPrompt: string, contents: { role: string; text: string }[]): Promise<string> => {
  const source = getSource();
  let res: Response;

  if (source === 'local') {
    const base = getEndpoint().replace(/\/+$/, '');
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          ...contents.map((c) => ({ role: c.role, content: c.text })),
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Endpoint local respondeu ${res.status}. ${body.slice(0, 160)}`);
    }
  } else {
    const key = getApiKey();
    if (!key) throw new Error(`Sem credencial. Pegue uma chave em ${GEMINI_KEY_URL}.`);
    const model = encodeURIComponent(getModel());
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents.map((c) => ({
            role: c.role === 'model' ? 'model' : 'user',
            parts: [{ text: c.text }],
          })),
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      },
    );
    if (res.status === 400) {
      throw new Error('Chave recusada pelo Google. Confira em ' + GEMINI_KEY_URL);
    }
    if (res.status === 429) throw new Error('Cota do Gemini esgotada.');
    if (res.status === 403) {
      throw new Error('Acesso negado (403). A API do Gemini pode não estar habilitada para esta chave.');
    }
    if (!res.ok) throw new Error(`Erro do Gemini (${res.status}): ${(await res.text()).slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text =
    data.choices?.[0]?.message?.content ??
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ??
    '';

  if (!text) throw new Error('O modelo devolveu uma resposta vazia.');
  return text;
};

/** Ask the tutor a question about the student's SQL. */
export const askTutor = async (question: string, context = ''): Promise<string> => {
  const history = getHistory();
  const contents = [
    ...history.map((m) => ({ role: m.role === 'model' ? 'model' : 'user', text: m.text })),
    { role: 'user', text: context ? `${context}\n\n---\n\n${question}` : question },
  ];

  const reply = await callModel(getSystemPrompt(), contents);
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

  const raw = await callModel(getSystemPrompt() + '\n\n' + instruction, [
    { role: 'user', text: 'Gere os exercicios agora.' },
  ]);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('O modelo nao devolveu JSON valido. Tente gerar novamente.');
  }

  const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) throw new Error('O modelo nao devolveu uma lista de exercicios.');

  return (list as QuestionDraft[])
    .filter((q) => q && q.title && q.description && q.expected_sql)
    .map((q) => ({
      title: String(q.title),
      description: String(q.description),
      expected_sql: String(q.expected_sql),
      success_message: String(q.success_message ?? 'Missao concluida.'),
      difficulty: (['facil', 'medio', 'dificil'].includes(q.difficulty) ? q.difficulty : opts.difficulty) as QuestionDraft['difficulty'],
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    }));
};
