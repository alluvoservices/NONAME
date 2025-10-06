/* VibriNova static app (GitHub Pages friendly) — upgraded */

const Store = (() => {
  const key = "vibrinova-data";
  const def = {
    theme: { mode:"dark", primary:"#6EE7F9", accent:"#8B5CF6" },
    activeProfileId: "p1",
    profiles: [
      { id:"p1", name:"KIDS", kids:true, avatar:"K", password:null },
      { id:"p2", name:"Profile 2", avatar:"P", password:null },
      { id:"p3", name:"Profile 3", avatar:"P", password:null },
      { id:"p4", name:"Profile 4", avatar:"P", password:null }
    ],
    devices: [],
    histories: { search:{}, watch:[] },
    chat: { messages: [], recommendations: [] }
  };
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(key)) || def;
      // Migrate older shape where theme was a string
      if (typeof s.theme === "string") s.theme = { mode:s.theme, primary:def.theme.primary, accent:def.theme.accent };
      if (!s.theme.primary) s.theme.primary = def.theme.primary;
      if (!s.theme.accent) s.theme.accent = def.theme.accent;
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
  code8: () => {
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let out="";
    for(let i=0;i<8;i++) out+=chars[Math.floor(Math.random()*chars.length)];
    return out;
  },
  extractTags: (text) => {
    const re=/@([A-Za-z0-9][A-Za-z0-9 ':.-]{0,49})/g; const tags=new Set();
    let m; while((m=re.exec(text))!==null) tags.add(m[1].trim()); return [...tags];
  },
  el: (sel,root=document)=>root.querySelector(sel),
  els: (sel,root=document)=>Array.from(root.querySelectorAll(sel))
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
  if(!/^#([A-Fa-f0-9]{3}){1,2}$/.test(primary)) primary = Store.get().theme.primary;
  if(!/^#([A-Fa-f0-9]{3}){1,2}$/.test(accent)) accent   = Store.get().theme.accent;
  Store.set(s=>{ s.theme.primary=primary; s.theme.accent=accent; return s; });
  applyThemeVars();
}

/* NAV */
function setActiveNav(page){
  Util.els(".nav a").forEach(a=>{
    const active = a.getAttribute("data-page")===page;
    a.classList.toggle("active", active);
  });
}

/* HISTORIES */
function recordSearch(page,q){
  Store.set(s=>{
    const list = s.histories.search[page] || [];
    s.histories.search[page] = [q, ...list].slice(0,50);
    return s;
  });
}
function recordWatch(title){
  Store.set(s=>{
    s.histories.watch = [{id:Util.uid(), title, ts:Date.now()}, ...s.histories.watch].slice(0,200);
    return s;
  });
}

/* CHAT */
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
    const self = (m.sender===me.name || m.sender===me.id);
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
    if(chat.recommendations.length===0){
      recWrap.innerHTML = `<p class="text-muted">No recommendations yet. Use @ in chat to tag titles.</p>`;
    } else {
      recWrap.innerHTML = chat.recommendations.map(r=>`
        <div class="row card section" style="align-items:center;">
          <div><div><strong>${r.title}</strong></div><div class="text-muted" style="font-size:12px">by ${r.from}</div></div>
          <button class="btn">Add to Watchlist</button>
        </div>`).join("");
    }
  }
  renderChat();
}

/* SEARCH with voice */
function bindSearch(page){
  const form = Util.el(`#search-${page}`);
  if(!form) return;
  const input = Util.el("input", form);
  const micBtn = Util.el(".mic-btn", form);
  const clearBtn = Util.el(".clear-btn", form);

  form.addEventListener("submit", e=>{
    e.preventDefault();
    const q = (input.value||"").trim(); if(!q) return;
    recordSearch(page, q); input.value="";
  });
  clearBtn && clearBtn.addEventListener("click", ()=>{ input.value=""; input.focus(); });

  if (micBtn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      micBtn.style.display = "none";
    } else {
      const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
      let running = false;
      const start = () => { if(running) return; running = true; rec.start(); micBtn.classList.add("btn-primary"); };
      const stop  = () => { if(!running) return; running = false; rec.stop(); micBtn.classList.remove("btn-primary"); };
      micBtn.addEventListener("click", ()=> running? stop(): start());
      rec.onresult = (e)=>{ const t = Array.from(e.results).map(r=>r[0].transcript).join(" "); input.value = (input.value+" "+t).trim(); };
      rec.onend = ()=> stop();
      rec.onerror = ()=> stop();
    }
  }
}

/* PROFILES */
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
      Store.set(s=>{ s.activeProfileId=id; return s; });
      bindProfiles(); refreshMobileAvatar();
    });
  });
}

