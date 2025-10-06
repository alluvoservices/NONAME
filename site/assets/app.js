/* VibriNova static app (GitHub Pages) — profile gate + light theme + per-profile data */

const Store = (() => {
  const key = "vibrinova-data";
  const def = {
    theme: { mode:"dark", primary:"#6EE7F9", accent:"#8B5CF6" },
    onboarded: false,
    lastPage: "index",
    activeProfileId: "",
    profiles: [
      { id:"p1", name:"KIDS", kids:true, avatar:"K", password:null },
      { id:"p2", name:"Profile 1", kids:false, avatar:"P", password:null },
      { id:"p3", name:"Profile 2", kids:false, avatar:"P", password:null },
      { id:"p4", name:"Profile 3", kids:false, avatar:"P", password:null }
    ],
    devices: [],
    byProfile: {
      p1: { histories:{ search:{}, watch:[] } },
      p2: { histories:{ search:{}, watch:[] } },
      p3: { histories:{ search:{}, watch:[] } },
      p4: { histories:{ search:{}, watch:[] } }
    },
    chat: { messages: [], recommendations: [] } // shared global chat room (demo)
  };
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(key)) || def;
      // migrate theme
      if (typeof s.theme === "string") s.theme = { mode:s.theme, primary:def.theme.primary, accent:def.theme.accent };
      // migrate per-profile
      if (!s.byProfile) {
        s.byProfile = {};
        (s.profiles||def.profiles).forEach(p=>{ s.byProfile[p.id] = { histories: s.histories || {search:{}, watch:[]} } });
        delete s.histories;
      }
      return s;
    } catch { return def; }
  };
  const save = (s) => localStorage.setItem(key, JSON.stringify(s));
  let state = load();
  return {
    get: () => state,
    set: (mutator) => { state = mutator({ ...state }); save(state); return state; },
  };
})();

