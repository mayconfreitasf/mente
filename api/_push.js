// Notificações push de match e mensagem nova.
// Android: Firebase Cloud Messaging (FIREBASE_SERVICE_ACCOUNT com o JSON da conta de serviço do Firebase).
// iPhone: Apple Push Notification service (APNS_KEY com o conteúdo do arquivo .p8, APNS_KEY_ID, APNS_TEAM_ID;
// APNS_PRODUCAO=1 para apps da App Store e do TestFlight). Sem essas variáveis, nada é enviado.
import crypto from "node:crypto";
import http2 from "node:http2";
import { sql } from "./_banco.js";

const BUNDLE = process.env.APNS_BUNDLE_ID || "br.com.jingar.app";
const b64url = x => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const comLimite = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(ok, ms))]);

let tokenGoogle = null;
async function acessoFirebase(conta) {
  if (tokenGoogle && tokenGoogle.expira > Date.now() + 60000) return tokenGoogle.valor;
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64url({ alg: "RS256", typ: "JWT" }) + "." + b64url({ iss: conta.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: agora, exp: agora + 3600 });
  const jwt = corpo + "." + crypto.sign("RSA-SHA256", Buffer.from(corpo), conta.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("firebase-token");
  tokenGoogle = { valor: j.access_token, expira: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenGoogle.valor;
}
async function enviarAndroid(token, titulo, texto, dados) {
  let conta;
  try { conta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ""); } catch { return "sem-config"; }
  if (!conta.client_email || !conta.private_key || !conta.project_id) return "sem-config";
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
    method: "POST", headers: { Authorization: "Bearer " + await acessoFirebase(conta), "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title: titulo, body: texto }, data: dados, android: { priority: "high" } } })
  });
  if (r.status === 404 || r.status === 400) return "invalido";
  return r.ok ? "ok" : "erro";
}

let tokenApple = null;
function jwtApple() {
  if (tokenApple && tokenApple.criado > Date.now() - 50 * 60000) return tokenApple.valor;
  const corpo = b64url({ alg: "ES256", kid: process.env.APNS_KEY_ID }) + "." + b64url({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) });
  const chave = process.env.APNS_KEY.replace(/\\n/g, "\n");
  const assinatura = crypto.sign("sha256", Buffer.from(corpo), { key: chave, dsaEncoding: "ieee-p1363" }).toString("base64url");
  tokenApple = { valor: corpo + "." + assinatura, criado: Date.now() };
  return tokenApple.valor;
}
function enviarIos(token, titulo, texto, dados) {
  if (!process.env.APNS_KEY || !process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID) return Promise.resolve("sem-config");
  const host = process.env.APNS_PRODUCAO === "1" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  return new Promise(ok => {
    const cliente = http2.connect(host);
    cliente.on("error", () => ok("erro"));
    const req = cliente.request({
      ":method": "POST", ":path": "/3/device/" + token, authorization: "bearer " + jwtApple(),
      "apns-topic": BUNDLE, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json"
    });
    let status = 0;
    req.on("response", h => { status = h[":status"]; });
    req.on("end", () => { cliente.close(); ok(status === 200 ? "ok" : status === 410 || status === 400 ? "invalido" : "erro"); });
    req.on("error", () => { cliente.close(); ok("erro"); });
    req.end(JSON.stringify({ aps: { alert: { title: titulo, body: texto }, sound: "default" }, ...dados }));
  });
}

// Envia para todos os aparelhos da pessoa. Tokens recusados pelo Google ou pela Apple são apagados.
export async function avisar(usuarioId, titulo, texto, dados = {}) {
  try {
    const [u] = await sql`SELECT avisos FROM usuarios WHERE id = ${usuarioId}`;
    if (u && u.avisos === false) return;
    const aparelhos = await sql`SELECT token, plataforma FROM dispositivos WHERE usuario_id = ${usuarioId}`;
    await comLimite(Promise.all(aparelhos.map(async a => {
      const r = await (a.plataforma === "ios" ? enviarIos : enviarAndroid)(a.token, titulo, texto, dados).catch(() => "erro");
      if (r === "invalido") await sql`DELETE FROM dispositivos WHERE token = ${a.token}`;
    })), 4000);
  } catch (e) { console.error("push", e); }
}
