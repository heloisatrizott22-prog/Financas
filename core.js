// Minhas Finanças — telas e lógica (independente de onde os dados ficam salvos)
// store = { subscribe(onItems, onError), save(id|null, obj), remove(id), bulk(list of [id,obj], onProgress) }

export function iniciarApp(store, opts = {}) {
const CATS=["Mercado","Delivery e restaurantes","Combustível e pedágio","Seguro do carro","Carro (outros)","Casa","Contas da casa","Compras","Beleza","Academia","Saúde","Transporte (Uber)","Lazer","Viagem","Assinaturas","Trabalho e ferramentas","Transferências (Zelle e outros)","Saque em dinheiro","Taxas e juros","Outros"];
const CATS_ENTRADA=["Renda","Trabalho","Reembolso","Presente","Outros"];
const CONTAS=["Dinheiro","Santander conta corrente","Santander cartão 3190","Cartão Consumers","Cartão Amazon","Cartão Macy's","Zelle"];
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const $=s=>document.querySelector(s);
const money=n=>(n<0?"-":"")+"$"+Math.abs(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const fmtData=d=>d?d.getDate()+" "+MESES[d.getMonth()].slice(0,3):"";
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const mesDe=d=>d.getFullYear()+"-"+pad(d.getMonth()+1);

let items=[], view="inicio", mes=mesDe(new Date()), filtro="todas", contaFiltro="Todas", importando=false;

if(opts.nome&&$("#ola")) $("#ola").textContent="Olá, "+opts.nome+"!";
document.querySelectorAll(".nome-assist").forEach(e=>e.textContent=opts.assistente||"Lumi");
$("#hoje").textContent="Hoje é "+new Date().getDate()+" de "+MESES[new Date().getMonth()]+".";

function proxima(a){
  let d=parse(a.prox); if(!d) return null; const h=today(); let g=0;
  while(d<h && g++<600){ if(a.freq==="Anual") d.setFullYear(d.getFullYear()+1); else d.setMonth(d.getMonth()+1); }
  return d;
}
const porMes=a=>a.freq==="Anual"?(+a.valor||0)/12:(+a.valor||0);
const porAno=a=>a.freq==="Anual"?(+a.valor||0):(+a.valor||0)*12;
const of=t=>items.filter(i=>i.t===t);
const soma=l=>l.reduce((s,x)=>s+(+x.valor||0),0);
const ordemData=(a,b)=>(b.data||"").localeCompare(a.data||"")||(b.criado||0)-(a.criado||0);

// mês com dados mais recente (para abrir a tela de gastos num mês que tem algo)
function ultimoMesComDados(){
  const ms=items.filter(i=>i.t==="gasto"||i.t==="entrada").map(i=>(i.data||"").slice(0,7)).filter(Boolean).sort();
  return ms.length?ms[ms.length-1]:mesDe(new Date());
}

function render(){
  const gastos=of("gasto"), entradas=of("entrada"), assins=of("assin"), bens=of("bem");
  const ativas=assins.filter(a=>a.status!=="cancelada");
  const mAtual=mesDe(new Date());
  const gMes=soma(gastos.filter(g=>(g.data||"").slice(0,7)===mAtual));
  const guard=soma(bens.filter(b=>b.tipo!=="Investimento"));
  const inv=soma(bens.filter(b=>b.tipo==="Investimento"));
  const aMes=ativas.reduce((s,a)=>s+porMes(a),0);

  $("#s-patr").textContent=money(guard+inv);
  $("#s-gastos").textContent=money(gMes);
  $("#s-assin").textContent=money(aMes);
  $("#s-guard").textContent=money(guard);
  $("#s-inv").textContent=money(inv);

  const h=today(), lim=new Date(h); lim.setDate(lim.getDate()+30);
  const prox=ativas.map(a=>({a,d:proxima(a)})).filter(x=>x.d&&x.d<=lim).sort((x,y)=>x.d-y.d);
  $("#prox").innerHTML=prox.length?prox.map(({a,d})=>{
    const dias=Math.round((d-h)/864e5);
    const quando=dias===0?"hoje":dias===1?"amanhã":"em "+dias+" dias";
    const aviso=a.status==="cancelar"?'<span class="pill p-cancelar">cancele antes</span> ':"";
    return `<button type="button" class="row" data-edit="${esc(a.id)}"><div class="main"><div class="t">${esc(a.nome)}</div><div class="s">${aviso}${fmtData(d)} · ${quando}</div></div><div class="amt">${money(+a.valor)}</div></button>`;
  }).join(""):'<div class="empty">Nenhuma cobrança nos próximos 30 dias.</div>';

  const ult=[...gastos,...entradas].sort(ordemData).slice(0,5);
  $("#ultimos").innerHTML=ult.length?ult.map(rowMov).join(""):'<div class="empty">Toque no + para anotar um gasto.</div>';

  // ---------- GASTOS ----------
  const [y,m]=mes.split("-").map(Number);
  $("#m-label").textContent=MESES[m-1][0].toUpperCase()+MESES[m-1].slice(1)+" "+y;
  const movsMes=items.filter(i=>(i.t==="gasto"||i.t==="entrada"||i.t==="fatura")&&(i.data||"").slice(0,7)===mes);
  const contasMes=["Todas",...CONTAS.filter(c=>movsMes.some(i=>i.pag===c)),...[...new Set(movsMes.map(i=>i.pag).filter(c=>c&&!CONTAS.includes(c)))]];
  if(!contasMes.includes(contaFiltro)) contaFiltro="Todas";
  $("#g-contas").innerHTML=contasMes.length>2?contasMes.map(c=>`<button class="chip ${c===contaFiltro?"on":""}" data-conta="${esc(c)}">${esc(c)}</button>`).join(""):"";
  const vis=movsMes.filter(i=>contaFiltro==="Todas"||i.pag===contaFiltro);
  const gV=vis.filter(i=>i.t==="gasto"), eV=vis.filter(i=>i.t==="entrada");
  const totG=soma(gV), totE=soma(eV);
  $("#g-total").textContent=money(totG);
  $("#g-entr").textContent=money(totE);
  const saldo=totE-totG;
  $("#g-saldo").textContent=(saldo>=0?"Sobrou ":"Faltou ")+money(Math.abs(saldo));
  $("#g-saldo").style.color=saldo>=0?"var(--accent)":"var(--red)";
  const porCat={}; gV.forEach(g=>porCat[g.cat||"Outros"]=(porCat[g.cat||"Outros"]||0)+(+g.valor||0));
  const cats=Object.entries(porCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]); const max=cats.length?cats[0][1]:1;
  $("#g-cats").innerHTML=cats.length?'<div class="lbl" style="font-size:13px;color:var(--muted)">Gastos por categoria</div>'+cats.map(([c,v])=>`<div class="catrow"><span>${esc(c)}</span><b>${money(v)}</b></div><div class="bar"><i style="width:${Math.max(3,v/max*100)}%"></i></div>`).join(""):'<div class="lbl" style="font-size:14px;color:var(--muted)">Nenhum gasto neste mês.</div>';
  $("#g-list").innerHTML=vis.length?[...vis].sort(ordemData).map(rowMov).join(""):'<div class="empty">Nada por aqui ainda.</div>';

  // importar extratos
  const temExtrato=items.some(i=>i.origem==="extrato");
  $("#g-import").innerHTML=(!temExtrato&&opts.extratoUrl)?`<div class="card" style="margin-bottom:12px"><b>Trazer os extratos de agosto a outubro</b><div class="note">São 196 lançamentos dos seus cartões e da conta Santander, já organizados por categoria.</div><div class="btns"><button class="btn pri" id="b-import" ${importando?"disabled":""}>${importando?"Importando…":"Importar agora"}</button></div><div class="note" id="imp-prog"></div></div>`:"";
  if($("#b-import")) $("#b-import").onclick=importarExtratos;

  // ---------- ASSINATURAS ----------
  $("#a-mes").textContent=money(aMes);
  $("#a-ano").textContent=money(ativas.reduce((s,a)=>s+porAno(a),0));
  $("#a-econ").textContent=money(assins.filter(a=>a.status==="cancelada").reduce((s,a)=>s+porAno(a),0));
  const ordem={cancelar:0,ativa:1,cancelada:2};
  const lista=assins.filter(a=>filtro==="todas"||a.status===filtro).sort((a,b)=>(ordem[a.status]-ordem[b.status])||porAno(b)-porAno(a));
  $("#a-list").innerHTML=lista.length?lista.map(a=>{
    const d=a.status!=="cancelada"?proxima(a):null;
    const lbl={ativa:"Ativa",cancelar:"Vou cancelar",cancelada:"Cancelada"}[a.status]||"Ativa";
    return `<button type="button" class="row ${a.status==="cancelada"?"dim":""}" data-edit="${esc(a.id)}"><div class="main"><div class="t">${esc(a.nome)}</div><div class="s"><span class="pill p-${esc(a.status||"ativa")}">${lbl}</span> ${esc(a.onde||"")}${d?" · próxima "+fmtData(d):""}</div></div><div class="amt">${money(+a.valor)}<small>${a.freq==="Anual"?"por ano":"por mês"}</small></div></button>`;
  }).join(""):'<div class="empty">Nenhuma assinatura aqui.</div>';

  // ---------- PATRIMÔNIO ----------
  $("#p-guard").textContent=money(guard); $("#p-inv").textContent=money(inv);
  const rowBem=b=>{
    const meta=+b.meta>0?`<div class="bar"><i style="width:${Math.min(100,(+b.valor||0)/(+b.meta)*100)}%"></i></div><div class="s">Meta ${money(+b.meta)} · ${Math.round((+b.valor||0)/(+b.meta)*100)}%</div>`:"";
    const at=b.atualizado?"atualizado em "+fmtData(parse(b.atualizado)):"";
    return `<button type="button" class="row" data-edit="${esc(b.id)}"><div class="main"><div class="t">${esc(b.nome)}</div><div class="s">${esc(b.onde||"")}${b.onde&&at?" · ":""}${at}</div>${meta}</div><div class="amt">${money(+b.valor)}</div></button>`;
  };
  const ec=bens.filter(b=>b.tipo!=="Investimento"), iv=bens.filter(b=>b.tipo==="Investimento");
  $("#p-econ").innerHTML=ec.length?ec.map(rowBem).join(""):'<div class="empty">Toque no + para adicionar uma poupança, caixinha ou dinheiro guardado.</div>';
  $("#p-invs").innerHTML=iv.length?iv.map(rowBem).join(""):'<div class="empty">Toque no + para adicionar um investimento.</div>';

  if(opts.afterRender) opts.afterRender(items);
}
const ICONES={"Mercado":"🛒","Delivery e restaurantes":"🍔","Combustível e pedágio":"⛽","Seguro do carro":"🚗","Carro (outros)":"🔧","Casa":"🏠","Contas da casa":"💡","Compras":"🛍️","Beleza":"💅","Academia":"🏋️","Saúde":"🩺","Transporte (Uber)":"🚕","Lazer":"🎉","Viagem":"✈️","Assinaturas":"🔁","Trabalho e ferramentas":"🧰","Transferências (Zelle e outros)":"↔️","Saque em dinheiro":"💵","Taxas e juros":"⚠️","Outros":"•","Renda":"💰","Pagamento de fatura":"💳"};
const ic=c=>`<div class="ic">${ICONES[c]||"•"}</div>`;
function rowMov(g){
  if(g.t==="entrada") return `<button type="button" class="row" data-edit="${esc(g.id)}">${ic("Renda")}<div class="main"><div class="t">${esc(g.desc||"Entrada")}</div><div class="s">${esc(g.pag||"")} · ${fmtData(parse(g.data))}</div></div><div class="amt" style="color:var(--accent)">+${money(+g.valor)}</div></button>`;
  if(g.t==="fatura") return `<button type="button" class="row dim" data-edit="${esc(g.id)}">${ic("Pagamento de fatura")}<div class="main"><div class="t">${esc(g.desc)}</div><div class="s">Pagamento de fatura (não conta como gasto) · ${fmtData(parse(g.data))}</div></div><div class="amt">${money(+g.valor)}</div></button>`;
  return `<button type="button" class="row" data-edit="${esc(g.id)}">${ic(g.cat)}<div class="main"><div class="t">${esc(g.desc||g.cat)}</div><div class="s">${esc(g.cat||"")} · ${esc(g.pag||"")} · ${fmtData(parse(g.data))}</div></div><div class="amt">${money(+g.valor)}</div></button>`;
}

async function importarExtratos(){
  if(importando) return; importando=true; render();
  try{
    const r=await fetch(opts.extratoUrl); const lista=await r.json();
    const pares=lista.map((o,i)=>["x"+String(i+1).padStart(3,"0"),o]);
    await store.bulk(pares,(feito)=>{const p=$("#imp-prog"); if(p) p.textContent=feito+" de "+pares.length});
    mes=ultimoMesComDados();
  }catch(e){ const p=$("#imp-prog"); if(p) p.textContent="Não consegui importar agora. Tente de novo."; }
  importando=false; render();
}

// ---------- NAVEGAÇÃO ----------
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>show(b.dataset.v));
let jaAbriuGastos=false;
function show(v){
  view=v;
  if(v==="gastos"&&!jaAbriuGastos){ jaAbriuGastos=true; const temMesAtual=items.some(i=>(i.t==="gasto"||i.t==="entrada")&&(i.data||"").slice(0,7)===mesDe(new Date())); if(!temMesAtual) mes=ultimoMesComDados(); render(); }
  ["inicio","gastos","assin","patr"].forEach(k=>$("#v-"+k).classList.toggle("hide",k!==v));
  document.querySelectorAll("nav.tabs button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));
  window.scrollTo(0,0);
}
$("#m-prev").onclick=()=>{const[y,m]=mes.split("-").map(Number);mes=mesDe(new Date(y,m-2,1));render()};
$("#m-next").onclick=()=>{const[y,m]=mes.split("-").map(Number);mes=mesDe(new Date(y,m,1));render()};
$("#a-filtro").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;filtro=b.dataset.f;document.querySelectorAll("#a-filtro .chip").forEach(c=>c.classList.toggle("on",c===b));render()};
$("#g-contas").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;contaFiltro=b.dataset.conta;render()};
document.addEventListener("click",e=>{const r=e.target.closest("[data-edit]");if(r){const it=items.find(i=>i.id===r.dataset.edit);if(it)abrir(it.t,it)}});
$("#fab").onclick=()=>{ if(view==="assin") abrir("assin"); else if(view==="patr") abrir("bem"); else abrir("gasto"); };

