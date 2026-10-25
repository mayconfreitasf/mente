// Bancos de perguntas do app (perguntas.js, dificeis.js, muitodificeis.js) lidos no servidor, para conferir as respostas.
// Os arquivos são os mesmos do site: definem window.MENTE_*; aqui rodam com um "window" falso.
import fs from "node:fs";
import path from "node:path";

let cache = null;
function carregar() {
  if (cache) return cache;
  const w = {};
  for (const f of ["perguntas.js", "dificeis.js", "muitodificeis.js"]) new Function("window", fs.readFileSync(path.join(process.cwd(), f), "utf8"))(w);
  const cats = w.MENTE_CATEGORIAS || [];
  cache = { 1: Object.fromEntries(cats.map(c => [c.id, c.q])), 2: w.MENTE_DIFICEIS || {}, 3: w.MENTE_MUITO_DIFICEIS || {}, nomes: Object.fromEntries(cats.map(c => [c.id, c.nome])) };
  return cache;
}
// Pergunta do banco no formato [enunciado, certa, errada, errada], ou null.
export const perguntaDoBanco = (modo, cat, i) => ((carregar()[modo] || {})[cat] || [])[i] || null;
export const nomeDoAssunto = id => carregar().nomes[id] || null;
// Todas as perguntas de um assunto nos três modos, com a chave "modo:índice" (usada pela prova).
export function perguntasDoAssunto(cat) {
  const b = carregar(), out = [];
  for (const modo of [1, 2, 3]) ((b[modo] || {})[cat] || []).forEach((q, i) => out.push({ chave: `${modo}:${i}`, modo, i, q }));
  return out;
}
