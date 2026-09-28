
/* ===== PASTE YOUR FIREBASE CONFIG HERE (Firebase console → Project settings → Your apps → Web app) ===== */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0uDbhkIlct7BUUBQTcuG_F75ZbeV6Y9A",
  authDomain: "soc-l1cc.firebaseapp.com",
  projectId: "soc-l1cc",
  storageBucket: "soc-l1cc.firebasestorage.app",
  messagingSenderId: "94446378090",
  appId: "1:94446378090:web:e3fe1bd60fdccbe8f93e13"
};
/* ================================================================================================ */
/* ===== track config comes from TRACK (defined in each center's page) ===== */
const BASE=TRACK.curriculum.map(s=>[s.name,s.rooms]);
let CURR=BASE.map(s=>[s[0],s[1].slice()]);
function applyCurr(){CURR=BASE.map((s,i)=>[s[0],(typeof S!=='undefined'&&S&&S.curr&&Array.isArray(S.curr[i])&&S.curr[i].length)?S.curr[i]:s[1]])}
const KEY=TRACK.key;
const THM_PATH=TRACK.pathUrl;
const HTB_DEFAULT=TRACK.practiceUrl;
const SLUG=TRACK.slugs||{};
const secPath=i=>(TRACK.curriculum[i]&&TRACK.curriculum[i].pathUrl)||THM_PATH;
const secPlat=i=>(TRACK.curriculum[i]&&TRACK.curriculum[i].platform)||'thm';
function roomUrl(k){if(S.links[k])return S.links[k];const [i,j]=k.split('-').map(Number),r=CURR[i][1][j];if(secPlat(i)==='thm'&&SLUG[r])return 'https://tryhackme.com/room/'+SLUG[r];if(secPlat(i)==='htb')return 'https://duckduckgo.com/?q='+encodeURIComponent('\\ site:academy.hackthebox.com module '+r);return 'https://duckduckgo.com/?q='+encodeURIComponent('\\ site:tryhackme.com/room '+(r==='Topic Rewind Recap'?CURR[i][0]+' topic rewind':r))}
function htbUrl(i){return S.htb[i]||HTB_DEFAULT}
function openUrl(u){const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
function safeUrl(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;try{return new URL(u).href}catch(e){return null}}
function editLink(kind,id,label){const m=document.getElementById('modal');const cur=kind==='room'?(S.links[id]||''):(S.htb[id]||'');
 document.getElementById('mtitle').textContent='Link for '+label;
 const b=document.getElementById('mbody');b.innerHTML='<p style="margin:0 0 8px">Paste the exact page URL. Leave empty to use the default link.</p><input id="linkIn" class="linkin" placeholder="https://…">';
 const inp=document.getElementById('linkIn');inp.value=cur;
 const a=document.getElementById('mact');a.innerHTML='';
 [['Cancel',null],['Save link','lime']].forEach(([t,c])=>{const e=document.createElement('button');e.className='btn'+(c?' '+c:'');e.textContent=t;e.onclick=()=>{if(c){const v=safeUrl(inp.value);if(v===null){msg('That doesn’t look like a valid URL');return}const store=kind==='room'?S.links:S.htb;if(v)store[id]=v;else delete store[id];save();msg(v?'Link saved':'Default link restored')}m.classList.remove('show')};a.appendChild(e)});
 m.classList.add('show');inp.focus()}
const blank=()=>({rooms:{},ass:{},cases:[],links:{},htb:{},notes:[],vault:null,vaultFiles:{},curr:{}});
function norm(x){x=x&&typeof x==='object'?x:{};return{rooms:x.rooms&&typeof x.rooms==='object'?x.rooms:{},ass:x.ass&&typeof x.ass==='object'?x.ass:{},cases:Array.isArray(x.cases)?x.cases:[],links:x.links&&typeof x.links==='object'?x.links:{},htb:x.htb&&typeof x.htb==='object'?x.htb:{},notes:Array.isArray(x.notes)?x.notes:[],vault:x.vault&&typeof x.vault==='object'?x.vault:null,vaultFiles:x.vaultFiles&&typeof x.vaultFiles==='object'?x.vaultFiles:{},curr:x.curr&&typeof x.curr==='object'?x.curr:{}}}
let UKEY=KEY;let S=blank();
function loadLocal(){try{return norm(JSON.parse(localStorage.getItem(UKEY)))}catch(e){return blank()}}
function saveLocal(){try{localStorage.setItem(UKEY,JSON.stringify(S))}catch(e){}}

/* Cloud sync (per-user, private) when running as a published artifact */
let DB=null,DOC=null,pushT=null;
function setSync(t){document.getElementById('syncfoot').textContent=t;document.getElementById('syncline').textContent=t==='Synced to your account'?'Progress is synced to your account (Firebase) and cached in this browser.':'Progress is saved in this browser.'}
async function initCloud(){}
/* ================= FIREBASE LOGIN + CLOUD SAVE ================= */
function fbReady(){return FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey&&!/PASTE/.test(FIREBASE_CONFIG.apiKey)&&window.firebase}
let AUTH=null,FS=null,CUR_USER=null;
const ERR={'auth/invalid-email':'That email address isn’t valid.','auth/missing-password':'Enter your password.','auth/weak-password':'Password must be at least 6 characters.','auth/email-already-in-use':'An account with this email already exists. Sign in instead.','auth/invalid-credential':'Wrong email or password.','auth/wrong-password':'Wrong email or password.','auth/user-not-found':'No account with this email. Create one first.','auth/too-many-requests':'Too many attempts. Wait a few minutes and try again.','auth/popup-closed-by-user':'Google sign-in was closed before finishing.','auth/unauthorized-domain':'This website address isn’t allowed yet. Add it in Firebase → Authentication → Settings → Authorized domains.','auth/operation-not-allowed':'This sign-in method is turned off in Firebase → Authentication → Sign-in method.','auth/network-request-failed':'No internet connection.','auth/popup-blocked':'Your browser blocked the Google popup. Allow popups for this site (icon at the right of the address bar) and try again.','auth/cancelled-popup-request':'Sign-in was already in progress. Try again.','auth/api-key-not-valid.-please-pass-a-valid-api-key.':'The Firebase apiKey in index.html is wrong. Copy it again from Firebase → Project settings.','auth/invalid-api-key':'The Firebase apiKey in index.html is wrong. Copy it again from Firebase → Project settings.'};
function gerr(e){const el=document.getElementById('gerr');el.textContent=ERR[e&&e.code]||('Sign-in failed: '+((e&&e.message)||e));el.className='gmsg bad'}
function ginfo(t){const el=document.getElementById('gerr');el.textContent=t;el.className='gmsg ok'}
function gbusy(on){document.querySelectorAll('#gate button').forEach(b=>b.disabled=on)}
function initFirebase(){
 const gate=document.getElementById('gate');
 if(!fbReady()){showGate('setup');return}
 firebase.initializeApp(FIREBASE_CONFIG);AUTH=firebase.auth();FS=firebase.firestore();
 AUTH.onAuthStateChanged(async u=>{
  CUR_USER=u;
  if(!u){DOC=null;IS_ADMIN=false;S=blank();renderAll();showGate('form');document.getElementById('whoami').textContent='';return}
  if(!(await checkAccess(u)))return;
  gate.classList.remove('show');document.getElementById('whoami').textContent=u.email||u.displayName||'Signed in';
  UKEY=KEY+'_'+u.uid;S=loadLocal();renderAll();
  DOC=FS.collection('users').doc(u.uid);
  try{const snap=await DOC.get();
   if(snap.exists){const d=snap.data();if(d&&d[TRACK.field]){S=norm(JSON.parse(d[TRACK.field]));saveLocal();renderAll()}}
   else{await DOC.set({[TRACK.field]:JSON.stringify(S),updated:Date.now(),email:u.email||''},{merge:true})}
   setSync('Synced to your account');
   vaultUI();if(vaultOn()){vaultPull(false).then(()=>vaultSync(false))}
  }catch(e){setSync('Offline — saved in this browser');msg('Cloud sync failed — check Firestore rules')}
 });
}
/* ---- invite-only access ---- */
let IS_ADMIN=false;
function showGate(which){const g=document.getElementById('gate');g.classList.add('show');document.getElementById('gform').hidden=which!=='form';document.getElementById('gpending').hidden=which!=='pending';document.getElementById('gsetup').hidden=which!=='setup';if(which==='form'){document.getElementById('gerr').textContent=''}}
async function checkAccess(u){
 const email=(u.email||'').toLowerCase();
 IS_ADMIN=false;
 try{await FS.collection('requests').limit(1).get();IS_ADMIN=true}catch(e){}
 if(IS_ADMIN){renderAccess();return true}
 try{const a=await FS.collection('allowlist').doc(email).get();if(a.exists)return true}catch(e){}
 try{await FS.collection('requests').doc(email).set({email,name:u.displayName||'',photo:u.photoURL||'',uid:u.uid,requested:Date.now()})}catch(e){}
 document.getElementById('gpemail').textContent=email;document.getElementById('gperr').textContent='';showGate('pending');
 return false;
}
async function recheckAccess(){const u=AUTH&&AUTH.currentUser;if(!u)return;const el=document.getElementById('gperr');el.className='gmsg';el.textContent='Checking…';
 try{const a=await FS.collection('allowlist').doc((u.email||'').toLowerCase()).get();if(a.exists){location.reload();return}}catch(e){}
 el.className='gmsg bad';el.textContent='Not approved yet. Try again later.'}
async function renderAccess(){
 const box=document.getElementById('accessPanel');if(!box)return;box.hidden=!IS_ADMIN;if(!IS_ADMIN)return;
 const [rq,al]=await Promise.all([FS.collection('requests').get(),FS.collection('allowlist').get()]).catch(()=>[null,null]);
 if(!rq){document.getElementById('acReq').innerHTML='<div class="empty">Could not load — check Firestore rules.</div>';return}
 const reqs=rq.docs.map(d=>d.data()).sort((a,b)=>(b.requested||0)-(a.requested||0));
 const allow=al.docs.map(d=>({email:d.id,...d.data()})).sort((a,b)=>a.email.localeCompare(b.email));
 document.getElementById('acBadge').textContent=reqs.length?reqs.length+' pending':'';
 document.getElementById('acReq').innerHTML=reqs.length?reqs.map(r=>'<div class="acrow"><div><b>'+esc(r.name||r.email)+'</b><span>'+esc(r.email)+' · '+new Date(r.requested||Date.now()).toLocaleString()+'</span></div><div class="actions" style="margin:0"><button class="btn sm lime" onclick="approve(\''+esc(r.email)+'\')">Approve</button><button class="btn sm" onclick="denyReq(\''+esc(r.email)+'\')">Deny</button></div></div>').join(''):'<div class="empty">No pending requests.</div>';
 document.getElementById('acAllow').innerHTML=allow.length?allow.map(a=>'<div class="acrow"><div><b>'+esc(a.email)+'</b><span>approved '+(a.added?new Date(a.added).toLocaleDateString():'')+'</span></div><button class="btn sm" onclick="revoke(\''+esc(a.email)+'\')">Remove</button></div>').join(''):'<div class="empty">No approved users yet.</div>';
}
async function approve(email){email=email.toLowerCase().trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){msg('Enter a valid email');return}
 try{await FS.collection('allowlist').doc(email).set({added:Date.now(),by:(CUR_USER&&CUR_USER.email)||''});await FS.collection('requests').doc(email).delete().catch(()=>{});msg('Approved '+email);renderAccess()}catch(e){msg('Failed: '+(e.code||e.message))}}