// ---------- FORMULÁRIO ----------
const sheet=$("#sheet"), bg=$("#sheet-bg"), form=$("#form");
function fechar(){sheet.classList.remove("open");setTimeout(()=>bg.style.display="none",200)}
bg.onclick=fechar;
const opts_=(arr,sel)=>{const a=arr.includes(sel)||!sel?arr:[...arr,sel];return a.map(o=>`<option ${o===sel?"selected":""}>${esc(o)}</option>`).join("")};
function seg(name,vals,sel){return `<div class="seg" data-seg="${name}">${vals.map(([v,l])=>`<button type="button" data-val="${esc(v)}" class="${v===sel?"on":""}">${esc(l)}</button>`).join("")}</div><input type="hidden" name="${name}" value="${esc(sel)}">`}

let editando=null, tipoForm=null, apagarArmado=false;
function abrir(t,it,pre){
  editando=it||null; tipoForm=(t==="entrada"||t==="fatura")?"gasto":t; apagarArmado=false; const v=it||pre||{};
  let html="";
  if(tipoForm==="gasto"){
    const tipo=v.t||"gasto";
    html=`<h3>${it?"Editar lançamento":"Novo lançamento"}</h3>
    <label>Tipo</label>${seg("tipo",[["gasto","Gasto"],["entrada","Entrada"],["fatura","Pag. de fatura"]],tipo)}
    <label>Valor ($)</label><input name="valor" type="number" inputmode="decimal" step="0.01" required value="${esc(v.valor??"")}">
    <label>Descrição</label><input name="desc" placeholder="Ex.: almoço, mercado, salário" value="${esc(v.desc||"")}">
    <label>Categoria</label><select name="cat" id="f-cat">${opts_(tipo==="entrada"?CATS_ENTRADA:CATS,v.cat||(tipo==="entrada"?"Renda":"Mercado"))}</select>
    <label>Conta / forma de pagamento</label><select name="pag">${opts_(CONTAS,v.pag||"Dinheiro")}</select>
    <label>Data</label><input name="data" type="date" required value="${esc(v.data||iso(new Date()))}">`;
  } else if(t==="assin"){
    html=`<h3>${it?"Assinatura":"Nova assinatura"}</h3>
    <label>Status</label>${seg("status",[["ativa","Ativa"],["cancelar","Vou cancelar"],["cancelada","Cancelada"]],v.status||"ativa")}
    <label>Nome</label><input name="nome" required value="${esc(v.nome||"")}">
    <div class="two"><div><label>Valor ($)</label><input name="valor" type="number" inputmode="decimal" step="0.01" min="0" required value="${esc(v.valor??"")}"></div>
    <div><label>Frequência</label><select name="freq">${opts_(["Mensal","Anual"],v.freq||"Mensal")}</select></div></div>
    <label>Onde é cobrada</label><input name="onde" placeholder="Apple, cartão, débito…" value="${esc(v.onde||"")}">
    <label>Próxima cobrança</label><input name="prox" type="date" value="${esc(v.prox||"")}">
    <label>Observação</label><input name="obs" value="${esc(v.obs||"")}">`;
  } else {
    html=`<h3>${it?"Atualizar":"Adicionar economia ou investimento"}</h3>
    <label>Tipo</label>${seg("tipo",[["Economia","Guardado"],["Investimento","Investido"]],v.tipo||"Economia")}
    <label>Nome</label><input name="nome" required placeholder="Ex.: Reserva de emergência, Ações, Nubank" value="${esc(v.nome||"")}">
    <label>Valor atual ($)</label><input name="valor" type="number" inputmode="decimal" step="0.01" required value="${esc(v.valor??"")}">
    <label>Onde está</label><input name="onde" placeholder="Banco, corretora, em casa…" value="${esc(v.onde||"")}">
    <label>Meta ($, opcional)</label><input name="meta" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(v.meta||"")}">`;
  }
  html+=`<div class="btns">${it?'<button type="button" class="btn del" id="b-del">Excluir</button>':""}<button type="button" class="btn sec" id="b-cancel">Fechar</button><button type="submit" class="btn pri">Salvar</button></div><div class="err" id="f-err"></div>`;
  form.innerHTML=html;
  form.querySelectorAll("[data-seg]").forEach(s=>s.onclick=e=>{
    const b=e.target.closest("button");if(!b)return;
    s.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
    form.elements[s.dataset.seg].value=b.dataset.val;
    if(tipoForm==="gasto"&&s.dataset.seg==="tipo"){const c=$("#f-cat");const lst=b.dataset.val==="entrada"?CATS_ENTRADA:b.dataset.val==="fatura"?["Pagamento de fatura"]:CATS;c.innerHTML=opts_(lst,lst[0]);}
  });
  $("#b-cancel").onclick=fechar;
  if(it) $("#b-del").onclick=apagar;
  bg.style.display="block"; requestAnimationFrame(()=>sheet.classList.add("open"));
}

