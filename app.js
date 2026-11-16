// Minhas Finanças — liga as telas ao Firebase (login, dados e notificações)
import { firebaseConfig, vapidKey } from "./firebase-config.js";
import { iniciarApp } from "./core.js?v=11";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Service worker (app offline + notificações) ----------
let swReg = null;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(r => { swReg = r; }).catch(() => {});
}

// ---------- Firebase ----------
const configurado = !Object.values(firebaseConfig).some(v => String(v).includes("COLE_AQUI"));
if (!configurado) {
  $("#login").classList.remove("hide");
  $("#login-sub").textContent = "Falta colar os dados do Firebase no arquivo firebase-config.js (passo 2 do guia).";
  $("#login-form").classList.add("hide");
  $("#login-toggle").classList.add("hide");
  $("#login-reset").classList.add("hide");
  throw new Error("firebase-config.js não preenchido");
}
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = initializeFirestore(fb, { localCache: persistentLocalCache() });

// ---------- Store usado pelas telas ----------
let itensCol = null, onItems = null, unsub = null, usuario = null;
const store = {
  ready: () => !!itensCol,
  subscribe(f) { onItems = f; },
  async save(id, obj) { if (id) await setDoc(doc(itensCol, id), obj); else await addDoc(itensCol, obj); },
  async remove(id) { await deleteDoc(doc(itensCol, id)); },
  async bulk(pares, prog) {
    for (let i = 0; i < pares.length; i += 400) {
      const b = writeBatch(db);
      pares.slice(i, i + 400).forEach(([id, o]) => b.set(doc(itensCol, id), o));
      await b.commit();
      prog && prog(Math.min(i + 400, pares.length));
    }
  }
};

const ui = iniciarApp(store, {
  extratoUrl: "transacoes.json",
  nome: "Heloisa",
  assistente: "Lumi",
  afterRender: atualizarAvisoNotif
});

// ---------- Login ----------
let modoCriar = false;
$("#login-toggle").onclick = () => {
  modoCriar = !modoCriar;
  $("#login-btn").textContent = modoCriar ? "Criar conta" : "Entrar";
  $("#login-toggle").textContent = modoCriar ? "Já tenho conta. Entrar" : "Primeira vez? Criar conta";
  $("#login-sub").textContent = modoCriar ? "Crie sua conta com e-mail e uma senha (mínimo 6 letras ou números)." : "Entre para ver suas contas.";
};
$("#login-form").onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target).entries());
  $("#login-err").textContent = "";
  try {
    if (modoCriar) await createUserWithEmailAndPassword(auth, f.email.trim(), f.senha);
    else await signInWithEmailAndPassword(auth, f.email.trim(), f.senha);
  } catch (err) {
    const c = err && err.code || "";
    $("#login-err").textContent =
      c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") ? "E-mail ou senha errados." :
      c.includes("email-already-in-use") ? "Esse e-mail já tem conta. Toque em \"Já tenho conta\"." :
      c.includes("weak-password") ? "Senha muito curta: use pelo menos 6 caracteres." :
      c.includes("operation-not-allowed") || c.includes("admin-restricted") ? "Criação de contas está desligada no Firebase." :
      "Não deu certo. Confira a internet e tente de novo.";
  }
};
$("#login-reset").onclick = async () => {
  const email = $("#login-form").elements.email.value.trim();
  if (!email) { $("#login-err").textContent = "Escreva seu e-mail acima e toque de novo em \"Esqueci a senha\"."; return; }
  try { await sendPasswordResetEmail(auth, email); $("#login-err").textContent = "Enviei um e-mail para você criar uma senha nova."; }
  catch (_) { $("#login-err").textContent = "Não consegui enviar. Confira o e-mail."; }
};

onAuthStateChanged(auth, user => {
  usuario = user;
  if (unsub) { unsub(); unsub = null; }
  if (!user) {
    itensCol = null;
    $("#app").classList.add("hide"); $("#fab").classList.add("hide");
    $("#login").classList.remove("hide");
    return;
  }
  $("#login").classList.add("hide");
  $("#app").classList.remove("hide"); $("#fab").classList.remove("hide");
  itensCol = collection(db, "users", user.uid, "itens");
  const st = $("#status");
  st.classList.remove("hide"); st.textContent = "Carregando seus dados…";
  const timer = setTimeout(() => { st.textContent = "Sem internet agora — mostrando o que ficou salvo no celular."; }, 10000);
  unsub = onSnapshot(itensCol, { includeMetadataChanges: false }, snap => {
    clearTimeout(timer); st.classList.add("hide");
    const lista = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    onItems && onItems(lista);
    if (!lista.length) oferecerDadosIniciais();
  }, () => { clearTimeout(timer); st.classList.remove("hide"); st.textContent = "Não consegui carregar seus dados agora."; });
});

// ---------- Dados iniciais (assinaturas já levantadas) ----------
let ofereceu = false;
async function oferecerDadosIniciais() {
  if (ofereceu) return; ofereceu = true;
  try {
    const r = await fetch("seed.json"); const seed = await r.json();
    await store.bulk(seed.map((o, i) => ["a" + String(i + 1).padStart(2, "0"), o]));
  } catch (_) {}
}

