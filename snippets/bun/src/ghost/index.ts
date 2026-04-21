import { ghost } from "./client";

// ── 1. Criar post como rascunho ───────────────────────────────────────────
const post = await ghost.createPost({
  title: "Bem-vindo ao Kids Tales",
  html: `
    <p>Esta é a plataforma onde crianças descobrem histórias incríveis.</p>
    <h2>Por que ler?</h2>
    <ul>
      <li>Desenvolve criatividade</li>
      <li>Expande o vocabulário</li>
      <li>Estimula a imaginação</li>
    </ul>
  `,
  tags: ["introducao", "leitura"],
  excerpt: "Conheça a plataforma Kids Tales.",
});

console.log("Post criado:", post.id, "| status:", post.status);

// ── 2. Editar o post ──────────────────────────────────────────────────────
const edited = await ghost.updatePost(post.id, {
  title: "Bem-vindo ao Kids Tales!",
  excerpt: "Conheça a plataforma Kids Tales e comece a ler hoje.",
});

console.log("Post editado:", edited.title);

// ── 3. Publicar ───────────────────────────────────────────────────────────
const published = await ghost.publishPost(post.id);

console.log("Post publicado:", published.url);

// ── 4. Deletar ────────────────────────────────────────────────────────────
await ghost.deletePost(post.id);

console.log("Post deletado.");
