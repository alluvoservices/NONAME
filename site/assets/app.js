const Store = (() => {
  const key="vibrinova-data";
  const def={
    theme:{ mode:"dark", primary:"#6EE7F9", accent:"#8B5CF6" },
    onboarded:false, lastPage:"index", activeProfileId:"",
    profiles:[
      {id:"p1",name:"KIDS",kids:true, avatar:"K",password:null},
      {id:"p2",name:"Profile 1",kids:false,avatar:"P",password:null},
      {id:"p3",name:"Profile 2",kids:false,avatar:"P",password:null},
      {id:"p4",name:"Profile 3",kids:false,avatar:"P",password:null}
    ],
    devices:[],
    byProfile:{},
    chat:{messages:[], recommendations:[]}
  };
  const load=()=>{ try{
    const s=JSON.parse(localStorage.getItem(key))||def;
    if(typeof s.theme==="string") s.theme={mode:s.theme,primary:def.theme.primary,accent:def.theme.accent};
    if(!s.byProfile) s.byProfile={};
    (s.profiles||def.profiles).forEach(p=>{ if(!s.byProfile[p.id]) s.byProfile[p.id]={histories:{search:{},watch:[]}}; });
    return s;
  }catch{return def;} };
  let state=load(); const save=()=>localStorage.setItem(key, JSON.stringify(state));
  return { get:()=>state, set:(fn)=>{ state=fn({...state}); save(); return state; } };
})();

