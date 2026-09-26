import React, { useState } from 'react';
import {
  AiSource,
  getSource,
  setSource,
  getApiKey,
  setApiKey,
  getSystemPrompt,
  setSystemPrompt,
  getModel,
  setModel,
  getEndpoint,
  setEndpoint,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_KEY_URL,
} from '../services/ai';

/**
 * Model source and tutor prompt.
 *
 * There is no sign-in and no secret belonging to this project. The default
 * source is a local endpoint on the student's own machine, which needs no
 * credential at all. The alternative is their personal Gemini key, pasted by
 * them and kept in this browser.
 */
const AiSettings: React.FC = () => {
  const [source, setSourceState] = useState<AiSource>(getSource());
  const [apiKey, setKey] = useState(getApiKey());
  const [prompt, setPrompt] = useState(getSystemPrompt());
  const [model, setModelValue] = useState(getModel());
  const [endpoint, setEndpointState] = useState(getEndpoint());

  const pick = (next: AiSource) => {
    setSourceState(next);
    setSource(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Assistente</h4>
        <span className="text-[10px] font-mono text-green-500">SEM LOGIN</span>
      </div>

      <p className="text-[10px] text-slate-400 leading-tight">
        O app é estático e não tem servidor. Nada é enviado para lugar nenhum
        além do modelo que você escolher abaixo.
      </p>

      {/* Source */}
      <div className="flex gap-1">
        {([['local', 'Modelo local'], ['gemini', 'Chave Gemini']] as [AiSource, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-wider rounded-sm border transition-colors ${
              source === key
                ? 'bg-blue-500 text-white border-blue-500'
                : 'text-slate-500 border-slate-300 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {source === 'local' ? (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase block mb-1">Endpoint</label>
            <input
              value={endpoint}
              onChange={(e) => setEndpointState(e.target.value)}
              onBlur={() => setEndpoint(endpoint)}
              placeholder="http://localhost:11434/v1"
              className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Qualquer servidor compatível com OpenAI na sua máquina: Ollama, LM Studio,
            llama.cpp. Nenhuma credencial é necessária.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            onBlur={() => setApiKey(apiKey)}
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
            A chave fica só neste navegador, em localStorage. Sai da sua máquina
            direto para o Google e nunca entra no bundle.
          </p>
        </div>
      )}

      {/* Model */}
      <div>
        <label className="text-[10px] text-slate-500 uppercase block mb-1">Modelo</label>
        {source === 'local' ? (
          <input
            value={model}
            onChange={(e) => setModelValue(e.target.value)}
            onBlur={() => setModel(model)}
            placeholder="llama3.1:8b"
            className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
          />
        ) : (
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
        )}
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
          Define como o modelo atua como tutor. Editável porque o método de estudo é
          escolha do aluno.
        </p>
      </div>
    </div>
  );
};

export default AiSettings;