function denyReq(email){ask('Deny '+email+'?','The request is removed. They can request again by signing in.',[{label:'Cancel'},{label:'Deny',cls:'lime',fn:async()=>{try{await FS.collection('requests').doc(email).delete();msg('Request removed');renderAccess()}catch(e){msg('Failed: '+(e.code||e.message))}}}])}
function revoke(email){ask('Remove '+email+'?','They will lose access the next time they open the site. Their saved progress is kept.',[{label:'Cancel'},{label:'Remove access',cls:'lime',fn:async()=>{try{await FS.collection('allowlist').doc(email).delete();msg('Access removed');renderAccess()}catch(e){msg('Failed: '+(e.code||e.message))}}}])}
function addAllowed(){const i=document.getElementById('acNew');approve(i.value);i.value=''}
async function gGoogle(){if(!AUTH){return}gbusy(true);const t=setTimeout(()=>gbusy(false),15000);try{const pr=new firebase.auth.GoogleAuthProvider();pr.setCustomParameters({prompt:'select_account'});await AUTH.signInWithPopup(pr)}catch(e){gerr(e)}clearTimeout(t);gbusy(false)}
async function gEmail(create){const em=document.getElementById('gem').value.trim(),pw=document.getElementById('gpw').value;gbusy(true);
 try{if(create)await AUTH.createUserWithEmailAndPassword(em,pw);else await AUTH.signInWithEmailAndPassword(em,pw)}catch(e){gerr(e)}gbusy(false)}
async function gReset(){const em=document.getElementById('gem').value.trim();if(!em){gerr({code:'auth/invalid-email'});return}
 try{await AUTH.sendPasswordResetEmail(em);ginfo('Password reset email sent to '+em)}catch(e){gerr(e)}}