const Util = {
  uid: () => Math.random().toString(36).slice(2,10),
  code8: () => { const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o=""; for(let i=0;i<8;i++) o+=c[Math.floor(Math.random()*c.length)]; return o; },
  extractTags: (t) => { const re=/@([A-Za-z0-9][A-Za-z0-9 ':.-]{0,49})/g; const set=new Set(); let m; while((m=re.exec(t))!==null) set.add(m[1].trim()); return [...set]; },
  el:(s,r=document)=>r.querySelector(s), els:(s,r=document)=>Array.from(r.querySelectorAll(s)),
  qs:(k)=> new URLSearchParams(location.search).get(k)
};

/* THEME */
function applyThemeVars(){
  const { theme } = Store.get();
  document.documentElement.dataset.theme = theme.mode;
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--accent", theme.accent);
}
function setThemeMode(mode){ Store.set(s=>{ s.theme.mode = (mode==="light"?"light":"dark"); return s; }); applyThemeVars(); }
function setThemeColors(primary, accent){
  const hex=/^#([A-Fa-f0-9]{3}){1,2}$/;
  Store.set(s=>{
    if(hex.test(primary)) s.theme.primary=primary;
    if(hex.test(accent))  s.theme.accent=accent;
    return s;
  });
  applyThemeVars();
}

/* NAV */
function setActiveNav(page){
  Util.els(".nav a").forEach(a=>{
    const active = a.getAttribute("data-page")===page;
    a.classList.toggle("active", active);
  });
}

/* PER-PROFILE HISTORIES */
function recordSearch(page,q){
  Store.set(s=>{
    const id=s.activeProfileId||"p1";
    const list = s.byProfile[id].histories.search[page] || [];
    s.byProfile[id].histories.search[page] = [q, ...list].slice(0,50);
    return s;
  });
}
function recordWatch(title){
  Store.set(s=>{
    const id=s.activeProfileId||"p1";
    s.byProfile[id].histories.watch = [{id:Util.uid(), title, ts:Date.now()}, ...s.byProfile[id].histories.watch].slice(0,200);
    return s;
  });
}

/* CHAT (global room) */
function addMessage(sender,text){
  const msg = { id:Util.uid(), sender, text, ts:Date.now() };
  Store.set(s=>{
    s.chat.messages = [...s.chat.messages, msg].slice(-500);
    Util.extractTags(text).forEach(t => s.chat.recommendations.unshift({ title:t, from: sender }));
    s.chat.recommendations = s.chat.recommendations.slice(0,200);
    return s;
  });
  return msg;
}
function renderChat(){
  const wrap = Util.el("#chat-messages"); if(!wrap) return;
  const { profiles, activeProfileId, chat } = Store.get();
  const me = profiles.find(p=>p.id===activeProfileId);
  wrap.innerHTML = `
    <div class="bubble other">Welcome to ${document.title.replace(" —","").split(" — ")[0]} Chat!</div>
    <div class="bubble other">Mention a movie with @ like <strong>@Interstellar</strong></div>
  `;
  chat.messages.forEach(m=>{
    const self = (m.sender===me?.name || m.sender===me?.id);
    const div = document.createElement("div");
    div.className = "bubble " + (self? "self":"other");
    div.textContent = m.text; wrap.appendChild(div);
  });
  wrap.scrollTop = wrap.scrollHeight;
}
function bindChat(){
  const input = Util.el("#chat-input"); const form=Util.el("#chat-form"); const wrap=Util.el("#chat-messages");
  if(!input || !form) return;
  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const v=input.value.trim(); if(!v) return;
    const me = Store.get().profiles.find(p=>p.id===Store.get().activeProfileId);
    addMessage(me?.name || "Me", v);
    input.value=""; renderChat(); setTimeout(()=>wrap.scrollTop=wrap.scrollHeight, 50);
  });
  const recWrap = Util.el("#recs"); if(recWrap){
    const { chat } = Store.get();
    recWrap.innerHTML = chat.recommendations.length ? chat.recommendations.map(r=>`
      <div class="row card section" style="align-items:center;">
        <div><div><strong>${r.title}</strong></div><div class="text-muted" style="font-size:12px">by ${r.from}</div></div>
        <button class="btn">Add to Watchlist</button>
      </div>`).join("") : `<p class="text-muted">No recommendations yet. Use @ in chat.</p>`;
  }
  renderChat();
}

/* Search with voice */
function bindSearch(page){
  const form = Util.el(`#search-${page}`); if(!form) return;
  const input = Util.el("input", form);
  const micBtn = Util.el(".mic-btn", form);
  const clearBtn = Util.el(".clear-btn", form);
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const q=(input.value||"").trim(); if(!q) return; recordSearch(page,q); input.value="";
  });
  clearBtn && clearBtn.addEventListener("click", ()=>{ input.value=""; input.focus(); });
  if(micBtn){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ micBtn.style.display="none"; }
    else {
      const rec = new SR(); rec.lang="en-US"; rec.interimResults=false; rec.continuous=false;
      let on=false;
      const start=()=>{ if(on) return; on=true; rec.start(); micBtn.classList.add("btn-primary"); }
      const stop =()=>{ if(!on) return; on=false; rec.stop(); micBtn.classList.remove("btn-primary"); }
      micBtn.addEventListener("click", ()=> on?stop():start());
      rec.onresult=(e)=>{ const t=Array.from(e.results).map(r=>r[0].transcript).join(" "); input.value=(input.value+" "+t).trim(); };
      rec.onend=stop; rec.onerror=stop;
    }
  }
}

/* Profiles */
function bindProfiles(){
  const wrap = Util.el("#profiles-list"); if(!wrap) return;
  const { profiles, activeProfileId } = Store.get();
  wrap.innerHTML = profiles.map(p=>`
    <button class="profile" data-id="${p.id}" style="background:none;border:0;cursor:pointer">
      <div class="avatar ${p.id===activeProfileId?"active":""}">${(p.avatar||p.name[0]||"P").slice(0,1)}</div>
      <div class="mt-1" style="text-align:center">${p.name}${p.kids?` <small class="text-muted">(Kids)</small>`:""}</div>
    </button>
  `).join("");
  Util.els(".profile", wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-id");
      Store.set(s=>{ s.activeProfileId=id; s.onboarded=true; return s; });
      refreshPinnedAvatar();
      // If it was the first time, or query param ?first=1 -> go to home
      if (Util.qs("first")==="1" || document.referrer==="" ) location.href="index.html";
    });
  });
}

function refreshPinnedAvatar(){
  const slot = Util.el("#mobile-avatar");
  if(slot){
    const { profiles, activeProfileId } = Store.get();
    const me = profiles.find(p=>p.id===activeProfileId);
    slot.textContent = (me?.avatar || me?.name?.[0] || "P").slice(0,1);
  }
}