const U={
  uid:()=>Math.random().toString(36).slice(2,10),
  code8:()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let o="";for(let i=0;i<8;i++) o+=c[Math.floor(Math.random()*c.length)];return o;},
  tags:(t)=>{const re=/@([A-Za-z0-9][A-Za-z0-9 ':.-]{0,49})/g; const s=new Set(); let m; while((m=re.exec(t))!==null) s.add(m[1].trim()); return [...s];},
  el:(s,r=document)=>r.querySelector(s), els:(s,r=document)=>Array.from(r.querySelectorAll(s)),
  qs:(k)=> new URLSearchParams(location.search).get(k)
};

/* Theme */
function applyTheme(){ const t=Store.get().theme;
  document.documentElement.dataset.theme=t.mode;
  document.documentElement.style.setProperty("--primary", t.primary);
  document.documentElement.style.setProperty("--accent", t.accent);
}
function setMode(m){ Store.set(s=>{ s.theme.mode=(m==="light"?"light":"dark"); return s; }); applyTheme(); }
function setColors(p,a){ const hex=/^#([A-Fa-f0-9]{3}){1,2}$/; Store.set(s=>{ if(hex.test(p)) s.theme.primary=p; if(hex.test(a)) s.theme.accent=a; return s; }); applyTheme(); }

/* Nav */
function setActive(page){ U.els(".nav a").forEach(a=> a.classList.toggle("active", a.getAttribute("data-page")===page)); }

/* Per-profile histories */
function recordSearch(page,q){ Store.set(s=>{ const id=s.activeProfileId||"p1"; const list=s.byProfile[id].histories.search[page]||[]; s.byProfile[id].histories.search[page]=[q,...list].slice(0,50); return s; }); }
function recordWatch(title){ Store.set(s=>{ const id=s.activeProfileId||"p1"; s.byProfile[id].histories.watch=[{id:U.uid(),title,ts:Date.now()},...s.byProfile[id].histories.watch].slice(0,200); return s; }); }

/* Chat */
function addMsg(sender,text){ Store.set(s=>{ s.chat.messages=[...s.chat.messages,{id:U.uid(),sender,text,ts:Date.now()}].slice(-500); U.tags(text).forEach(t=>s.chat.recommendations.unshift({title:t,from:sender})); s.chat.recommendations=s.chat.recommendations.slice(0,200); return s; }); }
function renderChat(){ const w=U.el("#chat-messages"); if(!w) return; const {profiles,activeProfileId,chat}=Store.get(); const me=profiles.find(p=>p.id===activeProfileId);
  w.innerHTML=`<div class="bubble other">Welcome to VibriNova Chat!</div><div class="bubble other">Use @Title to recommend</div>`;
  chat.messages.forEach(m=>{ const self=(m.sender===me?.name||m.sender===me?.id); const d=document.createElement("div"); d.className="bubble "+(self?"self":"other"); d.textContent=m.text; w.appendChild(d); });
  w.scrollTop=w.scrollHeight;
}
function bindChat(){ const inp=U.el("#chat-input"), form=U.el("#chat-form"), w=U.el("#chat-messages"); if(!form||!inp) return;
  form.addEventListener("submit",e=>{ e.preventDefault(); const v=inp.value.trim(); if(!v) return; const me=Store.get().profiles.find(p=>p.id===Store.get().activeProfileId); addMsg(me?.name||"Me", v); inp.value=""; renderChat(); setTimeout(()=>w.scrollTop=w.scrollHeight,50); });
  const R=U.el("#recs"); if(R){ const {chat}=Store.get(); R.innerHTML= chat.recommendations.length ? chat.recommendations.map(r=>`<div class="row card section" style="align-items:center;"><div><div><strong>${r.title}</strong></div><div class="text-muted" style="font-size:12px">by ${r.from}</div></div><button class="btn">Add</button></div>`).join("") : `<p class="text-muted">No recommendations yet.</p>`; }
  renderChat();
}

/* Search (+voice) */
function bindSearch(page){ const f=U.el(`#search-${page}`); if(!f) return; const i=U.el("input",f), mic=U.el(".mic-btn",f), clr=U.el(".clear-btn",f);
  f.addEventListener("submit",e=>{ e.preventDefault(); const q=(i.value||"").trim(); if(!q) return; recordSearch(page,q); i.value=""; });
  clr && clr.addEventListener("click",()=>{ i.value=""; i.focus(); });
  if(mic){ const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ mic.style.display="none"; } else {
      const rec=new SR(); rec.lang="en-US"; rec.interimResults=false; rec.continuous=false; let on=false;
      const start=()=>{ if(on) return; on=true; rec.start(); mic.classList.add("btn-primary"); };
      const stop =()=>{ if(!on) return; on=false; rec.stop(); mic.classList.remove("btn-primary"); };
      mic.addEventListener("click",()=> on?stop():start());
      rec.onresult=e=>{ const t=Array.from(e.results).map(r=>r[0].transcript).join(" "); i.value=(i.value+" "+t).trim(); };
      rec.onend=stop; rec.onerror=stop;
  } }
}

/* Profiles */
function bindProfiles(){ const w=U.el("#profiles-list"); if(!w) return; const {profiles,activeProfileId}=Store.get();
  w.innerHTML=profiles.map(p=>`<button class="profile" data-id="${p.id}" style="background:none;border:0;cursor:pointer"><div class="avatar ${p.id===activeProfileId?"active":""}">${(p.avatar||p.name[0]||"P").slice(0,1)}</div><div class="mt-1" style="text-align:center">${p.name}${p.kids?` <small class="text-muted">(Kids)</small>`:""}</div></button>`).join("");
  U.els(".profile",w).forEach(b=> b.addEventListener("click",()=>{ const id=b.getAttribute("data-id"); Store.set(s=>{ s.activeProfileId=id; s.onboarded=true; return s; }); refreshAvatars(); if(U.qs("first")==="1"||document.referrer==="") location.href="index.html"; }));
}
function refreshAvatars(){ const {profiles,activeProfileId}=Store.get(); const me=profiles.find(p=>p.id===activeProfileId); const ch=(me?.avatar||me?.name?.[0]||"P").slice(0,1); const a1=U.el("#mobile-avatar"); if(a1) a1.textContent=ch; const a2=U.el("#sidebar-avatar"); if(a2) a2.textContent=ch; }

/* Kids filter */
function kidsFilter(){ const {profiles,activeProfileId}=Store.get(); const me=profiles.find(p=>p.id===activeProfileId); if(!me?.kids) return; const ok=new Set(["U","7+"]); U.els(".poster").forEach(card=>{ const age=card.getAttribute("data-age")||"U"; card.style.display= ok.has(age) ? "" : "none"; }); }

/* Devices & settings */
function renderDevices(){ const lst=U.el("#devices-list"); if(!lst) return; const {devices}=Store.get();
  lst.innerHTML= devices.length ? devices.map(d=>`<div class="kv"><div>${d.name} • <strong>${d.code}</strong></div><button class="btn" data-remove="${d.code}">Remove</button></div>`).join("") : `<p class="text-muted">No devices activated yet.</p>`;
  U.els("button[data-remove]").forEach(b=> b.addEventListener("click",()=>{ const code=b.getAttribute("data-remove"); Store.set(s=>{ s.devices=s.devices.filter(x=>x.code!==code); return s; }); renderDevices(); }));
  const hist=U.el("#histories"); if(hist){ const id=Store.get().activeProfileId||"p1"; const hp=Store.get().byProfile[id].histories; const searches=Object.values(hp.search).reduce((a,b)=>a+b.length,0); hist.textContent=`Search entries: ${searches} • Watched: ${hp.watch.length}`; }
}
function bindSettings(){
  U.el("#gen-device")?.addEventListener("click",()=>{ const name=(U.el("#device-name")?.value||"My Device").toString(); const d={id:U.uid(),name,code:U.code8(),activatedAt:Date.now()}; Store.set(s=>{ s.devices=[d,...s.devices].slice(0,50); return s; }); alert(`Activation code for ${d.name}: ${d.code}`); renderDevices(); });
  U.el("#clear-histories")?.addEventListener("click",()=>{ Store.set(s=>{ const id=s.activeProfileId||"p1"; s.byProfile[id].histories={search:{},watch:[]}; return s; }); renderDevices(); });
  const sel=U.el("#theme-select"); if(sel){ sel.value=Store.get().theme.mode; sel.addEventListener("change",e=> setMode(e.target.value)); }
  U.els(".swatch").forEach(sw=> sw.addEventListener("click",()=> setColors(sw.getAttribute("data-p"), sw.getAttribute("data-a"))));
  const p=U.el("#pick-primary"), a=U.el("#pick-accent"); U.el("#apply-colors")?.addEventListener("click",()=> setColors(p.value,a.value));
  renderDevices();
}

/* Guard */
function guard(page){ const {onboarded,activeProfileId}=Store.get(); if(!onboarded || !activeProfileId){ if(page!=="profiles"){ location.replace("profiles.html?first=1"); return false; } } return true; }

/* Header autohide: hide on up, show on down (as requested) */
function bindHeaderAutohide(){ const h=U.el(".header"); if(!h) return; let last=window.scrollY||0; window.addEventListener("scroll",()=>{ const y=window.scrollY||0; if(y < last-6) h.classList.add("is-hidden"); else if(y > last+6) h.classList.remove("is-hidden"); last=y; }, { passive:true }); }

/* Boot */
document.addEventListener("DOMContentLoaded", ()=>{
  applyTheme(); refreshAvatars(); bindHeaderAutohide();
  if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  const page=document.body.getAttribute("data-page")||"stream";
  if(!guard(page)) return;
  setActive(page);
  if(page==="stream"){ bindSearch("stream"); kidsFilter(); U.els(".watch-btn").forEach(b=>b.addEventListener("click",()=>recordWatch(b.getAttribute("data-title")))); }
  if(page==="food"){ bindSearch("food"); }
  if(page==="chat"){ bindChat(); }
  if(page==="tickets"){ bindSearch("tickets"); kidsFilter(); }
  if(page==="playzone"){ bindSearch("playzone"); }
  if(page==="profiles"){ bindProfiles(); }
  if(page==="settings"){ bindSettings(); }
});