function signOut(){ask('Sign out?','Your progress stays saved in your account.',[{label:'Cancel'},{label:'Sign out',cls:'lime',fn:()=>{clearTimeout(pushT);AUTH&&AUTH.signOut()}}])}
function pushCloud(){if(!DOC)return;clearTimeout(pushT);pushT=setTimeout(()=>{DOC.set({[TRACK.field]:JSON.stringify(S),updated:Date.now(),email:(CUR_USER&&CUR_USER.email)||''},{merge:true}).catch(()=>{})},700)}
function persist(){saveLocal();pushCloud();queueVault()}
function save(){persist();renderAll()}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function all(){let a=[];CURR.forEach((s,si)=>s[1].forEach((r,ri)=>a.push({si,ri,s:s[0],r,key:si+'-'+ri})));return a}
function st(k){return S.rooms[k]?.status||'Not Started'}
function setst(k,v){const o=S.rooms[k]||{};S.rooms[k]={...o,status:v,learned:v==='Done'?(o.learned||today()):(o.learned||'')}}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function cur(){const a=all();return a.find(x=>st(x.key)!=='Done')||a[a.length-1]}
function stats(i){let r=CURR[i][1].map((_,j)=>st(i+'-'+j));return{n:r.length,d:r.filter(x=>x==='Done').length}}
function passed(i){return S.ass[i]?.status==='Passed'}
function go(id){if(id==='settings'&&IS_ADMIN)setTimeout(renderAccess,0);document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));document.getElementById(id).classList.add('on');document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x.dataset.v===id));document.getElementById('crumb').textContent='COMMAND CENTER / '+id.toUpperCase();renderAll();window.scrollTo(0,0)}
document.querySelectorAll('.nav button').forEach(x=>x.onclick=()=>go(x.dataset.v));
let toastT;function msg(x){let t=document.getElementById('toast');t.textContent=x;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}
function ask(title,body,buttons){const m=document.getElementById('modal');document.getElementById('mtitle').textContent=title;document.getElementById('mbody').textContent=body;const a=document.getElementById('mact');a.innerHTML='';buttons.forEach(b=>{const e=document.createElement('button');e.className='btn'+(b.cls?' '+b.cls:'');e.textContent=b.label;e.onclick=()=>{m.classList.remove('show');b.fn&&b.fn()};a.appendChild(e)});m.classList.add('show');a.lastChild.focus()}
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')e.currentTarget.classList.remove('show')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('modal').classList.remove('show')});

function thm(){openUrl(THM_PATH)}
function start(){let c=cur();openUrl(roomUrl(c.key));if(st(c.key)==='Not Started'){setst(c.key,'In Progress');save()}msg('Opening: '+c.r)}
function done(){let c=cur();setst(c.key,'Done');save();msg('Completed: '+c.r)}
function renderDash(){const sc=document.getElementById('seccount');if(sc)sc.textContent=CURR.length+' sections';let a=all(),d=a.filter(x=>st(x.key)==='Done').length,c=cur();
 pct.textContent=Math.round(d/a.length*100)+'%';rooms.textContent=d+' / '+a.length+' rooms';secno.textContent=(c.si+1);secname.textContent=c.s;
 unlocked.textContent=CURR.filter((_,i)=>passed(i)).length;casecount.textContent=S.cases.length;
 msec.textContent='SECTION '+(c.si+1)+' • '+c.s.toUpperCase();mroom.textContent=c.r;mstatus.textContent=st(c.key).toUpperCase();
 sprogress.innerHTML=CURR.map((s,i)=>{let q=stats(i),p=Math.round(q.d/q.n*100);return '<div class="srow"><div class="rtop"><b>'+(i+1)+'. '+esc(s[0])+'</b><span>'+q.d+'/'+q.n+' • '+p+'%</span></div><div class="progress"><i style="width:'+p+'%"></i></div></div>'}).join('')}
function renderTHM(){let q=(document.getElementById('search').value||'').toLowerCase(),o='';
 CURR.forEach((s,i)=>{let rs=s[1].map((r,j)=>({r,j})).filter(x=>(s[0]+' '+x.r).toLowerCase().includes(q));if(!rs.length)return;
  o+='<div class="sechdrow"><h3 class="sechd">SECTION '+(i+1)+' • '+esc(s[0])+'</h3><span class="actions" style="margin:0"><a class="btn sm" href="'+esc(secPath(i))+'" target="_blank" rel="noopener">Open path ↗</a><button class="btn sm" onclick="editSection('+i+')" title="Edit room names">✎ Rooms</button></span></div><div class="tw"><table class="table"><thead><tr><th>#</th><th>Room</th><th>Status</th><th>Action</th></tr></thead><tbody>';
  rs.forEach(x=>{let z=st(i+'-'+x.j),cl=z==='Done'?'done':z==='In Progress'?'prog':'not';o+='<tr><td>'+(x.j+1)+'</td><td><b>'+esc(x.r)+'</b></td><td><span class="tag '+cl+'">'+z+'</span></td><td class="acts"><a class="btn sm lime" href="'+esc(roomUrl(i+'-'+x.j))+'" target="_blank" rel="noopener" onclick="opened(\''+i+'-'+x.j+'\')">'+(z==='Done'?'Open ↗':'Start ↗')+'</a><button class="btn sm" onclick="cycle(\''+i+'-'+x.j+'\')">'+(z==='Not Started'?'Mark started':z==='In Progress'?'Mark done':'Reopen')+'</button><button class="btn sm" title="Edit link" aria-label="Edit room link" onclick="editLink(\'room\',\''+i+'-'+x.j+'\',CURR['+i+'][1]['+x.j+'])">✎</button><button class="btn sm'+(noteForRoom(i+'-'+x.j)?' hasnote':'')+'" title="Room notes" aria-label="Room notes" onclick="roomNote(\''+i+'-'+x.j+'\')">📝</button></td></tr>'});
  o+='</tbody></table></div>'});
 thmlist.innerHTML=o||'<div class="empty">No rooms match that search. Try a section name like "Phishing".</div>'}
function opened(k){if(st(k)==='Not Started'){setTimeout(()=>{setst(k,'In Progress');save()},400)}}
function cycle(k){let z=st(k);setst(k,z==='Not Started'?'In Progress':z==='In Progress'?'Done':'Not Started');save();msg('Room updated')}
function assTag(a){return a==='Passed'?'done':a==='Failed'?'lock':'not'}
function renderSections(){sectable.innerHTML=CURR.map((s,i)=>{let q=stats(i),p=Math.round(q.d/q.n*100),a=S.ass[i]?.status||'Pending';return '<tr><td><b>Section '+(i+1)+'</b><br><span class="muted">'+esc(s[0])+'</span></td><td>'+q.d+'/'+q.n+'</td><td style="min-width:110px"><div class="progress"><i style="width:'+p+'%"></i></div>'+p+'%</td><td><span class="tag '+assTag(a)+'">'+a+'</span></td><td><span class="tag '+(passed(i)?'ready':'lock')+'">'+(passed(i)?'Unlocked':'Locked')+'</span></td></tr>'}).join('')}
function renderAssess(){asslist.innerHTML=CURR.map((s,i)=>{let q=stats(i),a=S.ass[i]?.status||'Pending',ready=q.d===q.n,dt=S.ass[i]?.date?' <span class="muted" style="font-size:11px">('+esc(S.ass[i].date)+')</span>':'';
 return '<div class="card panel"><div class="pt"><h3>Section '+(i+1)+' • '+esc(s[0])+'</h3><span>'+q.d+'/'+q.n+' rooms</span></div><div class="assrow"><span class="muted">'+(ready?'Assessment available.':'Complete all rooms first.')+'</span>'+(ready?'<button class="btn sm" onclick="assess('+i+')">Record pass / fail</button>':'')+'<span class="tag '+assTag(a)+'">'+a+'</span>'+dt+'</div></div>'}).join('')}
