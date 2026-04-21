import { generateBlogPost } from "./gemini";
import { ghost } from "../ghost/client";

const TITLES_FILE = new URL("../../titles.txt", import.meta.url).pathname;

async function run() {
  const file = Bun.file(TITLES_FILE);
  const content = await file.text();

  const titles = content
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  console.log(`${titles.length} títulos encontrados em titles.txt\n`);

  for (const title of titles) {
    console.log(`Gerando: "${title}"...`);

    try {
      // 1. Gera o conteúdo HTML via Gemini
      const html = await generateBlogPost(title);

      // 2. Cria o post no Ghost como rascunho
      const post = await ghost.createPost({ title, html, tags: ["ia", "historias"] });
      console.log(`  Rascunho criado: ${post.id}`);

      // 3. Publica imediatamente
      const published = await ghost.publishPost(post.id);
      console.log(`  Publicado: ${published.url}\n`);
    } catch (err) {
      console.error(`  Erro em "${title}":`, err);
    }
  }

  console.log("Concluído.");
}

run();
