// Funções de segurança das contas: senha com scrypt, tokens de sessão e verificação de tokens do Google e da Apple.
// Arquivos de api/ que começam com "_" não viram rota na Vercel.
import crypto from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, tamanho: 64 };

export function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(senha, sal, SCRYPT.tamanho, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${sal.toString("base64")}$${h.toString("base64")}`;
}

export function confereSenha(senha, guardado) {
  const [tipo, n, sal, hash] = String(guardado || "").split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const h = crypto.scryptSync(senha, Buffer.from(sal, "base64"), esperado.length, { N: Number(n), r: SCRYPT.r, p: SCRYPT.p });
  return crypto.timingSafeEqual(h, esperado);
}

// O token vai só no cookie do navegador; o banco guarda apenas o hash dele.
export const novoToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = t => crypto.createHash("sha256").update(String(t)).digest("hex");

export const usuarioValido = u => /^[a-z]{4,15}$/.test(u);
// Celular brasileiro: DDD + 9 + 8 dígitos, guardado como +55DDD9XXXXXXXX.
export function normalizaTelefone(x) {
  let d = String(x || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return /^[1-9]{2}9\d{8}$/.test(d) ? "+55" + d : null;
}
export const novoCodigo = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
export const emailValido = e => e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const senhaValida = s => typeof s === "string" && s.length >= 6 && s.length <= 128 && /[A-Za-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);

// Tokens do "Entrar com Google" e "Entrar com Apple": JWT RS256 assinado com as chaves públicas do provedor.
const PROVEDORES = {
  google: { jwks: "https://www.googleapis.com/oauth2/v3/certs", emissores: ["https://accounts.google.com", "accounts.google.com"] },
  apple: { jwks: "https://appleid.apple.com/auth/keys", emissores: ["https://appleid.apple.com"] }
};
const cacheChaves = {};

async function chaves(url) {
  const c = cacheChaves[url];
  if (c && Date.now() - c.quando < 3600 * 1000) return c.chaves;
  const r = await fetch(url);
  if (!r.ok) throw new Error("jwks");
  const { keys } = await r.json();
  cacheChaves[url] = { quando: Date.now(), chaves: keys };
  return keys;
}

export async function verificaTokenProvedor(provedor, token, audiencia) {
  const cfg = PROVEDORES[provedor];
  if (!cfg || !audiencia || typeof token !== "string") return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  let cab, dados;
  try {
    cab = JSON.parse(Buffer.from(partes[0], "base64url").toString());
    dados = JSON.parse(Buffer.from(partes[1], "base64url").toString());
  } catch { return null; }
  if (cab.alg !== "RS256" || !cab.kid) return null;
  const jwk = (await chaves(cfg.jwks)).find(k => k.kid === cab.kid);
  if (!jwk) return null;
  const chave = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.verify("RSA-SHA256", Buffer.from(partes[0] + "." + partes[1]), chave, Buffer.from(partes[2], "base64url"));
  if (!ok) return null;
  const agora = Math.floor(Date.now() / 1000);
  if (!cfg.emissores.includes(dados.iss) || dados.aud !== audiencia || !(dados.exp > agora) || !dados.sub) return null;
  const verificado = dados.email_verified === true || dados.email_verified === "true";
  return { sub: String(dados.sub), email: verificado && typeof dados.email === "string" ? dados.email.toLowerCase() : null };
}
