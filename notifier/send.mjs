// Roda todo dia no GitHub Actions: olha as assinaturas e manda notificação para o celular.
import admin from "firebase-admin";

const conta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!conta.project_id) { console.error("Falta o segredo FIREBASE_SERVICE_ACCOUNT no GitHub."); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(conta) });
const db = admin.firestore();
const fcm = admin.messaging();

const APP_URL = process.env.APP_URL || "";
const TESTE = process.env.MODO === "teste";

// "Hoje" no horário de Nova York
const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const [Y, M, D] = partes.split("-").map(Number);
const hoje = new Date(Date.UTC(Y, M - 1, D));
const DIA = 864e5;

function proxima(a) {
  if (!a.prox) return null;
  const [y, m, d] = a.prox.split("-").map(Number);
  let dt = new Date(Date.UTC(y, m - 1, d)), g = 0;
  while (dt < hoje && g++ < 600) {
    if (a.freq === "Anual") dt.setUTCFullYear(dt.getUTCFullYear() + 1); else dt.setUTCMonth(dt.getUTCMonth() + 1);
  }
  return dt;
}
const money = n => "$" + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quando = dias => dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `Em ${dias} dias`;

async function enviar(uid, titulo, corpo) {
  const toks = await db.collection("users").doc(uid).collection("tokens").get();
  if (toks.empty) { console.log(uid, "sem celular cadastrado"); return; }
  for (const t of toks.docs) {
    const token = t.data().token;
    try {
      await fcm.send({ token, notification: { title: titulo, body: corpo }, webpush: { fcmOptions: APP_URL ? { link: APP_URL } : undefined, headers: { Urgency: "high" } } });
      console.log(uid, "enviado:", titulo);
    } catch (e) {
      const c = e && e.code || "";
      console.log(uid, "falhou:", c);
      if (c.includes("registration-token-not-registered") || c.includes("invalid-registration-token") || c.includes("invalid-argument")) await t.ref.delete();
    }
  }
}

const usuarios = await db.collection("users").listDocuments();
for (const u of usuarios) {
  const prefsSnap = await u.get();
  const prefs = prefsSnap.exists ? prefsSnap.data() : {};
  if (TESTE) { await enviar(u.id, "Minhas Finanças", "Teste: as notificações estão funcionando ✅"); continue; }

  const dias = prefs.diasAntes ?? 2;
  const assins = (await u.collection("itens").where("t", "==", "assin").get()).docs.map(d => d.data())
    .filter(a => a.status !== "cancelada");
  const chegando = assins.map(a => ({ a, d: proxima(a) }))
    .filter(x => x.d && (x.d - hoje) / DIA >= 0 && (x.d - hoje) / DIA <= dias)
    .sort((x, y) => x.d - y.d);

  const linhas = chegando.map(({ a, d }) => {
    const n = Math.round((d - hoje) / DIA);
    const aviso = a.status === "cancelar" ? " — você marcou para cancelar!" : "";
    return `${quando(n)}: ${a.nome} ${money(a.valor)}${a.onde ? " (" + a.onde + ")" : ""}${aviso}`;
  });

  if (D === 5 && prefs.lembreteExtrato !== false) linhas.push("Dia 5: mande os extratos do mês passado para atualizar seus gastos.");
  if (!linhas.length) { console.log(u.id, "nada para avisar hoje"); continue; }

  const titulo = chegando.length === 1
    ? `${quando(Math.round((chegando[0].d - hoje) / DIA))} cobra ${chegando[0].a.nome}`
    : chegando.length > 1 ? `${chegando.length} cobranças chegando` : "Lembrete";
  await enviar(u.id, titulo, linhas.join("\n"));
}
console.log("Pronto.");
