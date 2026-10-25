// Filtro de palavrões e ofensas para o que outras pessoas veem: nome e "sobre você" do perfil, mensagens do chat
// e nomes do ranking dos desafios.
const semAcento = t => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const normal = t => semAcento(t).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/@/g, "a");

// Nomes do ranking: lista ampla (inclui palavras curtas e ambíguas, que num nome quase sempre são provocação).
const PROIBIDAS_NOME = ["porra", "caralho", "buceta", "bucet", "piroca", "pica", "rola", "cu", "cuzao", "foder", "foda", "fdp", "puta", "puto", "viado", "veado", "bicha", "sapatao", "traveco",
  "macaco", "preto sujo", "retardado", "mongol", "vagabunda", "vadia", "piranha", "corno", "otario", "babaca", "arrombado", "merda", "bosta", "estupro", "nazi", "hitler",
  "fuck", "shit", "bitch", "nigger", "nigga", "faggot", "cunt", "dick", "pussy", "whore", "slut", "rape"];
// Textos livres (perfil e chat): só palavrões e ofensas fortes, sem palavras comuns como "rola" ou "pica".
const OFENSAS = new Set(["caralho", "buceta", "bucetas", "piroca", "foder", "fodase", "fodas", "fdp", "puta", "putas", "arrombado", "arrombada", "viado", "viados", "traveco",
  "retardado", "retardada", "vagabunda", "vadia", "vadias", "cuzao", "porra", "nazista", "hitler",
  "fuck", "fucking", "motherfucker", "nigger", "nigga", "faggot", "cunt", "bitch", "whore", "slut", "pussy"]);

// Nome com palavrão, ofensa ou link: o ranking mostra "Jogador" no lugar.
export function nomeLimpo(nome, max = 20) {
  const n = typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, max) : "";
  if (!n) return "";
  const t = normal(n).replace(/[^a-z0-9 ]/g, " ");
  const palavras = t.split(/\s+/), junto = t.replace(/\s+/g, "");
  const ruim = /https?:|www\.|\.com/.test(n.toLowerCase()) || PROIBIDAS_NOME.some(p => p.includes(" ") ? t.includes(p) : palavras.includes(p) || (p.length >= 5 && junto.includes(p)));
  return ruim ? "Jogador" : n;
}

// Troca cada palavrão ou ofensa por asteriscos e mantém o resto do texto.
export const mascarar = texto => typeof texto === "string"
  ? texto.replace(/[\p{L}\p{N}@]+/gu, w => OFENSAS.has(normal(w)) ? "*".repeat(w.length) : w)
  : texto;
