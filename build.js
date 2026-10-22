// Gera a pasta dist/ para a Vercel: transforma index.html (escrito sem <html>/<head>,
// como no link do Claude) num documento completo e copia os bancos de perguntas.
import fs from "node:fs";

const SAIDA = "dist";
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
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${pagina}
</body>
</html>
`;
fs.writeFileSync(`${SAIDA}/index.html`, documento);
for (const f of ["perguntas.js", "dificeis.js", "muitodificeis.js", "icone.svg"]) fs.copyFileSync(f, `${SAIDA}/${f}`);
console.log("dist/ pronto");
