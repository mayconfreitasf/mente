// Gera a pasta dist/ para a Vercel e para o app: transforma index.html (escrito sem <html>/<head>,
// como no link do Claude) num documento completo e copia os bancos de perguntas e as páginas.
// Para o app de iPhone e Android, rode com API_URL apontando para o site, por exemplo:
//   API_URL=https://jingar.com.br node build.js && npx cap sync
import fs from "node:fs";

const SAIDA = "dist";
const API = (process.env.API_URL || "").replace(/\/$/, "");
// Endereço do servidor usado pelo app nativo. No site fica vazio (o servidor é o próprio site).
const configuracao = `<script>window.JINGAR_API = ${JSON.stringify(API)};</script>`;
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(SAIDA);

const pagina = fs.readFileSync("index.html", "utf8");
const documento = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#150d11">
<link rel="icon" href="icone.svg" type="image/svg+xml">
${configuracao}
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${pagina}
</body>
</html>
`;
fs.writeFileSync(`${SAIDA}/index.html`, documento);
for (const f of ["perguntas.js", "dificeis.js", "muitodificeis.js", "icone.svg", "logo-email.png", "moderacao.html"]) fs.copyFileSync(f, `${SAIDA}/${f}`);
// Fontes embutidas (woff2), para o app abrir sem depender do Google Fonts.
fs.cpSync("fontes", `${SAIDA}/fontes`, { recursive: true });
for (const f of ["privacidade.html", "termos.html", "excluir-conta.html"]) fs.writeFileSync(`${SAIDA}/${f}`, fs.readFileSync(f, "utf8").replace("</head>", `${configuracao}\n</head>`));
console.log("dist/ pronto" + (API ? ` (app usando ${API})` : ""));
