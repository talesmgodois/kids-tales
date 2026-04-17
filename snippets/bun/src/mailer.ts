import nodemailer from "nodemailer";

export interface MailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(options: MailOptions) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    ...options,
  });

  console.log(`Email enviado: ${info.messageId}`);
  return info;
}

export async function verifyConnection() {
  await transporter.verify();
  console.log("Conexão SMTP ok");
}
