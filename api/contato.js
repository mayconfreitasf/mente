// Encaminha o que chega em contato@jingar.com.br (caixa de entrada do Resend) para o e-mail do dono do app.
// O Resend chama este endereço no evento "email.received". O aviso traz só o id: o conteúdo vem da API do
// Resend com a nossa chave, então um aviso falso não encaminha nada. Variáveis: RESEND_API_KEY e
// CONTATO_ENCAMINHAR (para onde mandar). O remetente original vai no assunto, no topo e no "responder".
const CAIXA = "contato@jingar.com.br";

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lista = v => (Array.isArray(v) ? v : v ? [v] : []).join(", ");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const destino = process.env.CONTATO_ENCAMINHAR, chave = process.env.RESEND_API_KEY;
  if (!destino || !chave) return res.status(501).json({ erro: "Encaminhamento não configurado" });
  const ev = req.body || {};
  if (ev.type !== "email.received") return res.status(200).json({ ignorado: true });
  const id = String(ev.data && ev.data.email_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).end();

  const r = await fetch(`https://api.resend.com/emails/receiving/${id}`, { headers: { Authorization: `Bearer ${chave}` } }).catch(() => null);
  if (!r || !r.ok) return res.status(404).end();
  const m = await r.json();
  // Só a caixa de contato: outros endereços do domínio não são encaminhados por aqui.
  const para = [].concat(m.to || [], m.cc || [], m.received_for || []).map(x => String(x).toLowerCase());
  if (!para.some(x => x.includes(CAIXA))) return res.status(200).json({ ignorado: true });

  const de = String(m.from || "remetente desconhecido");
  const anexos = (m.attachments || []).map(a => a.filename).filter(Boolean);
  const topo = `<div style="font:14px/1.5 system-ui,sans-serif;background:#f4f1f2;border-radius:8px;padding:12px 14px;margin-bottom:16px">
    <b>Mensagem para ${CAIXA}</b><br>De: ${esc(de)}<br>Para: ${esc(lista(m.to))}${m.cc && m.cc.length ? `<br>Cc: ${esc(lista(m.cc))}` : ""}<br>
    Data: ${esc(m.created_at)}${anexos.length ? `<br>Anexos (ficam no Resend): ${esc(anexos.join(", "))}` : ""}<br>
    <span style="color:#666">Responder este e-mail responde direto para o remetente.</span></div>`;
  const corpo = m.html || `<pre style="white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif">${esc(m.text || "(sem texto)")}</pre>`;
  const envio = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", "Idempotency-Key": `contato-${id}` },
    body: JSON.stringify({
      from: `Contato Jingar <${CAIXA}>`, to: destino, reply_to: m.reply_to && m.reply_to.length ? m.reply_to : de,
      subject: `[Contato] ${m.subject || "(sem assunto)"} — de ${de}`,
      html: topo + corpo,
      text: `Mensagem para ${CAIXA}\nDe: ${de}\nPara: ${lista(m.to)}\nData: ${m.created_at || ""}\n\n${m.text || ""}`
    })
  }).catch(() => null);
  if (!envio || !envio.ok) return res.status(502).json({ erro: "Falha ao encaminhar" });
  return res.status(200).json({ encaminhado: true });
}
