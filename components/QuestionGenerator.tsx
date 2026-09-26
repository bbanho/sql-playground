import React, { useState } from 'react';
import { generateQuestions, QuestionDraft } from '../services/ai';

/**
 * AI question generator.
 *
 * The generated exercises are drafts. Nothing is written to the student's bank
 * without an explicit click, and the student can edit every field first. The
 * question bank is theirs; the model only ever proposes.
 */
const QuestionGenerator: React.FC<{
  schema: string;
  disabled: boolean;
  onAccept: (drafts: QuestionDraft[]) => Promise<void> | void;
}> = ({ schema, disabled, onAccept }) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<QuestionDraft['difficulty']>('medio');
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await generateQuestions({ topic, count, difficulty, schema });
      if (result.length === 0) {
        setError('O Gemini não devolveu nenhum exercício utilizável. Tente outra vez.');
      }
      setDrafts(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao gerar exercícios.');
    } finally {
      setBusy(false);
    }
  };

  const update = (i: number, field: keyof QuestionDraft, value: string) => {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-slate-500 uppercase block mb-1">Tópico</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex.: junções entre cursos e disciplinas"
          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 uppercase block mb-1">Quantidade</label>
          <input
            type="number"
            min={1}
            max={8}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 uppercase block mb-1">Dificuldade</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as QuestionDraft['difficulty'])}
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm text-slate-700 dark:text-slate-200"
          >
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
      </div>

      <button
        onClick={run}
        disabled={disabled || busy || !topic.trim()}
        className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
      >
        {busy ? 'Gerando...' : 'Gerar exercícios'}
      </button>

      {disabled && !busy && (
        <p className="text-[10px] text-orange-500 leading-tight">Aguarde o processo atual terminar.</p>
      )}
      {error && <p className="text-[10px] text-red-500 leading-tight">{error}</p>}

      {drafts.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase">
            {drafts.length} rascunho{drafts.length > 1 ? 's' : ''} — revise antes de salvar
          </p>
          {drafts.map((d, i) => (
            <div
              key={i}
              className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm space-y-2"
            >
              <input
                value={d.title}
                onChange={(e) => update(i, 'title', e.target.value)}
                className="w-full px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm"
              />
              <textarea
                value={d.description}
                onChange={(e) => update(i, 'description', e.target.value)}
                rows={3}
                className="w-full px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm resize-y leading-relaxed"
              />
              <textarea
                value={d.expected_sql}
                onChange={(e) => update(i, 'expected_sql', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 text-[10px] font-mono text-green-700 dark:text-green-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-sm resize-y"
              />
            </div>
          ))}
          <button
            onClick={() => onAccept(drafts)}
            className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-sm bg-green-600 text-white hover:bg-green-700"
          >
            Salvar no banco de questões
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;