/* Kids restriction: hide cards by data-age */
function enforceKidsIfNeeded(page){
  const { profiles, activeProfileId } = Store.get();
  const me = profiles.find(p=>p.id===activeProfileId);
  if(!me?.kids) return;
  const allowed = new Set(["U","7+"]);
  Util.els(".poster").forEach(card=>{
    const age = card.getAttribute("data-age") || "U";
    card.style.display = allowed.has(age) ? "" : "none";
  });
}

/* Devices & settings */
function renderDevices(){
  const list = Util.el("#devices-list"); if(!list) return;
  const { devices } = Store.get();
  list.innerHTML = devices.length ? devices.map(d=>`
    <div class="kv"><div>${d.name} • <strong>${d.code}</strong></div><button class="btn" data-remove="${d.code}">Remove</button></div>
  `).join("") : `<p class="text-muted">No devices activated yet.</p>`;
  Util.els("button[data-remove]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const code = b.getAttribute("data-remove");
      Store.set(s=>{ s.devices = s.devices.filter(x=>x.code!==code); return s; });
      renderDevices();
    });
  });
  const hist = Util.el("#histories");
  if(hist){
    const id = Store.get().activeProfileId || "p1";
    const hp = Store.get().byProfile[id].histories;
    const searches = Object.values(hp.search).reduce((a,b)=>a+b.length,0);
    hist.textContent = `Search entries: ${searches} • Watched: ${hp.watch.length}`;
  }
}
function bindSettings(){
  const genBtn = Util.el("#gen-device");
  genBtn && genBtn.addEventListener("click", ()=>{
    const name = (Util.el("#device-name")?.value || "My Device").toString();
    const d = { id:Util.uid(), name, code:Util.code8(), activatedAt:Date.now() };
    Store.set(s=>{ s.devices=[d, ...s.devices].slice(0,50); return s; });
    alert(`Activation code for ${d.name}: ${d.code}`);
    renderDevices();
  });
  Util.el("#clear-histories")?.addEventListener("click", ()=>{
    Store.set(s=>{ const id=s.activeProfileId||"p1"; s.byProfile[id].histories={search:{}, watch:[]}; return s; });
    renderDevices();
  });
  const themeSel = Util.el("#theme-select");
  if(themeSel){ themeSel.value = Store.get().theme.mode; themeSel.addEventListener("change",e=>setThemeMode(e.target.value)); }
  Util.els(".swatch").forEach(sw=>{
    sw.addEventListener("click", ()=> setThemeColors(sw.getAttribute("data-p"), sw.getAttribute("data-a")));
  });
  const p=Util.el("#pick-primary"), a=Util.el("#pick-accent");
  Util.el("#apply-colors")?.addEventListener("click", ()=> setThemeColors(p.value, a.value));
  renderDevices();
}

/* Route guards and last-page tracking */
function guardProfiles(page){
  const { onboarded, activeProfileId } = Store.get();
  if(!onboarded || !activeProfileId){
    if(page!=="profiles"){ location.replace("profiles.html?first=1"); return false; }
  }
  return true;
}
function trackLast(page){ Store.set(s=>{ s.lastPage = page; return s; }); }

/* Init */
function initIcons(){ window.lucide && window.lucide.createIcons && window.lucide.createIcons(); }

document.addEventListener("DOMContentLoaded", ()=>{
  applyThemeVars();
  initIcons();
  refreshPinnedAvatar();

  const page = document.body.getAttribute("data-page") || "stream";
  if(!guardProfiles(page)) return;
  setActiveNav(page);

  if(page==="stream"){ bindSearch("stream"); enforceKidsIfNeeded(page); Util.els(".watch-btn").forEach(b=>b.addEventListener("click", ()=>recordWatch(b.getAttribute("data-title")))); }
  if(page==="tickets"){ bindSearch("tickets"); enforceKidsIfNeeded(page); }
  if(page==="food"){ bindSearch("food"); }
  if(page==="playzone"){ bindSearch("playzone"); }
  if(page==="chat"){ bindChat(); }
  if(page==="profiles"){ bindProfiles(); }
  if(page==="settings"){ bindSettings(); }
  trackLast(page);
});
