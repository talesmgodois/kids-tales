import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const PROMPT_TEMPLATE = (title: string) => `
Você é um escritor de histórias infantis.
Escreva um blog post completo para o título: "${title}"

Regras:
- Retorne SOMENTE o HTML do conteúdo (sem <html>, <head> ou <body>)
- Use tags semânticas: <h2> para subtítulos, <p> para parágrafos, <ul>/<li> para listas
- Entre 400 e 600 palavras
- Linguagem acessível para crianças e pais
- Tom: lúdico, envolvente e educativo
- Termine com um parágrafo de moral ou lição da história
`;

export async function generateBlogPost(title: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: PROMPT_TEMPLATE(title),
  });

  const html = response.text ?? "";

  // Remove blocos de código markdown caso o modelo os inclua
  return html.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();
}