/* SETTINGS */
function renderDevices(){
  const list = Util.el("#devices-list"); if(!list) return;
  const { devices, histories } = Store.get();
  list.innerHTML = devices.map(d=>`
    <div class="kv">
      <div>${d.name} • <strong>${d.code}</strong></div>
      <button class="btn" data-remove="${d.code}">Remove</button>
    </div>`).join("") || `<p class="text-muted">No devices activated yet.</p>`;

  Util.els("button[data-remove]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const code = b.getAttribute("data-remove");
      Store.set(s=>{ s.devices = s.devices.filter(x=>x.code!==code); return s; });
      renderDevices();
    });
  });

  const hist = Util.el("#histories");
  if(hist){
    const searches = Object.values(histories.search).reduce((a,b)=>a+b.length,0);
    hist.textContent = `Search entries: ${searches} • Watched: ${histories.watch.length}`;
  }
}

function bindSettings(){
  const genBtn = Util.el("#gen-device"); if(genBtn){
    genBtn.addEventListener("click", ()=>{
      const name = (Util.el("#device-name")?.value || "My Device").toString();
      const d = { id:Util.uid(), name, code:Util.code8(), activatedAt:Date.now() };
      Store.set(s=>{ s.devices=[d, ...s.devices].slice(0,50); return s; });
      alert(`Activation code for ${d.name}: ${d.code}`);
      renderDevices();
    });
  }
  const clearBtn = Util.el("#clear-histories");
  clearBtn && clearBtn.addEventListener("click", ()=>{
    Store.set(s=>{ s.histories={search:{}, watch:[]}; return s; });
    renderDevices();
  });

  const themeSel = Util.el("#theme-select");
  if(themeSel){
    themeSel.value = Store.get().theme.mode;
    themeSel.addEventListener("change",(e)=>setThemeMode(e.target.value));
  }

  // Palette swatches
  Util.els(".swatch").forEach(sw=>{
    sw.addEventListener("click", ()=>{
      const p = sw.getAttribute("data-p") || Store.get().theme.primary;
      const a = sw.getAttribute("data-a") || Store.get().theme.accent;
      setThemeColors(p,a);
    });
  });

  // Custom pickers
  const pPick = Util.el("#pick-primary"); const aPick = Util.el("#pick-accent");
  if(pPick && aPick){
    pPick.value = Store.get().theme.primary; aPick.value = Store.get().theme.accent;
    Util.el("#apply-colors")?.addEventListener("click", ()=> setThemeColors(pPick.value, aPick.value));
  }

  // Profile password
  const pwdBtn = Util.el("#save-profile-pwd");
  const pwdInp = Util.el("#profile-pwd");
  if(pwdBtn && pwdInp){
    pwdBtn.addEventListener("click", ()=>{
      const pwd = (pwdInp.value || "").toString();
      Store.set(s=>{
        const id = s.activeProfileId;
        s.profiles = s.profiles.map(p => p.id===id ? {...p, password: (pwd||null)} : p);
        return s;
      });
      pwdInp.value="";
      alert("Profile password saved.");
    });
  }

  renderDevices();
}

/* HEADER: mobile profile (left) + notifications (right) */
function refreshMobileAvatar(){
  const slot = Util.el("#mobile-avatar");
  if(slot){
    const { profiles, activeProfileId } = Store.get();
    const me = profiles.find(p=>p.id===activeProfileId);
    slot.textContent = (me?.avatar || me?.name?.[0] || "P").slice(0,1);
  }
}

/* Init */
function initNavIcons(){ if(window.lucide && window.lucide.createIcons){ window.lucide.createIcons(); } }

document.addEventListener("DOMContentLoaded", ()=>{
  applyThemeVars();
  initNavIcons();
  refreshMobileAvatar();

  const page = document.body.getAttribute("data-page") || "stream";
  setActiveNav(page);

  if(page==="stream"){
    bindSearch("stream");
    Util.els(".watch-btn").forEach(b=>b.addEventListener("click", ()=>recordWatch(b.getAttribute("data-title"))));
  }
  if(page==="tickets") bindSearch("tickets");
  if(page==="food") bindSearch("food");
  if(page==="playzone") bindSearch("playzone");
  if(page==="chat") bindChat();
  if(page==="profiles") bindProfiles();
  if(page==="settings") bindSettings();
});