function assess(i){ask('Section '+(i+1)+' assessment','Record your result for '+CURR[i][0]+'.',[
 {label:'Cancel'},
 {label:'Not passed',fn:()=>{S.ass[i]={status:'Failed',date:today()};save();msg('Not passed — revise and retry')}},
 {label:'Passed',cls:'lime',fn:()=>{S.ass[i]={status:'Passed',date:today()};save();msg('Passed — '+TRACK.labels.practiceShort+' unlocked')}}])}
function renderHTB(){htblist.innerHTML=CURR.map((s,i)=>{let q=stats(i),p=passed(i);return '<tr><td><b>'+(i+1)+'. '+esc(s[0])+'</b></td><td>'+q.d+'/'+q.n+'</td><td><span class="tag '+(p?'done':'lock')+'">'+(p?'Passed':'Not Passed')+'</span></td><td><span class="tag '+(p?'ready':'lock')+'">'+(p?'Unlocked':'Locked')+'</span></td><td class="acts">'+(p?'<a class="btn sm lime" href="'+esc(htbUrl(i))+'" target="_blank" rel="noopener">'+TRACK.labels.practiceBtn+' ↗</a><button class="btn sm" onclick="newCase(\''+TRACK.labels.practiceShort+' / Section '+(i+1)+'\')">'+TRACK.labels.plan+'</button>':'<span class="muted" style="margin-right:6px">Pass assessment first</span>')+'<button class="btn sm" title="Edit HTB link" aria-label="Edit HTB link" onclick="editLink(\'htb\','+i+',\'Section '+(i+1)+' ('+TRACK.labels.practiceShort+')\')">✎</button></td></tr>'}).join('')}
function launch(){let c=cur();if(passed(c.si)){go('htb');msg(TRACK.labels.practiceShort+' unlocked for current section')}else{go('assess');msg('Assessment required before '+TRACK.labels.practiceShort)}}
function newCase(title){let n=S.cases.reduce((m,c)=>Math.max(m,parseInt(String(c.id).split('-')[1])||0),0)+1;let id=TRACK.caseId+'-'+String(n).padStart(3,'0');S.cases.push({id,title:title||TRACK.caseDefault,created:today(),notes:'',verdict:'Open'});save();go('cases');msg(id+' created')}
function renderCases(){caselist.innerHTML=S.cases.length?S.cases.map((c,i)=>'<div class="card case"><h3>'+esc(c.id)+'</h3><input value="'+esc(c.title)+'" onchange="setTitle('+i+',this.value)" aria-label="Case title"><p class="muted" style="font-size:12px;margin:8px 0 0">Created '+esc(c.created)+' • <span class="tag '+(c.verdict==='Open'?'prog':'done')+'">'+esc(c.verdict)+'</span></p><textarea oninput="note('+i+',this.value)" placeholder="Evidence, timeline, IOC/TTP, MITRE, verdict, response…">'+esc(c.notes)+'</textarea><div class="row"><button class="btn sm" onclick="closeCase('+i+')">'+(c.verdict==='Open'?'Close case':'Reopen case')+'</button><button class="btn sm" onclick="delCase('+i+')">Delete</button></div></div>').join(''):'<div class="empty" style="grid-column:1/-1">No cases yet. Select “+ New Case” to log your first investigation.</div>'}
function setTitle(i,v){S.cases[i].title=v;persist()}
function note(i,v){S.cases[i].notes=v;persist()}
function closeCase(i){S.cases[i].verdict=S.cases[i].verdict==='Open'?'Closed':'Open';save()}
function delCase(i){ask('Delete '+S.cases[i].id+'?','Its notes will be removed permanently.',[{label:'Cancel'},{label:'Delete case',cls:'lime',fn:()=>{S.cases.splice(i,1);save();msg('Case deleted')}}])}
function renderRev(){let a=all().filter(x=>st(x.key)==='Done'),t=today();
 revlist.innerHTML=a.length?a.map(x=>{let L=S.rooms[x.key].learned||t,d=new Date(L+'T00:00:00'),f=n=>{let z=new Date(d);z.setDate(z.getDate()+n);let s=z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0');return s===t?'<span class="tag not">'+s+' • today</span>':s<t?'<span class="muted">'+s+'</span>':s};
 return '<tr><td>'+esc(x.r)+'</td><td>'+esc(x.s)+'</td><td>'+esc(L)+'</td><td>'+f(1)+'</td><td>'+f(3)+'</td><td>'+f(7)+'</td></tr>'}).join(''):'<tr><td colspan="6"><div class="empty">Mark a room done to start revision tracking.</div></td></tr>'}

/* Backup via the downloads capability */
let DL=null;
(async()=>{try{if(window.claude&&window.claude.use){DL=await window.claude.use('downloads')}}catch(e){DL=null}})();
async function backup(){const data=JSON.stringify(S,null,2);
 if(DL){try{await DL.save({filename:TRACK.id+'_Backup.json',data});msg('Backup exported')}catch(e){if(e&&e.code==='declined')msg('Backup cancelled');else msg('Backup is unavailable here')}return}
 try{const b=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=TRACK.id+'_Backup.json';a.click();msg('Backup exported')}catch(e){msg('Backup is unavailable here')}}
function restore(inp){let f=inp.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{S=norm(JSON.parse(r.result));save();msg('Backup restored')}catch(e){msg('That file isn’t a valid backup JSON')}inp.value=''};r.readAsText(f)}
function resetAll(){ask('Reset all training data?','Rooms, assessments and cases will be cleared. Export a backup first if you might need them.',[{label:'Cancel'},{label:'Reset',cls:'lime',fn:()=>{S=blank();save();msg('Progress reset')}}])}
/* ================= CURRICULUM EDITOR ================= */
function editSection(i){const m=document.getElementById('modal');
 document.getElementById('mtitle').textContent='Rooms — '+CURR[i][0];
 const b=document.getElementById('mbody');b.innerHTML='<p style="margin:0 0 8px">One room per line, in path order. Renaming keeps your progress; progress follows the line position.</p><textarea id="secRooms" class="linkin" style="min-height:220px;font:12px var(--mono)"></textarea>';
 document.getElementById('secRooms').value=CURR[i][1].join('\n');
 const a=document.getElementById('mact');a.innerHTML='';
 [['Reset to default','',()=>{delete S.curr[i];save();msg('Section reset')}],['Cancel','',null],['Save','lime',()=>{const rows=document.getElementById('secRooms').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!rows.length){msg('Add at least one room');return false}S.curr[i]=rows;save();msg('Rooms updated')}]].forEach(([t,c,fn])=>{const e=document.createElement('button');e.className='btn'+(c?' '+c:'');e.textContent=t;e.onclick=()=>{if(fn&&fn()===false)return;m.classList.remove('show')};a.appendChild(e)});
 m.classList.add('show')}

