import { sendMail, verifyConnection } from "./mailer";

await verifyConnection();

// 1. Email simples em texto
await sendMail({
  to: "usuario@exemplo.com",
  subject: "Bem-vindo ao Kids Tales!",
  text: "Olá! Sua conta foi criada com sucesso.",
});

// 2. Email em HTML
await sendMail({
  to: "usuario@exemplo.com",
  subject: "Sua história está pronta",
  html: `
    <h1>Olá!</h1>
    <p>Sua história <strong>A Floresta Mágica</strong> já está disponível.</p>
    <a href="https://kids-tales.com/stories/123">Ler agora</a>
  `,
});

// 3. Email para múltiplos destinatários com anexo
await sendMail({
  to: ["mae@exemplo.com", "pai@exemplo.com"],
  subject: "Relatório semanal de leitura",
  html: `<p>Seu filho leu <strong>3 histórias</strong> esta semana!</p>`,
  attachments: [
    {
      filename: "relatorio.txt",
      content: "Histórias lidas: A Floresta Mágica, O Dragão Azul, A Sereia",
    },
  ],
});