let salvando=false;
form.onsubmit=async e=>{
  e.preventDefault(); if(salvando) return;
  if(!store.ready()){$("#f-err").textContent="Ainda não conectou. Espere um pouco e tente de novo.";return}
  const f=Object.fromEntries(new FormData(form).entries());
  let doc;
  if(tipoForm==="gasto") doc={t:f.tipo,valor:+f.valor,desc:f.desc.trim(),cat:f.cat,pag:f.pag,data:f.data,criado:editando?.criado||Date.now(),origem:editando?.origem||"app"};
  else if(tipoForm==="assin") doc={t:"assin",nome:f.nome.trim(),valor:+f.valor,freq:f.freq,status:f.status,onde:f.onde.trim(),prox:f.prox||"",obs:f.obs.trim()};
  else doc={t:"bem",tipo:f.tipo,nome:f.nome.trim(),valor:+f.valor,onde:f.onde.trim(),meta:f.meta?+f.meta:0,atualizado:iso(new Date())};
  if(!isFinite(doc.valor)){$("#f-err").textContent="Coloque um valor válido.";return}
  salvando=true;
  try{ await store.save(editando?editando.id:null,doc); fechar(); }
  catch(err){$("#f-err").textContent=(err&&err.code==="quota_exceeded")?"Espaço cheio: apague alguns lançamentos antigos.":"Não consegui salvar. Tente de novo."}
  salvando=false;
};
async function apagar(){
  if(!apagarArmado){apagarArmado=true;$("#b-del").textContent="Toque de novo";return}
  try{await store.remove(editando.id);fechar()}catch(e){$("#f-err").textContent="Não consegui excluir. Tente de novo."}
}