/* ================= GITHUB VAULT SYNC ================= */
let VAULT_T=null,VAULT_BUSY=false,VAULT_AGAIN=false,VAULT_MSG='',VAULT_ERR='';
function vaultOn(){return !!(window.GH&&S.vault&&S.vault.enabled&&GH.ready()&&GH.cfg().owner===S.vault.owner)}
function hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return String(h)}
const tagArr=t=>Array.isArray(t)?t:String(t||'').split(',').map(x=>x.trim()).filter(Boolean);
function itemMd(kind,it){
 if(kind==='notes')return GH.fm.build({title:it.title||'Untitled note',room:it.room?roomName(it.room):undefined,roomKey:it.room||undefined,tags:tagArr(it.tags),updated:new Date(it.updated||Date.now()).toISOString(),id:it.id},it.body||'');
 return GH.fm.build({id:it.id,title:it.title||TRACK.caseDefault,created:it.created,verdict:it.verdict||'Open'},it.notes||'');
}
function autoPath(kind,it){return kind==='notes'?TRACK.vault+'notes/'+GH.slug(it.title)+'-'+String(it.id).slice(-4)+'.md':TRACK.vault+'cases/'+it.id+'-'+GH.slug(it.title)+'.md'}
function ownPattern(kind,it,p){return kind==='notes'?p.startsWith(TRACK.vault+'notes/')&&p.endsWith('-'+String(it.id).slice(-4)+'.md'):p.startsWith(TRACK.vault+'cases/'+it.id+'-')}
function itemPath(kind,it){if(it.ghPath&&!ownPattern(kind,it,it.ghPath))return it.ghPath;return autoPath(kind,it)}
function vaultUI(){
 const on=vaultOn(),el=document.getElementById('vaultStatus');if(!el)return;
 const c=window.GH?GH.cfg():{};
 el.innerHTML=on?'<span class="ok">● connected</span> → <b>'+esc(c.owner+'/'+GH.vaultRepo())+'</b> (private)<br>'+(VAULT_ERR?'<span class="er">'+esc(VAULT_ERR)+'</span>':'<span class="cy">'+esc(VAULT_MSG||'Up to date')+'</span>'):'Not connected — notes and cases are saved to your account only.';
 document.getElementById('vConnect').textContent=on?'Change settings':'Connect GitHub';
 ['vPull','vPush','vOff'].forEach(id=>document.getElementById(id).hidden=!on);
 const mini=document.getElementById('vaultMini');if(mini)mini.innerHTML=on?(VAULT_ERR?'<span style="color:var(--red)">☁ GitHub sync error</span>':(VAULT_BUSY||VAULT_T?'<span style="color:var(--amber)">☁ syncing…</span>':'<span style="color:var(--green)">☁ saved to GitHub</span>')):'';
}
function queueVault(){if(!vaultOn())return;clearTimeout(VAULT_T);VAULT_T=setTimeout(()=>{VAULT_T=null;vaultSync()},4000);vaultUI()}
async function vaultSync(manual){
 if(!vaultOn())return;if(VAULT_BUSY){VAULT_AGAIN=true;return}
 VAULT_BUSY=true;VAULT_ERR='';vaultUI();const repo=GH.vaultRepo();let n=0;
 try{
  const live={};
  for(const kind of ['notes','cases']){
   for(const it of S[kind]){
    const text=itemMd(kind,it),hh=hashStr(text),path=itemPath(kind,it);live[path]=1;
    if(it.ghHash===hh&&it.ghPath===path)continue;
    const moved=it.ghPath&&it.ghPath!==path;
    it.ghSha=await GH.put(repo,path,text,moved?undefined:it.ghSha,(it.ghPath?(moved?'Rename ':'Update '):'Add ')+(kind==='notes'?'note: ':'case: ')+(it.title||it.id));
    if(moved){await GH.del(repo,it.ghPath,undefined,'Rename '+it.ghPath).catch(()=>{});delete S.vaultFiles[it.ghPath]}
    it.ghPath=path;it.ghHash=hh;S.vaultFiles[path]=1;n++;
   }
  }
  for(const path of Object.keys(S.vaultFiles)){if(!live[path]){await GH.del(repo,path,undefined,'Delete '+path).catch(()=>{});delete S.vaultFiles[path];n++}}
  VAULT_MSG='Last sync '+new Date().toLocaleTimeString()+(n?' · '+n+' file'+(n>1?'s':'')+' updated':'');
  saveLocal();pushCloud();if(manual)msg(n?'Pushed '+n+' change'+(n>1?'s':'')+' to GitHub':'GitHub is already up to date');
 }catch(e){VAULT_ERR=e.message;if(manual)msg(e.message)}
 VAULT_BUSY=false;vaultUI();if(VAULT_AGAIN){VAULT_AGAIN=false;queueVault()}
}
async function vaultPull(manual){
 if(!vaultOn())return;VAULT_BUSY=true;VAULT_ERR='';vaultUI();const repo=GH.vaultRepo();let n=0;
 try{
  for(const kind of ['notes','cases']){
   const files=(await GH.list(repo,TRACK.vault+kind)).filter(f=>f.name.endsWith('.md'));
   for(const f of files){
    const local=S[kind].find(x=>x.ghPath===f.path);
    if(local&&local.ghSha===f.sha)continue;
    const g=await GH.get(repo,f.path);if(!g)continue;const {meta,body}=GH.fm.parse(g.text);
    let it=local;
    if(kind==='notes'){
     if(!it){it={id:meta.id&&!S.notes.some(x=>x.id===meta.id)?meta.id:nid()};S.notes.unshift(it)}
     Object.assign(it,{title:meta.title||f.name.replace(/\.md$/,''),room:meta.roomKey||it.room||'',tags:tagArr(meta.tags).join(', '),body,updated:Date.parse(meta.updated)||Date.now()});
    }else{
     if(!it){let id=meta.id&&!S.cases.some(x=>x.id===meta.id)?meta.id:TRACK.caseId+'-'+String(S.cases.reduce((m,c)=>Math.max(m,parseInt(String(c.id).split('-')[1])||0),0)+1).padStart(3,'0');it={id};S.cases.push(it)}
     Object.assign(it,{title:meta.title||it.id,created:meta.created||today(),verdict:meta.verdict||'Open',notes:body});
    }
    it.ghPath=f.path;it.ghSha=f.sha;it.ghHash=hashStr(itemMd(kind,it));S.vaultFiles[f.path]=1;n++;
   }
  }
  VAULT_MSG='Pulled '+new Date().toLocaleTimeString()+(n?' · '+n+' file'+(n>1?'s':'')+' updated':' · nothing new');
  saveLocal();pushCloud();renderAll();if(manual)msg(n?'Pulled '+n+' file'+(n>1?'s':'')+' from GitHub':'Nothing new on GitHub');
 }catch(e){VAULT_ERR=e.message;if(manual)msg(e.message)}
 VAULT_BUSY=false;vaultUI();
}
async function vaultConnect(){
 const r=await GH.openSettings({need:['vaultRepo'],intro:'Notes and '+TRACK.labels.cases+' are saved as Markdown files in your private vault repository. The token is stored only in this browser.'});
 if(r==='disconnected'){vaultDisable(true);return}
 if(r!==true)return;
 S.vault={enabled:true,owner:GH.cfg().owner};saveLocal();pushCloud();vaultUI();
 msg('GitHub connected — syncing…');await vaultPull(false);await vaultSync(true);
}
function vaultDisable(silent){S.vault=null;saveLocal();pushCloud();VAULT_MSG='';VAULT_ERR='';vaultUI();if(silent!==true)msg('GitHub sync turned off (files on GitHub are kept)')}

