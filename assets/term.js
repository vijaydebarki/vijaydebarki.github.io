/* ====================================================================
   term.js — interactive terminal for every page
   SiteShell.mount(element, {user, host, cwd, files, cmds, help, banner, suggest})
   ==================================================================== */
(function(){
const ROOT=(function(){const s=document.currentScript&&document.currentScript.src;return s?s.replace(/assets\/term\.js.*$/,''):'/'})();
const PAGES={home:'',centers:'centers/',soc:'soc/',pentest:'pentest/',writeups:'writeups/',posts:'writeups/'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=(s,n)=>String(s).padEnd(n,' ');
const css=`.xsh{cursor:text;white-space:normal!important}
.xsh .xout{max-height:230px;overflow-y:auto;white-space:pre-wrap;word-break:break-word}
.xsh .xout:empty{display:none}
.xsh .xline{display:flex;align-items:center;gap:8px}
.xsh .xp{white-space:nowrap}.xsh .xp .u{color:#9fef00}.xsh .xp .h{color:#00e5ff}
.xsh input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#e6edf6;font:inherit;caret-color:#9fef00;padding:0}
.xsh input::placeholder{color:#4a5a72}
.xsh .ok{color:#9fef00}.xsh .er{color:#ff3e5b}.xsh .dim{color:#8391a7}.xsh .cy{color:#00e5ff}.xsh .mg{color:#ff2bd6}.xsh .am{color:#ffb800}.xsh .c{color:#e6edf6}
.xsh:focus-within{border-color:#9fef0066!important;box-shadow:0 0 0 1px #9fef0022,0 0 18px #9fef0014}`;
function injectCss(){if(document.getElementById('xsh-css'))return;const s=document.createElement('style');s.id='xsh-css';s.textContent=css;document.head.appendChild(s)}
function go(path){location.href=ROOT+path}
function openUrl(u){const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
const table=rows=>rows.map(r=>'<span class="ok">'+esc(pad(r[0],20))+'</span><span class="dim">'+esc(r[1])+'</span>').join('\n');

function mount(el,o){
 injectCss();o=o||{};
 const user=o.user||'visitor',host=o.host||'offsec',cwd=o.cwd||'~';
 const prompt='<span class="xp"><span class="u">'+esc(user)+'@'+esc(host)+'</span>:<span class="h">'+esc(cwd)+'</span>$</span>';
 el.classList.add('xsh');el.innerHTML='<div class="xout"></div><label class="xline">'+prompt+'<input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal — type help"></label>';
 const out=el.querySelector('.xout'),inp=el.querySelector('input'),H=[];let hi=0;
 const self={print(h,cls){const d=document.createElement('div');if(cls)d.className=cls;d.innerHTML=h;out.appendChild(d);out.scrollTop=out.scrollHeight},clear(){out.innerHTML=''},input:inp};
 const files=o.files||{};
 const base={
  help:()=>table((o.help||[]).concat([
    ['ls','list files / pages'],['cat FILE','read a file'],['cd PAGE','go to home, centers, soc, pentest, writeups'],
    ['whoami / id / pwd','who and where'],['neofetch','system info'],['clear','clear screen (Ctrl+L)'],
    ['…','also: date echo uname history ping nmap sudo cowsay matrix exit']])),
  ls:(a)=>{const f=Object.keys(files);const pages=['centers/','soc/','pentest/','writeups/'];
    if(a.some(x=>/^-.*a/.test(x)))return 'drwxr-xr-x  .\ndrwxr-xr-x  ..\n-rw-------  .secrets\n'+f.map(n=>'-rw-r--r--  '+esc(n)).join('\n')+'\n'+pages.map(p=>'drwxr-xr-x  <span class="cy">'+p+'</span>').join('\n');
    return f.map(n=>'<span class="c">'+esc(n)+'</span>').concat(pages.map(p=>'<span class="cy">'+p+'</span>')).join('  ')},
  cat:(a)=>{const n=(a[0]||'').replace(/^\.\//,'');if(!n)return 'usage: cat FILE  (try <b>ls</b>)';
    if(n.startsWith('.secret'))return '<span class="er">cat: '+esc(n)+': Permission denied</span> <span class="dim">— nice try 😉</span>';
    if(n==='/etc/passwd')return 'root:x:0:0:root:/root:/bin/bash\n'+esc(user)+':x:1000:1000::/home/'+esc(user)+':/bin/offsec-sh';
    if(n==='/etc/shadow')return '<span class="er">cat: /etc/shadow: Permission denied</span>';
    const f=files[n];if(f===undefined)return 'cat: '+esc(n)+': No such file or directory';return typeof f==='function'?f():esc(f)},
  cd:(a)=>{let t=(a[0]||'home').replace(/^\.?\/*|\/+$/g,'').replace(/^~/,'')||'home';if(t==='..')t='home';
    if(PAGES[t]===undefined)return '<span class="er">cd: '+esc(a[0])+': No such file or directory</span> <span class="dim">(home, centers, soc, pentest, writeups)</span>';
    setTimeout(()=>go(PAGES[t]),250);return '<span class="ok">→</span> '+esc(t)},
  whoami:()=>esc(user),
  id:()=>'uid=1000('+esc(user)+') gid=1000('+esc(user)+') groups=1000('+esc(user)+'),27(offsec)',
  pwd:()=>'/home/'+esc(user)+(cwd.replace(/^~/,'')),
  hostname:()=>esc(host),
  uname:a=>a.includes('-a')?'Linux '+esc(host)+' 6.8.0-offsec #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux':'Linux',
  date:()=>esc(new Date().toString()),
  echo:a=>esc(a.join(' ')),
  history:()=>H.map((c,i)=>'<span class="dim">'+String(i+1).padStart(4,' ')+'</span>  '+esc(c)).join('\n'),
  clear:()=>{self.clear()},
  sudo:()=>'<span class="er">[sudo] '+esc(user)+' is not in the sudoers file. This incident will be reported.</span> <span class="dim">🚨</span>',
  su:()=>'<span class="er">su: Authentication failure</span>',
  rm:a=>a.join(' ').includes('-rf')?'<span class="mg">Nice try. Incident INC-'+Math.floor(1e4+Math.random()*9e4)+' opened.</span>':'rm: permission denied',
  ping:a=>{const h=esc(a[a.length-1]||'8.8.8.8');return 'PING '+h+' 56(84) bytes of data.\n'+[1,2,3].map(i=>'64 bytes from '+h+': icmp_seq='+i+' ttl=117 time='+(12+Math.random()*9).toFixed(1)+' ms').join('\n')+'\n<span class="dim">--- 3 packets transmitted, 3 received, 0% packet loss ---</span>'},
  nmap:a=>{const h=esc(a.filter(x=>!x.startsWith('-')).pop()||'localhost');return 'Starting Nmap 7.95 ( https://nmap.org )\nNmap scan report for '+h+'\nPORT     STATE    SERVICE   VERSION\n22/tcp   <span class="ok">open</span>     ssh       OpenSSH 9.6\n80/tcp   <span class="ok">open</span>     http      nginx 1.24\n443/tcp  <span class="ok">open</span>     https\n3389/tcp <span class="am">filtered</span> ms-wbt-server\n<span class="dim">(simulated — only scan systems you are authorised to test)</span>'},
  cowsay:a=>{const t=a.join(' ')||'hack the planet (legally)';return esc(' '+'_'.repeat(t.length+2)+'\n< '+t+' >\n '+'-'.repeat(t.length+2)+'\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||')},
  matrix:()=>{const ch='01アイウエオカキクケコ';let s='';for(let r=0;r<6;r++){for(let c=0;c<46;c++)s+=ch[Math.floor(Math.random()*ch.length)];s+='\n'}return '<span class="ok">'+esc(s)+'</span>'},
  neofetch:()=>'<span class="ok">   ▄▄▄▄▄▄▄▄   </span>  <b class="cy">'+esc(user)+'@'+esc(host)+'</b>\n<span class="ok">  █ &gt;_     █  </span>  <span class="dim">-----------------</span>\n<span class="mg">  █ OFFSEC █  </span>  <span class="ok">OS</span>: Kali GNU/Linux x86_64\n<span class="cy">  █▄▄▄▄▄▄▄▄█  </span>  <span class="ok">Shell</span>: offsec-sh 1.0\n<span class="ok">     ▀▀▀▀     </span>  <span class="ok">Focus</span>: Red Team 70% · Blue Team 30%',
  exit:()=>'logout <span class="dim">(the terminal is always here)</span>'
 };
 const cmds=Object.assign({},base,o.cmds||{});
 el.addEventListener('click',()=>{if(!getSelection().toString())inp.focus()});
 inp.addEventListener('keydown',async e=>{
  if(e.key==='ArrowUp'){if(hi>0){hi--;inp.value=H[hi]}e.preventDefault();return}
  if(e.key==='ArrowDown'){if(hi<H.length-1){hi++;inp.value=H[hi]}else{hi=H.length;inp.value=''}e.preventDefault();return}
  if(e.key==='Tab'){e.preventDefault();const v=inp.value;const parts=v.split(/\s+/);
    if(parts.length<=1){const m=Object.keys(cmds).filter(k=>k.startsWith(v));if(m.length===1)inp.value=m[0]+' ';else if(m.length>1)self.print(m.join('   '),'dim')}
    else{const last=parts[parts.length-1];const pool=parts[0]==='cd'?Object.keys(PAGES):parts[0]==='open'&&o.openTargets?o.openTargets:Object.keys(files);const m=pool.filter(k=>k.startsWith(last));if(m.length===1){parts[parts.length-1]=m[0];inp.value=parts.join(' ')}else if(m.length>1)self.print(m.join('   '),'dim')}
    return}
  if(e.key==='l'&&e.ctrlKey){e.preventDefault();self.clear();return}
  if(e.key!=='Enter')return;
  const line=inp.value;inp.value='';self.print(prompt+' <span class="c">'+esc(line)+'</span>');
  const t=line.trim();if(!t)return;H.push(t);hi=H.length;
  const [c,...args]=t.split(/\s+/);const fn=cmds[c];
  try{if(fn){const r=await fn(args,self,t);if(r)self.print(r)}else self.print('bash: '+esc(c)+': command not found <span class="dim">(try <b>help</b>)</span>','er')}
  catch(err){self.print(esc(err.message||err),'er')}
 });
 // animated placeholder suggestions
 const sug=o.suggest||['help'];let si=0,ci=0,del=false,timer=null;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function tick(){if(document.activeElement===inp||inp.value){inp.placeholder='type help';timer=setTimeout(tick,600);return}
  const s='try: '+sug[si%sug.length];inp.placeholder=s.slice(0,ci);
  if(!del&&ci<s.length){ci++;timer=setTimeout(tick,70)}else if(!del){del=true;timer=setTimeout(tick,1800)}else if(ci>5){ci--;timer=setTimeout(tick,30)}else{del=false;si++;timer=setTimeout(tick,300)}}
 if(reduce)inp.placeholder='try: '+sug[0];else tick();
 if(o.banner)self.print(o.banner);
 return self;
}
window.SiteShell={mount,openUrl,go,esc,ROOT};
})();