// ---------- CATEGORIA AUTOMÁTICA ----------
const PALAVRAS=[
  [/caf[eé]|starbucks|almo[cç]o|jantar|lanche|pizza|restaurante|doordash|uber ?eats|ifood|subway|padaria|bakery|comida|mcdonald|burger|sorvete|a[cç]a[ií]/i,"Delivery e restaurantes"],
  [/mercado|supermercado|walmart|fine ?fare|save ?smart|target|costco|aldi|feira|shoprite|bj'?s(?! fuel)/i,"Mercado"],
  [/gasolina|combust|posto|citgo|sunoco|wawa|shell|exxon|ezpass|ped[aá]gio|jersey gas|phillips/i,"Combustível e pedágio"],
  [/uber|lyft|t[aá]xi|[oô]nibus|metr[oô]|trem|nj ?transit/i,"Transporte (Uber)"],
  [/geico|seguro/i,"Seguro do carro"],
  [/academia|personal|la fitness|gym|pilates/i,"Academia"],
  [/sal[aã]o|unha|cabelo|gloss|sobrancelha|depila|beleza|manicure/i,"Beleza"],
  [/farm[aá]cia|rem[eé]dio|m[eé]dico|dentista|cvs|walgreens|consulta/i,"Saúde"],
  [/aluguel|rent|luz|[aá]gua|internet|g[aá]s de casa|pse&g|conta de/i,"Contas da casa"],
  [/netflix|spotify|disney|apple|icloud|prime|assinatura|youtube/i,"Assinaturas"],
  [/home depot|lowe'?s|ferramenta|material|piso|obra/i,"Trabalho e ferramentas"],
  [/amazon|roupa|sapato|loja|shopping|tommy|pandora|presente/i,"Compras"],
  [/cinema|show|festa|bar|balada|passeio/i,"Lazer"],
  [/airbnb|hotel|passagem|voo|viagem/i,"Viagem"],
  [/zelle|transfer/i,"Transferências (Zelle e outros)"]
];
function adivinharCat(desc,tipo){
  if(tipo==="entrada") return "Renda";
  const d=(desc||"").trim().toLowerCase(); if(!d) return null;
  const igual=[...items].filter(i=>i.t==="gasto"&&(i.desc||"").toLowerCase()===d).sort(ordemData)[0];
  if(igual&&igual.cat) return igual.cat;
  for(const [re,c] of PALAVRAS) if(re.test(d)) return c;
  return null;
}
function adivinharConta(txt){
  const t=(txt||"").toLowerCase();
  if(/consumers/.test(t)) return "Cartão Consumers";
  if(/amazon/.test(t)&&/cart[aã]o/.test(t)) return "Cartão Amazon";
  if(/macy/.test(t)) return "Cartão Macy's";
  if(/santander.*cart[aã]o|cart[aã]o.*santander|3190/.test(t)) return "Santander cartão 3190";
  if(/d[eé]bito|santander/.test(t)) return "Santander conta corrente";
  if(/zelle/.test(t)) return "Zelle";
  if(/dinheiro|cash/.test(t)) return "Dinheiro";
  return null;
}

// ---------- TOAST ----------
let toastTimer=null;
function toast(msg,acao,fn){
  document.querySelectorAll(".toast").forEach(t=>t.remove());
  const t=document.createElement("div"); t.className="toast";
  const sp=document.createElement("span"); sp.textContent=msg; t.appendChild(sp);
  if(acao){const b=document.createElement("button");b.textContent=acao;b.onclick=()=>{t.remove();fn()};t.appendChild(b)}
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.remove(),5000);
}
async function salvarRapido(doc){
  const id="m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  await store.save(id,doc);
  return id;
}

// ---------- LANÇAR RÁPIDO ----------
const L={tipo:"gasto",cents:0,catManual:false};
const elL=$("#lancar");
function fillSelect(sel,lista,val){sel.innerHTML=lista.map(o=>`<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")}
function ultimaConta(){const u=[...items].filter(i=>i.t==="gasto"&&i.origem==="app").sort(ordemData)[0];return (u&&u.pag)||"Dinheiro"}
function lRender(){
  const v=$("#l-valor"); v.textContent=money(L.cents/100); v.classList.toggle("zero",L.cents===0);
  $("#l-ok").disabled=L.cents===0;
  $("#l-ok").textContent=L.tipo==="entrada"?"Lançar entrada":"Lançar gasto";
  elL.querySelectorAll(".tipo button").forEach(b=>b.classList.toggle("on",b.dataset.tipo===L.tipo));
}
function abrirLancar(){
  if(!elL) return;
  L.tipo="gasto"; L.cents=0; L.catManual=false;
  $("#l-desc").value="";
  fillSelect($("#l-cat"),["Categoria…",...CATS],"Categoria…");
  fillSelect($("#l-conta"),CONTAS,ultimaConta());
  lRender(); elL.classList.add("open");
}
function fecharLancar(){ elL.classList.remove("open"); if(location.hash==="#lancar") history.replaceState(null,"",location.pathname+location.search); }
if(elL){
  $("#b-plus").onclick=abrirLancar;
  $("#l-x").onclick=fecharLancar;
  elL.querySelectorAll(".tipo button").forEach(b=>b.onclick=()=>{
    L.tipo=b.dataset.tipo;
    fillSelect($("#l-cat"),L.tipo==="entrada"?CATS_ENTRADA:["Categoria…",...CATS],L.tipo==="entrada"?"Renda":"Categoria…");
    L.catManual=false; lRender();
  });
  $("#l-teclado").onclick=e=>{
    const b=e.target.closest("button"); if(!b) return;
    if(b.dataset.k==="del") L.cents=Math.floor(L.cents/10);
    else { const d=b.textContent; const n=L.cents*(d==="00"?100:10)+(d==="00"?0:+d); if(n<1e9) L.cents=n; }
    if(navigator.vibrate) try{navigator.vibrate(8)}catch(_){}
    lRender();
  };
  $("#l-desc").oninput=()=>{ if(L.catManual) return; const c=adivinharCat($("#l-desc").value,L.tipo); if(c) $("#l-cat").value=c; };
  $("#l-desc").onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); e.target.blur(); } };
  $("#l-cat").onchange=()=>{L.catManual=true};
  $("#l-mais").onclick=()=>{ const v=L.cents?L.cents/100:""; const desc=$("#l-desc").value; fecharLancar(); abrir("gasto",null,{t:L.tipo,valor:v,desc}); };
  $("#l-ok").onclick=async()=>{
    if(!store.ready()){toast("Ainda conectando… tente de novo em instantes.");return}
    let cat=$("#l-cat").value; if(cat==="Categoria…") cat=adivinharCat($("#l-desc").value,L.tipo)||(L.tipo==="entrada"?"Renda":"Outros");
    const doc={t:L.tipo,valor:L.cents/100,desc:$("#l-desc").value.trim(),cat,pag:$("#l-conta").value,data:iso(new Date()),criado:Date.now(),origem:"app"};
    $("#l-ok").disabled=true;
    try{ const id=await salvarRapido(doc); fecharLancar(); toast((L.tipo==="entrada"?"Entrada de ":"Gasto de ")+money(doc.valor)+" lançado","Desfazer",()=>store.remove(id)); }
    catch(_){ toast("Não consegui salvar. Tente de novo."); lRender(); }
  };
}

// ---------- ASSISTENTE ----------
const elC=$("#chat");
const NOME_A=opts.assistente||"Lumi";
const SUGS=["Qual meu saldo?","Quanto gastei este mês?","Gastei 20 no café","Próximas cobranças","Quanto gastei com delivery?","Maiores gastos do mês","Quanto pago de assinaturas?"];
let conversaIniciada=false;
function bolha(txt,quem,acao){
  const d=document.createElement("div"); d.className="msg "+(quem==="eu"?"eu":"ela"); d.textContent=txt;
  if(acao){const b=document.createElement("button");b.className="acao";b.textContent=acao.rotulo;b.onclick=()=>{b.remove();acao.fn()};d.appendChild(b)}
  $("#c-msgs").appendChild(d); $("#c-msgs").scrollTop=1e9;
}
function abrirChat(){
  if(!elC) return;
  elC.classList.add("open");
  if(!conversaIniciada){
    conversaIniciada=true;
    const h=new Date().getHours(); const sauda=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
    bolha(`${sauda}${opts.nome?", "+opts.nome:""}! Eu sou a ${NOME_A}. Posso te dizer seu saldo, quanto você gastou, quais cobranças estão chegando, ou anotar um gasto, é só escrever "gastei 15 no almoço".`,"ela");
  }
  $("#c-sugs").innerHTML=SUGS.map(s=>`<button type="button">${esc(s)}</button>`).join("");
}
function fecharChat(){ elC.classList.remove("open"); if(location.hash==="#assistente") history.replaceState(null,"",location.pathname+location.search); }
if(elC){
  $("#b-ask").onclick=abrirChat;
  $("#c-x").onclick=fecharChat;
  $("#c-sugs").onclick=e=>{const b=e.target.closest("button"); if(b) perguntar(b.textContent)};
  $("#c-form").onsubmit=e=>{e.preventDefault(); const t=$("#c-in").value.trim(); if(!t) return; $("#c-in").value=""; perguntar(t)};
}

const MESES_RE=MESES.map(m=>m.normalize("NFD").replace(/[̀-ͯ]/g,""));
const semAcento=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function mesDaFrase(t){
  const n=new Date();
  if(/m[eê]s passado|ultimo m[eê]s/.test(t)) return mesDe(new Date(n.getFullYear(),n.getMonth()-1,1));
  for(let i=0;i<12;i++){ if(new RegExp("\\b"+MESES_RE[i]+"\\b").test(t)){ const y=i>n.getMonth()?n.getFullYear()-1:n.getFullYear(); return y+"-"+pad(i+1);} }
  return mesDe(n);
}
const nomeMes=m=>{const[y,mm]=m.split("-").map(Number);return MESES[mm-1]+(y!==new Date().getFullYear()?" de "+y:"")};
function lerValor(t){ const m=t.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/); if(!m) return null;
  let v=m[1]; if(/[.,]\d{1,2}$/.test(v)){ v=v.replace(/[.,](\d{1,2})$/,"#$1").replace(/[.,]/g,"").replace("#","."); } else v=v.replace(/[.,]/g,""); return {v:parseFloat(v),raw:m[0]}; }

function perguntar(txt){
  bolha(txt,"eu");
  setTimeout(()=>responder(txt),250);
}
async function responder(txt){
  const t=semAcento(txt);
  const gastos=of("gasto"), entradas=of("entrada"), assins=of("assin"), bens=of("bem");
  const ativas=assins.filter(a=>a.status!=="cancelada");

  // Anotar gasto/entrada
  const ehGasto=/\b(gastei|paguei|comprei|anota|lanca|lancar|gasto de|saiu)\b/.test(t);
  const ehEntrada=/\b(recebi|ganhei|entrou|caiu|vendi)\b/.test(t);
  if((ehGasto||ehEntrada)&&lerValor(t)){
    const {v,raw}=lerValor(txt);
    const B=w=>new RegExp("(?<![\\p{L}\\p{N}])(?:"+w+")(?![\\p{L}\\p{N}])","giu");
    let desc=txt.replace(raw,"")
      .replace(B("cart[aã]o|d[eé]bito|dinheiro|cash|consumers|amazon|santander|macy'?s|zelle|3190"),"")
      .replace(B("gastei|paguei|comprei|anota|lança|lanca|lançar|lancar|gasto de|saiu|recebi|ganhei|entrou|caiu|vendi|dólares|dolares|reais|dollars?|bucks|hoje|ontem"),"")
      .replace(B("no|na|num|numa|em|de|do|da|com|pra|para|pro|um|uma|o|a|e"),"").replace(/\s+/g," ").trim();
    desc=desc.charAt(0).toUpperCase()+desc.slice(1);
    const tipo=ehEntrada&&!ehGasto?"entrada":"gasto";
    const cat=adivinharCat(desc,tipo)||(tipo==="entrada"?"Renda":"Outros");
    const conta=adivinharConta(txt)||"Dinheiro";
    if(!store.ready()){bolha("Ainda estou conectando, tente de novo em instantes.","ela");return}
    try{
      const id=await salvarRapido({t:tipo,valor:v,desc,cat,pag:conta,data:iso(new Date()),criado:Date.now(),origem:"app"});
      bolha(`Anotado ✅\n${tipo==="entrada"?"Entrada":"Gasto"} de ${money(v)}${desc?" — "+desc:""}\nCategoria: ${cat} · ${conta}`,"ela",{rotulo:"Desfazer",fn:async()=>{await store.remove(id);bolha("Pronto, apaguei esse lançamento.","ela")}});
    }catch(_){bolha("Não consegui salvar agora. Tente de novo.","ela")}
    return;
  }

  // Cancelei X
  const mc=t.match(/\bcancelei\s+(?:o |a |os |as )?(.+)/);
  if(mc){
    const alvo=mc[1].trim(); const a=assins.find(x=>semAcento(x.nome).includes(alvo)||alvo.includes(semAcento(x.nome).split(/[ —-]/)[0]));
    if(!a){bolha(`Não achei "${mc[1]}" nas suas assinaturas. Confira o nome na aba Assinaturas.`,"ela");return}
    const antes=Object.assign({},a); delete antes.id;
    await store.save(a.id,Object.assign({},antes,{status:"cancelada"}));
    bolha(`Marquei ${a.nome} como cancelada 🎉 Você economiza ${money(porAno(a))} por ano.`,"ela",{rotulo:"Desfazer",fn:async()=>{await store.save(a.id,antes);bolha("Voltei para como estava.","ela")}});
    return;
  }

  const mes=mesDaFrase(t);
  const doMes=l=>l.filter(i=>(i.data||"").slice(0,7)===mes);
  const gM=doMes(gastos), eM=doMes(entradas);
  const totG=soma(gM), totE=soma(eM);
  const guard=soma(bens.filter(b=>b.tipo!=="Investimento")), inv=soma(bens.filter(b=>b.tipo==="Investimento"));
  const semDados=!gM.length&&!eM.length;
  const dica=()=>{ if(!semDados) return ""; const um=ultimoMesComDados(); return um!==mes?`\n(Ainda não tem lançamentos em ${nomeMes(mes)}. Seu último mês com dados é ${nomeMes(um)}: pergunte "quanto gastei em ${MESES[+um.slice(5)-1]}".)`:""; };

  if(/saldo|sobrou|quanto (eu )?tenho|como (eu )?to|como estou|resumo/.test(t)){
    const s=totE-totG;
    bolha(`Em ${nomeMes(mes)}:\n• Entradas: ${money(totE)}\n• Gastos: ${money(totG)}\n• ${s>=0?"Sobrou":"Faltou"}: ${money(Math.abs(s))}\n\nGuardado: ${money(guard)} · Investido: ${money(inv)}${dica()}`,"ela");
    return;
  }
  if(/cobranc|vai cobrar|vence|vencimento|proxim|chegando|debitar|descontar/.test(t)){
    const h=today(); const lim=new Date(h); lim.setDate(lim.getDate()+(/semana/.test(t)?7:30));
    const l=ativas.map(a=>({a,d:proxima(a)})).filter(x=>x.d&&x.d<=lim).sort((x,y)=>x.d-y.d);
    if(!l.length){bolha("Nenhuma cobrança de assinatura nesse período 🙌","ela");return}
    bolha("Próximas cobranças:\n"+l.map(({a,d})=>`• ${fmtData(d)} — ${a.nome} ${money(+a.valor)}${a.status==="cancelar"?" ⚠️ cancelar":""}`).join("\n")+`\n\nTotal: ${money(l.reduce((s,x)=>s+(+x.a.valor||0),0))}`,"ela");
    return;
  }
  if(/assinatura/.test(t)){
    const pm=ativas.reduce((s,a)=>s+porMes(a),0);
    const top=[...ativas].sort((a,b)=>porAno(b)-porAno(a)).slice(0,5);
    const canc=assins.filter(a=>a.status==="cancelada");
    bolha(`Você tem ${ativas.length} assinaturas ativas: ${money(pm)} por mês (${money(pm*12)} por ano).\n\nAs que mais pesam por ano:\n${top.map(a=>`• ${a.nome}: ${money(porAno(a))}`).join("\n")}${canc.length?`\n\nJá cancelou ${canc.length}, economizando ${money(canc.reduce((s,a)=>s+porAno(a),0))} por ano 👏`:""}`,"ela");
    return;
  }
  if(/maior(es)? gasto|onde (eu )?mais gast|top/.test(t)){
    const top=[...gM].sort((a,b)=>b.valor-a.valor).slice(0,5);
    if(!top.length){bolha(`Não tem gastos em ${nomeMes(mes)}.${dica()}`,"ela");return}
    bolha(`Maiores gastos de ${nomeMes(mes)}:\n${top.map(g=>`• ${g.desc||g.cat}: ${money(g.valor)}`).join("\n")}`,"ela");
    return;
  }
  if(/quanto|gastei|gasto|gastos/.test(t)){
    // categoria ou palavra específica
    const limpo=t.replace(new RegExp("\\b("+MESES_RE.join("|")+")\\b","g")," ").replace(/\b(este|esse|neste|nesse|deste|desse|ultimo)\s+mes\b|\bmes passado\b|\bmes\b/g," ").replace(/[?!.]/g," ").replace(/\s+/g," ").trim();
    const mm=limpo.match(/\b(?:gastei|gasto|gastos|paguei)\s+(?:com|em|no|na|de)\s+(.+)$/)||limpo.match(/\b(?:com|no|na)\s+(.+)$/);
    const resto=mm?mm[1].replace(/\s+(em|de|no|na)$/,"").trim():"";
    let alvo=null;
    if(resto&&resto.length>2&&!/^(gastei|gasto|gastos|quanto)$/.test(resto)){
      const cat=CATS.find(c=>semAcento(c).includes(resto)||resto.split(" ").some(w=>w.length>3&&semAcento(c).includes(w)))||adivinharCat(resto,"gasto");
      const porCat=cat?gM.filter(g=>g.cat===cat):[];
      const porDesc=gM.filter(g=>semAcento(g.desc||"").includes(resto));
      const l=porCat.length>=porDesc.length?porCat:porDesc;
      alvo=cat&&porCat.length>=porDesc.length?cat:resto;
      if(l.length||cat){ bolha(`Com ${alvo} em ${nomeMes(mes)}: ${money(soma(l))} (${l.length} lançamento${l.length===1?"":"s"}).${dica()}`,"ela"); return; }
    }
    const pc={}; gM.forEach(g=>pc[g.cat||"Outros"]=(pc[g.cat||"Outros"]||0)+(+g.valor||0));
    const top=Object.entries(pc).sort((a,b)=>b[1]-a[1]).slice(0,4);
    bolha(`Em ${nomeMes(mes)} você gastou ${money(totG)}.${top.length?"\n\nOnde mais foi:\n"+top.map(([c,v])=>`• ${c}: ${money(v)}`).join("\n"):""}${dica()}`,"ela");
    return;
  }
  if(/guardad|economi|investid|patrimonio|reserva/.test(t)){
    bolha(`Guardado: ${money(guard)}\nInvestido: ${money(inv)}\nTotal: ${money(guard+inv)}${!bens.length?"\n\nVocê ainda não cadastrou nada na aba Patrimônio.":""}`,"ela");
    return;
  }
  if(/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey)\b/.test(t)){ bolha(`Oi${opts.nome?", "+opts.nome:""}! Em que posso ajudar?`,"ela"); return; }
  if(/obrigad|valeu/.test(t)){ bolha("Imagina! 💚","ela"); return; }
  bolha(`Ainda não sei responder isso 😅 Tente assim:\n• "Qual meu saldo?"\n• "Quanto gastei com mercado em outubro?"\n• "Gastei 35 no salão no cartão Consumers"\n• "Recebi 800 de cliente"\n• "Próximas cobranças"\n• "Cancelei o Spotify"`,"ela");
}

// ---------- ATALHOS (#lancar, #assistente) ----------
function rota(){ if(location.hash==="#lancar") abrirLancar(); else if(location.hash==="#assistente") abrirChat(); }
window.addEventListener("hashchange",rota);
setTimeout(rota,0);

render();
store.subscribe(list=>{items=list;render()});
return { render, abrir, abrirLancar, abrirChat, perguntar, getItems:()=>items };
}