/* ================= NOTES ================= */
let CUR_NOTE=null,NOTE_PREVIEW=false;
function nid(){return 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function roomName(k){if(!k)return '';const [i,j]=k.split('-').map(Number);return CURR[i]&&CURR[i][1][j]?CURR[i][1][j]+' · S'+(i+1):''}
function noteForRoom(k){return S.notes.find(n=>n.room===k)}
function newNote(room){const n={id:nid(),title:room?CURR[+room.split('-')[0]][1][+room.split('-')[1]]:'Untitled note',room:room||'',tags:'',body:'',updated:Date.now()};S.notes.unshift(n);CUR_NOTE=n.id;NOTE_PREVIEW=false;save();go('notes');setTimeout(()=>{const t=document.getElementById('nbody');t&&t.focus()},50)}
function roomNote(k){const n=noteForRoom(k);if(n){CUR_NOTE=n.id;NOTE_PREVIEW=true;go('notes')}else newNote(k)}
function openNote(id){CUR_NOTE=id;NOTE_PREVIEW=true;renderNotes()}
function curNote(){return S.notes.find(n=>n.id===CUR_NOTE)}
function editNote(f,v){const n=curNote();if(!n)return;n[f]=v;n.updated=Date.now();persist();renderNoteList()}
function delNote(){const n=curNote();if(!n)return;ask('Delete "'+(n.title||'Untitled')+'"?','This note will be removed permanently.',[{label:'Cancel'},{label:'Delete note',cls:'lime',fn:()=>{S.notes=S.notes.filter(x=>x.id!==n.id);CUR_NOTE=null;save();msg('Note deleted')}}])}
function togglePreview(){NOTE_PREVIEW=!NOTE_PREVIEW;renderNoteEditor()}
function md(src){try{if(window.marked&&window.DOMPurify)return DOMPurify.sanitize(marked.parse(src||''))}catch(e){}return '<pre>'+esc(src)+'</pre>'}
function fmtDate(t){const d=new Date(t);return d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}
function renderNoteList(){const q=(document.getElementById('nsearch').value||'').toLowerCase();
 const list=S.notes.slice().sort((a,b)=>b.updated-a.updated).filter(n=>(n.title+' '+n.tags+' '+n.body+' '+roomName(n.room)).toLowerCase().includes(q));
 document.getElementById('nlist').innerHTML=list.length?list.map(n=>'<button class="nitem'+(n.id===CUR_NOTE?' on':'')+'" onclick="openNote(\''+n.id+'\')"><b>'+esc(n.title||'Untitled note')+'</b><span>'+(n.room?'▣ '+esc(roomName(n.room))+' · ':'')+fmtDate(n.updated)+'</span>'+(n.tags?'<span class="ntags">'+n.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=>'#'+esc(t)).join(' ')+'</span>':'')+'</button>').join(''):'<div class="empty">'+(S.notes.length?'No notes match.':'No notes yet. Click “+ New note”, or 📝 next to any room.')+'</div>'}
function renderNoteEditor(){const n=curNote(),ed=document.getElementById('neditor');
 if(!n){ed.innerHTML='<div class="empty">Select a note, or create a new one.</div>';return}
 ed.innerHTML='<div class="nhead"><input id="ntitle" class="ntitle" aria-label="Note title" placeholder="Note title"><div class="actions" style="margin:0"><button class="btn sm" onclick="togglePreview()">'+(NOTE_PREVIEW?'✎ Edit':'👁 Preview')+'</button><button class="btn sm" onclick="delNote()">Delete</button></div></div>'+
 '<div class="nmeta">'+(n.room?'<span class="tag prog">▣ '+esc(roomName(n.room))+'</span>':'')+'<input id="ntags" class="linkin" placeholder="tags, comma separated (e.g. splunk, phishing)" aria-label="Tags"></div>'+
 (NOTE_PREVIEW?'<div class="mdview">'+(n.body.trim()?md(n.body):'<p class="muted">Empty note. Click ✎ Edit to start writing.</p>')+'</div>':'<textarea id="nbody" class="nbody" placeholder="# Key takeaways&#10;- …&#10;&#10;```&#10;index=main sourcetype=wineventlog EventCode=4625&#10;```"></textarea>');
 const t=document.getElementById('ntitle');t.value=n.title;t.oninput=e=>editNote('title',e.target.value);
 const g=document.getElementById('ntags');g.value=n.tags;g.oninput=e=>editNote('tags',e.target.value);
 const b=document.getElementById('nbody');if(b){b.value=n.body;b.oninput=e=>editNote('body',e.target.value);b.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();const s=b.selectionStart;b.setRangeText('  ',s,b.selectionEnd,'end');editNote('body',b.value)}}}}
function renderNotes(){if(!document.getElementById('nlist'))return;if(CUR_NOTE&&!curNote())CUR_NOTE=null;renderNoteList();renderNoteEditor()}
function renderAll(){applyCurr();vaultUI();if(!document.activeElement||!document.activeElement.closest('#neditor'))renderNotes();renderDash();renderTHM();renderSections();renderAssess();renderHTB();if(!document.activeElement||!document.activeElement.closest('#caselist'))renderCases();renderRev()}
renderAll();initFirebase();