// ---------- Configurações ----------
const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function atualizarAvisoNotif() {
  const box = $("#aviso-notif"); if (!box) return;
  const perm = ("Notification" in window) ? Notification.permission : "indisponivel";
  if (perm === "granted") { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="alert">Ative as notificações para ser avisada antes de cada cobrança. <b><a href="#" id="go-config" style="color:inherit">Ativar</a></b></div>`;
  $("#go-config").onclick = e => { e.preventDefault(); abrirConfig(); };
}

$("#b-config").onclick = abrirConfig;

async function abrirConfig() {
  const prefsRef = doc(db, "users", usuario.uid);
  let prefs = {};
  try { const s = await getDoc(prefsRef); prefs = s.exists() ? s.data() : {}; } catch (_) {}
  const dias = prefs.diasAntes ?? 2;
  const perm = ("Notification" in window) ? Notification.permission : "indisponivel";
  const form = $("#form");
  form.innerHTML = `<h3>Configurações</h3>
    <label>Notificações neste celular</label>
    <div class="card" style="padding:12px 14px">
      <div id="n-status" class="note" style="margin-top:0">${perm === "granted" ? "✅ Ativadas." : "Ainda não ativadas."}</div>
      ${ehIOS && !instalado ? `<div class="note">No iPhone, primeiro instale o app: no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>. Depois abra o app pela tela de início e volte aqui.</div>` : ""}
      <div class="btns" style="margin-top:10px"><button type="button" class="btn pri" id="n-ativar">${perm === "granted" ? "Ativar de novo" : "Ativar notificações"}</button></div>
    </div>
    <label>Avisar quantos dias antes da cobrança?</label>
    <select name="diasAntes">${[1, 2, 3, 5, 7].map(n => `<option value="${n}" ${n === dias ? "selected" : ""}>${n} dia${n > 1 ? "s" : ""} antes</option>`).join("")}</select>
    <label><input type="checkbox" name="lembreteExtrato" style="width:auto;margin-right:8px" ${prefs.lembreteExtrato === false ? "" : "checked"}>Lembrar no dia 5 de mandar os extratos</label>
    <label>Backup</label>
    <div class="btns" style="margin-top:0"><button type="button" class="btn sec" id="bk-exp">Baixar backup</button><label class="btn sec" style="text-align:center;margin:0;color:var(--ink);font-size:16px">Restaurar<input type="file" id="bk-imp" accept="application/json" style="display:none"></label></div>
    <div class="btns"><button type="button" class="btn del" id="b-sair">Sair</button><button type="button" class="btn sec" id="b-fechar">Fechar</button><button type="button" class="btn pri" id="b-salvar-cfg">Salvar</button></div>
    <div class="err" id="f-err"></div>`;
  abrirSheet();
  $("#b-fechar").onclick = fecharSheet;
  $("#b-sair").onclick = async () => { fecharSheet(); await signOut(auth); };
  $("#n-ativar").onclick = ativarNotificacoes;
  $("#bk-exp").onclick = () => {
    const dados = JSON.stringify(ui.getItems(), null, 1);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dados], { type: "application/json" }));
    a.download = "minhas-financas-backup.json"; a.click();
  };
  $("#bk-imp").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const lista = JSON.parse(await f.text());
      const pares = lista.map(o => { const { id, ...rest } = o; return [id || crypto.randomUUID(), rest]; });
      const doExtrato = pares.filter(([, o]) => o.origem === "extrato");
      const outros = pares.filter(([, o]) => o.origem !== "extrato");
      if (outros.length) await store.bulk(outros);
      let msg = outros.length ? outros.length + " itens restaurados. " : "";
      if (doExtrato.length) {
        const r = await ui.importarComConferencia(doExtrato);
        msg += `Extrato: ${r.novos} lançamentos novos` + (r.conferidos ? ` e ${r.conferidos} que você já tinha lançado (marcados com ✓, sem duplicar).` : ".");
      }
      $("#f-err").textContent = msg || "Nada novo nesse arquivo.";
    } catch (_) { $("#f-err").textContent = "Esse arquivo não parece um backup ou extrato do app."; }
  };

  $("#b-salvar-cfg").onclick = async () => {
    const fd = new FormData(form);
    try {
      await setDoc(prefsRef, { diasAntes: +fd.get("diasAntes"), lembreteExtrato: fd.get("lembreteExtrato") === "on" }, { merge: true });
      fecharSheet();
    } catch (_) { $("#f-err").textContent = "Não consegui salvar."; }
  };
}

async function ativarNotificacoes() {
  const out = $("#n-status");
  try {
    if (!("Notification" in window) || !(await isSupported())) {
      out.textContent = ehIOS ? "No iPhone, as notificações só funcionam com o app instalado na tela de início (iOS 16.4 ou mais novo)." : "Este navegador não aceita notificações.";
      return;
    }
    const p = await Notification.requestPermission();
    if (p !== "granted") { out.textContent = "Você não permitiu. Para ligar depois: Ajustes do iPhone → Notificações → Finanças."; return; }
    const reg = swReg || await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(fb), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) { out.textContent = "Não consegui ativar. Tente de novo."; return; }
    await setDoc(doc(db, "users", usuario.uid, "tokens", token.replace(/\//g, "_")), { token, criado: Date.now(), aparelho: navigator.userAgent.slice(0, 120) });
    await setDoc(doc(db, "users", usuario.uid), { notificar: true }, { merge: true });
    out.textContent = "✅ Ativadas! Você vai receber os avisos neste celular.";
    atualizarAvisoNotif();
  } catch (err) {
    out.textContent = "Não consegui ativar: " + esc(err && err.message || "erro desconhecido");
  }
}

function abrirSheet() { $("#sheet-bg").style.display = "block"; requestAnimationFrame(() => $("#sheet").classList.add("open")); }
function fecharSheet() { $("#sheet").classList.remove("open"); setTimeout(() => $("#sheet-bg").style.display = "none", 200); }
