import { GoogleGenAI } from "@google/genai";

// Initialization with environment variable as strictly requested
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAiHelp = async (
  missionDesc: string,
  userSql: string,
  errorMessage?: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "⚠️ API Key não configurada. Configure process.env.API_KEY para usar a IA.";
    }

    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Você é um tutor de SQL paciente e didático.
      O aluno está tentando resolver esta missão: "${missionDesc}"
      
      O código SQL atual dele é: "${userSql}"
      ${errorMessage ? `O erro retornado pelo banco foi: "${errorMessage}"` : ''}

      Por favor, dê uma dica curta e direta sobre o que está errado ou como prosseguir. 
      NÃO dê a resposta completa. Explique o conceito.
      Se o erro for de sintaxe, aponte onde está.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Não foi possível gerar uma dica agora.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Erro ao conectar com o tutor IA. Tente novamente mais tarde.";
  }
};