/* hacker-theme extras */
const _rd=renderDash;renderDash=function(){_rd();const c=cur(),t=document.getElementById('termline');if(t)t.textContent='[S'+String(c.si+1).padStart(2,'0')+'] '+c.r+'  ::  '+st(c.key).toLowerCase();};
/* ================= INTERACTIVE TERMINALS ================= */
function Shell(o){
 const out=document.getElementById(o.out),inp=document.getElementById(o.input),H=[];let hi=0;
 const self={
  print(html,cls){const d=document.createElement('div');if(cls)d.className=cls;d.innerHTML=html;out.appendChild(d);out.scrollTop=out.scrollHeight},
  text(t,cls){this.print(esc(t),cls)},
  clear(){out.innerHTML=''},
  focus(){inp.focus()}
 };
 inp.closest('.sh').addEventListener('click',e=>{if(!getSelection().toString())inp.focus()});
 inp.addEventListener('keydown',async e=>{
  if(e.key==='ArrowUp'){if(hi>0){hi--;inp.value=H[hi]}e.preventDefault();return}
  if(e.key==='ArrowDown'){if(hi<H.length-1){hi++;inp.value=H[hi]}else{hi=H.length;inp.value=''}e.preventDefault();return}
  if(e.key==='Tab'){e.preventDefault();const v=inp.value.trim();if(!v)return;const m=Object.keys(o.cmds).filter(k=>k.startsWith(v)&&!k.startsWith('_'));if(m.length===1)inp.value=m[0]+' ';else if(m.length>1)self.print(m.join('   '),'dim');return}
  if(e.key==='l'&&e.ctrlKey){e.preventDefault();self.clear();return}
  if(e.key!=='Enter')return;
  const line=inp.value;inp.value='';
  self.print(o.prompt+' <span class="c">'+esc(line)+'</span>');
  const t=line.trim();if(!t)return;
  H.push(t);hi=H.length;
  const [cmd,...args]=t.split(/\s+/);
  const fn=o.cmds[cmd]||(cmd.startsWith('./')&&o.cmds[cmd]);
  try{
   if(o.cmds._pre){const r=o.cmds._pre(t,cmd,args,self,H);if(r!==undefined){if(r)self.print(r);return}}
   if(fn){const r=await fn(args,self,H,t);if(r)self.print(r)}
   else self.print('bash: '+esc(cmd)+': command not found <span class="dim">(try <b>help</b>)</span>','er');
  }catch(err){self.print(esc(String(err.message||err)),'er')}
 });
 return self;
}
const pad=(s,n)=>String(s).padEnd(n,' ');
const helpTable=rows=>rows.map(r=>'<span class="ok">'+esc(pad(r[0],18))+'</span><span class="dim">'+esc(r[1])+'</span>').join('\n');
const common={
 clear:(a,s)=>{s.clear()},
 date:()=>esc(new Date().toString()),
 echo:a=>esc(a.join(' ')),
 hostname:()=>TRACK.host,
 uname:a=>a.includes('-a')?'Linux '+TRACK.host+' 6.8.0-'+TRACK.group+' #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux':'Linux',
 history:(a,s,H)=>H.map((c,i)=>'<span class="dim">'+String(i+1).padStart(4,' ')+'</span>  '+esc(c)).join('\n'),
 sudo:()=>'<span class="er">[sudo] this user is not in the sudoers file. This incident will be reported.</span> <span class="dim">🚨 alert forwarded to SOC</span>',
 su:()=>'<span class="er">su: Authentication failure</span>',
 rm:(a)=>a.join(' ').includes('-rf')?'<span class="mg">Nice try. Ticket INC-'+Math.floor(1e4+Math.random()*9e4)+' raised for destructive command attempt.</span>':'rm: permission denied',
 ping:a=>{const h=esc(a[a.length-1]||'8.8.8.8');return 'PING '+h+' 56(84) bytes of data.\n'+[1,2,3].map(i=>'64 bytes from '+h+': icmp_seq='+i+' ttl=117 time='+(12+Math.random()*9).toFixed(1)+' ms').join('\n')+'\n<span class="dim">--- 3 packets transmitted, 3 received, 0% packet loss ---</span>'},
 nmap:a=>{const h=esc(a[a.length-1]||'localhost');return 'Starting Nmap 7.95 ( https://nmap.org )\nNmap scan report for '+h+'\nPORT     STATE    SERVICE\n22/tcp   <span class="ok">open</span>     ssh\n80/tcp   <span class="ok">open</span>     http\n443/tcp  <span class="ok">open</span>     https\n3389/tcp <span class="am">filtered</span> ms-wbt-server\n<span class="dim">(simulated — only scan systems you are authorised to test)</span>'},
 cowsay:a=>{const t=a.join(' ')||'moo, analyst';return esc(' '+'_'.repeat(t.length+2)+'\n< '+t+' >\n '+'-'.repeat(t.length+2)+'\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||')},
 matrix:(a,s)=>{const ch='01アイウエオカキクケコ';let o='';for(let r=0;r<6;r++){for(let c=0;c<48;c++)o+=ch[Math.floor(Math.random()*ch.length)];o+='\n'}return '<span class="ok">'+esc(o)+'</span>'},
 exit:()=>'logout <span class="dim">(nice try — you can’t escape the SOC)</span>'
};
const neo=(user)=>'<span class="ok">   ▄▄▄▄▄▄▄▄   </span>  <b class="cy">'+esc(user)+'@'+TRACK.host+'</b>\n<span class="ok">  █ &gt;_     █  </span>  <span class="dim">-----------------</span>\n<span class="cy">  █ '+TRACK.short+' █  </span>  <span class="ok">OS</span>: '+TRACK.os+' x86_64\n<span class="mg">  █▄▄▄▄▄▄▄▄█  </span>  <span class="ok">Shell</span>: soc-sh 1.0\n<span class="ok">     ▀▀▀▀     </span>  <span class="ok">Tools</span>: Splunk · Elastic · Wireshark · Snort\n                <span class="ok">Uptime</span>: '+Math.floor(performance.now()/60000)+' min';

/* ---- login-screen shell ---- */
const GFILES={'README.txt':'Welcome to the '+TRACK.title+'.\nAuthenticate to access your training dashboard.\n\n  ./authenticate --google   sign in with Google\n  login                     sign in with Google\n  register                  request access','login.sh':'#!/bin/bash\n# focuses the email login form\necho "Enter credentials below"'};
let GSH=null;
function initLoginShell(){
 GSH=Shell({out:'gout',input:'gcmd',prompt:'<span class="p">guest@'+TRACK.host+'</span>:<span class="h">~</span>$',cmds:Object.assign({},common,{
  help:()=>helpTable([['./authenticate','sign in (add --google for Google)'],['login','sign in with Google'],['register','how to get access'],['whoami','current user'],['ls / cat FILE','look around'],['neofetch','system info'],['clear','clear the screen (Ctrl+L)'],['…','plus: pwd id uname date echo history ping nmap cowsay matrix sudo']]),
  whoami:()=>'guest',
  id:()=>'uid=1000(guest) gid=1000(guest) groups=1000(guest)',
  pwd:()=>'/home/guest',
  cd:a=>'bash: cd: '+esc(a[0]||'~')+': restricted shell — authenticate first',
  ls:a=>a.some(x=>x.startsWith('-')&&x.includes('a'))?'drwx------  .secrets/\n-rw-r--r--  README.txt\n-rwxr-xr-x  login.sh\n-rwxr-xr-x  authenticate':'<span class="cy">README.txt</span>  <span class="ok">login.sh  authenticate</span>',
  cat:a=>{const f=(a[0]||'').replace(/^\.\//,'');if(!f)return 'usage: cat FILE';if(f.startsWith('.secrets'))return '<span class="er">cat: '+esc(f)+': Permission denied</span> <span class="dim">😉 nice try, analyst</span>';if(f==='/etc/passwd')return 'root:x:0:0:root:/root:/bin/bash\nguest:x:1000:1000::/home/guest:/bin/soc-sh';if(f==='/etc/shadow')return '<span class="er">cat: /etc/shadow: Permission denied</span>';return GFILES[f]?esc(GFILES[f]):'cat: '+esc(f)+': No such file or directory'},
  neofetch:()=>neo('guest'),
  './authenticate':async(a,s)=>{if(a.includes('--google')||a.includes('-g')){s.print('[*] launching Google OAuth…','cy');await gGoogle();return}return 'usage: ./authenticate --google   (or type <b>login</b> for email)'},
  authenticate:async(a,s)=>{s.print('[*] launching Google OAuth…','cy');await gGoogle()},
  google:async(a,s)=>{s.print('[*] launching Google OAuth…','cy');await gGoogle()},
  login:async(a,s)=>{s.print('[*] launching Google OAuth…','cy');await gGoogle()},
  './login.sh':async(a,s)=>{s.print('[*] launching Google OAuth…','cy');await gGoogle()},
  register:()=>'Access is invite-only. Sign in with Google — your request goes to the admin for approval.'
 })});
 GSH.print('<span class="dim">SOC-SH 1.0 — type</span> <span class="ok">help</span> <span class="dim">for commands</span>');
}

/* ---- dashboard shell ---- */
const VIEWS={dash:'dashboard',thm:'learning path',sections:'section progress',assess:'assessment gate',htb:TRACK.labels.practice,cases:'casebook',notes:'notes',rev:'revision',settings:'settings'};
const VALIAS={home:'dash',dashboard:'dash',path:'thm',rooms:'thm',progress:'sections',assessment:'assess',gate:'assess',casebook:'cases',case:'cases',note:'notes',revision:'rev',config:'settings'};
let DSH=null;
function initDashShell(){
 const user=()=>(CUR_USER&&(CUR_USER.email||'').split('@')[0])||TRACK.user;
 DSH=Shell({out:'dout',input:'dcmd',prompt:'<span class="p">'+TRACK.user+'@'+TRACK.host+'</span>:<span class="h">~</span>$',cmds:Object.assign({},common,{
  help:()=>helpTable([['status','overall progress'],['mission','current room'],['start','open current room'],['done','mark current room done'],['next','show the next 3 rooms'],['cd VIEW','go to a page (thm, htb, cases, notes, rev…)'],['ls','list pages'],['grep WORD','search rooms'],['case new [title]','open a new '+TRACK.labels.case],['note [text]','quick note'],['whoami','signed-in user'],['logout','sign out'],['…','plus: neofetch date ping nmap cowsay matrix history clear']]),
  whoami:()=>esc(CUR_USER?(CUR_USER.email||CUR_USER.displayName||TRACK.user):TRACK.user),
  id:()=>'uid=1337('+esc(user())+') gid=1337('+TRACK.group+') groups=1337('+TRACK.group+'),42(offsec)',
  pwd:()=>'/home/'+esc(user()),
  neofetch:()=>neo(user()),
  ls:()=>Object.keys(VIEWS).map(v=>'<span class="cy">'+pad(v+'/',11)+'</span><span class="dim">'+VIEWS[v]+'</span>').join('\n'),
  cd:(a,s)=>{let v=(a[0]||'dash').replace(/\/$/,'').replace(/^~\/?/,'')||'dash';v=VALIAS[v]||v;if(!VIEWS[v])return '<span class="er">cd: '+esc(a[0])+': No such file or directory</span>';go(v);if(v!=='dash')msg('cd '+v);return v==='dash'?'':''},
  open:(a,s)=>common_open(a),
  status:()=>{const A=all(),d=A.filter(x=>st(x.key)==='Done').length,p=Math.round(d/A.length*100),bar='█'.repeat(Math.round(p/5))+'░'.repeat(20-Math.round(p/5));return '<span class="ok">'+bar+'</span> '+p+'%  ('+d+'/'+A.length+' rooms)\n'+TRACK.labels.practiceShort+' unlocked: '+CURR.filter((_,i)=>passed(i)).length+'/'+CURR.length+' · cases: '+S.cases.length+' · notes: '+S.notes.length},
  mission:()=>{const c=cur();return '<span class="cy">[S'+String(c.si+1).padStart(2,'0')+'] '+esc(c.s)+'</span>\n→ '+esc(c.r)+'  <span class="am">('+st(c.key)+')</span>'},
  next:()=>{const A=all().filter(x=>st(x.key)!=='Done').slice(0,3);return A.length?A.map((x,i)=>(i?'  ':'<span class="ok">▶ </span>')+esc(x.r)+' <span class="dim">· S'+(x.si+1)+'</span>').join('\n'):'<span class="ok">All rooms complete. 🎉</span>'},
  start:()=>{const c=cur();start();return '<span class="ok">[+]</span> opening '+esc(c.r)+' on TryHackMe…'},
  done:()=>{const c=cur();done();return '<span class="ok">[✓]</span> '+esc(c.r)+' marked done'},
  grep:a=>{const q=a.join(' ').toLowerCase();if(!q)return 'usage: grep WORD';const r=all().filter(x=>(x.r+' '+x.s).toLowerCase().includes(q));return r.length?r.slice(0,12).map(x=>pad('S'+(x.si+1),4)+esc(x.r)+' <span class="dim">['+st(x.key)+']</span>').join('\n'):'(no match)'},
  case:(a)=>{if(a[0]==='new'){newCase(a.slice(1).join(' ')||undefined);return ''}if(a[0]==='ls'){return S.cases.length?S.cases.map(c=>esc(c.id)+'  '+esc(c.title)+' <span class="dim">['+esc(c.verdict)+']</span>').join('\n'):'(no cases)'}return 'usage: case new [title] | case ls'},
  note:(a)=>{if(!a.length){go('notes');return ''}const t=a.join(' ');const n={id:nid(),title:t.slice(0,60),room:'',tags:'quick',body:t,updated:Date.now()};S.notes.unshift(n);save();return '<span class="ok">[+]</span> note saved'},
  logout:()=>{signOut();return ''},
  exit:()=>{signOut();return 'logout'}
 })});
}
function common_open(a){const t=(a[0]||'').toLowerCase();if(t==='thm'){thm();return '[+] opening TryHackMe'}if(t==='htb'){openUrl('https://app.hackthebox.com/sherlocks');return '[+] opening HackTheBox'}return 'usage: open thm | open htb'}
initLoginShell();initDashShell();

function applyRgb(on){document.documentElement.dataset.rgb=on?'on':'off';const s=document.getElementById('rgbSw');if(s)s.setAttribute('aria-checked',on?'true':'false')}
function toggleRgb(){const on=document.documentElement.dataset.rgb!=='on';applyRgb(on);try{localStorage.setItem('SOC_L1_RGB',on?'on':'off')}catch(e){}msg('RGB effects '+(on?'on':'off'))}
try{applyRgb(localStorage.getItem('SOC_L1_RGB')!=='off')}catch(e){applyRgb(true)}
renderDash();
